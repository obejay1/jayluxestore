import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    failures.push(`Missing required file: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

function forbidMatch(source, pattern, message) {
  if (pattern.test(source)) failures.push(message);
}

const uploader = read('lib/adminImageUpload.ts');
const route = read('app/api/upload/route.ts');
const component = read('components/admin/AdminImageUpload.tsx');
const adminPage = read('app/admin/(protected)/page.tsx');
const store = read('lib/store.ts');
const transformations = read('lib/transformations.ts');
const testimonials = read('lib/testimonials.ts');
const bridal = read('lib/bridal.ts');

/* ---- Client uploader contract (Cloudinary pipeline) ---- */
requireMatch(uploader, /export type AdminImageKind/, 'Shared uploader must export AdminImageKind.');
requireMatch(uploader, /export function startAdminImageUpload/, 'Shared uploader must expose startAdminImageUpload().');
requireMatch(uploader, /export (async )?function uploadAdminImage/, 'Shared uploader must expose uploadAdminImage().');
requireMatch(uploader, /\/api\/upload/, 'Uploader must POST to the server-side /api/upload route.');
requireMatch(uploader, /MAX_ADMIN_IMAGE_BYTES|8 \* 1024 \* 1024/, 'Shared uploader must enforce the 8 MB limit.');
requireMatch(uploader, /ADMIN_IMAGE_UPLOAD_TIMEOUT_MS/, 'Shared uploader must enforce a hard upload timeout.');
requireMatch(uploader, /image\/(jpeg|png|webp|gif)/, 'Shared uploader must allow jpeg/png/webp/gif MIME types.');
requireMatch(uploader, /AbortController/, 'Shared uploader must expose cancellation via AbortController.');
requireMatch(uploader, /cancel/, 'Shared uploader must expose cancellation.');
requireMatch(uploader, /canvas|toBlob|toDataURL/, 'Uploader must compress large images client-side before upload.');
requireMatch(uploader, /finally/, 'Uploader must always settle/clean up, including on cancellation.');
forbidMatch(uploader, /uploadBytesResumable|getDownloadURL|getStorage\(/, 'Uploader must not use Firebase Storage.');

/* ---- Server route contract ---- */
requireMatch(route, /hasTrustedRequestOrigin/, 'Upload route must verify the request origin.');
requireMatch(route, /verifyAdminSessionCookieValue|adminSession/, 'Upload route must authenticate the admin session cookie.');
requireMatch(route, /ALLOWED_FOLDERS/, 'Upload route must constrain Cloudinary folders to an allowlist.');
requireMatch(route, /v2 as cloudinary|v2\.uploader/, 'Upload route must use the Cloudinary server SDK.');
requireMatch(route, /CLOUDINARY_API_SECRET/, 'Upload route must consume server-only Cloudinary credentials.');
requireMatch(route, /data:image\/(jpeg|png|webp|gif)/, 'Upload route must accept jpeg/png/webp/gif data URLs.');
requireMatch(route, /publicId/, 'Upload route must return a Cloudinary public id.');
forbidMatch(route, /process\.env\.CLOUDINARY_API_SECRET[\s\S]{0,80}export/, 'Cloudinary secret must never leak to the client bundle.');

/* ---- Upload component UX ---- */
requireMatch(component, /type="file"/, 'AdminImageUpload must use a normal file input.');
requireMatch(component, /accept="image\/jpeg,image\/png,image\/webp,image\/gif"/, 'AdminImageUpload must accept jpeg/png/webp/gif only.');
requireMatch(component, /startAdminImageUpload/, 'AdminImageUpload must use the shared cancellable uploader.');
requireMatch(component, /Uploading/, 'AdminImageUpload must expose upload progress/status.');
requireMatch(component, /finally \{/, 'AdminImageUpload must always reset its busy state in a finally block.');
requireMatch(component, /onUploadingChange\?\.\(false\)/, 'AdminImageUpload must reset the parent uploading flag in finally.');
requireMatch(component, /Remove image/, 'AdminImageUpload needs an explicit Remove image action.');
requireMatch(component, /Replace image/, 'AdminImageUpload needs an explicit Replace image label/action.');

/* ---- Admin page wiring ---- */
requireMatch(adminPage, /import AdminImageUpload from ['"]@\/components\/admin\/AdminImageUpload['"]/, 'Admin page must import AdminImageUpload.');
for (const kind of ['categories', 'bridal-gallery', 'transformation-before', 'transformation-after', 'testimonials']) {
  requireMatch(adminPage, new RegExp(`kind=[{]?['\"]${kind}['\"]`), `Admin page must wire upload kind: ${kind}`);
}
requireMatch(
  adminPage,
  /kind=\{form\.type === ['"]service['"] \? ['"]services['"] : ['"]products['"]\}/,
  'Product/Service editor must route services and products through their dedicated shared upload paths.',
);
const uploadComponentCount = (adminPage.match(/<AdminImageUpload\b/g) || []).length;
if (uploadComponentCount < 6) failures.push(`Expected at least 6 AdminImageUpload instances, found ${uploadComponentCount}.`);
forbidMatch(adminPage, /new FileReader\(|readAsDataURL\(/, 'Admin page must not convert newly selected admin images to base64.');
forbidMatch(adminPage, /uploadCatalogImage/, 'Admin page must not use a section-specific catalog uploader directly.');

/* ---- No duplicate upload implementations ---- */
forbidMatch(store, /\binitializeApp\b|\bgetApps\b|\bgetFirestore\b/, 'lib/store.ts must not initialize Firebase independently.');
requireMatch(store, /from ['"]\.\/firebase['"]/, 'lib/store.ts must import the shared Firebase instance.');

forbidMatch(transformations, /uploadTransformationImage|uploadBytes\b|getStorage\b|getDownloadURL\b/, 'Transformation module must not retain a second Storage upload implementation.');
forbidMatch(testimonials, /uploadTestimonialPhoto|uploadBytes\b|getStorage\b|getDownloadURL\b/, 'Testimonial module must not retain a second Storage upload implementation.');
forbidMatch(bridal, /uploadBridalPackageImage|uploadBytes\b|getStorage\b|getDownloadURL\b/, 'Bridal module must not retain a second Storage upload implementation.');

if (failures.length) {
  console.error('Unified admin image upload verification: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Unified admin image upload verification: PASS');