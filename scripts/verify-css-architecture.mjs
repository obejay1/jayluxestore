import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appDir = path.join(root, 'app');
const designDir = path.join(appDir, 'styles', 'design-system');
const legacyRootCss = [
  'luxury-theme.css',
  'jayluxe-redesign.css',
  'jayluxe-refactor.css',
  'jayluxe-mobile.css',
  'jayluxe-mobile-polish.css',
  'jayluxe-consistency-fixes.css',
  'jayluxe-production-stability.css',
  'jayluxe-feature-update.css',
  'jayluxe-card-system.css',
  'jayluxe-production-system.css',
  'jayluxe-phase7-luxury-brand.css',
  'jayluxe-phase6-mobile-ux.css',
  'jayluxe-phase8-home-conversion.css',
  'jayluxe-phase15-home-luxury-compact.css',
  'jayluxe-phase17-feature-strip.css',
  'jayluxe-phase37-5-polish.css',
  'jayluxe-ui-compact-polish.css',
  'jayluxe-installment-ui-phase11.css',
  'jayluxe-installment-plan-cards-phase13.css',
];

const textFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|css|mjs|js)$/.test(entry.name)) textFiles.push(full);
  }
}
walk(appDir);

const directLegacyImports = [];
for (const file of textFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const legacy of legacyRootCss) {
    if (new RegExp(`(?:['\"./])${legacy.replaceAll('.', '\\.')}(?:['\"])`).test(text)) {
      if (path.basename(file) !== legacy) directLegacyImports.push({ file, legacy });
    }
  }
}

const sourceFiles = fs.readdirSync(designDir).filter((name) => name.endsWith('.css')).sort();
const invalidNames = sourceFiles.filter((name) => !/^\d{2}-/.test(name));

if (directLegacyImports.length) {
  console.error('CSS architecture check failed: legacy root CSS is directly imported.');
  for (const item of directLegacyImports) console.error(`- ${path.relative(root, item.file)} -> ${item.legacy}`);
  process.exit(1);
}

if (invalidNames.length) {
  console.error('CSS architecture check failed: design-system modules must use numeric ordering.');
  for (const file of invalidNames) console.error(`- ${file}`);
  process.exit(1);
}

const layout = fs.readFileSync(path.join(appDir, 'layout.tsx'), 'utf8');
if (!layout.includes("import './globals.css';") || !layout.includes("import './jayluxe-design-system.css';")) {
  console.error('CSS architecture check failed: app/layout.tsx must load globals then the generated design-system bundle.');
  process.exit(1);
}

console.log(`CSS architecture OK: ${sourceFiles.length} ordered design-system modules, one global bundle entry, no direct legacy root imports.`);
