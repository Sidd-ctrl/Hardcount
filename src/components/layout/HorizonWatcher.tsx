import { useEffect } from 'react';
import { useSimulation } from '@/store/simulation';
import { useSimNow } from '@/hooks/useSimNow';

export function HorizonWatcher() {
  const phase = useSimulation((state) => state.phase);
  const horizonMs = useSimulation((state) => state.plan.horizonMs);
  const pause = useSimulation((state) => state.pause);
  const nowMs = useSimNow(500);

  useEffect(() => {
    if (phase === 'running' && nowMs >= horizonMs) pause();
  }, [phase, nowMs, horizonMs, pause]);

  return null;
}
