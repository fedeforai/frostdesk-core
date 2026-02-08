'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import {
  fetchPendingInstructors,
  approveInstructor,
  type PendingInstructorItem,
} from '@/lib/adminApi';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function truncateId(id: string, max = 8): string {
  if (id.length <= max) return id;
  return id.slice(0, max) + '…';
}

export default function InstructorApprovalsPage() {
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

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (instructorId: string) => {
    setActingId(instructorId);
    setError(null);
    try {
      await approveInstructor(instructorId, 'approved');
      setItems((prev) => prev.filter((i) => i.id !== instructorId));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to approve');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (instructorId: string) => {
    setActingId(instructorId);
    setError(null);
    try {
      await approveInstructor(instructorId, 'rejected');
      setItems((prev) => prev.filter((i) => i.id !== instructorId));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to reject');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Instructor approvals', href: '/admin/instructor-approvals' },
        ]}
      />
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 600, color: '#111827' }}>
          Instructor in attesa di approvazione
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Approva o rifiuta le richieste; dopo l&apos;approvazione l&apos;instructor potrà accedere e completare l&apos;onboarding.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          backgroundColor: '#fafafa',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
            Caricamento…
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
            Nessun instructor in attesa
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map((item) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #e5e7eb',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9375rem' }}>
                    {item.email ?? truncateId(item.id)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    ID: {truncateId(item.id, 12)} · {formatDate(item.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleApprove(item.id)}
                    disabled={actingId !== null}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #059669',
                      background: '#059669',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: actingId !== null ? 'not-allowed' : 'pointer',
                      opacity: actingId !== null ? 0.7 : 1,
                    }}
                  >
                    {actingId === item.id ? '…' : 'Approva'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(item.id)}
                    disabled={actingId !== null}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #dc2626',
                      background: '#fff',
                      color: '#dc2626',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: actingId !== null ? 'not-allowed' : 'pointer',
                      opacity: actingId !== null ? 0.7 : 1,
                    }}
                  >
                    {actingId === item.id ? '…' : 'Rifiuta'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: '#6b7280' }}>
        <Link href="/admin/dashboard" style={{ color: '#2563eb', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}
