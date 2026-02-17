// apps/admin/lib/kpiStore.ts

export type Kpis = {
  draftUsed: number;
};

let kpis: Kpis = {
  draftUsed: 0,
};

const listeners = new Set<(k: Kpis) => void>();

export const kpiStore = {
  getKpis(): Kpis {
    return kpis;
  },

  incrementDraftUsed(): void {
    kpis = { ...kpis, draftUsed: kpis.draftUsed + 1 };
    for (const l of listeners) l(kpis);
  },

  subscribe(fn: (k: Kpis) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
