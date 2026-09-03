import crypto from "crypto";

function sortObject(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result: any, key) => {
        result[key] = sortObject(value[key]);
        return result;
      }, {});
  }

  return value;
}

/**
 * Creates the OPay request signature.
 * The payload is deeply sorted so the signature matches
 * the exact canonical representation sent to OPay.
 */
export function createOpaySignature(payload: unknown, secret: string) {
  const canonicalPayload = JSON.stringify(sortObject(payload));

  return crypto
    .createHmac("sha512", secret)
    .update(canonicalPayload)
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
