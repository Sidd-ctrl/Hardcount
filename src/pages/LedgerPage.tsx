import { useMemo, useState } from 'react';
import { BookOpenCheck } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PlaybackBar } from '@/components/simulation/PlaybackBar';
import { MS_PER_YEAR, formatMoney } from '@/domain/money';
import { accruedEnergyAt, categoryTotals, eventsUpTo, expenditureAt } from '@/domain/simulate';
import { configSummary } from '@/domain/lifecycle';
import { useSimulation } from '@/store/simulation';
import { useSimNow } from '@/hooks/useSimNow';
import { ALL_CATEGORIES } from '@/components/charts/categoryTheme';
import type { LedgerCategory } from '@/domain/types';

export function LedgerPage() {
  const plan = useSimulation((state) => state.plan);
  const config = useSimulation((state) => state.config);
  const phase = useSimulation((state) => state.phase);
  const liveMs = useSimNow(500);

  const [active, setActive] = useState<Set<LedgerCategory>>(new Set(ALL_CATEGORIES));

  const eventsAt = Math.floor(liveMs / (MS_PER_YEAR / 24)) * (MS_PER_YEAR / 24);
  const events = useMemo(() => eventsUpTo(plan, eventsAt), [plan, eventsAt]);
  const accrued = phase === 'draft' ? 0 : accruedEnergyAt(plan, liveMs);
  const totals = useMemo(() => categoryTotals(events), [events]);
  const total = phase === 'draft' ? plan.derived.initialCapexPaise : expenditureAt(plan, liveMs);

  const booked = Object.values(totals).reduce((sum, value) => sum + value, 0);

  const toggle = (category: LedgerCategory) => {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-graphite-50">Physical cost ledger</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-graphite-400">
            Every rupee in the counter comes from one of these entries. Expand a row to see the
            quantity, unit price, recurrence rule and the assumption that produced it.
          </p>
        </div>
        <Badge tone="steel">{configSummary(config)}</Badge>
      </header>

      <PlaybackBar />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="hc-panel p-4">
          <div className="hc-label">Booked entries</div>
          <div className="hc-figure mt-1.5 text-xl font-semibold text-graphite-50">
            {formatMoney(booked)}
          </div>
          <p className="mt-1 text-2xs text-graphite-500">{events.length} records to date</p>
        </div>
        <div className="hc-panel p-4">
          <div className="hc-label">Energy accrued, not yet billed</div>
          <div className="hc-figure mt-1.5 text-xl font-semibold text-steel-glow">
            {formatMoney(accrued)}
          </div>
          <p className="mt-1 text-2xs text-graphite-500">
            Metered continuously, posted at each monthly billing boundary.
          </p>
        </div>
        <div className="hc-panel p-4">
          <div className="hc-label">Counter total</div>
          <div className="hc-figure mt-1.5 text-xl font-semibold text-amber-glow">
            {formatMoney(total)}
          </div>
          <p className="mt-1 text-2xs text-graphite-500">
            Booked plus accrued. This is the number the dashboard shows.
          </p>
        </div>
      </div>

      <Panel
        title="Ledger entries"
        subtitle={`${(liveMs / MS_PER_YEAR).toFixed(2)} simulated years elapsed of a ${config.assumptions.horizonYears}-year model`}
      >
        {events.length === 0 ? (
          <EmptyState
            icon={<BookOpenCheck className="h-5 w-5" />}
            title="The ledger is empty"
            description="Commission the configuration in the build studio, or step the clock forward, and the acquisition entries will be recorded here."
          />
        ) : (
          <LedgerTable
            events={events}
            accruedEnergyPaise={accrued}
            totalPaise={total}
            categories={ALL_CATEGORIES}
            activeCategories={active}
            onToggleCategory={toggle}
          />
        )}
      </Panel>
    </div>
  );
}
