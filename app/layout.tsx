import type { Metadata, Viewport } from 'next';
import {
  Playfair_Display,
  Plus_Jakarta_Sans,
} from 'next/font/google';

import './globals.css';
import './luxury-theme.css';
import './jayluxe-redesign.css';
import './jayluxe-refactor.css';
import './jayluxe-mobile.css';
import './jayluxe-mobile-polish.css';
import './jayluxe-card-system.css';
import './jayluxe-consistency-fixes.css';

import GoogleAnalytics from '@/components/GoogleAnalytics';
import HeroImageController from '@/components/HeroImageController';
import SiteChrome from '@/components/SiteChrome';
import { getSiteUrl } from '@/lib/site';
import {
  OFFICIAL_EMAIL,
  OFFICIAL_WHATSAPP_E164,
  OFFICIAL_WHATSAPP_URL,
} from '@/lib/contact';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jayluxe-sans',
});

const serif = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jayluxe-serif',
});

const siteUrl = getSiteUrl().toString().replace(/\/$/, '');

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'JayLuxe',
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  email: OFFICIAL_EMAIL,
  telephone: `+${OFFICIAL_WHATSAPP_E164}`,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: OFFICIAL_EMAIL,
    telephone: `+${OFFICIAL_WHATSAPP_E164}`,
    url: OFFICIAL_WHATSAPP_URL,
    areaServed: 'NG',
    availableLanguage: ['English'],
  },
};

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: 'JayLuxe',
    template: '%s | JayLuxe',
  },
  description: 'Luxury beauty, fashion, bridal and lifestyle essentials.',
  applicationName: 'JayLuxe',
  category: 'shopping',
  alternates: { canonical: '/' },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'JayLuxe',
    title: 'JayLuxe',
    description: 'Luxury beauty, fashion, bridal and lifestyle essentials.',
    images: [
      {
        url: '/hero-banner.png',
        width: 1600,
        height: 900,
        alt: 'JayLuxe collection',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JayLuxe',
    description: 'Luxury beauty, fashion, bridal and lifestyle essentials.',
    images: ['/hero-banner.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f4' },
    { media: '(prefers-color-scheme: dark)', color: '#111111' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className={sans.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, '\\u003c'),
          }}
        />

        <HeroImageController />

        <a className="jl-skip-link" href="#main-content">
          Skip to main content
        </a>

        <SiteChrome />

        <div id="main-content" className="jl-main-content" tabIndex={-1}>
          {children}
        </div>

        <GoogleAnalytics />
      </body>
    </html>
  );
}
