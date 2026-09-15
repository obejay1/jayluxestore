import { createPageMetadata } from '@/lib/seo';

import './admin-design-system.css';
import './admin-dashboard-redesign.css';



// Admin-only mobile viewport configuration.
// Scoped to the /admin route segment only.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = createPageMetadata({
  title: 'Administration',
  description: 'Private JayLuxe administration area.',
  path: '/admin',
  noIndex: true,
});

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-interface-shell">{children}</div>;
}
