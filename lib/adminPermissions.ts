import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
  type AdminRole,
} from '@/lib/adminTypes';

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
};

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  dashboard: 'Dashboard',
  products: 'Products & Services',
  categories: 'Categories',
  orders: 'Orders',
  bookings: 'Bookings',
  reports: 'Reports',
  promotions: 'Promotions',
  testimonials: 'Testimonials',
  customers: 'Customers',
  content: 'Gallery & Content',
  settings: 'Store Settings',
  activity: 'Activity Log',
  users: 'Admin & Staff Users',
};

export const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [...ADMIN_PERMISSIONS],
  admin: [
    'dashboard',
    'products',
    'categories',
    'orders',
    'bookings',
    'reports',
    'promotions',
    'testimonials',
    'customers',
    'content',
    'settings',
    'activity',
  ],
  staff: ['dashboard', 'orders', 'bookings', 'reports'],
};

export function normalizePermissions(
  role: AdminRole,
  permissions?: readonly string[] | null,
): AdminPermission[] {
  if (role === 'super_admin') return [...ADMIN_PERMISSIONS];

  const allowed = new Set<string>(ADMIN_PERMISSIONS);
  const supplied = (permissions || []).filter(
    (permission): permission is AdminPermission => allowed.has(permission),
  );

  return supplied.length > 0
    ? Array.from(new Set(supplied))
    : [...DEFAULT_ROLE_PERMISSIONS[role]];
}

export function hasAdminPermission(
  user: { role: AdminRole; permissions: readonly AdminPermission[] },
  permission: AdminPermission,
) {
  return user.role === 'super_admin' || user.permissions.includes(permission);
}
