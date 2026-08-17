import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const css = read('app/jayluxe-design-system.css');
const card = read('components/ProductCard.tsx');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/\.lux-product-image\s*\{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1\s*;/m.test(css), 'Product image container must use a 1:1 aspect ratio.');
assert(/\.lux-product-img\s*\{[\s\S]*?width:\s*100%\s*;[\s\S]*?height:\s*100%\s*;[\s\S]*?object-fit:\s*(cover|contain)\s*;/m.test(css), 'Product image must fill the fixed container with cover/contain.');
assert(/\.lux-product-info\s*\{[\s\S]*?gap:\s*0\s*;[\s\S]*?padding:\s*8px\s*;/m.test(css), 'Product body must use 8px padding and explicit natural margins.');
assert(/\.lux-product-title-link\s*\{[\s\S]*?margin:\s*0\s*;/m.test(css), 'Title must rely on the 8px body inset instead of artificial spacer margins.');
assert(/\.lux-product-info h3\s*\{[\s\S]*?font-size:\s*13px\s*;[\s\S]*?-webkit-line-clamp:\s*2\s*;[\s\S]*?min-height:/m.test(css), 'Product title must be 13px, clamped to 2 lines, and reserve consistent title height.');
assert(/\.lux-product-pricing\s*\{[\s\S]*?margin-top:\s*(4px|5px|6px)\s*;/m.test(css), 'Price must sit naturally 4–6px below the title.');
assert(/\.lux-product-price\s*\{[\s\S]*?font-size:\s*14px\s*;/m.test(css), 'Product price must remain 14px.');
assert(/\.lux-product-add-btn\s*\{[\s\S]*?margin-top:\s*(6px|7px|8px)\s*;[\s\S]*?padding:\s*7px\s*;[\s\S]*?font-size:\s*10px\s*;/m.test(css), 'CTA must use natural 6–8px spacing, 7px padding, and 10px type.');
assert(!card.includes('lux-product-category'), 'Product card hierarchy should not render category metadata between image and title.');
assert(!card.includes('lux-product-rating-row'), 'Product card hierarchy should not render rating metadata between title and price.');
assert(!card.includes('tw-mt-auto'), 'Product card must not use auto-margin spacers to align pricing.');
assert(card.includes('fill'), 'Responsive product image must use fill inside the controlled container.');
assert(card.includes('tw-line-clamp-2'), 'Product names must remain limited to two lines.');

console.log('Product card alignment verification passed.');
