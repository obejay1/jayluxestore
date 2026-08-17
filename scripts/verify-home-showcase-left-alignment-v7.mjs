import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'app/jayluxe-design-system.css'), 'utf8');
const page = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function expect(condition, message) {
  if (!condition) fail(message);
}

const headerBlocks = [...css.matchAll(/\.jl-home-product-showcase\s+\.jj-section-header\s*\{([^}]*)\}/g)].map((m) => m[1]);
expect(headerBlocks.length > 0, 'Missing .jl-home-product-showcase .jj-section-header rule');
const hasTargetHeader = headerBlocks.some((block) =>
  /flex-direction\s*:\s*column\s*;/.test(block) &&
  /align-items\s*:\s*flex-start\s*;/.test(block) &&
  /justify-content\s*:\s*flex-start\s*;/.test(block) &&
  /text-align\s*:\s*left\s*;/.test(block) &&
  /gap\s*:\s*4px\s*;/.test(block)
);
expect(hasTargetHeader, 'Showcase header must stack vertically and align all content left with a compact 4px gap');
expect(!headerBlocks.some((block) => /align-items\s*:\s*flex-end\s*;/.test(block)), 'Showcase header must not align children to the right');
expect(!headerBlocks.some((block) => /justify-content\s*:\s*space-between\s*;/.test(block)), 'Showcase header must not push View All to the right');

const linkBlocks = [...css.matchAll(/\.jl-home-product-showcase\s+\.jj-section-header\s*>\s*a\s*\{([^}]*)\}/g)].map((m) => m[1]);
expect(linkBlocks.length > 0, 'Missing direct View All link rule');
expect(linkBlocks.some((block) => /align-self\s*:\s*flex-start\s*;/.test(block)), 'View All must align to the left beneath the heading');

expect(/<ProductShowcase[\s\S]*?eyebrow="Just Arrived"[\s\S]*?title="New Arrivals"/.test(page), 'New Arrivals must still use ProductShowcase');
expect(/<ProductShowcase[\s\S]*?eyebrow="Curated by JayLuxe"[\s\S]*?title="Featured Products"/.test(page), 'Featured Products must still use ProductShowcase');

if (!process.exitCode) {
  console.log('Homepage showcase left-alignment V7 verification passed.');
}
