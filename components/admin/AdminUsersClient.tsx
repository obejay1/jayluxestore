'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Edit3,
  Eye,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';

import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
} from '@/lib/adminPermissions';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  ADMIN_STATUSES,
  type AdminPermission,
  type AdminRole,
  type AdminSessionUser,
  type AdminStatus,
  type AdminUserProfile,
} from '@/lib/adminTypes';

type ManagedUser = AdminUserProfile & {
  authCreatedAt?: string | null;
  authLastSignInAt?: string | null;
  authDisabled?: boolean;
};

type Stats = {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  disabledUsers: number;
  superAdmins: number;
  admins: number;
  staffMembers: number;
};

type UserForm = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  role: AdminRole;
  status: AdminStatus;
  permissions: AdminPermission[];
};

const emptyStats: Stats = {
  totalUsers: 0,
  activeUsers: 0,
  onlineUsers: 0,
  disabledUsers: 0,
  superAdmins: 0,
  admins: 0,
  staffMembers: 0,
};

const blankForm: UserForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phoneNumber: '',
  role: 'staff',
  status: 'active',
  permissions: [...DEFAULT_ROLE_PERMISSIONS.staff],
};

function formatDate(value?: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'JL';
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export default function AdminUsersClient({
  currentUser,
  onCreateRequested,
}: Readonly<{
  currentUser: AdminSessionUser;
  onCreateRequested?: boolean;
}>) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(
    onCreateRequested ? 'create' : null,
  );
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserForm>(blankForm);
  const pageSize = 10;

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/users', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(String(data.message || 'Unable to load administrator accounts.'));
      }
      setUsers((data.users as ManagedUser[]) || []);
      setStats((data.stats as Stats) || emptyStats);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        `${user.fullName} ${user.email} ${user.phoneNumber || ''}`
          .toLowerCase()
          .includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  function openCreate() {
    setSelected(null);
    setForm(blankForm);
    setMessage('');
    setError('');
    setModal('create');
  }

  function openEdit(user: ManagedUser) {
    setSelected(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      confirmPassword: '',
      phoneNumber: user.phoneNumber || '',
      role: user.role,
      status: user.status,
      permissions: [...user.permissions],
    });
    setMessage('');
    setError('');
    setModal('edit');
  }

  function openView(user: ManagedUser) {
    setSelected(user);
    setModal('view');
  }

  function closeModal() {
    if (busy) return;
    setModal(null);
    setSelected(null);
    setForm(blankForm);
  }

  function changeRole(role: AdminRole) {
    setForm((current) => ({
      ...current,
      role,
      permissions: [...DEFAULT_ROLE_PERMISSIONS[role]],
    }));
  }

  function togglePermission(permission: AdminPermission) {
    if (form.role === 'super_admin') return;
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (modal === 'create' && form.password !== form.confirmPassword) {
      setError('Temporary password and confirmation do not match.');
      return;
    }

    setBusy(true);
    try {
      const creating = modal === 'create';
      const response = await fetch(
        creating ? '/api/admin/users' : `/api/admin/users/${selected?.uid}`,
        {
          method: creating ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email,
            password: creating ? form.password : undefined,
            phoneNumber: form.phoneNumber,
            role: form.role,
            status: creating ? 'active' : form.status,
            permissions: form.permissions,
          }),
        },
      );
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.message || 'The user could not be saved.'));
      setMessage(String(data.message || 'The user was saved.'));
      await loadUsers();
      window.setTimeout(() => closeModal(), 750);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The user could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(user: ManagedUser, status: AdminStatus) {
    const label = status === 'active' ? 'enable' : 'disable';
    if (!window.confirm(`Are you sure you want to ${label} ${user.fullName}?`)) return;
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${user.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber || '',
          role: user.role,
          status,
          permissions: user.permissions,
        }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.message || 'The status could not be changed.'));
      setMessage(String(data.message || 'The status was changed.'));
      await loadUsers();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'The status could not be changed.');
    }
  }

  async function resetPassword(user: ManagedUser) {
    if (!window.confirm(`Send a password reset email to ${user.email}?`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${user.uid}/reset-password`, {
        method: 'POST',
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.message || 'The reset email could not be sent.'));
      setMessage(String(data.message || 'Password reset email sent.'));
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'The reset email could not be sent.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(user: ManagedUser) {
    if (!window.confirm(`Permanently delete ${user.fullName}? This removes the Firebase Authentication account.`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${user.uid}`, { method: 'DELETE' });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.message || 'The user could not be deleted.'));
      setMessage(String(data.message || 'The user was deleted.'));
      await loadUsers();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The user could not be deleted.');
    } finally {
      setBusy(false);
    }
  }

  const statCards = [
    ['Total Users', stats.totalUsers],
    ['Active Users', stats.activeUsers],
    ['Online Users', stats.onlineUsers],
    ['Disabled Users', stats.disabledUsers],
    ['Super Admins', stats.superAdmins],
    ['Admins', stats.admins],
    ['Staff Members', stats.staffMembers],
  ] as const;

  return (
    <>
      <div className="amu-heading-actions amu-mobile-create">
        <button className="amu-button" type="button" onClick={openCreate}>
          <Plus size={18} aria-hidden="true" /> Create User
        </button>
      </div>

      <section className="amu-stats" aria-label="Administrator account statistics">
        {statCards.map(([label, value]) => (
          <article className="amu-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="amu-card">
        {message ? <p className="amu-message" role="status">{message}</p> : null}
        {error ? <p className="amu-message error" role="alert">{error}</p> : null}

        <div className="amu-toolbar">
          <div className="amu-field">
            <label htmlFor="admin-user-search">Search users</label>
            <div style={{ position: 'relative' }}>
              <Search size={17} aria-hidden="true" style={{ position: 'absolute', left: 13, top: 15, color: '#8c8172' }} />
              <input
                id="admin-user-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email or phone"
                style={{ paddingLeft: 40 }}
              />
            </div>
          </div>
          <div className="amu-field">
            <label htmlFor="admin-role-filter">Role</label>
            <select id="admin-role-filter" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="all">All roles</option>
              {ADMIN_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select>
          </div>
          <div className="amu-field">
            <label htmlFor="admin-status-filter">Status</label>
            <select id="admin-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {ADMIN_STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="amu-empty"><RefreshCw size={24} className="spin" /> Loading administrator accounts…</div>
        ) : visibleUsers.length === 0 ? (
          <div className="amu-empty">No administrator or staff accounts match the selected filters.</div>
        ) : (
          <div className="amu-table-wrap">
            <table className="amu-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Presence</th>
                  <th>Last Login</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.uid}>
                    <td>
                      <div className="amu-user-cell">
                        <span className="amu-avatar">{initials(user.fullName)}</span>
                        <span><strong>{user.fullName}</strong><small>{user.phoneNumber || 'No phone number'}</small></span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td><span className="amu-badge">{ROLE_LABELS[user.role]}</span></td>
                    <td><span className={`amu-badge ${user.status}`}>{user.status[0].toUpperCase() + user.status.slice(1)}</span></td>
                    <td><span className={`amu-badge ${user.online ? 'online' : 'offline'}`}>{user.online ? '🟢 Online' : '⚪ Offline'}</span></td>
                    <td>{formatDate(user.lastLoginAt || user.authLastSignInAt)}</td>
                    <td>{formatDate(user.createdAt || user.authCreatedAt)}</td>
                    <td>
                      <div className="amu-actions">
                        <button className="amu-icon-button" type="button" onClick={() => openView(user)}><Eye size={14} /> View</button>
                        <button className="amu-icon-button" type="button" onClick={() => openEdit(user)}><Edit3 size={14} /> Edit</button>
                        <button className="amu-icon-button" type="button" onClick={() => void resetPassword(user)} disabled={busy}><KeyRound size={14} /> Reset Password</button>
                        {user.status === 'active' ? (
                          <button className="amu-icon-button" type="button" onClick={() => void updateStatus(user, 'disabled')} disabled={user.uid === currentUser.uid || busy}><UserX size={14} /> Disable</button>
                        ) : (
                          <button className="amu-icon-button" type="button" onClick={() => void updateStatus(user, 'active')} disabled={busy}><UserCheck size={14} /> Enable</button>
                        )}
                        <button className="amu-icon-button" type="button" onClick={() => void deleteUser(user)} disabled={user.uid === currentUser.uid || busy}><Trash2 size={14} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="amu-pagination">
          <span>Showing {visibleUsers.length} of {filteredUsers.length} matching users</span>
          <div>
            <button className="amu-button secondary" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Previous</button>
            <button className="amu-button secondary" type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>Next</button>
          </div>
        </div>
      </section>

      {modal ? (
        <div className="amu-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeModal(); }}>
          <section className="amu-modal" role="dialog" aria-modal="true" aria-labelledby="admin-user-modal-title">
            <header className="amu-modal-header">
              <h2 id="admin-user-modal-title">
                {modal === 'create' ? 'Create New Staff Account' : modal === 'edit' ? 'Edit User Account' : 'User Details'}
              </h2>
              <button className="amu-modal-close" type="button" onClick={closeModal} aria-label="Close"><X size={19} /></button>
            </header>

            {modal === 'view' && selected ? (
              <div className="amu-modal-body">
                <div className="amu-detail-grid">
                  <div><span>Full Name</span><strong>{selected.fullName}</strong></div>
                  <div><span>Email</span><strong>{selected.email}</strong></div>
                  <div><span>Role</span><strong>{ROLE_LABELS[selected.role]}</strong></div>
                  <div><span>Status</span><strong>{selected.status}</strong></div>
                  <div><span>Last Login</span><strong>{formatDate(selected.lastLoginAt || selected.authLastSignInAt)}</strong></div>
                  <div><span>Last Logout</span><strong>{formatDate(selected.lastLogoutAt)}</strong></div>
                  <div><span>Online Status</span><strong>{selected.online ? '🟢 Online' : '⚪ Offline'}</strong></div>
                  <div><span>Total Login Count</span><strong>{selected.loginCount}</strong></div>
                  <div><span>Phone Number</span><strong>{selected.phoneNumber || 'Not provided'}</strong></div>
                  <div><span>Created</span><strong>{formatDate(selected.createdAt || selected.authCreatedAt)}</strong></div>
                  <div className="full"><span>Permissions</span><strong>{selected.permissions.map((permission) => PERMISSION_LABELS[permission]).join(', ')}</strong></div>
                </div>
              </div>
            ) : (
              <form onSubmit={submitUser}>
                <div className="amu-modal-body">
                  {message ? <p className="amu-message" role="status">{message}</p> : null}
                  {error ? <p className="amu-message error" role="alert">{error}</p> : null}
                  <div className="amu-form-grid">
                    <div className="amu-field">
                      <label htmlFor="staff-full-name">Full Name</label>
                      <input id="staff-full-name" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} required maxLength={160} />
                    </div>
                    <div className="amu-field">
                      <label htmlFor="staff-email">Email Address</label>
                      <input id="staff-email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required maxLength={200} />
                    </div>
                    {modal === 'create' ? (
                      <>
                        <div className="amu-field">
                          <label htmlFor="staff-password">Temporary Password</label>
                          <input id="staff-password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required minLength={8} maxLength={128} autoComplete="new-password" />
                        </div>
                        <div className="amu-field">
                          <label htmlFor="staff-confirm-password">Confirm Password</label>
                          <input id="staff-confirm-password" type="password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} required minLength={8} maxLength={128} autoComplete="new-password" />
                        </div>
                      </>
                    ) : null}
                    <div className="amu-field">
                      <label htmlFor="staff-phone">Phone Number (optional)</label>
                      <input id="staff-phone" value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} placeholder="+2348012345678" maxLength={32} />
                    </div>
                    <div className="amu-field">
                      <label htmlFor="staff-role">Role</label>
                      <select id="staff-role" value={form.role} onChange={(event) => changeRole(event.target.value as AdminRole)}>
                        {ADMIN_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                      </select>
                    </div>
                    {modal === 'edit' ? (
                      <div className="amu-field full">
                        <label htmlFor="staff-status">Status</label>
                        <select id="staff-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AdminStatus }))}>
                          {ADMIN_STATUSES.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
                        </select>
                      </div>
                    ) : null}
                    <div className="amu-field full">
                      <label>Permissions</label>
                      <div className="amu-permissions">
                        {ADMIN_PERMISSIONS.map((permission) => (
                          <label key={permission}>
                            <input type="checkbox" checked={form.permissions.includes(permission)} onChange={() => togglePermission(permission)} disabled={form.role === 'super_admin'} />
                            {PERMISSION_LABELS[permission]}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <footer className="amu-modal-footer">
                  <button className="amu-button secondary" type="button" onClick={closeModal} disabled={busy}>Cancel</button>
                  <button className="amu-button" type="submit" disabled={busy}>{busy ? 'Saving…' : modal === 'create' ? 'Create User' : 'Save Changes'}</button>
                </footer>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
