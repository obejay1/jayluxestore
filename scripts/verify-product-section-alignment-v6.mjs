import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const layout = read('lib/layoutClasses.ts');
const home = read('app/page.tsx');
const shop = read('app/shop/page.tsx');
const product = read('app/product/[id]/page.tsx');
const promotions = read('app/promotions/page.tsx');
const wishlist = read('app/wishlist/page.tsx');
const css = read('app/jayluxe-design-system.css');
const v6 = css.slice(css.lastIndexOf('PRODUCT SECTION ALIGNMENT V6'));

const must = (text, pattern, message) => assert.match(text, pattern, message);
const mustNot = (text, pattern, message) => assert.doesNotMatch(text, pattern, message);

must(layout, /PRODUCT_SECTION_SHELL_CLASS\s*=\s*'jl-product-section-shell'/, 'Shared product section shell must be exported.');
must(home, /className="jj-products jj-product-showcase jl-home-product-showcase jl-home-tight-section \$\{PRODUCT_SECTION_SHELL_CLASS\}"|className=\{`jj-products jj-product-showcase jl-home-product-showcase jl-home-tight-section \$\{PRODUCT_SECTION_SHELL_CLASS\}`\}/, 'Homepage ProductShowcase must use the shared section shell.');
must(home, /jj-categories[^\n]*PRODUCT_SECTION_SHELL_CLASS|PRODUCT_SECTION_SHELL_CLASS[^\n]*jj-categories/, 'Shop by Category must use the shared section shell.');
must(home, /jj-home-promotions[^\n]*PRODUCT_SECTION_SHELL_CLASS|PRODUCT_SECTION_SHELL_CLASS[^\n]*jj-home-promotions/, 'Homepage Popular Picks/promotions section must use the shared section shell.');
must(shop, /jl-shop-section[^\n]*PRODUCT_SECTION_SHELL_CLASS|PRODUCT_SECTION_SHELL_CLASS[^\n]*jl-shop-section/, 'Shop/search/category result section must use the shared section shell.');
must(product, /jl-related-products[^\n]*PRODUCT_SECTION_SHELL_CLASS|PRODUCT_SECTION_SHELL_CLASS[^\n]*jl-related-products/, 'Related/Recommended ProductRail must use the shared section shell.');
must(promotions, /jl-promo-products[^\n]*PRODUCT_SECTION_SHELL_CLASS|PRODUCT_SECTION_SHELL_CLASS[^\n]*jl-promo-products/, 'Promotion product section must use the shared section shell.');
must(wishlist, /wishlist-content[^\n]*PRODUCT_SECTION_SHELL_CLASS|PRODUCT_SECTION_SHELL_CLASS[^\n]*wishlist-content/, 'Wishlist product content must use the shared section shell.');

must(v6, /\.jl-product-section-shell\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*1280px;[\s\S]*?margin-inline:\s*auto;[\s\S]*?padding-inline:\s*12px;/m, 'Section shell must provide the 1280px centered container with 12px mobile padding.');
must(v6, /@media\s*\(min-width:\s*768px\)[\s\S]*?\.jl-product-section-shell(?:\s*,[\s\S]*?)?\s*\{\s*padding-inline:\s*24px;/m, 'Section shell must use 24px tablet padding.');
must(v6, /@media\s*\(min-width:\s*1100px\)[\s\S]*?\.jl-product-section-shell(?:\s*,[\s\S]*?)?\s*\{\s*padding-inline:\s*32px;/m, 'Section shell must use 32px desktop padding.');
must(v6, /\.jl-product-section-shell\s+:where\(\.jl-product-grid-system,\s*\.jj-category-grid\)\s*\{[\s\S]*?padding-inline:\s*0;/m, 'Product/category grids inside the shell must not double their horizontal padding.');
must(v6, /\.jl-product-section-shell\s+:where\([^}]*\.jl-related-head[^}]*\)\s*\{[\s\S]*?padding-inline:\s*0;[\s\S]*?text-align:\s*left;/m, 'Section headings must align to the shell left boundary.');
must(v6, /\.jl-product-section-shell\.jl-related-products\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*1280px;/m, 'Related products must neutralize its older independent width and follow the shared shell.');

must(v6, /\.lux-product-info h3\s*\{[\s\S]*?min-height:\s*(?:2[0-9](?:\.\d+)?px|30px);[\s\S]*?font-size:\s*13px;/m, 'Product title reserve must be tightened without increasing the 13px name size.');
must(css, /\.lux-product-category\s*\{[\s\S]*?font-size:\s*11px;/m, 'Desktop category must not increase beyond 11px.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.lux-product-category\s*\{[\s\S]*?font-size:\s*10px;/m, 'Mobile category must remain 10px.');
must(css, /\.lux-product-price\s*\{[\s\S]*?font-size:\s*14px;/m, 'Product price must remain 14px.');
must(v6, /\.lux-product-add-btn\s*\{[\s\S]*?min-height:\s*(?:2[6-9]px|30px);[\s\S]*?margin-top:\s*(?:5px|6px);[\s\S]*?padding:\s*7px;[\s\S]*?font-size:\s*10px;/m, 'CTA must stay compact without increasing padding/type.');
mustNot(v6, /\.lux-product-card(?:\.jl-product-card-compact)?[^\{]*\{[\s\S]*?height:\s*(?!auto)[0-9]/m, 'Product card must not gain a fixed overall height.');

console.log('Product section alignment V6 verification passed.');
