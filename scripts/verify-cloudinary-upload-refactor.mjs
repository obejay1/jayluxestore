import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const route = read('app/api/upload/route.ts');
const imageUpload = fs.existsSync('lib/imageUpload.ts') ? read('lib/imageUpload.ts') : '';
const field = fs.existsSync('components/admin/AdminImageUploadField.tsx') ? read('components/admin/AdminImageUploadField.tsx') : '';
const admin = read('app/admin/(protected)/page.tsx');

const images = read('lib/images.ts');
const responsiveImage = read('components/ResponsiveImage.tsx');
const productCard = read('components/ProductCard.tsx');

assert(images.includes('cloudinaryImageLoader'), 'Cloudinary delivery must use a shared responsive loader');
assert(images.includes('f_auto') && images.includes('q_auto') && images.includes('c_limit'), 'Cloudinary delivery loader must request automatic format/quality and bounded responsive widths');
assert(responsiveImage.includes('isCloudinaryImageSource') && responsiveImage.includes('cloudinaryImageLoader'), 'ResponsiveImage must route Cloudinary assets through the shared Cloudinary loader');
assert(productCard.includes('ResponsiveImage'), 'Product cards must use the shared responsive image delivery component');
assert(images.includes('getResponsiveDeliverySource'), 'non-Next image consumers must have a Cloudinary responsive delivery helper');

for (const path of ['lib/catalogImages.ts', 'lib/testimonials.ts', 'lib/transformations.ts', 'lib/bridal.ts']) {
  const source = read(path);
  assert(!source.includes("from 'firebase/storage'"), `${path} still imports firebase/storage`);
  assert(!/uploadBytes(?:Resumable)?\s*\(/.test(source), `${path} still performs Firebase Storage uploads`);
}

assert(route.includes('cloudinary.utils.api_sign_request'), 'upload route must sign Cloudinary upload parameters');
assert(!route.includes('request.json()') || route.includes('folder'), 'upload route still looks like the old base64 JSON upload endpoint');
assert(!route.includes('uploader.upload(image'), 'upload route still uploads base64 images server-side');
assert(route.includes('verifyAdminSessionCookieValue'), 'upload route must preserve admin authentication');
assert(route.includes('CLOUDINARY_API_SECRET'), 'upload route must use the server-only Cloudinary API secret');
assert(route.includes('signature'), 'upload route must return signed Cloudinary data');
assert(route.includes('FOLDER_PERMISSIONS'), 'upload route must enforce folder-specific admin permissions');
assert(route.includes('export async function DELETE'), 'upload route must support authenticated Cloudinary cleanup');
assert(route.includes('cloudinary.uploader.destroy'), 'upload route must delete Cloudinary assets by public ID');

assert(imageUpload.includes('FormData'), 'shared image upload helper must use FormData');
assert(imageUpload.includes('XMLHttpRequest'), 'shared image upload helper must use XHR for progress/timeout support');
assert(imageUpload.includes('image/gif'), 'shared image upload helper must accept GIF');
assert(imageUpload.includes('2400'), 'shared image upload helper must cap large still-image dimensions around 2400px');
assert(imageUpload.includes('/api/upload'), 'shared image upload helper must request an authenticated signature');
assert(imageUpload.includes('api.cloudinary.com'), 'shared image upload helper must upload directly to Cloudinary');
assert(imageUpload.includes('AbortController'), 'signature request must have an abort timeout');
assert(imageUpload.includes('IMAGE_DECODE_TIMEOUT_MS'), 'large-image decoding must have a finite timeout');
assert(imageUpload.includes('deleteAdminImage'), 'shared media helper must support Cloudinary deletion');

assert(field.includes('uploadAdminImage'), 'admin image field must use the shared upload helper');
assert(field.includes('progress'), 'admin image field must expose upload progress');
assert(field.includes('finally'), 'admin image field must reset state in finally');
assert(field.includes('Replace image') && field.includes('Remove image'), 'admin image field must support replace/remove actions');

assert(admin.includes('AdminImageUploadField'), 'admin page must use the reusable image upload field');
assert(admin.includes('ResponsiveImage'), 'admin media thumbnails must use the shared responsive image delivery component');
assert(!/<img\s/i.test(admin), 'admin dashboard still contains raw image elements instead of the shared delivery component');
for (const folder of ['products', 'categories', 'bridal-gallery', 'transformations/before', 'transformations/after', 'testimonials', 'bridal-packages']) {
  assert(admin.includes(folder), `admin page is missing Cloudinary folder ${folder}`);
}
assert(!admin.includes('new FileReader()'), 'admin page still converts image files to base64 with FileReader');
assert(admin.includes('galleryPublicIds'), 'product gallery uploads must persist their Cloudinary public IDs');
assert(admin.includes('product-gallery-0') && admin.includes('product-gallery-1') && admin.includes('product-gallery-2'), 'product gallery image slots must maintain independent upload states');
assert(admin.includes('cleanupCloudinaryImages'), 'admin record deletion/replacement must clean up known Cloudinary assets');

console.log('Cloudinary upload refactor verification passed.');
