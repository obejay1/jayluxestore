import { NextResponse } from "next/server";
import {
  CheckoutError,
  finalizeCheckoutIntent,
  type VerifiedPayment,
} from "@/lib/checkout/server";
import { verifyOpayCallbackSignature } from "@/lib/payments/opay";
import { adminDb } from "@/lib/firebaseAdmin";
import { settleVerifiedInstallmentPayment } from '@/lib/installments/settlement';

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const secret = process.env.OPAY_SECRET_KEY?.trim();

    if (!secret) {
      return NextResponse.json({ error: "Missing configuration" }, { status: 500 });
    }

    const payload = body?.payload as Record<string, unknown> | undefined;
    const signature = String(body?.sha512 ?? "");

    if (!payload || !signature || !verifyOpayCallbackSignature(payload, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const reference = String(payload.reference ?? "").trim();
    const transactionId = String(payload.transactionId ?? "").trim();
    const status = String(payload.status ?? "").trim().toUpperCase();
    const amountKobo = Number(payload.amount);
    const currency = String(payload.currency ?? "NGN").trim().toUpperCase();

    if (!reference) {
      return NextResponse.json({ error: "Missing order reference" }, { status: 400 });
    }

    const paymentRef = adminDb.collection("payments").doc(transactionId || reference);

    if (status !== "SUCCESS") {
      await paymentRef.set(
        {
          provider: "opay",
          reference,
          transactionId: transactionId || null,
          status: status || "FAILED",
          amount: Number.isFinite(amountKobo) ? amountKobo : null,
          currency,
          updatedAt: new Date(),
        },
        { merge: true },
      );

      return NextResponse.json({ received: true });
    }

    if (!transactionId || !Number.isFinite(amountKobo) || amountKobo <= 0) {
      return NextResponse.json({ error: "Incomplete payment payload" }, { status: 400 });
    }

    const suppliedPayment: VerifiedPayment = {
      status: "success",
      amount: amountKobo,
      reference,
      currency,
    };

    // Installment payments are reconciled from the provider webhook only.
    // The browser return URL never marks an installment as paid.
    const installmentPayment = await adminDb.collection('installmentPayments').doc(reference).get();
    if (installmentPayment.exists) {
      await settleVerifiedInstallmentPayment({
        provider: 'OPay',
        reference,
        status: 'success',
        amountKobo,
        currency,
        metadata: payload as Record<string, unknown>,
      });

      await paymentRef.set({
        provider: 'opay',
        reference,
        transactionId,
        amount: amountKobo,
        currency,
        status: 'SUCCESS',
        paidAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });

      return NextResponse.json({ received: true, installment: true });
    }

    // This is the only point where a normal OPay payment can complete a JayLuxe
    // checkout. HTTP 200 from create-payment never marks the order paid.
    const result = await finalizeCheckoutIntent(reference, suppliedPayment, "OPay");

    await paymentRef.set(
      {
        provider: "opay",
        reference,
        transactionId,
        amount: amountKobo,
        currency,
        status: "SUCCESS",
        orderId: result.order.id,
        paidAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof CheckoutError) {
      console.error("OPAY_WEBHOOK_RECONCILIATION_FAILED", {
        message: error.message,
        status: error.status,
      });
      return NextResponse.json({ error: "Payment reconciliation failed" }, { status: 409 });
    }

    console.error("OPAY_WEBHOOK_ERROR", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid callback" }, { status: 400 });
  }
}
