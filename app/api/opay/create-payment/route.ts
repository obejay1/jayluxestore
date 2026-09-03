import { NextResponse } from "next/server";
import { createOpaySignature } from "@/lib/payments/opay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { amount, email, name, phone, orderId, productName } = await req.json();

    if (!amount || !orderId) {
      return NextResponse.json(
        { error: "Missing payment information" },
        { status: 400 }
      );
    }

    const merchantId = process.env.OPAY_MERCHANT_ID;
    const secret = process.env.OPAY_SECRET_KEY;
    const baseUrl = process.env.OPAY_BASE_URL;

    if (!merchantId || !secret || !baseUrl) {
      return NextResponse.json(
        { error: "OPay is not configured" },
        { status: 503 }
      );
    }

    const payload = {
      amount: {
        currency: "NGN",
        total: Math.round(Number(amount)),
      },
      callbackUrl:
        process.env.OPAY_CALLBACK_URL ||
        "https://jayluxestore.com/api/opay/webhook",
      country: "NG",
      reference: orderId,
      product: {
        name: productName || "Jayluxestore Order",
        description: `Customer: ${name || email}`,
      },
      notify: {
        notifyLanguage: "en",
        ...(email && {
          notifyUserEmail: email,
        }),
        ...(phone && {
          notifyUserMobile: phone,
        }),
        ...(name && {
          notifyUserName: name,
        }),
      },
      payMethod: "ReferenceCode",
    };

    const signature = createOpaySignature(payload, secret);

    const response = await fetch(
      `${baseUrl}/api/v1/international/payment/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${signature}`,
          MerchantId: merchantId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "OPay payment creation failed", details: data },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to initialize OPay payment" },
      { status: 500 }
    );
  }
}
