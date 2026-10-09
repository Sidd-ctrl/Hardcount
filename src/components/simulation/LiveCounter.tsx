import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { MS_PER_DAY, MS_PER_YEAR, formatCapacity, formatMoney } from '@/domain/money';
import { formatElapsed } from '@/domain/clock';
import { categoryTotals, eventsUpTo, expenditureAt } from '@/domain/simulate';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/components/charts/categoryTheme';
import { useSimulation } from '@/store/simulation';
import { useSimNow } from '@/hooks/useSimNow';
import type { LedgerCategory } from '@/domain/types';

export function LiveCounter() {
  const plan = useSimulation((state) => state.plan);
  const phase = useSimulation((state) => state.phase);
  const nowMs = useSimNow(70);

  const total = phase === 'draft' ? plan.derived.initialCapexPaise : expenditureAt(plan, nowMs);
  const elapsed = formatElapsed(nowMs);
  const progress = plan.horizonMs > 0 ? Math.min(1, nowMs / plan.horizonMs) : 0;

  const breakdownAt = Math.floor(nowMs / MS_PER_DAY) * MS_PER_DAY;
  const breakdown = useMemo(() => {
    const totals = categoryTotals(eventsUpTo(plan, breakdownAt));
    return (Object.keys(totals) as LedgerCategory[])
      .filter((category) => Math.abs(totals[category]) > 0)
      .map((category) => ({ category, amount: totals[category] }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }, [plan, breakdownAt]);

  const dailyRate = plan.derived.energyPaisePerMs * MS_PER_DAY;
  const fixedDaily = plan.derived.monthlyFixedOpexPaise / 30.4375;
  const maintenanceDaily = plan.derived.annualMaintenancePaise / 365.25;
  const blendedDaily = dailyRate + fixedDaily + maintenanceDaily;
  const perSecond = blendedDaily / 86400;

  const step = useSimulation((state) => state.speed);
  const running = phase === 'running';

  return (
    <div className="hc-panel relative overflow-hidden p-5 sm:p-7">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
        style={{
          background: 'radial-gradient(70% 100% at 50% 0%, rgba(255,181,71,0.13), transparent 72%)',
        }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="hc-label">Total cost of ownership</span>
          <span className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-2xs text-graphite-400">
            <Activity className={running ? 'h-3 w-3 text-amber-glow' : 'h-3 w-3'} />
            {phase === 'draft'
              ? 'Awaiting commissioning'
              : phase === 'running'
                ? `Accruing at ${step}`
                : phase === 'complete'
                  ? 'Model horizon reached'
                  : 'Clock paused'}
          </span>
        </div>

        <motion.div
          key={phase === 'draft' ? 'draft' : 'live'}
          initial={{ opacity: 0.6, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="hc-figure mt-3 text-[clamp(2.1rem,6.5vw,4.25rem)] font-semibold leading-none tracking-tight text-graphite-50"
          style={{ textShadow: '0 0 44px rgba(255,181,71,0.16)' }}
        >
          {formatMoney(total)}
        </motion.div>

        <p className="mt-2.5 text-xs leading-relaxed text-graphite-400">
          {phase === 'draft'
            ? 'Capital commitment for the configuration currently in the rack builder. Nothing is operating yet.'
            : `Accumulated across ${elapsed.years} year${elapsed.years === 1 ? '' : 's'} and ${elapsed.days} day${elapsed.days === 1 ? '' : 's'} of simulated operation.`}
        </p>

        <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-graphite-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-deep to-amber-glow transition-[width] duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-2xs text-graphite-500">
          <span className="hc-figure">{elapsed.label}</span>
          <span className="hc-figure">{formatCapacity(plan.derived.usableTb)} usable</span>
          <span className="hc-figure">
            year {(nowMs / MS_PER_YEAR).toFixed(2)} of {(plan.horizonMs / MS_PER_YEAR).toFixed(0)} ·{' '}
            {(progress * 100).toFixed(1)}% of horizon
          </span>
        </div>
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.04] sm:grid-cols-4">
        {[
          { label: 'Every second', value: perSecond },
          { label: 'Every day', value: blendedDaily },
          { label: 'Every month', value: blendedDaily * 30.4375 },
          { label: 'Every year', value: blendedDaily * 365.25 },
        ].map((entry) => (
          <div key={entry.label} className="bg-graphite-900/80 px-3 py-2.5">
            <div className="hc-label text-[0.625rem]">{entry.label}</div>
            <div className="hc-figure mt-1 text-sm font-semibold text-graphite-100">
              {formatMoney(entry.value)}
            </div>
          </div>
        ))}
      </div>

      {breakdown.length > 0 && (
        <div className="relative mt-5">
          <div className="hc-label mb-2">Where it has gone so far</div>
          <div className="flex flex-wrap gap-1.5">
            {breakdown.slice(0, 8).map((entry) => (
              <span
                key={entry.category}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-2xs"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: CATEGORY_COLORS[entry.category] }}
                />
                <span className="text-graphite-400">{CATEGORY_LABELS[entry.category]}</span>
                <span className="hc-figure font-semibold text-graphite-100">
                  {formatMoney(entry.amount)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="relative mt-4 text-2xs leading-relaxed text-graphite-500">
        Every figure above is drawn from the recorded ledger plus energy accrued since the last
        billing cycle. The per-second, day, month and year rates are blended averages across the
        modelled horizon, so scheduled replacements and post-warranty support are reflected.
        Changing the playback speed changes how fast the clock moves, never how much is charged.
      </p>
    </div>
  );
}
