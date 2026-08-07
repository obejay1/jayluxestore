import type { Metadata } from 'next';

import EditorialPage from '@/components/EditorialPage';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Terms for using the JayLuxe website, purchasing products and requesting services.',
};

export default function TermsPage() {
  return (
    <EditorialPage
      eyebrow="Website Terms"
      title="Terms and Conditions"
      introduction="These terms describe the general conditions for using the JayLuxe website, purchasing products and requesting beauty or bridal services."
      updated="July 30, 2026"
      sections={[
        {
          title: 'Using the website',
          content: (
            <p>You agree to provide accurate information, use the website lawfully and avoid attempts to interfere with its security, availability, accounts, payment flow or administrative systems.</p>
          ),
        },
        {
          title: 'Products, availability and pricing',
          content: (
            <p>JayLuxe aims to present accurate product descriptions, images, prices and stock information. Colours and presentation can vary by screen. Products, promotions, availability and prices may change before an order is successfully paid and verified.</p>
          ),
        },
        {
          title: 'Orders and payment',
          content: (
            <p>An order is accepted after the payment provider confirms a successful transaction and the JayLuxe server verifies and stores the order. JayLuxe may contact you when an order requires clarification, cannot be fulfilled or appears fraudulent.</p>
          ),
        },
        {
          title: 'Delivery',
          content: (
            <p>Delivery estimates are not guarantees. Customers are responsible for providing complete and accurate contact and delivery information. Additional charges or delays may apply for some locations or unsuccessful delivery attempts.</p>
          ),
        },
        {
          title: 'Returns and hygiene-sensitive items',
          content: (
            <p>Return eligibility depends on the item, condition, timing and hygiene or safety considerations. Customers should contact JayLuxe promptly and should not use, alter or discard the item or packaging while a concern is being reviewed.</p>
          ),
        },
        {
          title: 'Services and bridal bookings',
          content: (
            <p>A website booking submission is a request, not a confirmed appointment. Availability, location, timing, final price, deposits, cancellation terms and service details are confirmed directly by the JayLuxe team.</p>
          ),
        },
        {
          title: 'Accounts',
          content: (
            <p>You are responsible for protecting your account credentials and for activity performed through your account. Contact JayLuxe promptly if you believe your account or email has been compromised.</p>
          ),
        },
        {
          title: 'Limitation and updates',
          content: (
            <p>To the extent permitted by applicable law, JayLuxe is not responsible for losses caused by events outside reasonable control, third-party outages or misuse of the website. These terms may be updated as the website and services change.</p>
          ),
        },
      ]}
    />
  );
}
