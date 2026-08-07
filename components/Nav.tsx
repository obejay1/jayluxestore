"use client";
import Link from 'next/link';
import { Home, ShoppingBag, ShoppingCart, User, Scissors } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCart } from '@/lib/store';
export default function Nav() {
  const p = usePathname();
  const [cartCount, setCartCount] = useState(0);
  useEffect(() => {
    const updateCount = () => {
      const c = getCart();
      setCartCount(c.reduce((sum, item) => sum + item.qty, 0));
    };
    updateCount();
    window.addEventListener('cart', updateCount);
    return () => window.removeEventListener('cart', updateCount);
  }, []);
  const items = [['/', 'Home', Home], ['/shop', 'Shop', ShoppingBag], ['/services', 'Services', Scissors], ['/cart', 'Cart', ShoppingCart], ['/account', 'Account', User]] as const;
  return <nav className="bottom-nav">{items.map(([href, label, Icon]) => <Link className={`nav-item ${p === href ? 'active' : ''}`} href={href} key={href}>
    <div style={{ position: 'relative' }}>
      <Icon size={24} />
      {href === '/cart' && cartCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 'bold' }}>{cartCount}</span>}
    </div>
    <span>{label}</span>
  </Link>)}</nav>;
}
