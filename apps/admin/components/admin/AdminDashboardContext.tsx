'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { fetchComprehensiveDashboard } from '@/lib/adminApi';
import type { ComprehensiveDashboardData } from '@/lib/adminApi';
import type { SystemHealthSnapshot } from '@/lib/adminApi';

const REFRESH_INTERVAL_MS = 60_000;

export interface QuotaForPanel {
  channel: string;
  period: string;
  max_allowed: number;
  used: number;
}

function deriveSystemHealthSnapshot(data: ComprehensiveDashboardData | null): SystemHealthSnapshot | null {
  if (!data?.system || !data?.ai) return null;
  const sys = data.system;
  const ai = data.ai;
  return {
    emergency_disabled: sys.emergency_disabled ?? false,
    ai_global_enabled: sys.ai_global_enabled ?? false,
    ai_whatsapp_enabled: sys.ai_whatsapp_enabled ?? false,
    quota: {
      channel: 'whatsapp',
      limit: sys.quota?.limit ?? null,
      used_today: sys.quota?.used_today ?? null,
      percentage: sys.quota?.percentage ?? null,
      status: sys.quota?.status ?? 'not_configured',
    },
    activity_today: {
      conversations_ai_eligible: ai.conversations_ai_eligible_today ?? 0,
      escalations: ai.escalations_today ?? 0,
      drafts_generated: ai.drafts_generated_today ?? 0,
      drafts_sent: ai.drafts_sent_today ?? 0,
    },
  };
}

function deriveQuotaForPanel(data: ComprehensiveDashboardData | null): QuotaForPanel | null {
  if (!data?.system?.quota || data.system.quota.status === 'not_configured') return null;
  const q = data.system.quota;
  const limit = q.limit ?? 0;
  const used = q.used_today ?? 0;
  return {
    channel: q.channel ?? 'whatsapp',
    period: 'day',
    max_allowed: limit,
    used,
  };
}

interface AdminDashboardContextValue {
  data: ComprehensiveDashboardData | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
  systemHealthSnapshot: SystemHealthSnapshot | null;
  quotaForPanel: QuotaForPanel | null;
}

const AdminDashboardContext = createContext<AdminDashboardContextValue | null>(null);

export function useAdminDashboard() {
  const ctx = useContext(AdminDashboardContext);
  return ctx;
}

export function AdminDashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ComprehensiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const url = '/api/admin/dashboard-comprehensive';
    const opts: RequestInit = { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } };
    try {
      const res = await fetch(url, opts);
      if (res.ok) {
        const json = await res.json();
        const result = json?.ok && json?.data ? json.data : null;
        if (result) setData(result);
        else setError(true);
      } else if (res.status === 503) {
        await new Promise((r) => setTimeout(r, 2000));
        const retryRes = await fetch(url, opts);
        if (retryRes.ok) {
          const retryJson = await retryRes.json();
          const retryResult = retryJson?.ok && retryJson?.data ? retryJson.data : null;
          if (retryResult) setData(retryResult);
          else setError(true);
        } else setError(true);
      } else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      fetchComprehensiveDashboard().then((r) => { if (r) setData(r); }).catch(() => {});
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  const systemHealthSnapshot = deriveSystemHealthSnapshot(data);
  const quotaForPanel = deriveQuotaForPanel(data);

  const value: AdminDashboardContextValue = {
    data,
    loading,
    error,
    refresh,
    systemHealthSnapshot,
    quotaForPanel,
  };

  return (
    <AdminDashboardContext.Provider value={value}>
      {children}
    </AdminDashboardContext.Provider>
  );
}
