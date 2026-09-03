import crypto from "crypto";

export type JayLuxeNotifyLanguage = "en" | "ar";
export type OpayNotifyLanguage = "English" | "Arabic";

export type OpayCreatePaymentResponse = {
  code?: string | null;
  message?: string | null;
  error?: string | null;
  url?: string | null;
  paymentUrl?: string | null;
  cashierUrl?: string | null;
  data?: {
    url?: string | null;
    paymentUrl?: string | null;
    cashierUrl?: string | null;
    reference?: string | null;
    orderNo?: string | null;
    status?: string | null;
    referenceCode?: string | null;
    amount?: {
      total?: number | null;
      currency?: string | null;
    } | null;
  } | null;
};

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortObject((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

/**
 * JayLuxe uses compact locale codes internally. Missing/unknown values default
 * to English so nullable UI state never becomes a payment runtime error.
 */
export function normalizeJayLuxeNotifyLanguage(value: unknown): JayLuxeNotifyLanguage {
  return String(value ?? "").trim().toLowerCase() === "ar" ? "ar" : "en";
}

/**
 * OPay Reference Code expects the enum values "English" or "Arabic" rather
 * than locale codes. Keep JayLuxe's internal value as "en"/"ar" and map it
 * only at the provider boundary.
 */
export function toOpayNotifyLanguage(value: unknown): OpayNotifyLanguage {
  return normalizeJayLuxeNotifyLanguage(value) === "ar" ? "Arabic" : "English";
}

export function normalizeNigerianPhone(value: unknown) {
  const raw = String(value ?? "").trim().replace(/[\s()-]/g, "");
  if (!raw) return "";
  if (raw.startsWith("+234")) return raw;
  if (raw.startsWith("234")) return `+${raw}`;
  if (raw.startsWith("0")) return `+234${raw.slice(1)}`;
  return raw;
}

export function getOpayRedirectUrl(payload: OpayCreatePaymentResponse) {
  return (
    payload?.url ??
    payload?.paymentUrl ??
    payload?.cashierUrl ??
    payload?.data?.url ??
    payload?.data?.paymentUrl ??
    payload?.data?.cashierUrl ??
    null
  );
}

export function getOpayReferenceCode(payload: OpayCreatePaymentResponse) {
  return payload?.data?.referenceCode ?? null;
}

/**
 * Creates the OPay request signature. The payload is deeply sorted so the
 * signature matches the canonical representation used by this integration.
 */
export function createOpaySignature(payload: unknown, secret: string) {
  const canonicalPayload = JSON.stringify(sortObject(payload));

  return crypto
    .createHmac("sha512", secret)
    .update(canonicalPayload)
    .digest("hex");
}

/**
 * OPay callback notifications use HMAC-SHA3-512, which is different from the
 * SHA-512 HMAC used by payment creation requests.
 */
export function verifyOpayCallbackSignature(
  payload: Record<string, unknown>,
  receivedSignature: string,
  secret: string
) {
  const amount = String(payload.amount ?? "");
  const currency = String(payload.currency ?? "");
  const reference = String(payload.reference ?? "");
  const status = String(payload.status ?? "");
  const timestamp = String(payload.timestamp ?? "");
  const token = String(payload.token ?? "");
  const transactionId = String(payload.transactionId ?? "");
  const refunded = payload.refunded === true ? "t" : "f";

  const content = `{Amount:"${amount}",Currency:"${currency}",Reference:"${reference}",Refunded:${refunded},Status:"${status}",Timestamp:"${timestamp}",Token:"${token}",TransactionID:"${transactionId}"}`;

  const signature = crypto
    .createHmac("sha3-512", secret)
    .update(content)
    .digest("hex");

  return signature.toLowerCase() === String(receivedSignature ?? "").toLowerCase();
}
