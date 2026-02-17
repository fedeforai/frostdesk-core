'use client';

import { useEffect, useState } from 'react';
import { kpiStore, type Kpis } from '@/lib/kpiStore';

export function useKpis(): Kpis {
  const [kpis, setKpis] = useState<Kpis>(() => kpiStore.getKpis());

  useEffect(() => {
    return kpiStore.subscribe(setKpis);
  }, []);

  return kpis;
}
