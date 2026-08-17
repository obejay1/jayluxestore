import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const card = read('components/ProductCard.tsx');
const css = read('app/jayluxe-design-system.css');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/p\.category/.test(card), 'ProductCard must read category dynamically from p.category.');
assert(/\{\s*p\.category\?\.trim\(\)\s*&&[\s\S]*?className="lux-product-category"[\s\S]*?\{p\.category\.trim\(\)\}/m.test(card), 'Category row must render only when p.category is non-empty and must display the dynamic category value.');
assert(!/lux-product-category[^\n]*>\s*[A-Za-z][^<{]*</m.test(card), 'ProductCard must not hard-code a category label.');
assert(/\.lux-product-category\s*\{[\s\S]*?min-width:\s*0\s*;[\s\S]*?overflow:\s*hidden\s*;[\s\S]*?text-overflow:\s*ellipsis\s*;[\s\S]*?white-space:\s*nowrap\s*;/m.test(css), 'Category must be single-line, ellipsized, and width-safe.');
assert(/\.lux-product-category\s*\{[\s\S]*?font-weight:\s*(400|450|500)\s*;/m.test(css), 'Category must use secondary 400–500 font weight.');
assert(/\.lux-product-category\s*\{[\s\S]*?min-height:\s*0\s*;[\s\S]*?letter-spacing:\s*0\s*;[\s\S]*?text-transform:\s*none\s*;/m.test(css), 'Category must reset legacy reserved height, letter spacing, and uppercase transforms.');
assert(/@media\s*\(max-width:\s*767px\)[\s\S]*?\.lux-product-category\s*\{[\s\S]*?display:\s*block\s*;[\s\S]*?font-size:\s*(10px|11px)\s*;/m.test(css), 'Mobile category must remain visible at 10–11px.');
assert(!/@media\s*\(max-width:\s*767px\)[\s\S]*?\.lux-product-category\s*,[\s\S]*?display:\s*none\s*;/m.test(css), 'Mobile rules must not hide product categories.');
assert(/\.lux-product-info h3\s*\{[\s\S]*?font-size:\s*13px\s*;[\s\S]*?-webkit-line-clamp:\s*2\s*;/m.test(css), 'Product name must remain 13px and clamped to two lines.');
assert(/\.lux-product-price\s*\{[\s\S]*?font-size:\s*14px\s*;/m.test(css), 'Price must remain 14px.');
assert(/\.lux-product-add-btn\s*\{[\s\S]*?padding:\s*7px\s*;[\s\S]*?font-size:\s*10px\s*;/m.test(css), 'CTA must remain 7px padding and 10px type.');
assert(/\.lux-product-image\s*\{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1\s*;/m.test(css), 'Fixed 1:1 product image container must remain intact.');

console.log('Product card category verification passed.');
