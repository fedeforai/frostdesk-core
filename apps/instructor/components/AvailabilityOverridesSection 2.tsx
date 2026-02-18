'use client';

import { useState, useEffect } from 'react';
import {
  fetchAvailabilityOverrides,
  createAvailabilityOverride,
  deleteAvailabilityOverride,
  type AvailabilityOverrideItem,
} from '@/lib/instructorApi';

function formatOverrideDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { dateStyle: 'short' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function toISOStartOfDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function toISOEndOfDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

export default function AvailabilityOverridesSection() {
  const [overrides, setOverrides] = useState<AvailabilityOverrideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDate, setAddDate] = useState('');
  const [addType, setAddType] = useState<'block' | 'add'>('block');
  const [addStartTime, setAddStartTime] = useState('09:00');
  const [addEndTime, setAddEndTime] = useState('17:00');
  const [submitting, setSubmitting] = useState(false);

  const loadOverrides = async () => {
    try {
      setLoading(true);
      setError(null);
      const from = new Date();
      const to = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const data = await fetchAvailabilityOverrides({ from: from.toISOString(), to: to.toISOString() });
      setOverrides(data);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load exceptions');
      setOverrides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverrides();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDate.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      const isBlock = addType === 'block';
      let startUtc: string;
      let endUtc: string;
      if (isBlock) {
        startUtc = toISOStartOfDay(addDate);
        endUtc = toISOEndOfDay(addDate);
      } else {
        // Local date + time, then to ISO (UTC)
        startUtc = new Date(`${addDate}T${addStartTime}`).toISOString();
        endUtc = new Date(`${addDate}T${addEndTime}`).toISOString();
      }
      await createAvailabilityOverride({
        start_utc: startUtc,
        end_utc: endUtc,
        is_available: !isBlock,
      });
      setAddDate('');
      await loadOverrides();
    } catch (e) {
      setError((e as Error).message ?? 'Failed to add exception');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await deleteAvailabilityOverride(id);
      await loadOverrides();
    } catch (e) {
      setError((e as Error).message ?? 'Failed to delete');
    }
  };

  return (
    <div style={{
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginTop: '1.5rem',
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.5rem' }}>
        Exceptions (date-specific)
      </h2>
      <p style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '1rem' }}>
        Block a day or add extra availability for a specific date. These override your recurring weekly windows.
      </p>

      {error && (
        <div style={{
          padding: '0.5rem 0.75rem',
          marginBottom: '1rem',
          backgroundColor: 'rgba(185, 28, 28, 0.2)',
          border: '1px solid rgba(248, 113, 113, 0.4)',
          borderRadius: 6,
          fontSize: '0.875rem',
          color: '#fca5a5',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)' }}>Date</span>
          <input
            type="date"
            value={addDate}
            onChange={(e) => setAddDate(e.target.value)}
            required
            style={{
              padding: '0.375rem 0.5rem',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(226, 232, 240, 0.95)',
              fontSize: '0.875rem',
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)' }}>Type</span>
          <select
            value={addType}
            onChange={(e) => setAddType(e.target.value as 'block' | 'add')}
            style={{
              padding: '0.375rem 0.5rem',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(226, 232, 240, 0.95)',
              fontSize: '0.875rem',
            }}
          >
            <option value="block">Block (unavailable)</option>
            <option value="add">Add (extra window)</option>
          </select>
        </label>
        {addType === 'add' && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)' }}>Start</span>
              <input
                type="time"
                value={addStartTime}
                onChange={(e) => setAddStartTime(e.target.value)}
                style={{
                  padding: '0.375rem 0.5rem',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(226, 232, 240, 0.95)',
                  fontSize: '0.875rem',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)' }}>End</span>
              <input
                type="time"
                value={addEndTime}
                onChange={(e) => setAddEndTime(e.target.value)}
                style={{
                  padding: '0.375rem 0.5rem',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(226, 232, 240, 0.95)',
                  fontSize: '0.875rem',
                }}
              />
            </label>
          </>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {submitting ? 'Adding…' : 'Add exception'}
        </button>
      </form>

      {loading ? (
        <p style={{ color: 'rgba(148, 163, 184, 0.9)', fontSize: '0.875rem' }}>Loading exceptions…</p>
      ) : overrides.length === 0 ? (
        <p style={{ color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.875rem' }}>No exceptions in the next 90 days.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(148, 163, 184, 0.9)' }}>From</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(148, 163, 184, 0.9)' }}>To</th>
                <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(148, 163, 184, 0.9)' }}>Type</th>
                <th style={{ padding: '0.5rem', textAlign: 'right', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(148, 163, 184, 0.9)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <td style={{ padding: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }}>{formatOverrideDate(o.start_utc)}</td>
                  <td style={{ padding: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(226, 232, 240, 0.95)' }}>{formatOverrideDate(o.end_utc)}</td>
                  <td style={{ padding: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ color: o.is_available ? 'rgba(34, 197, 94, 0.9)' : 'rgba(248, 113, 113, 0.9)' }}>
                      {o.is_available ? 'Add' : 'Block'}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.06)', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => void handleDelete(o.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        color: '#fca5a5',
                        background: 'transparent',
                        border: '1px solid rgba(248, 113, 113, 0.4)',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
