'use client';

import { useEffect, useRef, useState } from 'react';
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
  { label: 'Installments', href: '/account/installments' },
];

export default function HamburgerMenu({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);

  const toggle = () => setIsOpen((open) => !open);
  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) close();
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className={`${styles.wrapper} ${className}`.trim()}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.hamburgerBtn} ${isOpen ? styles.open : ''}`}
        onClick={toggle}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
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
