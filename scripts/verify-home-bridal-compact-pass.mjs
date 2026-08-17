import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const css = read('app/jayluxe-design-system.css');
const home = read('app/page.tsx');
const bridal = read('app/bridal/page.tsx');

const must = (text, pattern, message) => assert.match(text, pattern, message);
const mustNot = (text, pattern, message) => assert.doesNotMatch(text, pattern, message);

// Homepage architecture and density.
const heroIndex = home.indexOf('className="jj-hero"');
const trustIndex = home.indexOf('className="jj-trust"');
const discoverIndex = home.indexOf('className="jl-discover-more');
const promoIndex = home.indexOf('jj-home-promotions');
const categoryIndex = home.indexOf('jj-categories');
const newArrivalIndex = home.indexOf('title="New Arrivals"');
const featuredIndex = home.indexOf('title="Featured Products"');
assert.ok(heroIndex > -1 && trustIndex > heroIndex, 'Hero must remain first, followed by Fast Delivery/trust.');
assert.ok(discoverIndex > trustIndex && promoIndex > discoverIndex && categoryIndex > promoIndex, 'Homepage order must remain Hero → Trust → Discover → Promotion → Category.');
assert.ok(newArrivalIndex > categoryIndex && featuredIndex > newArrivalIndex, 'New Arrivals and Featured Products must follow Category in order.');

must(home, /className="jj-section-header jl-category-heading"/, 'Shop by Category header must use the left-aligned dedicated class.');
mustNot(home, /className="jj-section-header jj-section-header-centered"/, 'Shop by Category must no longer use the centered header class.');

must(css, /\.jj-home\s*>\s*section:not\(\.jj-hero\):not\(\.jj-trust\)\s*\{[\s\S]*?padding-top:\s*(14px|15px|16px|17px|18px);[\s\S]*?padding-bottom:\s*(14px|15px|16px|17px|18px);/, 'Homepage sections must use compact 14–18px vertical padding.');
must(css, /\.jl-home-tight-section[\s\S]*?padding-top:\s*(10px|11px|12px|13px|14px);[\s\S]*?padding-bottom:\s*(10px|11px|12px|13px|14px);/, 'Priority homepage sections need a tighter 10–14px rhythm.');
must(css, /\.jl-category-heading\s*\{[\s\S]*?text-align:\s*left;[\s\S]*?justify-content:\s*flex-start;/, 'Curated Departments header must be left aligned.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jl-category-heading h2\s*\{[\s\S]*?font-size:\s*(18px|19px|20px);/, 'Shop by Category mobile heading must be 18–20px.');
must(css, /\.jj-hero\s*\{[\s\S]*?min-height:\s*clamp\((420px|430px|440px),[\s\S]*?(500px|510px|520px)\);/, 'Desktop hero must be compact and bounded.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jj-hero\s*\{[\s\S]*?min-height:\s*clamp\((350px|360px|370px|380px),[\s\S]*?(400px|410px|420px)\);/, 'Mobile hero must be compact and bounded.');

// Bridal 3+1 benefit layout.
must(bridal, /className="jl-bridal-delivery-note"/, 'Fourth bridal benefit must be the compact delivery/support row.');
must(css, /\.jl-bridal-trust\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/, 'Bridal primary benefits must use three equal columns.');
must(css, /\.jl-bridal-delivery-note\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1;/, 'Bridal delivery note must span the full benefit grid.');

// Exact mobile bridal package contract.
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jl-bridal-page \.jl-bridal-packages\s*\{[\s\S]*?padding-inline:\s*12px;/, 'Bridal packages mobile side padding must be 12px.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jl-bridal-page \.jl-bridal-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?gap:\s*6px;/, 'Bridal packages must use two mobile columns with a 6px gap.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jl-bridal-page \.jl-bridal-card\s*\{[\s\S]*?border-radius:\s*10px;/, 'Bridal mobile card radius must be 10px.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jl-bridal-page \.jl-bridal-card-body\s*\{[\s\S]*?padding:\s*8px;/, 'Bridal mobile card body padding must be 8px.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jl-bridal-page \.jl-bridal-card h3\s*\{[\s\S]*?font-size:\s*13px;/, 'Bridal mobile package name must be 13px.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jl-bridal-page \.jl-bridal-card-price strong\s*\{[\s\S]*?font-size:\s*14px;/, 'Bridal mobile price must be 14px.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jl-bridal-page \.jl-bridal-book\s*\{[\s\S]*?padding:\s*7px;[\s\S]*?font-size:\s*10px;/, 'Bridal mobile CTA must use 7px padding and 10px type.');
must(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.jl-bridal-page \.jl-bridal-card-image\s*\{[\s\S]*?aspect-ratio:\s*(4\s*\/\s*3|1\s*\/\s*1);/, 'Bridal mobile image area must use a controlled compact aspect ratio.');

console.log('Homepage + bridal compact pass verification passed.');
