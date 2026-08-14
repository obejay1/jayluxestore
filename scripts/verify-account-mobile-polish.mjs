import fs from 'node:fs';
import process from 'node:process';

const account = fs.readFileSync('app/account/page.tsx', 'utf8');
const css = fs.readFileSync('app/jayluxe-card-system.css', 'utf8');

const failures = [];
function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(/\bRefreshCw\b/.test(account), 'Account page must import/use RefreshCw.');
expect(/aria-label=["']Refresh order history["']/.test(account), 'Refresh button must have aria-label="Refresh order history".');
expect(/<RefreshCw[^>]*aria-hidden=["']true["']/.test(account), 'Refresh icon must be decorative with aria-hidden="true".');
expect(/<RefreshCw[\s\S]{0,180}?\bRefresh\s*<\/button>/.test(account), 'Refresh button visible label must be "Refresh".');
expect(/disabled=\{ordersLoading\}/.test(account), 'Refresh button must retain the ordersLoading disabled state.');

const mobile700Match = css.match(/@media \(max-width: 700px\) \{[\s\S]*?\/\* Account mobile polish authority \*\/[\s\S]*?\n\}/);
expect(Boolean(mobile700Match), 'Final CSS must contain the <=700px Account mobile polish authority block.');
if (mobile700Match) {
  const block = mobile700Match[0];
  expect(/\.jl-account-overview article,[\s\S]*?\.jl-account-overview > a[\s\S]*?min-height:\s*72px\s*!important;[\s\S]*?padding:\s*11px\s*!important;/.test(block), 'Account overview cards must be 72px min-height with 11px padding on mobile.');
  expect(/\.jl-account-content\s*\{[\s\S]*?padding-top:\s*12px\s*!important;/.test(block), 'Account content must start 12px below overview cards on mobile.');
  expect(/\.jl-account-profile-bar\s*\{[\s\S]*?margin-bottom:\s*12px\s*!important;[\s\S]*?padding:\s*12px 13px\s*!important;/.test(block), 'Profile bar must use compact mobile margin/padding.');
  expect(/\.jl-account-profile-bar button\s*\{[\s\S]*?min-height:\s*36px\s*!important;/.test(block), 'Sign Out must be compact at 36px minimum height.');
  expect(/\.jl-order-history\s*\{[\s\S]*?margin-top:\s*0\s*!important;[\s\S]*?margin-bottom:\s*0\s*!important;/.test(block), 'Order history must not add standalone section margins inside Account mobile flow.');
  expect(/\.jl-order-history-header\s*\{[\s\S]*?margin-bottom:\s*10px\s*!important;/.test(block), 'Order History header bottom spacing must be compact.');
  expect(/\.jl-order-history-header h2\s*\{[\s\S]*?font-size:\s*24px\s*!important;/.test(block), 'Order History mobile heading must be 24px.');
  expect(/\.jl-order-history-header button\s*\{[\s\S]*?min-height:\s*35px\s*!important;[\s\S]*?border:\s*1px solid/.test(block), 'Refresh must be a compact outlined button.');
}

expect(/@media \(max-width: 420px\) \{[\s\S]*?\/\* Narrow Account header polish \*\/[\s\S]*?\.jl-order-history-header[\s\S]*?flex-direction:\s*row\s*!important;/.test(css), 'Narrow phones must retain a compact horizontal Order History header.');
expect(/@media \(max-width: 299px\)[\s\S]*?\.jl-account-overview[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)\s*!important;/.test(css), 'Existing ultra-narrow one-column fallback must remain.');

if (failures.length) {
  console.error('Account mobile polish verification FAILED:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Account mobile polish verification passed.');
