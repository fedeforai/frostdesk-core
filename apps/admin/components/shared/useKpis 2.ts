// apps/admin/components/shared/useKpis.ts
'use client';

import { useEffect, useState } from 'react';
import { kpiStore, type Kpis } from '@/lib/kpiStore';

export function useKpis(): Kpis {
  const [kpis, setKpis] = useState<Kpis>(() => kpiStore.getKpis());

  useEffect(() => {
    // If store supports subscribe, this is live with zero polling
    const unsub = kpiStore.subscribe((next) => setKpis(next));
    setKpis(kpiStore.getKpis());
    return unsub;
  }, []);

  return kpis;
}
