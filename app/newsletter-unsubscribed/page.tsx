import Link from 'next/link';

export const metadata = {
  title: 'Newsletter Preferences | JayLuxe',
  robots: { index: false, follow: false },
};

export default function NewsletterUnsubscribedPage({ searchParams }: { searchParams: { status?: string } }) {
  const success = searchParams.status === 'success';
  return (
    <main style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '48px 20px' }}>
      <section style={{ maxWidth: 620, textAlign: 'center' }}>
        <p style={{ textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 800 }}>The JayLuxe Edit</p>
        <h1 className="font-serif">{success ? 'You have been unsubscribed.' : 'This unsubscribe link is invalid.'}</h1>
        <p>{success ? 'You will no longer receive JayLuxe marketing emails. Transactional account and order emails are unaffected.' : 'Please use the unsubscribe link from the most recent JayLuxe newsletter email.'}</p>
        <Link href="/" className="btn">Return to JayLuxe</Link>
      </section>
    </main>
  );
}
