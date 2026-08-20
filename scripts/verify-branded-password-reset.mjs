import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

check(exists('lib/passwordReset.ts'), 'Missing shared branded password-reset helper.');
check(exists('app/reset-password/page.tsx'), 'Missing /reset-password page.');
check(exists('app/reset-password/layout.tsx'), 'Missing /reset-password metadata layout.');

const templates = read('lib/email/templates.ts');
check(templates.includes('PRODUCTION_SITE_URL'), 'Email template shell must use the production JayLuxe URL so Resend links match the sending domain.');

const workflows = read('lib/email/workflows.ts');
check(workflows.includes('buildBrandedPasswordResetLink'), 'Customer reset workflow does not use branded reset-link helper.');
check(workflows.includes('generatePasswordResetLink'), 'Firebase Admin must remain responsible for reset-link generation.');


if (exists('lib/passwordReset.ts')) {
  const helper = read('lib/passwordReset.ts');
  check(helper.includes("searchParams.get('oobCode')") || helper.includes('searchParams.get("oobCode")'), 'Helper must extract Firebase oobCode.');
  check(helper.includes('/reset-password?oobCode='), 'Helper must build a JayLuxe /reset-password URL.');
  check(helper.includes('PRODUCTION_SITE_URL'), 'Reset emails must use the production JayLuxe domain even when generated from local development.');
  check(!helper.includes('console.log'), 'Reset helper must not log action codes.');
}

if (exists('app/reset-password/page.tsx')) {
  const page = read('app/reset-password/page.tsx');
  check(page.includes('verifyPasswordResetCode'), 'Reset page must verify Firebase reset code.');
  check(page.includes('confirmPasswordReset'), 'Reset page must confirm reset through Firebase.');
  check(page.includes('autoComplete="new-password"'), 'Reset page must use new-password autocomplete.');
  check(page.includes('Show password') && page.includes('Hide password'), 'Password visibility control must have accessible labels.');
  check(!/localStorage|sessionStorage|document\.cookie/.test(page), 'Reset page must not persist passwords or reset codes.');
}

if (failures.length) {
  console.error(`FAIL: branded password reset verification (${failures.length} issue${failures.length === 1 ? '' : 's'})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('PASS: branded password reset verification');
