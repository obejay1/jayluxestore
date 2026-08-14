import fs from 'node:fs';

const source = fs.readFileSync(new URL('../lib/adminImageUpload.ts', import.meta.url), 'utf8');

if (/ReturnType<\s*typeof\s+window\.setTimeout\s*>/.test(source)) {
  throw new Error('adminImageUpload.ts still derives timeoutId from merged Window/global setTimeout types; use an explicit browser timer id type instead.');
}

if (!/let\s+timeoutId:\s*number\s*\|\s*null\s*=\s*null/.test(source)) {
  throw new Error('adminImageUpload.ts must type the window.setTimeout handle as number | null.');
}

console.log('Catalog image browser timer typing verification passed.');
