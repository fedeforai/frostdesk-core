'use client';

const KPI_KEY = 'fd_kpis_v1';

export type KpiKey = 'ai_drafts_generated' | 'ai_drafts_used';

export type Kpis = Record<KpiKey, number>;

const DEFAULT_KPIS: Kpis = {
  ai_drafts_generated: 0,
  ai_drafts_used: 0,
};

function safeParse(json: string | null): Kpis {
  if (!json) return { ...DEFAULT_KPIS };
  try {
    const parsed = JSON.parse(json) as Partial<Kpis>;
    return {
      ai_drafts_generated: Number(parsed.ai_drafts_generated ?? 0),
      ai_drafts_used: Number(parsed.ai_drafts_used ?? 0),
    };
  } catch {
    return { ...DEFAULT_KPIS };
  }
}

export function getKpis(): Kpis {
  if (typeof window === 'undefined') return { ...DEFAULT_KPIS };
  return safeParse(window.localStorage.getItem(KPI_KEY));
}

export function setKpis(next: Kpis): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KPI_KEY, JSON.stringify(next));
}

export function incKpi(key: KpiKey, by = 1): Kpis {
  const current = getKpis();
  const next: Kpis = { ...current, [key]: (current[key] ?? 0) + by };
  setKpis(next);
  return next;
}

export function resetKpis(): void {
  setKpis({ ...DEFAULT_KPIS });
}
