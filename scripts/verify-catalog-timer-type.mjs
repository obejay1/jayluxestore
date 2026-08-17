import fs from 'node:fs';

const source = fs.readFileSync(new URL('../lib/imageUpload.ts', import.meta.url), 'utf8');

if (!source.includes('XMLHttpRequest')) {
  throw new Error('imageUpload.ts must use XMLHttpRequest for browser upload progress and timeout support.');
}

if (!/xhr\.timeout\s*=/.test(source)) {
  throw new Error('imageUpload.ts must configure a finite XHR timeout.');
}

if (!source.includes('xhr.ontimeout')) {
  throw new Error('imageUpload.ts must surface upload timeout errors.');
}

console.log('Cloudinary browser timeout verification passed.');
