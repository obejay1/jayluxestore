import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const assertions = [];
const check = (name, condition) => assertions.push({ name, condition: Boolean(condition) });

const ga = read('components/GoogleAnalytics.tsx');
const rules = read('firestore.rules');
const checkout = read('app/checkout/page.tsx');
const initialize = read('app/api/checkout/initialize/route.ts');
const checkoutServer = read('lib/checkout/server.ts');
const checkoutCart = read('lib/checkout/cart.ts');
const webhook = read('lib/payments/paystackWebhook.ts');
const orderApi = read('app/api/orders/[id]/route.ts');
const orderPage = read('app/order/[id]/page.tsx');
const invoicePage = read('app/invoice/[id]/page.tsx');
const admin = read('app/admin/(protected)/page.tsx');
const adminPrintTemplates = read('lib/admin/printTemplates.ts');
const output = read('lib/security/output.ts');
const settings = read('lib/settings.ts');
const pkg = JSON.parse(read('package.json'));
const sitemap = read('app/sitemap.ts');
const productLayout = read('app/product/[id]/layout.tsx');

check('Analytics has no hard-coded GA fallback', !ga.includes('G-MTLYK7BGNC'));
check('Analytics page view strips query and hash', ga.includes("page_location: `${window.location.origin}${pathname}`"));
check('Coupons are not public-readable in Firestore rules', /match \/coupons\/{document=\*\*} \{\s*allow read, write: if hasPermission\('promotions'\);/m.test(rules));
check('Checkout initializes Paystack on the server', checkout.includes("fetch('/api/checkout/initialize'"));
check('Installment no longer falls through to OPay', checkout.includes("paymentMethod === 'OPay' ? ("));
check('Checkout intent reserves inventory', checkoutServer.includes("reservationStatus: 'reserved'") && checkoutServer.includes('stock: stock - quoted.qty'));
check('Checkout intent supports inventory release', checkoutServer.includes('releaseIntentReservation'));
check('Duplicate cart lines are consolidated before stock reservation', checkoutServer.includes('normalizeRequestedCartItems') && checkoutCart.includes('quantityByProduct') && checkoutCart.includes('combinedQuantity'));
check('Only active reservations remain cleanup-query eligible', checkoutServer.includes(".where('cleanupAt', '<=', new Date().toISOString())") && checkoutServer.includes('cleanupAt: null'));
check('Webhook finalizes checkout intent', webhook.includes('finalizeCheckoutIntent(reference'));
check('Order access uses a header instead of URL query', orderApi.includes("request.headers.get('x-order-access-token')"));
check('Order page captures fragment token', orderPage.includes('captureOrderAccessToken(orderId)'));
check('Invoice page captures fragment token', invoicePage.includes('captureOrderAccessToken(String(params.id))'));
check('Admin print output escapes untrusted HTML', admin.includes('buildCustomerPrintHtml') && admin.includes('buildOrderInvoicePrintHtml') && adminPrintTemplates.includes('escapeHtml(customer.name)') && adminPrintTemplates.includes("escapeHtml(order.customerName || 'N/A')"));
check('CSV export neutralises spreadsheet formulas', output.includes('neutralizeSpreadsheetFormula') && admin.includes('row.map(escapeCsv)'));
check('Expired maintenance does not write from public reader', !settings.slice(settings.indexOf('if (maintenanceHasEnded)'), settings.indexOf('return settings;')).includes('setDoc('));
check('Legacy vulnerable xlsx dependency removed', !pkg.dependencies?.xlsx);
check('Client-side Paystack popup dependency removed', !pkg.dependencies?.['react-paystack']);
check('Product sitemap includes live products', sitemap.includes('getActiveProductsServer'));
check('Product pages expose product-specific JSON-LD', productLayout.includes("'@type': 'Product'"));
check('Server checkout cookie is HttpOnly', initialize.includes('httpOnly: true'));

const failed = assertions.filter((item) => !item.condition);
for (const item of assertions) console.log(`${item.condition ? 'PASS' : 'FAIL'} - ${item.name}`);
if (failed.length) {
  console.error(`\n${failed.length}/${assertions.length} Phase 34 checks failed.`);
  process.exit(1);
}
console.log(`\n${assertions.length}/${assertions.length} Phase 34 security checks passed.`);
