import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};

const admin = read('app/admin/(protected)/page.tsx');
const navCategories = admin.indexOf('href="#categories"');
const navProducts = admin.indexOf('href="#products"');
const navInventory = admin.indexOf('href="#inventory"');
ok(navCategories >= 0 && navProducts >= 0 && navInventory >= 0, 'Admin nav must contain Categories, Products and Inventory links.');
ok(navCategories < navProducts && navProducts < navInventory, 'Admin nav order must be Categories → Products → Inventory.');

const categorySection = admin.indexOf('id="categories"');
const productSection = admin.indexOf('id="products"');
const inventorySection = admin.indexOf('id="inventory"');
const reviewsSection = admin.indexOf('id="product-reviews"');
const bridalSection = admin.indexOf('id="bridal-packages"');
ok(categorySection >= 0 && productSection >= 0 && inventorySection >= 0 && reviewsSection >= 0 && bridalSection >= 0, 'Required Admin catalog sections must exist.');
ok(
  categorySection < productSection &&
    productSection < inventorySection &&
    inventorySection < reviewsSection &&
    reviewsSection < bridalSection,
  'Admin catalog section order must be Categories → Product editor → Inventory → Product Reviews → Bridal Packages.',
);
for (const id of ['categories', 'products', 'inventory', 'product-reviews']) {
  const matches = admin.match(new RegExp(`id=["']${id}["']`, 'g')) || [];
  ok(matches.length === 1, `Admin section #${id} must appear exactly once.`);
}

const store = read('lib/store.ts');
ok(store.includes('export function getCartItemCount'), 'lib/store.ts must expose one shared cart-count selector.');
ok(store.includes('export function subscribeToCart'), 'lib/store.ts must expose one shared cart subscription.');
ok(store.includes('export function clearCart'), 'lib/store.ts must expose an explicit clearCart() action.');
ok(store.includes("window.addEventListener('storage'"), 'Cart subscription must react to cross-tab localStorage changes.');

ok(exists('lib/useCartCount.ts'), 'Shared useCartCount hook must exist.');
if (exists('lib/useCartCount.ts')) {
  const hook = read('lib/useCartCount.ts');
  ok(hook.includes('useSyncExternalStore'), 'useCartCount must use useSyncExternalStore for hydration-safe shared state.');
  ok(hook.includes('getCartItemCount') && hook.includes('subscribeToCart'), 'useCartCount must use the shared cart selector and subscription.');
}

ok(exists('components/CartCountBadge.tsx'), 'Reusable CartCountBadge component must exist.');
if (exists('components/CartCountBadge.tsx')) {
  const badge = read('components/CartCountBadge.tsx');
  ok(/(?:safeCount|count)\s*<=\s*0/.test(badge) || /(?:safeCount|count)\s*>\s*0/.test(badge), 'CartCountBadge must hide itself when count is zero.');
}

const header = read('components/Header.tsx');
ok(header.includes('useCartCount'), 'Desktop Header must consume the shared cart-count hook.');
ok(header.includes('CartCountBadge'), 'Desktop Header must use the reusable CartCountBadge.');
ok(!header.includes("window.addEventListener('cart'"), 'Desktop Header must not own a duplicate cart subscription.');

const mobile = read('components/MobileBottomNav.tsx');
ok(mobile.includes('useCartCount'), 'Mobile navigation must consume the shared cart-count hook.');
ok(mobile.includes('CartCountBadge'), 'Mobile navigation must use the reusable CartCountBadge.');
ok(!mobile.includes("window.addEventListener('cart'"), 'Mobile navigation must not own a duplicate cart subscription.');

const account = read('app/account/page.tsx');
ok(account.includes('useCartCount'), 'Account cart summary must consume the shared cart-count hook.');

const checkout = read('app/checkout/page.tsx');
ok(checkout.includes('clearCart'), 'Checkout success path must clear persisted cart state through clearCart().');
ok(!/const \[cart, setCart\]/.test(checkout), 'Checkout local React setter must not shadow the persisted store setCart function.');
ok(/clearCart\(\)/.test(checkout), 'Checkout successful order path must invoke clearCart().');

if (failures.length) {
  console.error(`FAIL: ${failures.length} admin/cart regression check(s) failed.`);
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log('PASS: JayLuxe Admin + Cart State V10 regression checks passed.');
