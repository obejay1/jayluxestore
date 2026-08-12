'use client';

import { useState } from 'react';
import Link from 'next/link';

import styles from './HamburgerMenu.module.css';

const NAVIGATION_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Beauty Services', href: '/services' },
  { label: 'Bridal Package', href: '/bridal-package' },
  { label: 'Book Bridal Consultation', href: '/book-bridal-consultation' },
  { label: 'Before & After', href: '/before-after' },
  { label: 'Testimonials', href: '/testimonials' },
  { label: 'Promotions', href: '/promotions' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
];

export default function HamburgerMenu({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((open) => !open);
  const close = () => setIsOpen(false);


  return (
    <div className={`${styles.wrapper} ${className}`.trim()}>
      <button
        type="button"
        className={`${styles.hamburgerBtn} ${isOpen ? styles.open : ''}`}
        onClick={toggle}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        aria-controls="jayluxe-hamburger-menu"
      >
        <span className={styles.line} />
        <span className={styles.line} />
        <span className={styles.line} />
      </button>

      <nav
        id="jayluxe-hamburger-menu"
        className={`${styles.menuPanel} ${isOpen ? styles.open : ''}`}
        aria-label="JayLuxe quick navigation"
        aria-hidden={!isOpen}
      >
        <ul>
          {NAVIGATION_ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} onClick={close} tabIndex={isOpen ? 0 : -1}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
