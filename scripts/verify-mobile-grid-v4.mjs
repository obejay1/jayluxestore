import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const css = read('app/jayluxe-design-system.css');
const adminCss = read('app/admin/admin-design-system.css');
const home = read('app/page.tsx');
const card = read('components/ProductCard.tsx');
const admin = read('app/admin/(protected)/page.tsx');
const layoutClasses = read('lib/layoutClasses.ts');

const must = (text, pattern, message) => assert.match(text, pattern, message);
const mustNot = (text, pattern, message) => assert.doesNotMatch(text, pattern, message);

// Homepage product showcases must be real product grids, never horizontal rails.
mustNot(home, /jl-home-product-carousel/, 'Homepage ProductShowcase must not use the legacy horizontal carousel class.');
must(home, /jj-product-grid[^\n]*\$\{PRODUCT_GRID_CLASSES\}[^\n]*jl-home-product-grid/, 'Homepage ProductShowcase must use the shared product-grid token.');
must(layoutClasses, /PRODUCT_GRID_CLASSES\s*=\s*'jl-product-grid-system'/, 'Shared product-grid token must resolve to jl-product-grid-system.');
must(css, /\.jl-product-grid-system\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?gap:\s*6px;[\s\S]*?padding-inline:\s*12px;/m, 'Mobile/default product grid must be a true two-column minmax grid with 6px gap and 12px side padding.');
must(css, /\.jl-product-grid-system\s*>\s*\*\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;/m, 'Every direct product-grid item must be width:100% and min-width:0.');
must(css, /\.lux-product-card(?:\.jl-product-card-compact)?[^\{]*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?height:\s*auto;/m, 'Product cards must fill their grid track without artificial full-height stretching.');
mustNot(card, /tw-h-full/, 'ProductCard must not force h-full and create blank CTA space.');
must(card, /tw-w-full/, 'ProductCard must explicitly fill the grid track width.');

must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jl-recommended-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?overflow:\s*visible;/m, 'Recommended ProductCard collections must also use a two-column mobile grid.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jj-home \.jj-category-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[\s\S]*?gap:\s*6px;/m, 'Homepage categories must use three equal mobile columns.');

// Fixed media contract.
must(css, /\.lux-product-image\s*\{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1;[\s\S]*?width:\s*100%;[\s\S]*?overflow:\s*hidden;/m, 'Product image box must remain a fixed 1:1 container.');
must(css, /\.lux-product-img\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*(cover|contain);/m, 'Product image must fill the fixed media box using cover or contain.');

// Homepage density and section typography.
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jj-home\s*>\s*section:not\(\.jj-hero\):not\(\.jj-trust\)\s*\{[\s\S]*?padding-top:\s*(10px|11px|12px|13px);[\s\S]*?padding-bottom:\s*(10px|11px|12px|13px);/m, 'Mobile homepage sections must use compact vertical padding.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jj-section-header h2\s*\{[\s\S]*?font-size:\s*(20px|21px|22px|23px|24px|25px|26px|clamp\([^;]+\));/m, 'Mobile homepage section headings must follow the compact typography scale.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jl-discover-card\s*\{[\s\S]*?min-height:\s*(80px|82px|84px|86px|88px|90px);[\s\S]*?padding:\s*(6px|7px|8px|9px)[^;]*;/m, 'Discover More cards must be shallower and compact on mobile.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jj-home-promotions \.jl-home-promo-feature[\s\S]*?min-height:\s*(82px|84px|86px|88px|90px|92px);/m, 'Promotion cards must be compact on mobile.');
must(css, /\.jl-home-product-showcase\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?height:\s*auto;/m, 'Homepage product showcases must not reserve artificial vertical height.');

// Curated by JayLuxe remains left aligned.
must(css, /\.jl-home-product-showcase \.jj-section-header\s*\{[\s\S]*?text-align:\s*left;/m, 'Homepage product showcase headings must align to the left content boundary.');

// Admin tables/forms/uploads stay within the page on mobile.
must(admin, /All Transformations[\s\S]*?admin-table-scroll[\s\S]*?<table className="table">/m, 'Transformations table must be wrapped in an internal horizontal-scroll container.');
must(admin, /All Testimonials[\s\S]*?admin-table-scroll[\s\S]*?<table className="table">/m, 'Testimonials table must be wrapped in an internal horizontal-scroll container.');
must(admin, /id="transformations-form"[^>]*className="table-card admin-compact-form"|className="table-card admin-compact-form" id="transformations-form"/m, 'Transformation form must use the compact admin form class.');
must(admin, /id="testimonials-form"[^>]*className="table-card admin-compact-form"|className="table-card admin-compact-form" id="testimonials-form"/m, 'Testimonial form must use the compact admin form class.');
must(adminCss, /\.admin-compact-form \.admin-form-grid\s*\{[\s\S]*?gap:\s*(8px|9px|10px|11px|12px);/m, 'Compact admin forms must use an 8–12px field gap.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.admin-image-upload-field__dropzone\s*\{[\s\S]*?min-height:\s*(68px|70px|72px|74px|76px|78px|80px);/m, 'Mobile upload dropzones must be compact.');

// Global repeated-card grid items should not size their tracks from content.
must(css, /:where\([\s\S]*?\.jj-category-grid[\s\S]*?\.admin-gallery-grid[\s\S]*?\)\s*>\s*\*\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;/m, 'Global repeated grid items must enforce width:100% and min-width:0.');

console.log('Mobile grid/UI V4 verification passed.');
