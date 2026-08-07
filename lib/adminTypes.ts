export const ADMIN_ROLES = ['super_admin', 'admin', 'staff'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_STATUSES = [
  'active',
  'inactive',
  'suspended',
  'disabled',
] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export const ADMIN_PERMISSIONS = [
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
  'users',
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export type AdminUserProfile = {
  uid: string;
  fullName: string;
  email: string;
  emailLower: string;
  phoneNumber: string | null;
  role: AdminRole;
  status: AdminStatus;
  permissions: AdminPermission[];
  online: boolean;
  loginCount: number;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  authCreatedAt?: string | null;
  authLastSignInAt?: string | null;
};

export type AdminSessionUser = Pick<
  AdminUserProfile,
  'uid' | 'fullName' | 'email' | 'role' | 'status' | 'permissions'
>;

export type AdminActivityRecord = {
  id: string;
  actorUid: string;
  userName: string;
  email: string;
  role: AdminRole;
  action: string;
  description: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  browser: string | null;
  createdAt: string | null;
};
