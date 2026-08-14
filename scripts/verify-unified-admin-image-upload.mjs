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
const component = read('components/admin/AdminImageUpload.tsx');
const adminPage = read('app/admin/(protected)/page.tsx');
const store = read('lib/store.ts');
const transformations = read('lib/transformations.ts');
const testimonials = read('lib/testimonials.ts');
const bridal = read('lib/bridal.ts');
const rules = read('storage.rules');

requireMatch(uploader, /export type AdminImageKind/, 'Shared uploader must export AdminImageKind.');
requireMatch(uploader, /uploadBytesResumable/, 'Shared uploader must use uploadBytesResumable().');
requireMatch(uploader, /getDownloadURL/, 'Shared uploader must resolve a Firebase download URL.');
requireMatch(uploader, /getStorage\(app\)/, 'Shared uploader must use the singleton Firebase app explicitly.');
requireMatch(uploader, /getIdToken\(/, 'Shared uploader must refresh/verify Firebase Auth before upload.');
requireMatch(uploader, /image\/gif/, 'Shared uploader must support GIF MIME validation.');
requireMatch(uploader, /8 \* 1024 \* 1024/, 'Shared uploader must enforce the 8 MB limit.');
requireMatch(uploader, /cancel\(\)/, 'Shared uploader must expose cancellation.');

requireMatch(component, /type="file"/, 'AdminImageUpload must use a normal file input.');
requireMatch(component, /accept="image\/\*"/, 'AdminImageUpload must accept normal web/mobile images.');
requireMatch(component, /URL\.createObjectURL/, 'AdminImageUpload must use object URLs for local preview.');
requireMatch(component, /URL\.revokeObjectURL/, 'AdminImageUpload must revoke object URLs.');
requireMatch(component, /startAdminImageUpload/, 'AdminImageUpload must use the shared cancellable uploader.');
requireMatch(component, /Uploading/, 'AdminImageUpload must expose upload progress/status.');

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

forbidMatch(store, /\binitializeApp\b|\bgetApps\b|\bgetFirestore\b/, 'lib/store.ts must not initialize Firebase independently.');
requireMatch(store, /from ['"]\.\/firebase['"]/, 'lib/store.ts must import the shared Firebase instance.');

forbidMatch(transformations, /uploadTransformationImage|uploadBytes\b|getStorage\b|getDownloadURL\b/, 'Transformation module must not retain a second Storage upload implementation.');
forbidMatch(testimonials, /uploadTestimonialPhoto|uploadBytes\b|getStorage\b|getDownloadURL\b/, 'Testimonial module must not retain a second Storage upload implementation.');
forbidMatch(bridal, /uploadBridalPackageImage|uploadBytes\b|getStorage\b|getDownloadURL\b/, 'Bridal module must not retain a second Storage upload implementation.');

for (const rulePath of ['products', 'services', 'categories', 'testimonials', 'bridal-gallery']) {
  requireMatch(rules, new RegExp(`match \/${rulePath.replace('-', '\\-')}\/\\{fileName\\}`), `Storage Rules must define secure path: ${rulePath}.`);
}
requireMatch(rules, /match \/transformations\/\{allPaths=\*\*\}/, 'Storage Rules must secure transformation subpaths.');
requireMatch(rules, /image\/\(jpeg\|png\|webp\|gif\)/, 'Storage Rules must allow the approved image MIME types including GIF.');
requireMatch(rules, /match \/\{allPaths=\*\*\}[\s\S]*allow read, write: if false;/, 'Storage Rules must keep the catch-all deny rule.');

if (failures.length) {
  console.error('Unified admin image upload verification: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Unified admin image upload verification: PASS');
