import process from "node:process";

const required = [
  "OPAY_MERCHANT_ID",
  "OPAY_SECRET_KEY",
  "OPAY_BASE_URL",
  "OPAY_CALLBACK_URL"
];

const missing = required.filter((key)=>!process.env[key]);

if (missing.length) {
  console.error("Missing OPay production variables:", missing.join(", "));
  process.exit(1);
}

if (!process.env.OPAY_BASE_URL.includes("opay")) {
  console.error("Invalid OPay base URL configuration");
  process.exit(1);
}

console.log("OPay production configuration looks ready.");
