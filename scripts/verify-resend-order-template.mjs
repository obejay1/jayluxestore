import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const config = read('lib/email/config.ts');
const service = read('lib/email/service.ts');
const workflows = read('lib/email/workflows.ts');

const checks = [
  [
    'config exposes optional order confirmation template id',
    /orderConfirmationTemplateId\s*:\s*process\.env\.RESEND_ORDER_CONFIRMATION_TEMPLATE_ID\?\.trim\(\)\s*\|\|\s*''/.test(config),
  ],
  [
    'managed email input supports a hosted template',
    /type\s+ManagedEmailTemplate\s*=\s*\{[\s\S]*?id\s*:\s*string;[\s\S]*?variables\s*:\s*Record<string,\s*string\s*\|\s*number>[\s\S]*?\};/.test(service) &&
      /template\?\s*:\s*ManagedEmailTemplate;/.test(service),
  ],
  [
    'managed email html content is optional for template mode',
    /html\?\s*:\s*string;/.test(service),
  ],
  [
    'service branches into Resend template mode',
    /const\s+\{\s*data,\s*error\s*\}\s*=\s*templateId/.test(service) &&
      /template\s*:\s*\{\s*id\s*:\s*templateId,[\s\S]*?variables\s*:\s*input\.template\?\.variables/.test(service),
  ],
  [
    'service preserves html fallback mode',
    /html\s*:\s*input\.html/.test(service),
  ],
  [
    'service records template delivery diagnostics',
    /deliveryMode\s*:\s*templateId\s*\?\s*'template'\s*:\s*'html'/.test(service) &&
      /templateId\s*:\s*templateId\s*\|\|\s*null/.test(service),
  ],
  [
    'customer order workflow reads configured template id',
    /orderConfirmationTemplateId/.test(workflows),
  ],
  ...['CUSTOMER_NAME', 'ORDER_NUMBER', 'ORDER_DATE', 'ORDER_TOTAL', 'DELIVERY_ADDRESS', 'ORDER_URL'].map((key) => [
    `order template variable ${key} is provided`,
    new RegExp(`${key}\\s*:`).test(workflows),
  ]),
  [
    'existing html order template remains the fallback source',
    /const\s+template\s*=\s*orderConfirmationTemplate\(order\)/.test(workflows),
  ],
  [
    'template is attached only conditionally',
    /template:\s*orderConfirmationTemplateId\s*\?/.test(workflows),
  ],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Resend order template verification failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`Resend order template verification passed (${checks.length}/${checks.length}).`);
