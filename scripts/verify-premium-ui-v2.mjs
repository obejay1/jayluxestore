import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const layout = read('app/layout.tsx');
const home = read('app/page.tsx');
const css = fs.existsSync('app/jayluxe-design-system.css') ? read('app/jayluxe-design-system.css') : '';
const admin = read('app/admin/(protected)/page.tsx');
const upload = read('components/admin/AdminImageUploadField.tsx');
const menu = read('components/HamburgerMenu.jsx');
const menuCss = read('components/HamburgerMenu.module.css');

assert(layout.includes("import './jayluxe-design-system.css';"), 'Root layout must import the consolidated design system.');
for (const legacy of ['luxury-theme.css','jayluxe-redesign.css','jayluxe-refactor.css','jayluxe-mobile.css','jayluxe-mobile-polish.css','jayluxe-consistency-fixes.css','jayluxe-production-stability.css','jayluxe-feature-update.css','jayluxe-card-system.css','jayluxe-production-system.css']) {
  assert(!layout.includes(`import './${legacy}';`), `Root layout still imports legacy layer ${legacy}.`);
}

for (const token of ['--jl-space-1: 4px','--jl-space-2: 8px','--jl-space-3: 12px','--jl-space-4: 16px','--jl-space-5: 20px','--jl-space-6: 24px','--jl-space-8: 32px','--jl-space-10: 40px','--jl-container: 1280px']) {
  assert(css.includes(token), `Missing design token ${token}.`);
}
assert(css.includes('.jl-home-product-grid'), 'Missing homepage product-grid rules.');
assert(css.includes('scroll-snap-type: x mandatory'), 'Mobile carousels must use scroll snapping.');
assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced-motion support is required.');
assert(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'Mobile two-column grid rule is required.');
assert(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'Tablet three-column grid rule is required.');
assert(css.includes('grid-template-columns: repeat(4, minmax(0, 1fr))'), 'Desktop four-column grid rule is required.');
assert(css.includes('min-height: 390px') || css.includes('min-height: clamp(390px'), 'Mobile hero minimum target must be present.');

assert(home.includes('className={`jj-product-grid ${PRODUCT_GRID_CLASSES} jl-home-product-grid`}'), 'Homepage product showcases need the equal-width product-grid hook.');
assert(home.includes('className="jj-testimonials-grid jl-home-testimonial-carousel"'), 'Homepage testimonials need carousel hook.');
assert(home.includes('className="jj-bridal-compare-cta"'), 'Bridal compare area must use editorial CTA.');
assert(!home.includes('WhatsApp: {OFFICIAL_WHATSAPP_DISPLAY}'), 'Homepage must not show the duplicate WhatsApp contact card.');
assert(home.includes('initial={{ opacity: 0, y: 8 }}'), 'Homepage motion should use subtle 8px translation.');
assert(home.includes('.slice(0, 4)'), 'Bridal package feature list must be compacted to four visible features.');

assert(upload.includes("data-shape={shape}"), 'Upload preview shape semantics must remain data-driven.');
assert(upload.includes("shape?: 'wide' | 'landscape' | 'square' | 'portrait' | 'circle'"), 'Upload field must support 16:9 wide previews.');
assert(upload.includes('onDrop={handleDrop}'), 'Upload field must support drag-and-drop.');
assert(css.includes(".admin-image-upload-field[data-shape='portrait']"), 'Portrait upload preview rule missing.');
assert(css.includes(".admin-image-upload-field[data-shape='landscape']"), 'Landscape upload preview rule missing.');
assert(css.includes(".admin-image-upload-field[data-shape='wide']"), '16:9 upload preview rule missing.');
assert(css.includes('.admin-image-upload-field__dropzone'), 'Horizontal upload dropzone rules missing.');

assert(admin.includes('id="category-image-upload"') && admin.includes('shape="landscape"'), 'Category upload should be landscape/4:3 oriented.');
assert(admin.includes('id="bridal-gallery-image-upload"') && admin.includes('shape="wide"'), 'Bridal gallery upload should use a 16:9 preview.');
assert(admin.includes('id="testimonial-image-upload"') && admin.includes('shape="landscape"'), 'Testimonial upload should use a 4:3 preview.');
assert(admin.includes('shape={form.type === \'service\' ? \'landscape\' : \'portrait\'}'), 'Product/service main upload should choose content-specific aspect ratio.');

assert(menu.includes("event.key === 'Escape'"), 'Mobile menu must close on Escape.');
assert(menu.includes('wrapperRef'), 'Mobile menu must support outside-click dismissal.');
assert(menuCss.includes('translateY(-6px) scale(0.98)'), 'Mobile menu animation must use subtle premium motion.');
assert(menuCss.includes('max-height: min(70dvh, 560px)'), 'Mobile menu must use dynamic viewport height.');

console.log('JayLuxe Premium UI V2 verification passed.');
