import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const globals = read('app/globals.css');
const cardSystem = read('app/jayluxe-card-system.css');
const layout = read('app/layout.tsx');
const uploader = read('lib/catalogImages.ts');
const firebaseClient = read('lib/firebase.ts');
const adminPage = read('app/admin/(protected)/page.tsx');
const rules = read('storage.rules');
const adminLoginCss = read('app/admin/login/page.module.css');
const adminManagementCss = read('app/admin/admin-management.css');
const mobileVerifier = fs.existsSync(path.join(root, 'scripts/verify-mobile-layout.mjs'));

expect(globals.includes('--jl-space-1:'), 'Missing compact spacing token --jl-space-1');
expect(globals.includes('--jl-section-space:'), 'Missing shared section spacing token');
expect(globals.includes('--jl-control-h:'), 'Missing compact control-height token');
expect(globals.includes('--jl-content-max:'), 'Missing shared content-width token');
expect(cardSystem.includes('PRODUCTION COMPACT DESIGN SYSTEM'), 'Missing production compact design-system layer');
expect(cardSystem.includes('var(--jl-card-pad)'), 'Shared card system is not consuming compact card padding token');
expect(cardSystem.includes('var(--jl-section-space)'), 'Shared card system is not consuming compact section spacing token');

const imports = [...layout.matchAll(/import ['"]\.\/(.+?\.css)['"];?/g)].map((m) => m[1]);
expect(imports.at(-1) === 'jayluxe-card-system.css', 'jayluxe-card-system.css must be the final global CSS import for predictable shared-system precedence');

expect(firebaseClient.includes('normalizeStorageBucket'), 'Firebase client must normalize a gs:// bucket value instead of hard-coding a bucket');
expect(firebaseClient.includes('gs:\\/\\/'), 'Firebase client must strip a gs:// prefix from the configured bucket');
expect(uploader.includes('uploadBytesResumable'), 'Catalog uploader must use uploadBytesResumable');
expect(uploader.includes('getDownloadURL'), 'Catalog uploader must use getDownloadURL');
expect(/maxUploadRetryTime\s*=/.test(uploader), 'Catalog uploader must align Firebase maxUploadRetryTime below the outer timeout');
expect(uploader.includes('unsubscribe'), 'Catalog uploader must unsubscribe state listeners when settled');
expect(uploader.includes('task.cancel()'), 'Catalog uploader must cancel a stalled upload task');
expect(uploader.includes('storage/unauthorized'), 'Catalog uploader must map storage/unauthorized');
expect(uploader.includes('storage/quota-exceeded'), 'Catalog uploader must map storage/quota-exceeded');
expect(uploader.includes('storage/bucket-not-found'), 'Catalog uploader must map storage/bucket-not-found');
expect(uploader.includes('storage/retry-limit-exceeded'), 'Catalog uploader must map storage/retry-limit-exceeded');
expect(uploader.includes('Firebase Storage bucket:'), 'Catalog uploader must include non-secret bucket context in console diagnostics');

expect(adminPage.includes('admin-image-preview-actions'), 'Admin image UX needs compact preview replace/remove controls');
expect(adminPage.includes('Remove image'), 'Admin image UX needs an explicit Remove image action');
expect(adminPage.includes('Replace image'), 'Admin image UX needs an explicit Replace image label/action');
expect(adminPage.includes('finally {') && adminPage.includes('setIsUploading(false)'), 'Admin upload handlers must always reset uploading state in finally');

expect(rules.includes("match /products/{fileName}"), 'Storage rules must preserve products path');
expect(rules.includes("match /categories/{fileName}"), 'Storage rules must preserve categories path');
expect(rules.includes("hasPermission('products')"), 'Product uploads must remain permission-gated');
expect(rules.includes("hasPermission('categories')"), 'Category uploads must remain permission-gated');
expect(/request\.resource\.size\s*<=\s*8\s*\*\s*1024\s*\*\s*1024/.test(rules), 'Storage rules must allow at most 8 MB inclusive');
expect(adminLoginCss.includes('PRODUCTION COMPACT ADMIN LOGIN'), 'Admin login must use the compact production density layer');
expect(adminLoginCss.includes('min-height: 440px'), 'Admin login brand panel should not remain unnecessarily tall');
expect(adminManagementCss.includes('PRODUCTION COMPACT ACCESS DENIED'), 'Admin access-denied state must use compact production density');
expect(mobileVerifier, 'Existing mobile regression verifier must remain present');

if (failures.length) {
  console.error(`Production UI/storage verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Production UI/storage verification passed.');
