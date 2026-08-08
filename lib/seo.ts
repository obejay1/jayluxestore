import type { Metadata } from 'next';

import { getSiteUrl } from '@/lib/site';

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const canonical = new URL(path || '/', getSiteUrl()).toString();

  return {
    title,
    description,
    alternates: noIndex ? undefined : { canonical },
    openGraph: noIndex
      ? undefined
      : {
          type: 'website',
          siteName: 'JayLuxe',
          title,
          description,
          url: canonical,
        },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        }
      : undefined,
  };
}
