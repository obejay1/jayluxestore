import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const css = read('app/jayluxe-design-system.css');
const adminCss = read('app/admin/admin-design-system.css');
const home = read('app/page.tsx');
const product = read('app/product/[id]/page.tsx');
const testimonials = read('app/testimonials/page.tsx');
const layout = read('lib/layoutClasses.ts');

const mustContain = (text, pattern, message) => assert.match(text, pattern, message);

mustContain(layout, /PRODUCT_GRID_CLASSES\s*=\s*['"]jl-product-grid-system['"]/, 'Product grids need a dedicated class.');
mustContain(css, /\.jl-product-grid-system[\s\S]*?gap:\s*6px[\s\S]*?padding-inline:\s*12px/, 'Product grid must use 6px gap and 12px side padding.');
mustContain(css, /\.lux-product-card(?:\.jl-product-card-compact)?[\s\S]*?border-radius:\s*10px/, 'Product card radius must be 10px.');
mustContain(css, /\.lux-product-info\s*\{[\s\S]*?padding:\s*8px/, 'Product card body padding must be 8px.');
mustContain(css, /\.lux-product-wishlist\s*\{[\s\S]*?width:\s*24px;[\s\S]*?height:\s*24px/, 'Wishlist button must be 24px square.');
mustContain(css, /\.lux-product-info h3\s*\{[\s\S]*?font-size:\s*13px/, 'Product name must be 13px.');
mustContain(css, /\.lux-product-price\s*\{[\s\S]*?font-size:\s*14px/, 'Product price must be 14px.');
mustContain(css, /\.lux-product-add-btn\s*\{[\s\S]*?padding:\s*7px[\s\S]*?font-size:\s*10px/, 'Product CTA must use 7px padding and 10px type.');

const trustIndex = home.indexOf('className="jj-trust"');
const discoverIndex = home.indexOf('className="jl-discover-more"');
const promotionIndex = home.indexOf('className="jj-home-promotions"');
const categoryIndex = home.indexOf('className="jj-categories');
const newArrivalIndex = home.indexOf('title="New Arrivals"');
const featuredIndex = home.indexOf('title="Featured Products"');
assert.ok(trustIndex > -1 && discoverIndex > trustIndex, 'Discover More must follow trust section.');
assert.ok(promotionIndex > discoverIndex, 'Promotion strip must follow Discover More.');
assert.ok(categoryIndex > promotionIndex, 'Shop Category must follow promotion strip.');
assert.ok(newArrivalIndex > categoryIndex, 'New Arrivals must follow Shop Category.');
assert.ok(featuredIndex > newArrivalIndex, 'Featured Products must follow New Arrivals.');
mustContain(home, /jl-trust-icon jl-trust-icon-delivery/, 'Delivery animation class missing.');
mustContain(home, /jl-trust-icon jl-trust-icon-quality/, 'Quality animation class missing.');
mustContain(home, /jl-trust-icon jl-trust-icon-support/, 'Support animation class missing.');

mustContain(product, /onTouchStart=/, 'Product gallery needs touch swipe handling.');
mustContain(product, /className="jl-mobile-sticky-cart"/, 'Mobile sticky Add to Cart is missing.');
mustContain(product, /jl-recommended-grid/, 'Recommended for You needs a dedicated rail/grid.');
mustContain(product, /View All/, 'Recommended for You needs a View All action.');

mustContain(testimonials, /jl-testimonial-page-card/, 'Testimonials should use the redesigned card class.');
mustContain(css, /\.jl-testimonial-page-grid[\s\S]*?grid-template-columns:\s*repeat\(3/, 'Testimonials need 3 desktop columns.');
mustContain(adminCss, /\.admin-gallery-item\s*>\s*img[\s\S]*?max-height:\s*110px/, 'Admin gallery thumbnails must be bounded.');
mustContain(adminCss, /\.admin-gallery-grid[\s\S]*?minmax\(140px,\s*1fr\)/, 'Admin gallery must use small thumbnail columns.');

console.log('JayLuxe Global UI V3 verification passed.');
