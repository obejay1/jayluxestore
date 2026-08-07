'use client';

import { usePathname } from 'next/navigation';

import Header from '@/components/Header';
import MobileBottomNav from '@/components/MobileBottomNav';

const ADMIN_PATHS = ['/admin', '/admin-login', '/invoice'];

function isAdminRoute(pathname: string) {
  return ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export default function SiteChrome() {
  const pathname = usePathname();

  if (isAdminRoute(pathname)) {
    return null;
  }

  return (
    <>
      <Header brand />
      <MobileBottomNav />
    </>
  );
}
