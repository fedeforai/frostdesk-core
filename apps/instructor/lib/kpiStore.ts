export type Kpis = {
  draftsGenerated: number;
  draftsUsed: number;
  draftsIgnored: number;
};

type Listener = (kpis: Kpis) => void;

const DEFAULT_KPIS: Kpis = {
  draftsGenerated: 0,
  draftsUsed: 0,
  draftsIgnored: 0,
};

class KpiStore {
  private kpis: Kpis = { ...DEFAULT_KPIS };
  private listeners = new Set<Listener>();

  getKpis(): Kpis {
    return { ...this.kpis };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    const snapshot = this.getKpis();
    for (const fn of this.listeners) fn(snapshot);
  }

  incrementDraftsGenerated(by = 1): void {
    this.kpis.draftsGenerated += by;
    this.notify();
  }

  incrementDraftsUsed(by = 1): void {
    this.kpis.draftsUsed += by;
    this.notify();
  }

  incrementDraftsIgnored(by = 1): void {
    this.kpis.draftsIgnored += by;
    this.notify();
  }

  reset(): void {
    this.kpis = { ...DEFAULT_KPIS };
    this.notify();
  }
}

export const kpiStore = new KpiStore();
