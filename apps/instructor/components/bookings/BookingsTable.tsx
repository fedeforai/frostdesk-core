'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { updateInstructorBookingStatus, deleteInstructorBooking } from '@/lib/instructorApi';
import styles from './BookingsTable.module.css';

export type Booking = {
  id: string;
  customer_id?: string | null;
  customer_name: string | null;
  customer_display_name?: string | null;
  customer_phone?: string | null;
  start_time: string;
  end_time: string;
  status: string;
  payment_status?: string | null;
};

/** Prefer join-sourced customer info, fallback to legacy customer_name. */
function bookingCustomerLabel(b: Booking): string {
  const name = b.customer_display_name?.trim();
  if (name) return name;
  const phone = b.customer_phone?.trim();
  if (phone) return phone.length <= 6 ? `•••${phone.slice(-4)}` : `${phone.slice(0, 4)}•••${phone.slice(-4)}`;
  return b.customer_name?.trim() ?? '—';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

const ALL_STATUSES = ['draft', 'pending', 'confirmed', 'modified', 'cancelled', 'declined'] as const;

/** Valid transitions from each state (mirrors booking_state_machine.ts). */
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['pending', 'confirmed', 'cancelled'],
  pending: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['modified', 'cancelled'],
  modified: ['confirmed', 'modified', 'cancelled'],
  cancelled: ['draft', 'pending'],
  declined: ['draft', 'pending'],
};

function statusOptionsFor(current: string): string[] {
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  return [current, ...allowed.filter((s) => s !== current)];
}

type SortKey = 'id' | 'customer' | 'start' | 'end' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_FILTER_ALL = 'all';

export function BookingsTable({
  items,
  onUpdated,
}: {
  items: Booking[];
  onUpdated?: () => void;
}) {
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [sortKey, setSortKey] = useState<SortKey>('start');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'start' || key === 'end' ? 'desc' : 'asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;

    if (q) {
      list = list.filter((b) => {
        const label = bookingCustomerLabel(b).toLowerCase();
        const id = b.id.toLowerCase();
        return label.includes(q) || id.includes(q);
      });
    }

    if (statusFilter !== STATUS_FILTER_ALL) {
      list = list.filter((b) => b.status === statusFilter);
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'id':
          cmp = a.id.localeCompare(b.id);
          break;
        case 'customer':
          cmp = bookingCustomerLabel(a).localeCompare(bookingCustomerLabel(b));
          break;
        case 'start':
          cmp = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
          break;
        case 'end':
          cmp = new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        default:
          break;
      }
      return cmp * dir;
    });

    return list;
  }, [items, search, statusFilter, sortKey, sortDir]);

  async function handleStatusChange(id: string, newStatus: string) {
    setError(null);
    setChangingId(id);
    try {
      await updateInstructorBookingStatus(id, newStatus);
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setChangingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Cancel this booking? (It will be marked as cancelled.)')) return;
    setError(null);
    setChangingId(id);
    try {
      await deleteInstructorBooking(id);
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setChangingId(null);
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className={styles.sortIcon}>↕</span>;
    return (
      <span className={styles.sortIcon} aria-label={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search by customer or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search bookings"
        />
        <span className={styles.filterLabel}>Status</span>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value={STATUS_FILTER_ALL}>All</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <span className={styles.resultCount}>
          {filteredAndSorted.length} {filteredAndSorted.length === 1 ? 'booking' : 'bookings'}
        </span>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                className={`${styles.th} ${styles.thSortable} ${sortKey === 'id' ? styles.thActive : ''}`}
                onClick={() => handleSort('id')}
              >
                Booking ID
                <SortIcon column="id" />
              </th>
              <th
                className={`${styles.th} ${styles.thSortable} ${sortKey === 'customer' ? styles.thActive : ''}`}
                onClick={() => handleSort('customer')}
              >
                Customer
                <SortIcon column="customer" />
              </th>
              <th
                className={`${styles.th} ${styles.thSortable} ${sortKey === 'start' ? styles.thActive : ''}`}
                onClick={() => handleSort('start')}
              >
                Inizio
                <SortIcon column="start" />
              </th>
              <th
                className={`${styles.th} ${styles.thSortable} ${sortKey === 'end' ? styles.thActive : ''}`}
                onClick={() => handleSort('end')}
              >
                Fine
                <SortIcon column="end" />
              </th>
              <th
                className={`${styles.th} ${styles.thSortable} ${sortKey === 'status' ? styles.thActive : ''}`}
                onClick={() => handleSort('status')}
              >
                Status
                <SortIcon column="status" />
              </th>
              <th className={styles.th}>
                Pagamento
              </th>
              <th className={styles.th} style={{ width: '1%' }}>
                Azioni
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  {items.length === 0
                    ? 'No bookings yet.'
                    : 'No bookings match your search or filters.'}
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((b) => (
                <tr
                  key={b.id}
                  className={`${styles.tr} ${
                    b.status === 'confirmed' ? styles.trConfirmed : ''
                  } ${b.status === 'cancelled' || b.status === 'declined' ? styles.trMuted : ''}`}
                >
                  <td className={`${styles.td} ${styles.tdId}`}>
                    <Link
                      href={`/instructor/booking-lifecycle?bookingId=${b.id}`}
                      title={b.id}
                      className={styles.linkId}
                    >
                      {b.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className={`${styles.td} ${styles.tdCustomer}`}>
                    {bookingCustomerLabel(b)}
                  </td>
                  <td className={`${styles.td} ${styles.tdDateTime}`}>
                    {formatDateTime(b.start_time)}
                  </td>
                  <td className={`${styles.td} ${styles.tdDateTime}`}>
                    {formatDateTime(b.end_time)}
                  </td>
                  <td className={styles.td}>
                    <select
                      value={b.status}
                      onChange={(e) => handleStatusChange(b.id, e.target.value)}
                      disabled={changingId !== null}
                      className={`${styles.statusSelect} ${
                        b.status === 'confirmed' ? styles.statusConfirmed : ''
                      }`}
                      aria-label="Change status"
                    >
                      {statusOptionsFor(b.status).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={styles.td}>
                    <span className={b.payment_status === 'paid' ? styles.paymentPaid : styles.paymentUnpaid}>
                      {b.payment_status === 'paid' ? 'Pagato' : b.payment_status === 'pending' ? 'In attesa' : 'Non pagato'}
                    </span>
                  </td>
                  <td className={`${styles.td} ${styles.tdActions}`}>
                    <Link
                      href={`/instructor/bookings/${b.id}`}
                      className={styles.actionEdit}
                      aria-label="View or edit"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      disabled={changingId !== null}
                      className={styles.actionDelete}
                      aria-label="Delete booking"
                    >
                      {changingId === b.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
