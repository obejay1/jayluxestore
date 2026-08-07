'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Keeps the Home page hero untouched and adds a narrowly scoped body class
 * on every other route so only hero artwork can be hidden by CSS.
 */
export default function HeroImageController() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    const isHomePage = pathname === '/';

    body.classList.remove('jl-home-page', 'jl-remove-hero-images');
    body.classList.add(isHomePage ? 'jl-home-page' : 'jl-remove-hero-images');

    return () => {
      body.classList.remove('jl-home-page', 'jl-remove-hero-images');
    };
  }, [pathname]);

  return null;
}
