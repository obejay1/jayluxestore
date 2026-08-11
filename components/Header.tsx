'use client';

import Image from 'next/image';
import Link from 'next/link';
import FocusLock from 'react-focus-lock';
import { createPortal } from 'react-dom';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  Heart,
  Home,
  Info,
  LogIn,
  LogOut,
  Menu,
  Gem,
  Images,
  Layers3,
  MessageCircle,
  Scissors,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tags,
  User,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  getIdTokenResult,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';

import { auth } from '@/lib/firebase';
import {
  defaultCategories,
  getCart,
  getCategories,
  getProducts,
  getWishlist,
} from '@/lib/store';
import type { Category, Product } from '@/lib/types';

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

type MobileNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type HeaderAccount = {
  name: string;
  email: string;
  isAdmin: boolean;
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

const mobileNavigation: MobileNavigationItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Shop', href: '/shop', icon: ShoppingBag },
  { label: 'Services', href: '/services', icon: Scissors },
  { label: 'Bridal Packages', href: '/bridal', icon: Gem },
  { label: 'Before & After', href: '/gallery', icon: Images },
  { label: 'Promotions', href: '/promotions', icon: Tags },
  { label: 'Testimonials', href: '/testimonials', icon: MessageCircle },
  { label: 'About Us', href: '/about', icon: Info },
  { label: 'Contact Us', href: '/contact', icon: MessageCircle },
  { label: 'Wishlist', href: '/wishlist', icon: Heart },
  { label: 'Cart', href: '/cart', icon: ShoppingCart },
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

function normalizeCategoryName(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function mergeNavigationCategories(
  categoryItems: Category[],
  productItems: Product[],
): Category[] {
  const merged = new Map<string, Category>();

  const addCategory = (category: Category) => {
    if (category.active === false || !category.name?.trim()) return;
    const key = `${category.type}:${normalizeCategoryName(category.name)}`;
    if (!merged.has(key)) merged.set(key, category);
  };

  defaultCategories.forEach(addCategory);
  categoryItems.forEach(addCategory);

  productItems.forEach((item) => {
    if (item.active === false || !item.category?.trim()) return;
    addCategory({
      id: `navigation-${item.type}-${normalizeCategoryName(item.category).replace(/[^a-z0-9]+/g, '-')}`,
      name: item.category.trim(),
      type: item.type,
      active: true,
    });
  });

  const defaultOrder = new Map(
    defaultCategories.map((category, index) => [
      `${category.type}:${normalizeCategoryName(category.name)}`,
      index,
    ]),
  );

  return Array.from(merged.values()).sort((first, second) => {
    const firstKey = `${first.type}:${normalizeCategoryName(first.name)}`;
    const secondKey = `${second.type}:${normalizeCategoryName(second.name)}`;
    const firstOrder = defaultOrder.get(firstKey);
    const secondOrder = defaultOrder.get(secondKey);

    if (firstOrder !== undefined || secondOrder !== undefined) {
      return (firstOrder ?? Number.MAX_SAFE_INTEGER) -
        (secondOrder ?? Number.MAX_SAFE_INTEGER);
    }

    return first.name.localeCompare(second.name);
  });
}

export default function Header({
  title,
  brand = false,
  back = false,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [portalReady, setPortalReady] = useState(false);
  const [account, setAccount] = useState<HeaderAccount | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  const [menuCategories, setMenuCategories] = useState<Category[]>(
    defaultCategories.filter((category) => category.active !== false),
  );

  const productCategories = useMemo(
    () => menuCategories.filter((category) => category.type === 'product'),
    [menuCategories],
  );
  const serviceCategories = useMemo(
    () => menuCategories.filter((category) => category.type === 'service'),
    [menuCategories],
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setActiveCategory(
      new URLSearchParams(window.location.search).get('category')?.trim() || '',
    );
  }, [pathname, menuOpen]);

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
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        if (!cancelled) {
          setAccount(null);
          setAccountReady(true);
        }
        return;
      }

      try {
        const tokenResult = await getIdTokenResult(firebaseUser);
        if (cancelled) return;

        setAccount({
          name:
            firebaseUser.displayName?.trim() ||
            firebaseUser.email?.split('@')[0] ||
            'JayLuxe Customer',
          email: firebaseUser.email || '',
          isAdmin: tokenResult.claims.admin === true,
        });
      } catch (error) {
        console.error('Header authentication state could not be read:', error);
        if (!cancelled) {
          setAccount({
            name:
              firebaseUser.displayName?.trim() ||
              firebaseUser.email?.split('@')[0] ||
              'JayLuxe Customer',
            email: firebaseUser.email || '',
            isAdmin: false,
          });
        }
      } finally {
        if (!cancelled) setAccountReady(true);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMenuCategories() {
      const [categoryResult, productResult] = await Promise.allSettled([
        getCategories(),
        getProducts(),
      ]);

      if (cancelled) return;

      const categories =
        categoryResult.status === 'fulfilled' ? categoryResult.value : [];
      const products =
        productResult.status === 'fulfilled' ? productResult.value : [];

      setMenuCategories(mergeNavigationCategories(categories, products));
    }

    void loadMenuCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setMenuMounted(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (activeCategory) setCategoriesOpen(true);
  }, [activeCategory]);

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
    }, 320);

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
    if (!activeCategory) setCategoriesOpen(false);
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

  async function handleSignOut() {
    closeMobileMenu();
    await Promise.allSettled([
      signOut(auth),
      fetch('/api/admin/session', { method: 'DELETE' }),
    ]);
    router.push('/');
    router.refresh();
  }

  function mobileRouteIsActive(href: string) {
    if (href === '/shop') {
      return pathname === '/shop' && !activeCategory;
    }

    if (href === '/services') {
      return pathname === '/services' && !activeCategory;
    }

    return routeIsActive(pathname, href);
  }

  const categoryMenuActive =
    pathname === '/categories' ||
    (Boolean(activeCategory) &&
      (pathname === '/shop' || pathname === '/services'));

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
                <button
                  type="button"
                  className="jl-mobile-menu-close"
                  onClick={closeMobileMenu}
                  aria-label="Close menu"
                  tabIndex={menuOpen ? 0 : -1}
                  autoFocus={menuOpen}
                >
                  <X size={21} aria-hidden="true" />
                </button>

                <Link
                  href="/"
                  className="jl-mobile-menu-brand"
                  onClick={closeMobileMenu}
                  tabIndex={menuOpen ? 0 : -1}
                >
                  <Image
                    src="/logo.png"
                    alt=""
                    width={46}
                    height={46}
                    className="jl-mobile-menu-logo"
                  />
                  <span>
                    <strong id="jl-mobile-menu-title">JayLuxe</strong>
                    <small>Beauty · Fashion · Lifestyle</small>
                  </span>
                </Link>
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

              <nav className="jl-mobile-primary-nav" aria-label="Mobile navigation">
                {mobileNavigation.slice(0, 2).map((item) => {
                  const Icon = item.icon;
                  const active = mobileRouteIsActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? 'active' : undefined}
                      aria-current={active ? 'page' : undefined}
                      onClick={closeMobileMenu}
                      tabIndex={menuOpen ? 0 : -1}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <div className={`jl-mobile-categories${categoryMenuActive ? ' active' : ''}`}>
                  <button
                    type="button"
                    className="jl-mobile-categories-trigger"
                    aria-expanded={categoriesOpen}
                    aria-controls="jl-mobile-category-panel"
                    onClick={() => setCategoriesOpen((open) => !open)}
                    tabIndex={menuOpen ? 0 : -1}
                  >
                    <Layers3 size={18} aria-hidden="true" />
                    <span>Categories</span>
                    <ChevronDown size={17} aria-hidden="true" />
                  </button>

                  <div
                    id="jl-mobile-category-panel"
                    className={`jl-mobile-category-panel${categoriesOpen ? ' is-open' : ''}`}
                  >
                    <div className="jl-mobile-category-panel-inner">
                      <Link
                        href="/categories"
                        className={`jl-mobile-all-categories${
                          pathname === '/categories' ? ' active' : ''
                        }`}
                        aria-current={pathname === '/categories' ? 'page' : undefined}
                        onClick={closeMobileMenu}
                        tabIndex={menuOpen && categoriesOpen ? 0 : -1}
                      >
                        View all categories
                      </Link>

                      <section aria-labelledby="jl-product-category-title">
                        <h3 id="jl-product-category-title">Products</h3>
                        <div className="jl-mobile-category-links">
                          {productCategories.map((category) => {
                            const active =
                              pathname === '/shop' &&
                              normalizeCategoryName(activeCategory) ===
                                normalizeCategoryName(category.name);
                            return (
                              <Link
                                key={`product-${category.id}`}
                                href={`/shop?category=${encodeURIComponent(category.name)}`}
                                className={active ? 'active' : undefined}
                                aria-current={active ? 'page' : undefined}
                                onClick={closeMobileMenu}
                                tabIndex={menuOpen && categoriesOpen ? 0 : -1}
                              >
                                {category.name}
                              </Link>
                            );
                          })}
                        </div>
                      </section>

                      <section aria-labelledby="jl-service-category-title">
                        <h3 id="jl-service-category-title">Services</h3>
                        <div className="jl-mobile-category-links">
                          {serviceCategories.map((category) => {
                            const active =
                              pathname === '/services' &&
                              normalizeCategoryName(activeCategory) ===
                                normalizeCategoryName(category.name);
                            return (
                              <Link
                                key={`service-${category.id}`}
                                href={`/services?category=${encodeURIComponent(category.name)}`}
                                className={active ? 'active' : undefined}
                                aria-current={active ? 'page' : undefined}
                                onClick={closeMobileMenu}
                                tabIndex={menuOpen && categoriesOpen ? 0 : -1}
                              >
                                {category.name}
                              </Link>
                            );
                          })}
                        </div>
                      </section>
                    </div>
                  </div>
                </div>

                {mobileNavigation.slice(2).map((item) => {
                  const Icon = item.icon;
                  const active = mobileRouteIsActive(item.href);
                  const count =
                    item.href === '/wishlist'
                      ? wishlistCount
                      : item.href === '/cart'
                        ? cartCount
                        : 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? 'active' : undefined}
                      aria-current={active ? 'page' : undefined}
                      onClick={closeMobileMenu}
                      tabIndex={menuOpen ? 0 : -1}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{item.label}</span>
                      {count > 0 ? <b>{count > 99 ? '99+' : count}</b> : null}
                    </Link>
                  );
                })}
              </nav>

              <div className="jl-mobile-account-area" aria-label="Account actions">
                {!accountReady ? (
                  <div className="jl-mobile-account-loading" role="status">
                    <User size={18} aria-hidden="true" /> Checking account…
                  </div>
                ) : account ? (
                  <>
                    <div className="jl-mobile-account-profile">
                      <span className="jl-mobile-account-avatar" aria-hidden="true">
                        {account.name.charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <strong>{account.name}</strong>
                        {account.email ? <small>{account.email}</small> : null}
                      </span>
                    </div>

                    {account.isAdmin ? (
                      <Link
                        href="/admin"
                        onClick={closeMobileMenu}
                        tabIndex={menuOpen ? 0 : -1}
                      >
                        <ShieldCheck size={18} aria-hidden="true" />
                        <span>Admin Dashboard</span>
                      </Link>
                    ) : null}

                    <Link
                      href="/account"
                      onClick={closeMobileMenu}
                      tabIndex={menuOpen ? 0 : -1}
                    >
                      <User size={18} aria-hidden="true" />
                      <span>My Account</span>
                    </Link>

                    <button
                      type="button"
                      className="jl-mobile-signout"
                      onClick={() => void handleSignOut()}
                      tabIndex={menuOpen ? 0 : -1}
                    >
                      <LogOut size={18} aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={closeMobileMenu}
                      tabIndex={menuOpen ? 0 : -1}
                    >
                      <LogIn size={18} aria-hidden="true" />
                      <span>Login</span>
                    </Link>
                    <Link
                      href="/register"
                      className="jl-mobile-create-account"
                      onClick={closeMobileMenu}
                      tabIndex={menuOpen ? 0 : -1}
                    >
                      <UserPlus size={18} aria-hidden="true" />
                      <span>Create Account</span>
                    </Link>
                  </>
                )}
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
            Curated luxury for beauty, fashion and lifestyle
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
                    <Menu size={24} strokeWidth={2.1} aria-hidden="true" />
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
