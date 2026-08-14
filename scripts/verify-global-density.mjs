import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const shared = read('app/jayluxe-card-system.css');
const globals = read('app/globals.css');
const luxury = read('app/luxury-theme.css');
const checkout = read('app/checkout/page.module.css');
const reports = read('components/admin/AdminReportsClient.module.css');
const admin = read('app/admin/admin-dashboard-redesign.css');

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

// Shared token contract.
for (const token of ['--jl-space-1: 4px', '--jl-space-2: 8px', '--jl-space-3: 12px', '--jl-space-4: 16px', '--jl-space-5: 24px', '--jl-section-space:', '--jl-control-h: 42px']) {
  expect(globals.includes(token), `Missing compact design token: ${token}`);
}

// Shared compact authority must cover functional and marketing heroes.
expect(shared.includes('JAYLUXE GLOBAL DENSITY AUTHORITY'), 'Missing authoritative global density layer.');
expect(/\.wishlist-hero[\s\S]{0,900}\.jl-account-hero[\s\S]{0,900}\.jl-cart-hero/.test(shared) || shared.includes('.jl-functional-hero-density'), 'Functional hero family is not centrally compacted.');
expect(shared.includes('.jl-services-hero') && shared.includes('.jl-gallery-hero') && shared.includes('.jl-editorial-hero'), 'Marketing/editorial hero family is not centrally compacted.');
expect(shared.includes('max-width: var(--jl-content-max)') || shared.includes('var(--jl-content-max)'), 'Shared content max-width is not used by density authority.');
expect(shared.includes('@media (max-width: 700px)'), 'Mobile density breakpoint missing.');

// Legacy source rules that caused oversized functional pages must be removed/reduced.
expect(!luxury.includes('min-height: 390px !important; padding: 70px 24px !important'), 'Wishlist hero still has legacy 390px/70px sizing.');
expect(!luxury.includes('min-height: 310px !important; padding: 78px 24px !important'), 'Account hero still has legacy 310px/78px sizing.');
expect(!luxury.includes('padding: 84px 0;'), 'Editorial/contact legacy 84px section padding remains.');
expect(!luxury.includes('padding: 84px 24px;'), 'Editorial CTA legacy 84px padding remains.');

// Unique route modules must not retain known oversized spacing.
expect(!checkout.includes('padding: 72px 24px 100px;'), 'Checkout hero still has 72/100px vertical padding.');
expect(!checkout.includes('margin-bottom: 80px;'), 'Checkout module still has 80px mobile gap.');
expect(!reports.includes('min-height: 100vh;'), 'Reports shell still forces a full viewport minimum height.');

// Admin density should explicitly use compact control/card dimensions.
expect(admin.includes('JAYLUXE ADMIN DENSITY AUTHORITY'), 'Admin density authority marker/rules missing.');
expect(admin.includes('min-height: 40px') || admin.includes('height: 40px') || admin.includes('var(--jl-control-h)'), 'Admin compact control height is not defined.');

if (failures.length) {
  console.error('Global density verification failed:');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log('Global density verification passed.');
