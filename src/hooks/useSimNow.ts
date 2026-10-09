import { useEffect, useRef, useState } from 'react';
import { useSimulation } from '@/store/simulation';
import { subscribeTick } from './useTicker';

export function useSimNow(intervalMs = 0): number {
  const simMsAt = useSimulation((state) => state.simMsAt);
  const running = useSimulation((state) => state.phase === 'running');
  const [value, setValue] = useState(() => simMsAt(Date.now()));
  const lastEmit = useRef(0);

  useEffect(() => {
    if (!running) {
      setValue(simMsAt(Date.now()));
      return;
    }
    lastEmit.current = 0;
    return subscribeTick((wallNow) => {
      if (intervalMs > 0 && wallNow - lastEmit.current < intervalMs) return;
      lastEmit.current = wallNow;
      setValue(simMsAt(wallNow));
    });
  }, [running, intervalMs, simMsAt]);

  return value;
}
