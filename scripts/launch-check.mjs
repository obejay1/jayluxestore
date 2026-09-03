#!/usr/bin/env node

const checks = [
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID],
  ["NEXT_PUBLIC_PAYSTACK_KEY", process.env.NEXT_PUBLIC_PAYSTACK_KEY],
  ["RESEND_API_KEY", process.env.RESEND_API_KEY],
  ["CLOUDINARY_CLOUD_NAME", process.env.CLOUDINARY_CLOUD_NAME],
];

let failed = false;

console.log("JayLuxe Production Launch Check\n");

for (const [name, value] of checks) {
  if (value) {
    console.log(`✓ ${name} configured`);
  } else {
    console.log(`! ${name} missing`);
    failed = true;
  }
}

if (failed) {
  console.log("\nLaunch check incomplete. Configure missing production variables.");
  process.exitCode = 1;
} else {
  console.log("\n✓ JayLuxe production configuration ready");
}
