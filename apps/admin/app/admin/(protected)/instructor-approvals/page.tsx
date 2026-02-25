'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchPendingInstructors,
  approveInstructor,
  fetchInstructorWhatsappAccounts,
  verifyInstructorWhatsapp,
  type PendingInstructorItem,
  type InstructorWhatsappAccountItem,
} from '@/lib/adminApi';

// ── Types ────────────────────────────────────────────────────────────────

interface AdminInstructorRow {
  id: string;
  full_name: string | null;
  display_name: string | null;
  approval_status: string | null;
  profile_status: string | null;
  billing_status: string;
  account_health: string | null;
  created_at: string;
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  total_conversations: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
  } catch { return iso; }
}

function truncateId(id: string, max = 8): string {
  return id.length <= max ? id : id.slice(0, max) + '…';
}

function statusBadge(value: string | null, colorMap: Record<string, { bg: string; fg: string }>) {
  const v = value ?? 'unknown';
  const c = colorMap[v] ?? { bg: 'rgba(255, 255, 255, 0.06)', fg: '#6b7280' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 600, background: c.bg, color: c.fg }}>
      {v}
    </span>
  );
}

const APPROVAL_COLORS: Record<string, { bg: string; fg: string }> = {
  approved: { bg: '#d1fae5', fg: '#065f46' },
  pending: { bg: '#fef3c7', fg: '#92400e' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
};

const HEALTH_COLORS: Record<string, { bg: string; fg: string }> = {
  ok: { bg: '#d1fae5', fg: '#065f46' },
  warning: { bg: '#fef3c7', fg: '#92400e' },
  critical: { bg: '#fee2e2', fg: '#991b1b' },
};

const WHATSAPP_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  verified: { bg: '#d1fae5', fg: '#065f46' },
};

type Tab = 'pending' | 'all' | 'whatsapp';

// ── Main Component ───────────────────────────────────────────────────────

