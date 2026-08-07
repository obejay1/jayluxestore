'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, RefreshCw, Search } from 'lucide-react';

import { ROLE_LABELS } from '@/lib/adminPermissions';
import type { AdminActivityRecord, AdminRole } from '@/lib/adminTypes';

type ActivityResponse = {
  ok?: boolean;
  message?: string;
  records?: AdminActivityRecord[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters?: {
    actions: string[];
    users: Array<{ uid: string; name: string; email: string }>;
  };
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return {} as ActivityResponse;
  try {
    return JSON.parse(text) as ActivityResponse;
  } catch {
    return {} as ActivityResponse;
  }
}

export default function AdminActivityClient() {
  const [records, setRecords] = useState<AdminActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [user, setUser] = useState('');
  const [role, setRole] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [users, setUsers] = useState<Array<{ uid: string; name: string; email: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '25',
      });
      if (search.trim()) params.set('search', search.trim());
      if (user) params.set('user', user);
      if (role) params.set('role', role);
      if (action) params.set('action', action);
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const response = await fetch(`/api/admin/activity?${params.toString()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to load the activity log.');
      setRecords(data.records || []);
      setPagination(data.pagination || { page: 1, pageSize: 25, total: 0, totalPages: 1 });
      setActions(data.filters?.actions || []);
      setUsers(data.filters?.users || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the activity log.');
    } finally {
      setLoading(false);
    }
  }, [page, search, user, role, action, from, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  function resetFilters() {
    setSearch('');
    setUser('');
    setRole('');
    setAction('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <section className="amu-card">
      {error ? <p className="amu-message error" role="alert">{error}</p> : null}

      <div className="amu-toolbar" style={{ gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(3, minmax(145px, .7fr))' }}>
        <div className="amu-field">
          <label htmlFor="activity-search">Search activity</label>
          <div style={{ position: 'relative' }}>
            <Search size={17} aria-hidden="true" style={{ position: 'absolute', left: 13, top: 15, color: '#8c8172' }} />
            <input id="activity-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="User, email, action or description" style={{ paddingLeft: 40 }} />
          </div>
        </div>
        <div className="amu-field">
          <label htmlFor="activity-user">User</label>
          <select id="activity-user" value={user} onChange={(event) => { setUser(event.target.value); setPage(1); }}>
            <option value="">All users</option>
            {users.map((entry) => <option key={entry.uid} value={entry.email}>{entry.name || entry.email}</option>)}
          </select>
        </div>
        <div className="amu-field">
          <label htmlFor="activity-role">Role</label>
          <select id="activity-role" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
            <option value="">All roles</option>
            {(Object.keys(ROLE_LABELS) as AdminRole[]).map((entry) => <option key={entry} value={entry}>{ROLE_LABELS[entry]}</option>)}
          </select>
        </div>
        <div className="amu-field">
          <label htmlFor="activity-action">Action</label>
          <select id="activity-action" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}>
            <option value="">All actions</option>
            {actions.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
        </div>
      </div>

      <div className="amu-toolbar" style={{ gridTemplateColumns: 'repeat(2, minmax(160px, 240px)) auto' }}>
        <div className="amu-field">
          <label htmlFor="activity-from">From date</label>
          <input id="activity-from" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
        </div>
        <div className="amu-field">
          <label htmlFor="activity-to">To date</label>
          <input id="activity-to" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
          <button className="amu-button secondary" type="button" onClick={resetFilters}><Filter size={16} /> Clear filters</button>
          <button className="amu-button secondary" type="button" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="amu-empty">Loading administrator activity…</div>
      ) : records.length === 0 ? (
        <div className="amu-empty">No activity records match the selected filters.</div>
      ) : (
        <div className="amu-table-wrap">
          <table className="amu-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Description</th>
                <th>Date &amp; Time</th>
                <th>IP Address</th>
                <th>Browser</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="amu-user-cell">
                      <span className="amu-avatar">{record.userName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'JL'}</span>
                      <span><strong>{record.userName || 'Unknown user'}</strong><small>{record.email}</small></span>
                    </div>
                  </td>
                  <td><span className="amu-badge">{ROLE_LABELS[record.role] || record.role}</span></td>
                  <td><strong>{record.action}</strong></td>
                  <td style={{ maxWidth: 390, whiteSpace: 'normal', lineHeight: 1.5 }}>{record.description}</td>
                  <td>{formatDate(record.createdAt)}</td>
                  <td>{record.ipAddress || 'Unavailable'}</td>
                  <td style={{ maxWidth: 260, whiteSpace: 'normal', lineHeight: 1.4 }}>{record.browser || 'Unavailable'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="amu-pagination">
        <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} records</span>
        <div>
          <button className="amu-button secondary" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}><ChevronLeft size={16} /> Previous</button>
          <button className="amu-button secondary" type="button" onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={page >= pagination.totalPages}>Next <ChevronRight size={16} /></button>
        </div>
      </div>
    </section>
  );
}
