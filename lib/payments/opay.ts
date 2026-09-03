import crypto from "crypto";

export function createOpaySignature(payload: unknown, secret: string) {
  const sorted = JSON.stringify(payload, Object.keys(payload as any).sort());
  return crypto
    .createHmac("sha512", secret)
    .update(sorted)
    .digest("hex");
}

export function verifyOpayCallbackSignature(
  payload: any,
  receivedSignature: string,
  secret: string
) {
  const content = `{Amount:"${payload.amount}",Currency:"${payload.currency}",Reference:"${payload.reference}",Refunded:${payload.refunded ? "t" : "f"},Status:"${payload.status}",Timestamp:"${payload.timestamp}",Token:"${payload.token || ""}",TransactionID:"${payload.transactionId}"}`;

  const signature = crypto
    .createHmac("sha512", secret)
    .update(content)
    .digest("hex");

  return signature.toLowerCase() === String(receivedSignature).toLowerCase();
}
