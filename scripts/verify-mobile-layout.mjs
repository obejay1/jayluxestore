import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const luxury = read('app/luxury-theme.css');
const cards = read('app/jayluxe-card-system.css');
const mobile = read('app/jayluxe-mobile.css');
const home = read('app/page.tsx');
const account = read('app/account/page.tsx');
const layout = read('lib/layoutClasses.ts');
const shop = read('app/shop/page.tsx');
const services = read('app/services/page.tsx');
const refactor = read('app/jayluxe-refactor.css');

const smallAccountBlock = luxury.match(/@media\s*\(max-width:\s*600px\)[\s\S]*?\.jl-account-overview\s*\{([\s\S]*?)\}/);
assert(Boolean(smallAccountBlock), 'Missing <=600px account overview media rule.');
assert(
  smallAccountBlock?.[1]?.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'),
  'Account summary must remain a 2-column grid at <=600px.',
);

assert(
  /@media\s*\(max-width:\s*299px\)[\s\S]*?\.jl-account-overview\s*\{[\s\S]*?grid-template-columns:\s*1fr/.test(luxury),
  'Account summary needs a graceful one-column fallback only below 300px.',
);

assert(
  /\.jl-responsive-card-grid[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(cards),
  'Shared responsive card grid must default to two columns on mobile.',
);
assert(
  /\.jl-responsive-gallery-grid[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(cards),
  'Gallery grid must default to two columns on mobile.',
);
assert(
  !/margin-(?:top|bottom|left|right):\s*-\d+/.test(cards),
  'Compact card system must not use arbitrary negative margins.',
);

assert(
  home.includes("`/shop?category=${encodeURIComponent(category.name)}`"),
  'Homepage product category links must preserve the category query parameter.',
);
assert(
  home.includes("`/services?category=${encodeURIComponent(category.name)}`"),
  'Homepage service category links must preserve the service category query parameter.',
);
assert(
  (home.match(/<ProductShowcase/g) || []).length >= 2,
  'Featured Products and New Arrivals must share ProductShowcase/ProductCard rendering.',
);
assert(home.includes('jl-home-category-section'), 'Homepage category section needs the compact semantic class.');
assert(home.includes('jl-home-help-section'), 'Homepage help/booking section needs the compact semantic class.');
assert(home.includes('jl-home-product-showcase'), 'Product showcase needs the shared compact semantic class.');

assert(
  /\.jj-category-card[\s\S]*?min-height:\s*0\s*!important/.test(mobile) ||
    /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jj-category-card[\s\S]*?min-height:\s*0/.test(cards),
  'Mobile category cards must not retain a fixed/minimum desktop height.',
);

assert(
  account.includes('<section className="jl-account-overview">'),
  'Customer account overview markup must remain present.',
);
assert(
  layout.includes("RESPONSIVE_CARD_GRID_CLASSES = 'jl-responsive-card-grid'"),
  'Existing shared responsive grid class must remain the source of truth.',
);
assert(
  shop.includes("params.get('category')?.trim() || 'All'") &&
    shop.includes("normalize(product.category) !== category"),
  'Shop must continue reading the category query and filtering products by category.',
);
assert(
  services.includes("new URLSearchParams(window.location.search).get('category')") &&
    services.includes("category === selectedCategory"),
  'Services must continue reading the category query and filtering services.',
);
assert(
  !/@media\s*\(max-width:\s*420px\)[\s\S]*?\.jj-category-grid,[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(refactor),
  'Legacy <=420px CSS must not force category grids back to one column.',
);

if (failures.length) {
  console.error(`Mobile layout verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Mobile layout verification passed.');
