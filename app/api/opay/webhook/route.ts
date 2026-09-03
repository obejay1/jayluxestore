import { NextResponse } from "next/server";
import { verifyOpayCallbackSignature } from "@/lib/payments/opay";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const secret = process.env.OPAY_SECRET_KEY;

    if (!secret) {
      return NextResponse.json({ error: "Missing configuration" }, { status: 500 });
    }

    const payload = body.payload;
    const signature = body.sha512;

    if (!payload || !verifyOpayCallbackSignature(payload, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const orderId = payload.reference;

    // Production safety: require successful payment payload fields
    if (payload.status === "SUCCESS" && (!payload.transactionId || !payload.amount)) {
      return NextResponse.json({ error: "Incomplete payment payload" }, { status: 400 });
    }

    if (!orderId) {
      return NextResponse.json({ error: "Missing order reference" }, { status: 400 });
    }

    const paymentRef = adminDb.collection("payments").doc(String(payload.transactionId || orderId));
    const orderRef = adminDb.collection("orders").doc(String(orderId));

    if (payload.status !== "SUCCESS") {
      await paymentRef.set({
        provider: "opay",
        reference: orderId,
        transactionId: payload.transactionId || null,
        status: payload.status || "FAILED",
        updatedAt: new Date(),
      }, { merge: true });

      return NextResponse.json({ received: true });
    }

    await adminDb.runTransaction(async (transaction) => {
      const paymentSnap = await transaction.get(paymentRef);
      const orderSnap = await transaction.get(orderRef);

      // Idempotency: ignore already completed payments
      if (paymentSnap.exists && paymentSnap.data()?.status === "SUCCESS") {
        return;
      }

      transaction.set(paymentRef, {
        provider: "opay",
        reference: orderId,
        transactionId: payload.transactionId || null,
        amount: payload.amount?.total || null,
        currency: payload.amount?.currency || "NGN",
        status: "SUCCESS",
        paidAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });

      if (orderSnap.exists) {
        transaction.set(orderRef, {
          paymentStatus: "paid",
          status: "processing",
          paymentMethod: "opay",
          updatedAt: new Date(),
        }, { merge: true });
      }
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("OPay webhook error", error);
    return NextResponse.json({ error: "Invalid callback" }, { status: 400 });
  }
}
