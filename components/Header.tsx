'use client';

import Image from 'next/image';
import Link from 'next/link';
import FocusLock from 'react-focus-lock';
import { createPortal } from 'react-dom';
import { type FormEvent, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  Heart,
  AlignJustify,
  Search,
  ShoppingBag,
  Sparkles,
  User,
  X,
} from 'lucide-react';

import { getCart, getWishlist } from '@/lib/store';

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
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const updateCart = () => {
      setCartCount(
        getCart().reduce(
          (total, item) => total + Number(item.qty || 0),
          0,
        ),
      );
    };
    const updateWishlist = () => setWishlistCount(getWishlist().length);

    updateCart();
    updateWishlist();
    window.addEventListener('cart', updateCart);
    window.addEventListener('wishlist', updateWishlist);

    return () => {
      window.removeEventListener('cart', updateCart);
      window.removeEventListener('wishlist', updateWishlist);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setMenuMounted(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1041px)');

    const closeMenuOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMenuOpen(false);
        setMenuMounted(false);
      }
    };

    mediaQuery.addEventListener('change', closeMenuOnDesktop);
    return () => mediaQuery.removeEventListener('change', closeMenuOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuMounted) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuMounted]);

  useEffect(() => {
    if (menuOpen || !menuMounted) return;

    const timeout = window.setTimeout(() => {
      setMenuMounted(false);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [menuOpen, menuMounted]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : '/shop');
    setMenuOpen(false);
    setSearchOpen(false);
  }

  function openMobileMenu() {
    setSearchOpen(false);
    setMenuMounted(true);
    window.requestAnimationFrame(() => setMenuOpen(true));
  }

  function closeMobileMenu() {
    setMenuOpen(false);
  }

  function toggleMobileMenu() {
    if (menuOpen) {
      closeMobileMenu();
      return;
    }

    openMobileMenu();
  }

  const mobileMenu = brand && portalReady && menuMounted
    ? createPortal(
        <FocusLock returnFocus disabled={!menuOpen}>
          <div
            className={`jl-mobile-menu-layer${menuOpen ? ' is-open' : ''}`}
            aria-hidden={!menuOpen}
          >
            <button
              type="button"
              className="jl-mobile-menu-backdrop"
              onClick={closeMobileMenu}
              aria-label="Close navigation menu"
              tabIndex={-1}
            />

            <aside
              id="jl-mobile-menu"
              className="jl-mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-labelledby="jl-mobile-menu-title"
            >
              <div className="jl-mobile-menu-heading">
                <div>
                  <span>JayLuxe</span>
                  <strong id="jl-mobile-menu-title">Explore</strong>
                </div>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  aria-label="Close menu"
                  tabIndex={menuOpen ? 0 : -1}
                  autoFocus={menuOpen}
                >
                  <X size={21} aria-hidden="true" />
                </button>
              </div>

              <form className="jl-mobile-search" role="search" onSubmit={submitSearch}>
                <Search size={18} aria-hidden="true" />
                <label className="sr-only" htmlFor="mobile-product-search">
                  Search products
                </label>
                <input
                  id="mobile-product-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search products"
                  autoComplete="off"
                  enterKeyHint="search"
                  tabIndex={menuOpen ? 0 : -1}
                />
              </form>

              <nav aria-label="Mobile navigation">
                {navigation.map((item) => {
                  const parentActive = item.href
                    ? routeIsActive(pathname, item.href)
                    : false;

                  if (item.children) {
                    return (
                      <div className="jl-mobile-nav-group" key={item.label}>
                        {item.href ? (
                          <Link
                            href={item.href}
                            className={`jl-mobile-nav-group-title${
                              parentActive ? ' active' : ''
                            }`}
                            aria-current={parentActive ? 'page' : undefined}
                            onClick={closeMobileMenu}
                            tabIndex={menuOpen ? 0 : -1}
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <span className="jl-mobile-nav-group-title">
                            {item.label}
                          </span>
                        )}

                        <div className="jl-mobile-nav-children">
                          {item.children.map((child) => {
                            const childActive = routeIsActive(
                              pathname,
                              child.href,
                            );

                            return (
                              <Link
                                key={`${child.href}-${child.label}`}
                                href={child.href}
                                className={childActive ? 'active' : undefined}
                                aria-current={childActive ? 'page' : undefined}
                                onClick={closeMobileMenu}
                                tabIndex={menuOpen ? 0 : -1}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (!item.href) return null;

                  const active = routeIsActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? 'active' : undefined}
                      aria-current={active ? 'page' : undefined}
                      onClick={closeMobileMenu}
                      tabIndex={menuOpen ? 0 : -1}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="jl-mobile-menu-links">
                <Link
                  href="/account"
                  onClick={closeMobileMenu}
                  tabIndex={menuOpen ? 0 : -1}
                >
                  <User size={18} aria-hidden="true" /> My Account
                </Link>
                <Link
                  href="/wishlist"
                  onClick={closeMobileMenu}
                  tabIndex={menuOpen ? 0 : -1}
                >
                  <Heart size={18} aria-hidden="true" /> Wishlist{' '}
                  <b>{wishlistCount}</b>
                </Link>
                <Link
                  href="/cart"
                  onClick={closeMobileMenu}
                  tabIndex={menuOpen ? 0 : -1}
                >
                  <ShoppingBag size={18} aria-hidden="true" /> Shopping Bag{' '}
                  <b>{cartCount}</b>
                </Link>
              </div>
            </aside>
          </div>
        </FocusLock>,
        document.body,
      )
    : null;

  return (
    <>
      <header className="jl-site-header">
        <div className="jl-announcement-bar">
          <span>
            <Sparkles size={14} aria-hidden="true" /> Curated luxury for beauty,
            fashion and lifestyle
          </span>
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
                        {item.label}{' '}
                        <ChevronDown size={14} aria-hidden="true" />
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
                    {searchOpen ? (
                      <X size={20} aria-hidden="true" />
                    ) : (
                      <Search size={20} aria-hidden="true" />
                    )}
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
                    <span aria-hidden="true">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/cart"
                  className="jl-header-icon"
                  aria-label={`Shopping bag with ${cartCount} items`}
                >
                  <ShoppingBag size={20} aria-hidden="true" />
                  {cartCount > 0 ? (
                    <span aria-hidden="true">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  ) : null}
                </Link>
                <button
                  type="button"
                  className="jl-header-menu-button"
                  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={menuOpen}
                  aria-haspopup="dialog"
                  aria-controls="jl-mobile-menu"
                  onClick={toggleMobileMenu}
                >
                  {menuOpen ? (
                    <X size={23} aria-hidden="true" />
                  ) : (
                    <AlignJustify size={24} strokeWidth={2.1} aria-hidden="true" />
                  )}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {mobileMenu}
    </>
  );
}
