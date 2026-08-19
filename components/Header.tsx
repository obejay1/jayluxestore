'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  Heart,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import HamburgerMenu from '@/components/HamburgerMenu';
import CartCountBadge from '@/components/CartCountBadge';
import { getWishlist } from '@/lib/store';
import { useCartCount } from '@/lib/useCartCount';

type HeaderProps = {
  title?: string;
  brand?: boolean;
  back?: boolean;
  bell?: boolean;
};

type NavigationLink = {
  label: string;
  href: string;
};

type NavigationGroup = {
  label: string;
  href?: string;
  children?: NavigationLink[];
};

const navigation: NavigationGroup[] = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'Categories', href: '/categories' },
  {
    label: 'Products',
    href: '/shop',
    children: [
      { label: 'All Products', href: '/shop' },
      { label: 'New Arrivals', href: '/new-arrivals' },
      { label: 'Featured Products', href: '/featured-products' },
      { label: 'Best Sellers', href: '/best-sellers' },
    ],
  },
  { label: 'Beauty Services', href: '/beauty-services' },
  {
    label: 'Services',
    href: '/services',
    children: [
      { label: 'All Services', href: '/services' },
      { label: 'Bridal Packages', href: '/bridal' },
      { label: 'Transformation Gallery', href: '/gallery' },
    ],
  },
  {
    label: 'Offers',
    href: '/promotions',
    children: [
      { label: 'Flash Sales', href: '/flash-sale' },
      { label: 'Promotions', href: '/promotions' },
    ],
  },
  { label: 'Testimonials', href: '/testimonials' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

function routeIsActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function groupIsActive(pathname: string, group: NavigationGroup) {
  return Boolean(
    (group.href && routeIsActive(pathname, group.href)) ||
      group.children?.some((item) => routeIsActive(pathname, item.href)),
  );
}

export default function Header({
  title,
  brand = false,
  back = false,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const cartCount = useCartCount();
  const [wishlistCount, setWishlistCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const updateWishlist = () => setWishlistCount(getWishlist().length);

    updateWishlist();
    window.addEventListener('wishlist', updateWishlist);

    return () => {
      window.removeEventListener('wishlist', updateWishlist);
    };
  }, []);

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : '/shop');
    setSearchOpen(false);
  }

  return (
    <header className="jl-site-header jl-compact-header">
      <div className="jl-announcement-bar">
        <span>Curated luxury for beauty, fashion and lifestyle</span>
        <Link href="/promotions">View current offers</Link>
      </div>

      <div className="jl-header-main">
        <div className="jl-header-left">
          {back ? (
            <button
              type="button"
              className="jl-header-back"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          ) : null}

          {brand ? (
            <Link href="/" className="jl-header-brand" aria-label="JayLuxe home">
              <Image
                src="/logo.png"
                alt=""
                width={48}
                height={48}
                priority
                className="jl-header-logo"
              />
              <span className="jl-header-brand-copy">
                <strong>JayLuxe</strong>
                <small>Beauty · Fashion · Lifestyle</small>
              </span>
            </Link>
          ) : (
            <p className="jl-header-page-title">{title || 'JayLuxe'}</p>
          )}
        </div>

        {brand ? (
          <nav className="jl-header-nav" aria-label="Primary navigation">
            {navigation.map((item) => {
              const active = groupIsActive(pathname, item);

              if (item.children) {
                return (
                  <div
                    className={`jl-nav-group ${active ? 'active' : ''}`}
                    key={item.label}
                  >
                    <button
                      type="button"
                      className="jl-nav-group-trigger"
                      aria-haspopup="true"
                    >
                      {item.label} <ChevronDown size={14} aria-hidden="true" />
                    </button>
                    <div className="jl-nav-dropdown">
                      {item.children.map((child) => {
                        const childActive = routeIsActive(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={childActive ? 'active' : undefined}
                            aria-current={childActive ? 'page' : undefined}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href || '/'}
                  className={active ? 'active' : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <div className="jl-header-actions">
          {brand ? (
            <>
              <div className={`jl-header-search-wrap ${searchOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="jl-header-icon jl-search-toggle"
                  aria-label={searchOpen ? 'Close search' : 'Search'}
                  aria-expanded={searchOpen}
                  onClick={() => setSearchOpen((open) => !open)}
                >
                  {searchOpen ? <X size={20} aria-hidden="true" /> : <Search size={20} aria-hidden="true" />}
                </button>
                <form className="jl-header-search" role="search" onSubmit={submitSearch}>
                  <label className="sr-only" htmlFor="global-product-search">
                    Search products
                  </label>
                  <input
                    id="global-product-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search products"
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                  <button type="submit" aria-label="Submit search">
                    <Search size={17} aria-hidden="true" />
                  </button>
                </form>
              </div>

              <Link href="/account" className="jl-header-icon" aria-label="My account">
                <User size={20} aria-hidden="true" />
              </Link>
              <Link
                href="/wishlist"
                className="jl-header-icon"
                aria-label={`Wishlist with ${wishlistCount} items`}
              >
                <Heart size={20} aria-hidden="true" />
                {wishlistCount > 0 ? (
                  <span aria-hidden="true">{wishlistCount > 99 ? '99+' : wishlistCount}</span>
                ) : null}
              </Link>
              <Link
                href="/cart"
                className="jl-header-icon"
                aria-label={`Shopping bag with ${cartCount} items`}
              >
                <ShoppingBag size={20} aria-hidden="true" />
                <CartCountBadge count={cartCount} />
              </Link>

              <HamburgerMenu />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
