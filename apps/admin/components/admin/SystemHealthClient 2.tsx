'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchSystemHealth, type SystemHealthSnapshot } from '@/lib/adminApi';
import SystemHealthPanel from '@/components/admin/SystemHealthPanel';

const FALLBACK_SNAPSHOT: SystemHealthSnapshot = {
  emergency_disabled: false,
  ai_global_enabled: true,
  ai_whatsapp_enabled: true,
  quota: {
    status: 'ok',
    channel: 'whatsapp',
    limit: 100,
    used_today: 0,
    percentage: 0,
  },
  activity_today: {
    conversations_ai_eligible: 0,
    escalations: 0,
    drafts_generated: 0,
    drafts_sent: 0,
  },
};

export default function SystemHealthClient() {
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot>(FALLBACK_SNAPSHOT);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchSystemHealth();
      if (data?.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        setIsLive(true);
      } else {
        setSnapshot(FALLBACK_SNAPSHOT);
        setIsLive(false);
      }
    } catch {
      setSnapshot(FALLBACK_SNAPSHOT);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>
        Caricamento dati da API e DB…
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => { setLoading(true); load(); }}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(255, 255, 255, 0.05)',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Aggiorna
        </button>
      </div>
      <SystemHealthPanel snapshot={snapshot} isLive={isLive} />
    </>
  );
}
