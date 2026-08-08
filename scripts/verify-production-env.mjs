#!/usr/bin/env node

const required = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
  'PAYSTACK_SECRET_KEY',
  'RESEND_API_KEY',
  'TERMII_API_KEY',
];

const missing = required.filter((name) => !process.env[name]?.trim());
const expectedOrigin = 'https://jayluxestore.com';
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');

if (appUrl && appUrl !== expectedOrigin) {
  console.error(`NEXT_PUBLIC_APP_URL must be ${expectedOrigin}, got ${appUrl}`);
  process.exitCode = 1;
}

if (missing.length) {
  console.error('Missing required production environment variables:');
  for (const name of missing) console.error(`- ${name}`);
  process.exitCode = 1;
}

if (!process.exitCode) {
  console.log('JayLuxe production environment looks ready for jayluxestore.com.');
}
