import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const production = read('app/jayluxe-design-system.css');
const layout = read('app/layout.tsx');
const route = read('app/api/upload/route.ts');
const uploader = read('lib/imageUpload.ts');
const field = read('components/admin/AdminImageUploadField.tsx');
const adminPage = read('app/admin/(protected)/page.tsx');
const adminLoginCss = read('app/admin/login/page.module.css');
const adminManagementCss = read('app/admin/admin-design-system.css');

for (const token of [
  '--jl-space-1: 4px', '--jl-space-2: 8px', '--jl-space-3: 12px',
  '--jl-space-4: 16px', '--jl-space-5: 20px', '--jl-space-6: 24px',
  '--jl-space-8: 32px', '--jl-space-10: 40px', '--jl-control-h: 42px',
]) {
  expect(production.includes(token), `Missing production design token ${token}`);
}
expect(production.includes('--jl-container: 1280px'), 'Missing shared 1280px content container.');

const imports = [...layout.matchAll(/import ['"]\.\/(.+?\.css)['"];?/g)].map((m) => m[1]);
expect(imports.at(-1) === 'jayluxe-design-system.css', 'jayluxe-design-system.css must be the final global CSS import.');

expect(route.includes('cloudinary.utils.api_sign_request'), 'Upload API must generate signed Cloudinary upload parameters.');
expect(route.includes('verifyAdminSessionCookieValue'), 'Upload API must verify the existing admin session.');
expect(route.includes('FOLDER_PERMISSIONS'), 'Upload API must enforce section-specific permissions.');
expect(route.includes('cloudinary.uploader.destroy'), 'Upload API must support Cloudinary asset cleanup.');
expect(!route.includes('uploader.upload(image'), 'Upload API must not receive/upload base64 image bodies.');
expect(uploader.includes('XMLHttpRequest'), 'Browser uploader must use XHR for upload progress and timeout support.');
expect(uploader.includes('FormData'), 'Browser uploader must send binary FormData to Cloudinary.');
expect(uploader.includes('MAX_IMAGE_DIMENSION = 2400'), 'Large still images must be constrained to 2400px maximum dimension.');
expect(uploader.includes('image/gif'), 'Uploader must support GIF in addition to JPG/PNG/WebP.');
expect(uploader.includes('AbortController'), 'Signature request must be bounded by a timeout.');
expect(field.includes('finally {') && field.includes('setUploading(false)'), 'Reusable upload field must always clear uploading state in finally.');
expect(field.includes('Replace image') && field.includes('Remove image'), 'Upload field must expose replacement/removal controls.');
expect(adminPage.includes('AdminImageUploadField'), 'Admin page must use the reusable upload field.');
expect(!adminPage.includes('new FileReader()'), 'Admin media flow must not convert uploads to base64.');
expect(adminPage.includes('product-gallery-0') && adminPage.includes('product-gallery-2'), 'Product gallery uploads must have independent image slot state.');
expect(adminPage.includes('cleanupCloudinaryImages'), 'Known Cloudinary assets must be cleaned up after record deletion/replacement.');

for (const file of ['lib/catalogImages.ts', 'lib/testimonials.ts', 'lib/transformations.ts', 'lib/bridal.ts']) {
  const source = read(file);
  expect(!source.includes("from 'firebase/storage'"), `${file} still uses Firebase Storage for media uploads.`);
}

expect(adminLoginCss.includes('PRODUCTION COMPACT ADMIN LOGIN'), 'Admin login compact production layer must remain present.');
expect(adminManagementCss.includes('PRODUCTION COMPACT ACCESS DENIED'), 'Admin access-denied compact production layer must remain present.');

if (failures.length) {
  console.error(`Production UI/media verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Production UI/media verification passed.');
