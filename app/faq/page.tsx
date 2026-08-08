import { createPageMetadata } from '@/lib/seo';
import EditorialPage from '@/components/EditorialPage';

export const metadata = createPageMetadata({
  title: 'Frequently Asked Questions',
  description: 'Answers about JayLuxe orders, delivery, returns, services and bridal bookings.',
  path: '/faq',
});

export default function FaqPage() {
  return (
    <EditorialPage
      eyebrow="Client Care"
      title="Frequently Asked Questions"
      introduction="Helpful answers about shopping, delivery, payments, beauty appointments and bridal services."
      sections={[
        {
          title: 'Orders and payments',
          content: (
            <>
              <h3>How do I place an order?</h3>
              <p>Add products to your shopping bag, open Checkout, enter your delivery details and complete payment using an available payment option.</p>
              <h3>How will I know my order was received?</h3>
              <p>After a successful verified payment, JayLuxe creates an order confirmation page. Keep the order number for future support requests.</p>
              <h3>Can I change an order after payment?</h3>
              <p>Contact Client Care as soon as possible. Changes are not guaranteed once fulfilment or delivery preparation has started.</p>
            </>
          ),
        },
        {
          title: 'Delivery',
          content: (
            <>
              <h3>Where does JayLuxe deliver?</h3>
              <p>Delivery options and charges are shown during checkout based on the settings available for your order.</p>
              <h3>How long will delivery take?</h3>
              <p>Estimated delivery information is shown at checkout and on your order details. Delays can occur because of location, availability or courier conditions.</p>
              <h3>What should I do if my order is delayed?</h3>
              <p>Use the Contact page and include your order number so the team can review the latest status.</p>
            </>
          ),
        },
        {
          title: 'Returns and product concerns',
          content: (
            <>
              <h3>Can I return an item?</h3>
              <p>Contact JayLuxe promptly after delivery. Eligibility depends on the item, its condition, hygiene requirements and the reason for the request.</p>
              <h3>What if an item arrives damaged or incorrect?</h3>
              <p>Keep the packaging, take clear photographs and contact Client Care with your order number as soon as possible.</p>
            </>
          ),
        },
        {
          title: 'Beauty and bridal bookings',
          content: (
            <>
              <h3>How do I book a service?</h3>
              <p>Choose a service or bridal package, submit the booking form and wait for the JayLuxe team to confirm availability.</p>
              <h3>Is submitting a booking form a confirmed appointment?</h3>
              <p>No. A booking request is confirmed only after JayLuxe contacts you and confirms the date, time, location and any required deposit.</p>
              <h3>Can I request a custom bridal package?</h3>
              <p>Yes. Use the Contact page and describe your event date, location and preferred services.</p>
            </>
          ),
        },
        {
          title: 'Accounts and privacy',
          content: (
            <>
              <h3>Do I need an account to shop?</h3>
              <p>You may be able to check out as a guest. Signing in provides a safer way to view eligible order history associated with your verified email.</p>
              <h3>How do I reset my password?</h3>
              <p>Open the Forgot Password page and enter the email connected to your Firebase customer account.</p>
            </>
          ),
        },
      ]}
    />
  );
}
