'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getBookingDrafts,
  confirmBookingDraft,
  rejectBookingDraftApi,
  type BookingDraftItem,
} from '@/lib/instructorApi';

type StatusFilter = 'all' | 'pending_review' | 'confirmed' | 'rejected';

function formatDate(dateStr: string): string {
  try {
    // Normalize: strip trailing time portion if present (e.g. "2026-02-21T00:00:00.000Z" → "2026-02-21")
    const bare = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.slice(0, 10);
    const d = new Date(bare + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr || '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  // HH:MM:SS → HH:MM
  return timeStr?.slice(0, 5) ?? timeStr;
}

function formatCreatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    pending_review: { bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
    confirmed: { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399', border: 'rgba(52, 211, 153, 0.3)' },
    rejected: { bg: 'rgba(248, 113, 113, 0.12)', text: '#f87171', border: 'rgba(248, 113, 113, 0.3)' },
    expired: { bg: 'rgba(148, 163, 184, 0.12)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  };
  const c = colors[status] ?? colors.expired;
  const labels: Record<string, string> = {
    pending_review: 'Pending review',
    confirmed: 'Confirmed',
    rejected: 'Rejected',
    expired: 'Expired',
  };

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      fontSize: '0.7rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      borderRadius: 20,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      {labels[status] ?? status}
    </span>
  );
}

export default function BookingDraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<BookingDraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const data = await getBookingDrafts({ status });
      setDrafts(data);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Error loading drafts');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const handleConfirm = async (id: string) => {
    setActionLoading(id);
    try {
      const result = await confirmBookingDraft(id);
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'confirmed' as const } : d)));
      // Redirect to the created booking detail page
      if (result?.bookingId) {
        router.push(`/instructor/bookings/${result.bookingId}`);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      alert(err?.message ?? 'Confirmation error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await rejectBookingDraftApi(id);
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'rejected' as const } : d)));
    } catch (e: unknown) {
      const err = e as { message?: string };
      alert(err?.message ?? 'Rejection error');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = drafts.filter((d) => d.status === 'pending_review').length;

  return (
    <main style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', margin: 0 }}>
          AI Booking Drafts
        </h1>
        {pendingCount > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(251, 191, 36, 0.2)',
            color: 'rgba(251, 191, 36, 0.95)',
            padding: '0 6px',
          }}>
            {pendingCount}
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '1.5rem' }}>
        Proposals generated by AI from customer booking requests. Review and confirm or reject.
      </p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        {(['all', 'pending_review', 'confirmed', 'rejected'] as StatusFilter[]).map((f) => {
          const labels: Record<StatusFilter, string> = {
            all: 'All',
            pending_review: 'Pending review',
            confirmed: 'Confirmed',
            rejected: 'Rejected',
          };
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px',
                fontSize: '0.8125rem',
                fontWeight: filter === f ? 700 : 500,
                background: filter === f ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: filter === f ? '#93c5fd' : 'rgba(148, 163, 184, 0.85)',
                border: `1px solid ${filter === f ? 'rgba(59, 130, 246, 0.4)' : 'rgba(148, 163, 184, 0.2)'}`,
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '1rem',
          background: 'rgba(248, 113, 113, 0.1)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          borderRadius: 8,
          color: '#fca5a5',
          fontSize: '0.875rem',
        }}>
          {error}
          <button type="button" onClick={() => void loadDrafts()} style={{
            marginLeft: 12,
            padding: '4px 12px',
            fontSize: '0.75rem',
            background: 'rgba(248, 113, 113, 0.2)',
            color: '#fca5a5',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: 4,
            cursor: 'pointer',
          }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(148, 163, 184, 0.7)' }}>
          Loading drafts…
        </div>
      ) : drafts.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'rgba(148, 163, 184, 0.6)',
          border: '1px dashed rgba(148, 163, 184, 0.2)',
          borderRadius: 12,
        }}>
          No booking drafts
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {drafts.map((d) => {
            const isPending = d.status === 'pending_review';
            const isExpanded = expandedId === d.id;
            const isActioning = actionLoading === d.id;

            return (
              <div
                key={d.id}
                style={{
                  border: `1px solid ${isPending ? 'rgba(251, 191, 36, 0.25)' : 'rgba(71, 85, 105, 0.4)'}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: isPending ? 'rgba(251, 191, 36, 0.04)' : 'rgba(30, 41, 59, 0.3)',
                }}
              >
                {/* Card header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto auto',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 20px',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)' }}>
                      {d.customerName ?? d.customerPhone ?? 'Customer'}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.8)', marginTop: 2 }}>
                      {d.resort ?? d.sport ?? 'Lesson'} · {d.lessonType ?? ''} · {d.partySize} {d.partySize === 1 ? 'person' : 'people'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.9)' }}>
                      {formatDate(d.bookingDate)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.75)' }}>
                      {formatTime(d.startTime)} – {formatTime(d.endTime)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.65)' }}>
                    {formatCreatedAt(d.createdAt)}
                  </div>
                  <StatusBadge status={d.status} />
                  <div style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.6)' }}>
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{
                    padding: '0 20px 20px',
                    borderTop: '1px solid rgba(71, 85, 105, 0.3)',
                  }}>
                    <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse', marginTop: 14 }}>
                      <tbody>
                        <DetailRow label="Customer" value={d.customerName ?? '—'} />
                        <DetailRow label="Phone" value={d.customerPhone ?? '—'} />
                        <DetailRow label="Date" value={formatDate(d.bookingDate)} />
                        <DetailRow label="Time" value={`${formatTime(d.startTime)} – ${formatTime(d.endTime)}${d.durationMinutes ? ` (${d.durationMinutes} min)` : ''}`} />
                        <DetailRow label="Group size" value={String(d.partySize)} />
                        <DetailRow label="Skill level" value={d.skillLevel ?? '—'} />
                        <DetailRow label="Type" value={d.lessonType ?? '—'} />
                        <DetailRow label="Sport" value={d.sport ?? '—'} />
                        <DetailRow label="Resort" value={d.resort ?? '—'} />
                        <DetailRow label="Meeting point" value={d.meetingPointText ?? '—'} />
                        <DetailRow label="AI confidence" value={`${Math.round(d.extractionConfidence * 100)}%`} />
                        {d.aiCustomerReply && (
                          <DetailRow label="AI reply" value={d.aiCustomerReply} />
                        )}
                        <DetailRow
                          label="Conversation"
                          value={
                            <Link
                              href={`/instructor/inbox?c=${d.conversationId}`}
                              style={{ color: '#60a5fa', textDecoration: 'underline' }}
                            >
                              View in Inbox
                            </Link>
                          }
                        />
                      </tbody>
                    </table>

                    {/* Actions */}
                    {isPending && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                        <button
                          type="button"
                          disabled={isActioning}
                          onClick={() => void handleConfirm(d.id)}
                          style={{
                            padding: '8px 24px',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            background: 'rgba(52, 211, 153, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(52, 211, 153, 0.4)',
                            borderRadius: 6,
                            cursor: isActioning ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isActioning ? '…' : 'Confirm booking'}
                        </button>
                        <button
                          type="button"
                          disabled={isActioning}
                          onClick={() => void handleReject(d.id)}
                          style={{
                            padding: '8px 24px',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            background: 'transparent',
                            color: 'rgba(248, 113, 113, 0.85)',
                            border: '1px solid rgba(248, 113, 113, 0.3)',
                            borderRadius: 6,
                            cursor: isActioning ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isActioning ? '…' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td style={{
        padding: '6px 16px 6px 0',
        fontWeight: 600,
        color: 'rgba(148, 163, 184, 0.9)',
        width: 140,
        verticalAlign: 'top',
      }}>
        {label}
      </td>
      <td style={{
        padding: '6px 0',
        color: 'rgba(226, 232, 240, 0.92)',
      }}>
        {value}
      </td>
    </tr>
  );
}
