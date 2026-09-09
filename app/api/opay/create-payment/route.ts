import { NextRequest, NextResponse } from "next/server";
import {
  checkoutCompletionCookieName,
  CheckoutError,
  CHECKOUT_COMPLETION_MAX_AGE_SECONDS,
  markCheckoutInitializationFailed,
  prepareCheckoutIntent,
} from "@/lib/checkout/server";
import {
  getOpayRedirectUrl,
  normalizeJayLuxeNotifyLanguage,
  normalizeNigerianPhone,
  toOpayNotifyLanguage,
  type OpayCreatePaymentResponse,
} from "@/lib/payments/opay";
import { getVerifiedCustomer } from "@/lib/requestAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateOpayPaymentRequest = {
  items?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
  customerPhone?: unknown;
  customerAddress?: unknown;
  couponCode?: unknown;
  notifyLanguage?: unknown;
  paymentType?: unknown;
  installmentCount?: unknown;
  installmentPlan?: Record<string, unknown> | null;
};

export async function POST(req: NextRequest) {
  let checkoutReference = "";

  try {
    const body = (await req.json()) as CreateOpayPaymentRequest;
    const customer = await getVerifiedCustomer(req);
    const notifyLanguage = normalizeJayLuxeNotifyLanguage(body.notifyLanguage);

    const { intent, browserSecret } = await prepareCheckoutIntent({
      items: body.items,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      customerAddress: body.customerAddress,
      couponCode: body.couponCode,
      paymentType: body.paymentType === 'Installment' ? 'Installment' : 'OPay',
      installmentCount: body.installmentCount,
      installmentPlan: body.installmentPlan,
      ...(customer?.uid ? { userId: customer.uid } : {}),
    });

    checkoutReference = intent.reference;

    const merchantId = process.env.OPAY_MERCHANT_ID?.trim();
    const secret = process.env.OPAY_SECRET_KEY?.trim();
    const publicKey = process.env.OPAY_PUBLIC_KEY?.trim();
    const baseUrl = (process.env.OPAY_BASE_URL?.replace(/\/+$/, "") || "https://api.opaycheckout.com");

    if (!merchantId || !publicKey || !baseUrl) {
      await markCheckoutInitializationFailed(intent.reference);
      return NextResponse.json({ error: "OPay is not configured" }, { status: 503 });
    }

    const productName =
      intent.items.map((item) => item.name).filter(Boolean).join(", ").slice(0, 120) ||
      "Jayluxestore Order";

    const payload = {
      amount: {
        currency: "NGN",
        total: intent.expectedAmountKobo,
      },
      callbackUrl:
        process.env.OPAY_CALLBACK_URL ||
        "https://jayluxestore.com/api/opay/webhook",
      returnUrl:
        process.env.OPAY_RETURN_URL ||
        "https://jayluxestore.com/checkout/opay/return",
      cancelUrl:
        process.env.OPAY_CANCEL_URL ||
        "https://jayluxestore.com/checkout/opay/cancel",
      country: "NG",
      expireAt: 30,
      merchantName: "Jayluxestore",
      reference: intent.reference,
      product: {
        name: productName,
        description: `Jayluxestore order for ${intent.customerName}`,
      },
      notify: {
        // JayLuxe sends "en" internally. OPay's provider enum requires the
        // documented value "English", so conversion happens only here.
        notifyLanguage: toOpayNotifyLanguage(notifyLanguage),
        notifyMethod: "BOTH",
        notifyUserEmail: intent.customerEmail,
        notifyUserMobile: normalizeNigerianPhone(intent.customerPhone),
        notifyUserName: intent.customerName,
      },
      payMethod: "OpayWalletNg",
    };

    const response = await fetch(`${baseUrl}/api/v1/international/cashier/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${publicKey}`,
        MerchantId: merchantId,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const raw = await response.text();
    let data: OpayCreatePaymentResponse = {};

    if (raw) {
      try {
        data = JSON.parse(raw) as OpayCreatePaymentResponse;
      } catch {
        await markCheckoutInitializationFailed(intent.reference);
        return NextResponse.json(
          { error: "OPay returned an invalid response. Please try again." },
          { status: 502 },
        );
      }
    }

    if (!response.ok || (data.code && data.code !== "00000")) {
      await markCheckoutInitializationFailed(intent.reference);
      console.error("OPAY_CREATE_REJECTED", {
        httpStatus: response.status,
        code: data.code ?? null,
        message: data.message ?? null,
        reference: intent.reference,
      });

      return NextResponse.json(
        {
          error: data.message || data.error || "OPay payment creation failed",
          code: data.code ?? null,
        },
        { status: 502 },
      );
    }

    const cashierUrl = getOpayRedirectUrl(data);

    if (!cashierUrl) {
      await markCheckoutInitializationFailed(intent.reference);
      return NextResponse.json(
        { error: "OPay Cashier did not return a payment URL." },
        { status: 502 },
      );
    }

    const apiResponse = NextResponse.json({
      success: true,
      code: data.code ?? "00000",
      message: data.message ?? "SUCCESSFUL",
      cashierUrl,
      data: data.data ?? null,
      reference: intent.reference,
      amount: intent.expectedPaymentAmount,
      notifyLanguage,
    });

    // Preserve the same browser-bound completion protection used by the
    // hardened checkout architecture. The webhook remains authoritative.
    apiResponse.cookies.set(
      checkoutCompletionCookieName(intent.reference),
      `${intent.reference}.${browserSecret}`,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: CHECKOUT_COMPLETION_MAX_AGE_SECONDS,
      },
    );

    return apiResponse;
  } catch (error) {
    if (checkoutReference) {
      await markCheckoutInitializationFailed(checkoutReference).catch(() => undefined);
    }

    console.error("OPAY_CREATE_PAYMENT_FAILED", {
      message: error instanceof Error ? error.message : String(error),
      reference: checkoutReference || null,
    });

    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to initialize OPay payment" },
      { status: 500 },
    );
  }
}
