'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import {
  Activity,
  CreditCard,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from 'lucide-react';

import { hasAdminPermission, ROLE_LABELS } from '@/lib/adminPermissions';
import type { AdminSessionUser } from '@/lib/adminTypes';
import { auth } from '@/lib/firebase';

export default function AdminPageFrame({
  user,
  title,
  subtitle,
  actions,
  children,
}: Readonly<{
  user: AdminSessionUser;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, visible: true },
    {
      href: '/admin/users',
      label: 'Users',
      icon: Users,
      visible: user.role === 'super_admin',
    },
    {
      href: '/admin/activity',
      label: 'Activity',
      icon: Activity,
      visible: hasAdminPermission(user, 'activity'),
    },
    {
      href: '/admin/reports',
      label: 'Reports',
      icon: BarChart3,
      visible: hasAdminPermission(user, 'reports'),
    },
    {
      href: '/admin/installments',
      label: 'Installments',
      icon: CreditCard,
      visible: true,
    },
  ];

  async function logout() {
    await Promise.allSettled([
      fetch('/api/admin/session', { method: 'DELETE' }),
      signOut(auth),
    ]);
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <main className="amu-page">
      <header className="amu-topbar">
        <Link className="amu-brand" href="/admin">
          <span><Shield size={18} aria-hidden="true" /></span>
          <span>
            <strong>JayLuxe</strong>
            <small>Administration</small>
          </span>
        </Link>

        <nav className="amu-nav" aria-label="Administrator navigation">
          {links.filter((link) => link.visible).map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} aria-current={active ? 'page' : undefined}>
                <Icon size={17} aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="amu-account">
          <span>
            <strong>{user.fullName}</strong>
            <small>{ROLE_LABELS[user.role]}</small>
          </span>
          <button type="button" onClick={logout} aria-label="Log out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="amu-container">
        <section className="amu-heading">
          <div>
            <p>JayLuxe secure operations</p>
            <h1>{title}</h1>
            <span>{subtitle}</span>
          </div>
          {actions ? <div className="amu-heading-actions">{actions}</div> : null}
        </section>

        {children}
      </div>
    </main>
  );
}
