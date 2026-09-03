
/**
 * JayLuxe Installment Production Validation Checklist
 * This script validates required environment wiring before deployment.
 * It does not perform live payment calls.
 */

const requiredEnv = [
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
];

const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length) {
  console.error("Missing required environment variables:", missing.join(", "));
  process.exit(1);
}

console.log("Installment production validation passed.");
console.log("Next checks: Paystack sandbox/live low-value checkout, browser-close recovery, and webhook replay tests. Test OPay only if it is intentionally enabled after its full lifecycle is implemented.");
