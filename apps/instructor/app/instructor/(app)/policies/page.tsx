'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchInstructorPolicyDocument,
  type InstructorPolicyDocumentApi,
} from '@/lib/instructorApi';
import PolicyDocumentForm from '@/components/PolicyDocumentForm';

export default function PoliciesPage() {
  const [document, setDocument] = useState<InstructorPolicyDocumentApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchInstructorPolicyDocument();
      setDocument(data);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      const status = e?.status ?? 500;
      const raw = e?.message ?? 'Impossibile caricare le policy';
      if (status === 401 || /UNAUTHORIZED|No session/i.test(raw)) {
        setError('UNAUTHORIZED');
        setDocument({
          structured: {},
          freeform: '',
          version: 1,
          updated_by: null,
          updated_at: '',
        });
        return;
      }
      if (status === 403) {
        setError(raw || 'Non autorizzato');
        setDocument({
          structured: {},
          freeform: '',
          version: 1,
          updated_by: null,
          updated_at: '',
        });
        return;
      }
      setDocument({
        structured: {},
        freeform: '',
        version: 1,
        updated_by: null,
        updated_at: '',
      });
      const isConnectionError =
        /Failed to fetch|Load failed|NetworkError|polic(y|ies)|could not be loaded/i.test(raw);
      setError(isConnectionError
        ? 'Connessione non riuscita. Verifica che l\'API sia avviata (es. porta 3001) e riprova.'
        : raw);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleSuccess = () => {
    void loadPolicies();
  };

  if (loading && !document) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: 'rgba(148, 163, 184, 0.92)' }}>Caricamento…</p>
      </div>
    );
  }

  const doc: InstructorPolicyDocumentApi = document ?? {
    structured: {},
    freeform: '',
    version: 1,
    updated_by: null,
    updated_at: '',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
        Regole e policy
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '1.5rem' }}>
        Termini e condizioni per le tue lezioni.
      </p>

      {error && (
        <div
          style={{
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
          }}
        >
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
            onClick={() => void loadPolicies()}
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

      {document && (
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          Version {doc.version}
          {doc.updated_at && ` · Last updated ${new Date(doc.updated_at).toLocaleString()}`}
        </p>
      )}

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}
      >
        <PolicyDocumentForm document={doc} onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
