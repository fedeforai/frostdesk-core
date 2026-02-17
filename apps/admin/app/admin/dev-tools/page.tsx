'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface AuditLogRow {
  id: string;
  created_at: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  event_type: string | null;
  entity_type: string;
  entity_id: string | null;
  severity: string;
  request_id: string | null;
  ip: string | null;
  user_agent: string | null;
  payload: Record<string, unknown> | null;
}

const SEVERITY_COLORS: Record<string, { bg: string; fg: string }> = {
  info: { bg: '#dbeafe', fg: '#1e40af' },
  warn: { bg: '#fef3c7', fg: '#92400e' },
  error: { bg: '#fee2e2', fg: '#991b1b' },
};

const ENTITY_TYPES = [
  '', 'booking', 'conversation', 'message', 'feature_flag',
  'instructor', 'instructor_profile', 'instructor_policy',
  'customer', 'ai_booking_draft', 'whatsapp_account',
];

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return iso; }
}

function shortId(id: string | null): string {
  if (!id) return '—';
  return id.length > 12 ? id.slice(0, 8) + '…' : id;
}

const PAGE_SIZE = 30;

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async (append = false, cursorOverride?: string | null) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const qp = new URLSearchParams();
      qp.set('limit', String(PAGE_SIZE));
      if (entityType) qp.set('entity_type', entityType);
      if (entityId.trim()) qp.set('entity_id', entityId.trim());
      const c = append ? (cursorOverride ?? cursor) : null;
      if (c) qp.set('cursor', c);

      const res = await fetch(`/api/admin/audit?${qp.toString()}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? 'API error');

      const items: AuditLogRow[] = json.data?.items ?? [];
      const nextCursor: string | null = json.data?.next_cursor ?? null;

      if (append) setRows((prev) => [...prev, ...items]);
      else setRows(items);

      setCursor(nextCursor);
      setHasMore(nextCursor !== null);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load logs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [entityType, entityId, cursor]);

  // Initial load + re-fetch when filters change
  useEffect(() => {
    fetchLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(() => { fetchLogs(false); }, 15_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, entityType, entityId]);

  const handleFilter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchLogs(false);
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
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'top',
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'rgba(226, 232, 240, 0.95)', margin: 0 }}>Audit Log</h1>
          <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
            Operational log: bookings, conversations, instructors, AI, feature flags.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#6b7280', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh 15s
          </label>
          <button type="button" onClick={() => fetchLogs(false)} disabled={loading} style={{ padding: '0.375rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.8125rem' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilter} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.6875rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Entity Type</label>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} style={{ padding: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', fontSize: '0.8125rem', minWidth: 150 }}>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t || 'All'}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.6875rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Entity ID</label>
          <input type="text" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="UUID (optional)" style={{ padding: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', fontSize: '0.8125rem', width: 260 }} />
        </div>
        <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer' }}>
          Filter
        </button>
        {(entityType || entityId) && (
          <button type="button" onClick={() => { setEntityType(''); setEntityId(''); }} style={{ fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </form>

      {/* Count */}
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.75rem' }}>
        {rows.length} events loaded{hasMore ? ' · more available' : ''}
      </div>

      {/* Content */}
      {loading && rows.length === 0 ? (
        <div style={{ padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading logs...</div>
      ) : error ? (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#991b1b', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
          <br />
          <button type="button" onClick={() => fetchLogs(false)} style={{ marginTop: '0.5rem', padding: '0.375rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.8125rem' }}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                  <th style={th}>Date</th>
                  <th style={th}>Severity</th>
                  <th style={th}>Action</th>
                  <th style={th}>Actor</th>
                  <th style={th}>Entity</th>
                  <th style={th}>Entity ID</th>
                  <th style={th}>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No events found</td></tr>
                ) : rows.map((row) => {
                  const sc = SEVERITY_COLORS[row.severity] ?? SEVERITY_COLORS.info;
                  const isExpanded = expandedRow === row.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                      style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.06)' : undefined, transition: 'background 0.1s' }}
                    >
                      <td style={{ ...td, whiteSpace: 'nowrap', fontSize: '0.75rem', color: '#6b7280' }}>{formatTs(row.created_at)}</td>
                      <td style={td}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 600, background: sc.bg, color: sc.fg }}>
                          {row.severity}
                        </span>
                      </td>
                      <td style={{ ...td, fontWeight: 500, color: 'rgba(226, 232, 240, 0.95)' }}>{row.action}</td>
                      <td style={td}>
                        <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>{row.actor_type}</span>
                        {row.actor_id && <span style={{ display: 'block', fontSize: '0.6875rem', color: '#9ca3af', fontFamily: 'monospace' }}>{shortId(row.actor_id)}</span>}
                      </td>
                      <td style={{ ...td, fontSize: '0.75rem' }}>{row.entity_type}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.6875rem', color: '#6b7280' }} title={row.entity_id ?? undefined}>{shortId(row.entity_id)}</td>
                      <td style={{ ...td, fontSize: '0.75rem', color: '#9ca3af' }}>
                        {isExpanded && row.payload ? (
                          <pre style={{ margin: 0, fontSize: '0.6875rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: 320, color: 'rgba(148, 163, 184, 0.9)', background: 'rgba(255, 255, 255, 0.06)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                            {JSON.stringify(row.payload, null, 2)}
                          </pre>
                        ) : row.payload ? (
                          <span style={{ color: '#3b82f6', fontSize: '0.6875rem' }}>payload →</span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => fetchLogs(true, cursor)}
                disabled={loadingMore}
                style={{ padding: '0.5rem 1.5rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', background: 'rgba(255, 255, 255, 0.05)', cursor: loadingMore ? 'wait' : 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
