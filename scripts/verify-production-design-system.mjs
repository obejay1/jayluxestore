import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const layout = read('app/layout.tsx');
const cssPath = 'app/jayluxe-design-system.css';
assert(fs.existsSync(cssPath), 'shared consolidated design system stylesheet is missing');
const css = read(cssPath);

assert(layout.includes("import './jayluxe-design-system.css';"), 'layout must import consolidated design system stylesheet');
const imports = [...layout.matchAll(/import ['"]\.\/(.+?\.css)['"];?/g)].map((m) => m[1]);
assert(imports.at(-1) === 'jayluxe-design-system.css', 'consolidated design system must be the final global CSS import');

for (const [name, value] of [
  ['--jl-space-1', '4px'], ['--jl-space-2', '8px'], ['--jl-space-3', '12px'],
  ['--jl-space-4', '16px'], ['--jl-space-5', '20px'], ['--jl-space-6', '24px'],
  ['--jl-space-8', '32px'], ['--jl-space-10', '40px'],
]) {
  assert(css.includes(`${name}: ${value}`) || css.includes(`${name}:${value}`), `missing spacing token ${name}: ${value}`);
}

assert(css.includes('--jl-container: 1280px') || css.includes('--jl-container:1280px'), 'shared container must target 1280px');
assert(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'mobile shared grids must use two columns');
assert(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'tablet shared grids must use three columns');
assert(css.includes('grid-template-columns: repeat(4, minmax(0, 1fr))'), 'desktop shared grids must use four columns');
assert(css.includes('100dvh'), 'design system must include dynamic viewport handling');
assert(css.includes('overflow-x: clip') || css.includes('overflow-x: hidden'), 'design system must prevent horizontal page overflow');
assert(css.includes('env(safe-area-inset-bottom)'), 'design system must account for iPhone safe-area bottom inset');
assert(css.includes('min-width: 0'), 'design system must include min-width zero overflow protection');
assert(css.includes('max-width: 100%'), 'design system must constrain media/content width');
assert(css.includes('.admin-image-upload-field'), 'design system must style reusable admin image upload field');
assert(css.includes('.lux-product-card'), 'design system must normalize product cards');
assert(css.includes('.checkout-page-pro') || css.includes('.jl-checkout-page'), 'design system must normalize checkout spacing');
assert(css.includes('.admin-dashboard'), 'design system must normalize admin dashboard density');
assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'design system must respect reduced motion');

console.log('Production design system verification passed.');
