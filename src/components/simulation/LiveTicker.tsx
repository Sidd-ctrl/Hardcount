import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/domain/money';
import { expenditureAt } from '@/domain/simulate';
import { useSimulation } from '@/store/simulation';
import { useSimNow } from '@/hooks/useSimNow';

const PHASE_META = {
  draft: { label: 'Not commissioned', dot: 'bg-graphite-500', text: 'text-graphite-400' },
  running: { label: 'Operating', dot: 'bg-amber-glow animate-breathe', text: 'text-amber-glow' },
  paused: { label: 'Paused', dot: 'bg-steel-glow', text: 'text-steel-glow' },
  complete: { label: 'End of life', dot: 'bg-alert-glow', text: 'text-alert-glow' },
} as const;

export function LiveTicker() {
  const plan = useSimulation((state) => state.plan);
  const phase = useSimulation((state) => state.phase);
  const nowMs = useSimNow(90);
  const total = phase === 'draft' ? plan.derived.initialCapexPaise : expenditureAt(plan, nowMs);
  const meta = PHASE_META[phase];

  return (
    <Link
      to="/dashboard"
      className="group flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-graphite-900/70 px-3 py-1.5 transition-colors hover:border-white/[0.14]"
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)} />
      <span className="leading-none">
        <span className={cn('block text-2xs font-medium tracking-wide', meta.text)}>{meta.label}</span>
        <span className="hc-figure mt-1 block text-[0.8125rem] font-semibold text-graphite-50">
          {formatMoney(total)}
        </span>
      </span>
    </Link>
  );
}
