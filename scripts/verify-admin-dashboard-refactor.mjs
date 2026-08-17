import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const files = {
  admin: read('app/admin/(protected)/page.tsx'),
  adminCss: read('app/admin/admin-design-system.css'),
  productionCss: read('app/jayluxe-design-system.css'),
  uploader: read('lib/imageUpload.ts'),
  uploadRoute: read('app/api/upload/route.ts'),
  invoice: read('app/invoice/[id]/page.tsx'),
  siteChrome: read('components/SiteChrome.tsx'),
};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(files.admin.includes('className="admin-dashboard-nav-shell"'), 'Main admin must render horizontal navigation shell.');
check(files.admin.includes('className="admin-dashboard-nav"'), 'Main admin must render horizontal navigation rail.');
check(!files.admin.includes('<aside className="sidebar">'), 'Legacy vertical sidebar must remain removed.');
check((files.adminCss + files.productionCss).includes('overflow-x: auto'), 'Admin navigation/table CSS must support horizontal scrolling.');
check((files.adminCss + files.productionCss).includes('white-space: nowrap'), 'Admin navigation must prevent wrapped mobile tabs.');

check(files.admin.includes('Average Order Value'), 'Primary KPI grid must contain Average Order Value.');
check(files.admin.includes('admin-operational-metrics'), 'Products and Customers must remain as secondary metrics.');
check(files.admin.includes('Manage Users') && files.admin.includes('admin-team-action-card'), 'Manage Users must remain in the admin/team overview.');

check(files.admin.includes('AdminImageUploadField'), 'Admin media forms must share one upload component.');
for (const folder of ['jayluxe/products', 'jayluxe/categories', 'jayluxe/bridal-gallery', 'jayluxe/transformations/before', 'jayluxe/transformations/after', 'jayluxe/testimonials', 'jayluxe/bridal-packages']) {
  check(files.admin.includes(folder), `Missing admin Cloudinary destination ${folder}.`);
}
check(files.uploader.includes('XMLHttpRequest'), 'Shared image uploader must provide progress/timeout using XHR.');
check(files.uploadRoute.includes('api_sign_request'), 'Server upload route must sign Cloudinary uploads.');
check(!files.admin.includes('catalogUploadProgress'), 'Legacy catalog-only upload state must be removed.');
check(!files.admin.includes('new FileReader()'), 'Admin upload flow must not use base64 FileReader conversion.');

check(!/Dashboard/i.test(files.invoice), 'Invoice page source must not render Dashboard UI text.');
check(files.siteChrome.includes("'/invoice'"), 'Global SiteChrome must remain suppressed on invoice routes.');

if (failures.length) {
  console.error(`Admin dashboard refactor verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Admin dashboard refactor verification passed.');
