'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Scissors, ShoppingBag, ShoppingCart, User } from 'lucide-react';

import CartCountBadge from '@/components/CartCountBadge';
import { useCartCount } from '@/lib/useCartCount';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/shop', icon: ShoppingBag, label: 'Shop' },
  { href: '/services', icon: Scissors, label: 'Services' },
  { href: '/cart', icon: ShoppingCart, label: 'Cart' },
  { href: '/account', icon: User, label: 'Account' },
];

function isActiveRoute(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const cartCount = useCartCount();

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navItems.map((item) => {
        const active = isActiveRoute(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mobile-nav-icon-wrapper">
              <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              {item.href === '/cart' ? (
                <CartCountBadge count={cartCount} className="mobile-cart-badge" />
              ) : null}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
