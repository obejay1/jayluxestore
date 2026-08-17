# Resend Order Confirmation Template Integration Design

## Goal
Use a published Resend hosted template for the customer order-confirmation email without changing any other JayLuxe email workflow, and preserve the current HTML order-confirmation email as the fallback whenever no Resend template identifier is configured.

## Scope
- Add one optional configuration value: `RESEND_ORDER_CONFIRMATION_TEMPLATE_ID`.
- Extend the central email service so a managed email can carry either normal HTML/text content or a Resend hosted template reference plus variables.
- Update only the customer order-confirmation path in `sendOrderCreatedEmails` to use the Resend template when configured.
- Keep admin new-order notifications, payment emails, status emails, booking, contact, newsletter, verification, welcome, review, and password-reset emails on their current HTML paths.

## Template variables
The order-confirmation template receives exactly these variables:
- `CUSTOMER_NAME`
- `ORDER_NUMBER`
- `ORDER_DATE`
- `ORDER_TOTAL`
- `DELIVERY_ADDRESS`
- `ORDER_URL`

All values are derived from the existing `Order` object and current site URL. Missing optional customer/address fields use production-safe display fallbacks rather than `undefined`.

## Fallback behavior
`RESEND_ORDER_CONFIRMATION_TEMPLATE_ID` is optional. If it is absent or blank, the existing `orderConfirmationTemplate(order)` HTML/text payload is sent exactly as before. Once a published Resend template exists, set this environment variable to its ID or alias (for example `order-confirmation`) to activate the hosted template path.

## Service behavior
`sendManagedEmail` continues to validate recipients, claim idempotency in Firestore, use the same sender, headers, scheduling, and event tracking. When a template is present it sends `template` and intentionally omits `html`/`text`, because Resend rejects a request that includes both a hosted template and HTML/text content. When no template is present it sends the existing HTML/text payload.

## Verification
- Add a regression script that proves config, service branching, required variables, and fallback remain present.
- Run the new regression script before implementation to confirm RED.
- Run it again after implementation to confirm GREEN.
- Run the existing JayLuxe verification scripts.
- Run TypeScript syntax/type parsing as far as possible in the dependency-less extracted source.
- Confirm only the three intended application files changed, excluding docs/tests.
