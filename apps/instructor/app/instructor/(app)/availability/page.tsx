'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAvailability, deactivateAvailability } from '@/lib/instructorApi';
import type { InstructorAvailability } from '@/lib/instructorApi';
import AvailabilityTable from '@/components/AvailabilityTable';
import AvailabilityForm from '@/components/AvailabilityForm';

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<InstructorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAvailability, setEditingAvailability] = useState<InstructorAvailability | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAvailability();
      setAvailability(data);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      const status = e?.status;
      const raw = e?.message ?? 'Impossibile caricare la disponibilità';
      if (status === 401 || /UNAUTHORIZED|No session/i.test(raw)) {
        setError('UNAUTHORIZED');
        return;
      }
      if (status === 403) {
        setError(raw || 'Non autorizzato');
        return;
      }
      if (status === 404) {
        setError(raw || 'Profilo non trovato');
        return;
      }
      const isConnectionError =
        /Failed to fetch|Load failed|NetworkError|Unable to load|failed.*availability|availability.*failed|load availability|FAILED_TO_LOAD/i.test(raw) ||
        (/\bavailability\b/i.test(raw) && /\b(fail|error|load)\b/i.test(raw));
      const msg = isConnectionError
        ? 'Connessione non riuscita. Verifica che l\'API sia avviata (es. porta 3001) e riprova.'
        : raw;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: InstructorAvailability) => {
    setEditingAvailability(item);
    setShowAddForm(false);
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingAvailability(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingAvailability(null);
  };

  const handleSuccess = () => {
    window.location.reload();
  };

  const handleDeactivate = async (item: InstructorAvailability) => {
    try {
      await deactivateAvailability(item.id);
      window.location.reload();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Impossibile disattivare la disponibilità');
    }
  };

  if (loading && availability.length === 0 && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: 'rgba(148, 163, 184, 0.92)' }}>Caricamento…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
        Disponibilità
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '1.5rem' }}>
        Orari e finestre in cui sei disponibile per le lezioni.
      </p>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(185, 28, 28, 0.2)',
          border: '1px solid rgba(248, 113, 113, 0.5)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.875rem',
          color: '#fca5a5',
        }}>
          <span>
            {error === 'UNAUTHORIZED' ? (
              <>Sessione scaduta o non autenticato. <Link href="/instructor/login" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>Accedi</Link></>
            ) : (
              error
            )}
          </span>
          {error !== 'UNAUTHORIZED' && (
          <button
            type="button"
            onClick={() => void loadAvailability()}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: 6,
              border: '1px solid rgba(248, 113, 113, 0.6)',
              background: 'transparent',
              color: '#fca5a5',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.8125rem',
            }}
          >
            Riprova
          </button>
          )}
        </div>
      )}

      {showAddForm || editingAvailability ? (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
            {editingAvailability ? 'Edit Availability' : 'Add Availability'}
          </h2>
          <AvailabilityForm
            availability={editingAvailability}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </div>
      ) : (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}>
          <AvailabilityTable
            availability={availability}
            onEdit={handleEdit}
            onDeactivate={handleDeactivate}
            onAdd={handleAdd}
          />
        </div>
      )}
    </div>
  );
}
