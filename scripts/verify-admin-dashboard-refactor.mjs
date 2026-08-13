import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const files = {
  admin: read('app/admin/(protected)/page.tsx'),
  adminCss: read('app/admin/admin-dashboard-redesign.css'),
  managementCss: read('app/admin/admin-management.css'),
  catalog: read('lib/catalogImages.ts'),
  storageRules: read('storage.rules'),
  invoice: read('app/invoice/[id]/page.tsx'),
  siteChrome: read('components/SiteChrome.tsx'),
};

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

check(files.admin.includes('className="admin-dashboard-nav-shell"'), 'Main admin must render horizontal navigation shell.');
check(files.admin.includes('className="admin-dashboard-nav"'), 'Main admin must render horizontal navigation rail.');
check(!files.admin.includes('<aside className="sidebar">'), 'Legacy vertical sidebar must be removed from main admin markup.');
check(files.adminCss.includes('.admin-dashboard-nav') && files.adminCss.includes('overflow-x: auto'), 'Admin navigation CSS must support horizontal scrolling.');
check(files.adminCss.includes('white-space: nowrap'), 'Admin navigation must prevent wrapped/tall mobile tabs.');

check(files.admin.includes('Average Order Value'), 'Primary KPI grid must contain Average Order Value.');
check(files.admin.includes('admin-operational-metrics'), 'Products and Customers must remain as secondary metrics.');
check(files.admin.includes('Manage Users') && files.admin.includes('admin-team-action-card'), 'Manage Users must be inside the team overview grid.');
check(files.adminCss.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'Admin CSS must contain a three-column grid for primary/team layouts.');

check(files.catalog.includes('uploadBytesResumable'), 'Catalog uploader must use uploadBytesResumable.');
check(files.catalog.includes('onProgress'), 'Catalog uploader must expose progress reporting.');
check(files.catalog.includes('.cancel()'), 'Catalog uploader must cancel stalled uploads.');
check(files.catalog.includes('UPLOAD_TIMEOUT_MS'), 'Catalog uploader must have a finite timeout.');
check(files.catalog.includes('getDownloadURL'), 'Catalog uploader must return a durable download URL.');
check(files.catalog.includes('storageBucket'), 'Catalog uploader must validate Firebase Storage bucket configuration.');
check(files.admin.includes('catalogUploadProgress'), 'Admin UI must surface catalog image upload progress.');
check(files.storageRules.includes('request.resource.size <= 8 * 1024 * 1024'), 'Storage rules must allow the same 8 MB boundary as client validation.');

check(files.managementCss.includes('.amu-heading h1') && files.managementCss.includes('font-size: clamp(1.35rem'), 'Dedicated admin page title typography must be compact.');
check(files.managementCss.includes('.amu-nav') && files.managementCss.includes('overflow-x: auto'), 'Dedicated admin nav must remain horizontally scrollable.');

check(!/Dashboard/i.test(files.invoice), 'Invoice page source must not render Dashboard UI text.');
check(files.siteChrome.includes("'/invoice'"), 'Global SiteChrome must remain suppressed on invoice routes.');

if (failures.length) {
  console.error(`Admin dashboard refactor verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Admin dashboard refactor verification passed.');
