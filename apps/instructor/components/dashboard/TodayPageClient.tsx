'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchInstructorBookings, getBookingDraftCount } from '@/lib/instructorApi';
import styles from './dashboard.module.css';

type TodayBooking = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string | null;
  customer_display_name?: string | null;
  payment_status?: string | null;
  conversation_id?: string | null;
};

function getTodayDate(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function customerLabel(b: TodayBooking): string {
  const name = (b.customer_display_name ?? b.customer_name)?.trim();
  return name || '—';
}

function isPaid(status: string | null | undefined): boolean {
  return status === 'paid';
}

export default function TodayPageClient() {
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  const [draftCount, setDraftCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const today = getTodayDate();
    try {
      const [bookingsRes, count] = await Promise.all([
        fetchInstructorBookings({ date_from: today, date_to: today }),
        getBookingDraftCount(),
      ]);
      const items = Array.isArray(bookingsRes?.items) ? bookingsRes.items : [];
      setTodayBookings(items as TodayBooking[]);
      setDraftCount(count);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : 'Failed to load' });
      setTodayBookings([]);
      setDraftCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const now = new Date().toISOString();
  const sorted = [...todayBookings].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const nextBooking =
    sorted.find((b) => b.start_time >= now && !['cancelled', 'declined'].includes(b.status)) ??
    sorted.find((b) => !['cancelled', 'declined'].includes(b.status)) ??
    null;
  const unpaidCount = todayBookings.filter((b) => !isPaid(b.payment_status)).length;

  if (loading) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.pageTitle}>Today</h1>
        <p className={styles.pageSub}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.pageTitle}>Today</h1>
        <p className={styles.pageSub} style={{ color: '#f87171' }}>
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid rgba(148,163,184,0.4)',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(226,232,240,0.95)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const today = getTodayDate();
  const bookingsTodayHref = `/instructor/bookings?date_from=${today}&date_to=${today}`;
  const unpaidHref = '/instructor/bookings?payment_status=unpaid';
  const proposalsHref = '/instructor/booking-drafts';

  return (
    <div className={styles.wrap}>
      <h1 className={styles.pageTitle}>Today</h1>
      <p className={styles.pageSub}>Daily control view</p>

      {/* Prossima lezione */}
      <section className={styles.section}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(226,232,240,0.9)', marginBottom: 10 }}>
          Prossima lezione
        </h2>
        {nextBooking ? (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.25)',
              background: 'rgba(30,41,59,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'rgba(226,232,240,0.95)' }}>
                {formatTime(nextBooking.start_time)} – {customerLabel(nextBooking)}
              </span>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.9)', marginTop: 4 }}>
                {nextBooking.status}
                {nextBooking.payment_status && nextBooking.payment_status !== 'paid' && (
                  <span style={{ marginLeft: 8, color: '#fbbf24' }}>· Non pagata</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link
                href={`/instructor/bookings/${nextBooking.id}`}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: 'rgba(34,197,94,0.2)',
                  color: 'rgba(134,239,172,0.95)',
                  border: '1px solid rgba(34,197,94,0.4)',
                  fontWeight: 600,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                Apri prenotazione
              </Link>
              {nextBooking.conversation_id && (
                <Link
                  href={`/instructor/inbox?c=${nextBooking.conversation_id}`}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(226,232,240,0.95)',
                    border: '1px solid rgba(148,163,184,0.3)',
                    fontWeight: 600,
                    fontSize: 13,
                    textDecoration: 'none',
                  }}
                >
                  Inbox
                </Link>
              )}
            </div>
          </div>
        ) : (
          <p style={{ color: 'rgba(148,163,184,0.9)', fontSize: 14 }}>No lessons today</p>
        )}
      </section>

      {/* Lezioni di oggi */}
      <section className={styles.section}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(226,232,240,0.9)', marginBottom: 10 }}>
          Today's lessons ({todayBookings.length})
        </h2>
        {todayBookings.length === 0 ? (
          <p style={{ color: 'rgba(148,163,184,0.9)', fontSize: 14 }}>No lessons today</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sorted.slice(0, 5).map((b) => (
              <li
                key={b.id}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid rgba(148,163,184,0.15)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: 'rgba(226,232,240,0.9)', fontSize: 14 }}>
                  {formatTime(b.start_time)} {customerLabel(b)}
                  {!isPaid(b.payment_status) && (
                    <span style={{ marginLeft: 6, color: '#fbbf24', fontSize: 12 }}>Non pagata</span>
                  )}
                </span>
                <Link
                  href={`/instructor/bookings/${b.id}`}
                  style={{ fontSize: 13, color: 'rgba(148,163,184,0.95)', textDecoration: 'none' }}
                >
                  Apri
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={bookingsTodayHref}
          style={{
            display: 'inline-block',
            marginTop: 10,
            fontSize: 14,
            color: 'rgba(96,165,250,0.95)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Vedi tutte le lezioni di oggi →
        </Link>
      </section>

      {/* Non pagate */}
      <section className={styles.section}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(226,232,240,0.9)', marginBottom: 10 }}>
          Non pagate ({unpaidCount})
        </h2>
        {unpaidCount === 0 ? (
          <p style={{ color: 'rgba(148,163,184,0.9)', fontSize: 14 }}>Nessuna prenotazione non pagata</p>
        ) : (
          <Link
            href={unpaidHref}
            style={{
              display: 'inline-block',
              padding: '10px 16px',
              borderRadius: 8,
              background: 'rgba(251,191,36,0.12)',
              color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.3)',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Vedi prenotazioni non pagate →
          </Link>
        )}
      </section>

      {/* Proposte */}
      <section className={styles.section}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgba(226,232,240,0.9)', marginBottom: 10 }}>
          Proposte da confermare ({draftCount})
        </h2>
        {draftCount === 0 ? (
          <p style={{ color: 'rgba(148,163,184,0.9)', fontSize: 14 }}>Nessuna proposta in attesa</p>
        ) : (
          <Link
            href={proposalsHref}
            style={{
              display: 'inline-block',
              padding: '10px 16px',
              borderRadius: 8,
              background: 'rgba(34,197,94,0.15)',
              color: 'rgba(134,239,172,0.95)',
              border: '1px solid rgba(34,197,94,0.35)',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Vedi proposte →
          </Link>
        )}
      </section>
    </div>
  );
}
