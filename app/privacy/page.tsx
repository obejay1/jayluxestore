import { createPageMetadata } from '@/lib/seo';
import EditorialPage from '@/components/EditorialPage';
import { OFFICIAL_EMAIL } from '@/lib/contact';

export const metadata = createPageMetadata({
  title: 'Privacy Policy',
  description: 'How JayLuxe handles customer, order, booking and website information.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <EditorialPage
      eyebrow="Privacy"
      title="Privacy Policy"
      introduction="This page explains the types of information JayLuxe may process when you browse, shop, create an account, contact us or request a service."
      updated="July 30, 2026"
      sections={[
        {
          title: 'Information we collect',
          content: (
            <>
              <p>JayLuxe may collect information you provide, including your name, email address, phone number, delivery address, account profile, order details, booking details and messages sent through the website.</p>
              <p>The website may also process technical information needed for security, analytics and reliable operation, such as browser information, device information, page interactions and approximate request timestamps.</p>
            </>
          ),
        },
        {
          title: 'How information is used',
          content: (
            <ul>
              <li>To create and manage customer accounts.</li>
              <li>To process, verify and fulfil orders and payments.</li>
              <li>To manage beauty-service and bridal booking requests.</li>
              <li>To respond to support, contact and delivery enquiries.</li>
              <li>To prevent fraud, abuse and unauthorised access.</li>
              <li>To improve website usability, reliability and performance.</li>
              <li>To send marketing updates only where a customer has submitted a subscription request.</li>
            </ul>
          ),
        },
        {
          title: 'Service providers',
          content: (
            <p>JayLuxe uses service providers to operate parts of the website, such as Firebase for authentication and database services, payment providers for transaction processing, Cloudinary for media, Resend for email delivery, Termii for configured messaging and analytics tools when enabled. Those providers process information according to their own terms and security practices.</p>
          ),
        },
        {
          title: 'Payment information',
          content: (
            <p>Card and bank-payment details are entered through the selected payment provider. JayLuxe verifies payment references on the server but should not store complete card details in its application database.</p>
          ),
        },
        {
          title: 'Storage and security',
          content: (
            <p>JayLuxe applies access controls and server-side checks intended to limit access to customer and administrative information. No internet service can guarantee absolute security, so customers should use strong passwords and protect access to their email and devices.</p>
          ),
        },
        {
          title: 'Your choices',
          content: (
            <p>You may contact JayLuxe to ask about correcting account information, support records or marketing preferences. Some records may need to be retained for payment, fraud-prevention, tax, legal or operational reasons.</p>
          ),
        },
        {
          title: 'Contact',
          content: (
            <p>Privacy questions can be sent through the Contact page or by email to {OFFICIAL_EMAIL}.</p>
          ),
        },
      ]}
    />
  );
}