export default function InstructorApprovalsPage() {
  const [tab, setTab] = useState<Tab>('pending');

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(226, 232, 240, 0.95)', margin: 0 }}>Instructors</h1>
        <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
          Manage approvals and view all instructors on the platform.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid rgba(255, 255, 255, 0.1)', marginBottom: '1.5rem' }}>
        <TabButton label="Pending" active={tab === 'pending'} onClick={() => setTab('pending')} />
        <TabButton label="All Instructors" active={tab === 'all'} onClick={() => setTab('all')} />
        <TabButton label="WhatsApp" active={tab === 'whatsapp'} onClick={() => setTab('whatsapp')} />
      </div>

      {tab === 'pending' && <PendingTab />}
      {tab === 'all' && <AllInstructorsTab />}
      {tab === 'whatsapp' && <WhatsAppTab />}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '0.625rem 1.25rem',
        fontSize: '0.8125rem',
        fontWeight: active ? 600 : 400,
        color: active ? '#2563eb' : '#6b7280',
        background: 'none',
        border: 'none',
        borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
        marginBottom: '-2px',
        cursor: 'pointer',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ── Pending Tab (existing logic) ─────────────────────────────────────────

function PendingTab() {
  const [items, setItems] = useState<PendingInstructorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchPendingInstructors();
      setItems(res.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load pending instructors');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (instructorId: string, action: 'approved' | 'rejected') => {
    setActingId(instructorId);
    setError(null);
    try {
      await approveInstructor(instructorId, action);
      setItems((prev) => prev.filter((i) => i.id !== instructorId));
    } catch (e: any) {
      setError(e?.message ?? `Failed to ${action === 'approved' ? 'approve' : 'reject'}`);
    } finally {
      setActingId(null);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading…</div>;

  if (error) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#991b1b', fontSize: '0.875rem' }}>
        {error}
        <br />
        <button type="button" onClick={load} style={{ marginTop: '0.5rem', padding: '0.375rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.8125rem' }}>Retry</button>
      </div>
    );
  }

  if (items.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>No instructors pending approval.</div>;
  }

  return (
    <div style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem', overflow: 'hidden' }}>
      {items.map((item) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', fontSize: '0.9375rem' }}>{item.email ?? truncateId(item.id)}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>ID: {truncateId(item.id, 12)} · {formatDate(item.created_at)}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={() => handleAction(item.id, 'approved')} disabled={actingId !== null} style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #059669', background: '#059669', color: '#fff', fontWeight: 600, fontSize: '0.8125rem', cursor: actingId !== null ? 'not-allowed' : 'pointer', opacity: actingId !== null ? 0.7 : 1 }}>
              {actingId === item.id ? '…' : 'Approve'}
            </button>
            <button type="button" onClick={() => handleAction(item.id, 'rejected')} disabled={actingId !== null} style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #dc2626', background: 'rgba(255, 255, 255, 0.05)', color: '#dc2626', fontWeight: 600, fontSize: '0.8125rem', cursor: actingId !== null ? 'not-allowed' : 'pointer', opacity: actingId !== null ? 0.7 : 1 }}>
              {actingId === item.id ? '…' : 'Reject'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── All Instructors Tab (new) ────────────────────────────────────────────

function AllInstructorsTab() {
  const [rows, setRows] = useState<AdminInstructorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qp = new URLSearchParams();
      qp.set('limit', String(PAGE_SIZE));
      qp.set('offset', String(offset));
      if (statusFilter) qp.set('approval_status', statusFilter);

      const res = await fetch(`/api/admin/instructors?${qp.toString()}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? 'API error');
      setRows(json.data?.items ?? []);
      setTotal(json.data?.total ?? 0);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load instructors');
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  const th: React.CSSProperties = {
    padding: '0.625rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
    whiteSpace: 'nowrap',
  };

  const td: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    fontSize: '0.8125rem',
    color: 'rgba(148, 163, 184, 0.9)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  };

  return (
    <>
      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.6875rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</label>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} style={{ padding: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', fontSize: '0.8125rem', minWidth: 130 }}>
            <option value="">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', alignSelf: 'center' }}>
          {total} total instructors
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading…</div>
      ) : error ? (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#991b1b', fontSize: '0.875rem' }}>
          {error}
          <br />
          <button type="button" onClick={load} style={{ marginTop: '0.5rem', padding: '0.375rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.8125rem' }}>Retry</button>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                  <th style={th}>Name</th>
                  <th style={th}>Status</th>
                  <th style={th}>Profile</th>
                  <th style={th}>Health</th>
                  <th style={th}>Bookings</th>
                  <th style={th}>Confirmed</th>
                  <th style={th}>Cancelled</th>
                  <th style={th}>Conversations</th>
                  <th style={th}>Registered</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No instructors found</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} style={{ transition: 'background 0.1s' }}>
                    <td style={td}>
                      <div style={{ fontWeight: 500, color: 'rgba(226, 232, 240, 0.95)' }}>{r.display_name ?? r.full_name ?? '—'}</div>
                      {r.full_name && r.display_name && r.display_name !== r.full_name && (
                        <div style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{r.full_name}</div>
                      )}
                      <div style={{ fontSize: '0.6875rem', color: '#9ca3af', fontFamily: 'monospace' }}>{truncateId(r.id, 12)}</div>
                    </td>
                    <td style={td}>{statusBadge(r.approval_status, APPROVAL_COLORS)}</td>
                    <td style={td}>{statusBadge(r.profile_status, { active: { bg: '#d1fae5', fg: '#065f46' }, draft: { bg: '#e0e7ff', fg: '#3730a3' } })}</td>
                    <td style={td}>{statusBadge(r.account_health, HEALTH_COLORS)}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 600 }}>{r.total_bookings}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: r.confirmed_bookings > 0 ? '#059669' : '#9ca3af' }}>{r.confirmed_bookings}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: r.cancelled_bookings > 0 ? '#dc2626' : '#9ca3af' }}>{r.cancelled_bookings}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 600 }}>{r.total_conversations}</td>
                    <td style={{ ...td, fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {hasPrev && (
                <button type="button" onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} style={{ padding: '0.375rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.8125rem' }}>
                  ← Previous
                </button>
              )}
              {hasNext && (
                <button type="button" onClick={() => setOffset(offset + PAGE_SIZE)} style={{ padding: '0.375rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.8125rem' }}>
                  Next →
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── WhatsApp Tab (list + verify) ─────────────────────────────────────────

function WhatsAppTab() {
  const [items, setItems] = useState<InstructorWhatsappAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchInstructorWhatsappAccounts();
      setItems(res.items ?? []);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Failed to load WhatsApp accounts');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerify = async (instructorId: string) => {
    setActingId(instructorId);
    setError(null);
    try {
      await verifyInstructorWhatsapp(instructorId);
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Failed to verify');
    } finally {
      setActingId(null);
    }
  };

  const th: React.CSSProperties = {
    padding: '0.625rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
    whiteSpace: 'nowrap',
  };

  const td: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    fontSize: '0.8125rem',
    color: 'rgba(148, 163, 184, 0.9)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#991b1b', fontSize: '0.875rem' }}>
        {error}
        <br />
        <button type="button" onClick={load} style={{ marginTop: '0.5rem', padding: '0.375rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.8125rem' }}>Retry</button>
      </div>
    );
  }

  return (
    <>
      <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginBottom: '1rem' }}>
        Collegamenti WhatsApp degli istruttori. Conferma i numeri in attesa con &quot;Verifica&quot;.
      </p>
      <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
              <th style={th}>Instructor</th>
              <th style={th}>Phone number</th>
              <th style={th}>Status</th>
              <th style={th}>Created</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No WhatsApp accounts linked.</td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.instructor_id} style={{ transition: 'background 0.1s' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 500, color: 'rgba(226, 232, 240, 0.95)' }}>{row.full_name ?? '—'}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#9ca3af', fontFamily: 'monospace' }}>{truncateId(row.instructor_id, 12)}</div>
                  </td>
                  <td style={td}>{row.phone_number}</td>
                  <td style={td}>{statusBadge(row.status, WHATSAPP_STATUS_COLORS)}</td>
                  <td style={{ ...td, fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                  <td style={td}>
                    {row.status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => void handleVerify(row.instructor_id)}
                        disabled={actingId !== null}
                        style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #059669',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#059669',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          cursor: actingId !== null ? 'not-allowed' : 'pointer',
                          opacity: actingId !== null ? 0.7 : 1,
                        }}
                      >
                        {actingId === row.instructor_id ? '…' : 'Verifica'}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
