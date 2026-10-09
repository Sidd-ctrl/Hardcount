import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  FileText,
  Gauge,
  HardDrive,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { Metric } from '@/components/ui/Metric';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/EmptyState';
import { LiveCounter } from '@/components/simulation/LiveCounter';
import { PlaybackBar } from '@/components/simulation/PlaybackBar';
import { LifecycleTimeline } from '@/components/timeline/LifecycleTimeline';
import { CostReceiptSheet } from '@/components/receipt/CostReceiptSheet';
import { ExpenditureChart } from '@/components/charts/ExpenditureChart';
import { CompositionChart } from '@/components/charts/CompositionChart';
import { CapacityChart } from '@/components/charts/CapacityChart';
import { CapexOpexChart } from '@/components/charts/CapexOpexChart';
import { CATEGORY_LABELS, STACKABLE_CATEGORIES } from '@/components/charts/categoryTheme';
import { MS_PER_YEAR, formatCapacity, formatMoney, formatMoneyCompact } from '@/domain/money';
import { accruedEnergyAt, categoryTotals, eventsUpTo, expenditureAt, nextEventAfter } from '@/domain/simulate';
import { buildReceipt } from '@/domain/receipt';
import { configSummary } from '@/domain/lifecycle';
import { useSimulation } from '@/store/simulation';
import { useSimNow } from '@/hooks/useSimNow';
import { cn } from '@/lib/cn';
import type { ChartView, LedgerCategory } from '@/domain/types';

export function DashboardPage() {
  const plan = useSimulation((state) => state.plan);
  const config = useSimulation((state) => state.config);
  const phase = useSimulation((state) => state.phase);
  const startDate = useSimulation((state) => state.startDate);
  const pause = useSimulation((state) => state.pause);
  const advance = useSimulation((state) => state.advance);

  const liveMs = useSimNow(70);
  const chartMs = useSimNow(1000);
  const [view, setView] = useState<ChartView>('nominal');
  const [categories, setCategories] = useState<Set<LedgerCategory>>(new Set(STACKABLE_CATEGORIES));
  const [receiptOpen, setReceiptOpen] = useState(false);

  const derived = plan.derived;
  const total = phase === 'draft' ? derived.initialCapexPaise : expenditureAt(plan, liveMs);
  const accrued = phase === 'draft' ? 0 : accruedEnergyAt(plan, liveMs);

  const bookedAt = Math.floor(liveMs / (MS_PER_YEAR / 12)) * (MS_PER_YEAR / 12);
  const bookedTotals = useMemo(() => categoryTotals(eventsUpTo(plan, bookedAt)), [plan, bookedAt]);

  const capexBooked = bookedTotals.hardware + bookedTotals.facility + bookedTotals.commissioning;
  const opexBooked = total - capexBooked - bookedTotals.recovery;

  const next = nextEventAfter(plan, liveMs);
  const currentStep = [...plan.capacitySteps].reverse().find((step) => step.atMs <= liveMs);
  const usableNow = currentStep ? currentStep.usableTb : derived.usableTb;
  const yearsElapsed = liveMs / MS_PER_YEAR;
  const consumedTb = config.storage.initialDataTb * Math.pow(1 + config.storage.annualGrowthPct / 100, yearsElapsed);
  const headroomTb = Math.max(0, usableNow - consumedTb);

  const costPerUsableTbYear = yearsElapsed > 0 ? Math.round(total / (usableNow * yearsElapsed)) : derived.costPerUsableTbPaise;
  const storedTbYears =
    config.storage.annualGrowthPct > 0
      ? (config.storage.initialDataTb * (Math.pow(1 + config.storage.annualGrowthPct / 100, yearsElapsed) - 1)) /
        (config.storage.annualGrowthPct / 100)
      : config.storage.initialDataTb * yearsElapsed;
  const costPerStoredTbYear = storedTbYears > 0 ? Math.round(total / storedTbYears) : 0;

  const receiptAt = Math.floor(liveMs / (MS_PER_YEAR / 12)) * (MS_PER_YEAR / 12);
  const receipt = useMemo(
    () =>
      buildReceipt(
        config,
        plan,
        receiptAt,
        startDate ? new Date(startDate) : new Date(),
        configSummary(config),
      ),
    [config, plan, startDate, receiptAt],
  );

  const toggleCategory = (category: LedgerCategory) => {
    setCategories((current) => {
      const nextSet = new Set(current);
      if (nextSet.has(category)) nextSet.delete(category);
      else nextSet.add(category);
      return nextSet;
    });
  };

  const metrics = [
    {
      label: 'Initial capital expenditure',
      value: formatMoney(derived.initialCapexPaise),
      sub: `${formatMoney(derived.hardwareCapexPaise)} hardware · ${formatMoneyCompact(derived.facilityCapexPaise)} facility`,
      tone: 'steel' as const,
      info: 'Everything booked on day zero: purchase orders plus commissioning labour.',
    },
    {
      label: 'Operating spend to date',
      value: formatMoney(Math.max(0, opexBooked)),
      sub: `${derived.annualOpexPaise > 0 ? ((opexBooked / derived.annualOpexPaise) * 100).toFixed(0) : 0}% of one modelled year`,
      tone: 'amber' as const,
      info: 'Recurring and event-driven charges booked since commissioning, excluding the day-zero purchase.',
    },
    {
      label: 'Annual operating cost',
      value: formatMoney(derived.annualOpexPaise),
      sub: `${formatMoneyCompact(derived.annualElectricityPaise + derived.annualCoolingPaise)} of that is energy`,
      tone: 'default' as const,
      info: 'A full year of energy, labour, software, maintenance and post-warranty support at today\u2019s rates.',
    },
    {
      label: 'Cost per usable terabyte',
      value: formatMoney(derived.costPerUsableTbPaise),
      sub: 'Capital divided by usable capacity',
      tone: 'default' as const,
      info: 'Initial capital expenditure divided by capacity available after redundancy and reserve.',
    },
    {
      label: 'Projected end of life',
      value: formatMoney(plan.projectedEndOfLifePaise),
      sub: `${config.assumptions.horizonYears}-year horizon`,
      tone: 'amber' as const,
      info: 'The full ledger run to the end of the modelled horizon, including decommissioning and any recovery.',
    },
    {
      label: 'Capacity headroom',
      value: formatCapacity(headroomTb),
      sub: `${formatCapacity(consumedTb)} of ${formatCapacity(usableNow)} consumed`,
      tone: (headroomTb <= 0 ? 'alert' : 'steel') as 'alert' | 'steel',
      info: 'Usable capacity right now minus the modelled data volume at this point in the lifecycle.',
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-graphite-50">Financial dashboard</h1>
          <p className="mt-1 text-xs text-graphite-400">
            {configSummary(config)} · {config.assumptions.horizonYears}-year model
            {config.assumptions.escalateCosts ? ` · ${config.assumptions.inflationPct}% escalation` : ' · constant prices'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="md"
            icon={<FileText className="h-4 w-4" />}
            onClick={() => setReceiptOpen(true)}
          >
            Generate cost receipt
          </Button>
          <Button asChild variant="ghost" size="md">
            <Link to="/ledger">
              Open full ledger
              <ArrowRight className="h-4 w-4 opacity-70" />
            </Link>
          </Button>
        </div>
      </header>

      <PlaybackBar />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <LiveCounter />

        <Panel
          title="Key measures"
          subtitle="Every value is computed from the same ledger that drives the counter."
        >
          <div className="grid grid-cols-2 gap-x-5 gap-y-5">
            {metrics.map((metric) => (
              <Metric
                key={metric.label}
                label={metric.label}
                value={metric.value}
                sub={metric.sub}
                tone={metric.tone}
                size="sm"
                info={metric.info}
              />
            ))}
          </div>

          {phase === 'draft' && (
            <div className="mt-5 rounded-xl border border-steel-glow/25 bg-steel-glow/[0.06] p-3.5">
              <p className="text-2xs leading-relaxed text-graphite-300">
                Nothing is operating yet. Commission the system to start the clock, or step forward in
                time to inspect the ledger without watching it tick.
              </p>
            </div>
          )}

          {next && (
            <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
              <div className="hc-label mb-1.5 flex items-center gap-1.5">
                <CalendarClock className="h-3 w-3" />
                Next scheduled major expense
              </div>
              <p className="text-[0.8125rem] font-medium text-graphite-100">{next.title}</p>
              <p className="mt-0.5 text-2xs text-graphite-500">{next.detail}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="hc-figure text-sm font-semibold text-amber-glow">
                  {formatMoney(next.amountPaise)}
                </span>
                <Button variant="ghost" size="sm" onClick={() => advance(Math.max(0, next.atMs - liveMs))}>
                  Advance to it
                </Button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Lifetime expenditure curve"
        subtitle="Cumulative modelled spend across the configured horizon."
        actions={
          <Segmented
            ariaLabel="Chart view"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'nominal', label: 'Nominal', hint: 'Cumulative spend as modelled' },
              {
                value: 'real',
                label: 'Real',
                hint: 'Each month deflated back to year-zero prices using the configured escalation rate',
              },
              { value: 'annual', label: 'Per year', hint: 'Spend booked inside each simulated year' },
            ]}
          />
        }
        padded={false}
      >
        <div className="px-2 pb-2 pt-3 sm:px-3">
          <ExpenditureChart
            plan={plan}
            view={view}
            inflationPct={config.assumptions.inflationPct}
            currentMs={chartMs}
          />
        </div>
        {view === 'real' && !config.assumptions.escalateCosts && (
          <p className="border-t border-white/[0.055] px-4 py-2.5 text-2xs text-graphite-500">
            Cost escalation is switched off, so nominal and real are identical. Turn escalation on in
            the build studio to see the two diverge.
          </p>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Cost composition"
          subtitle="Annual spend by category. Toggle a category to exclude it."
          actions={
            <span className="hc-figure text-2xs text-graphite-500">
              {categories.size} of {Object.keys(CATEGORY_LABELS).length - 3} shown
            </span>
          }
          padded={false}
        >
          <div className="px-2 pb-2 pt-3 sm:px-3">
            <CompositionChart plan={plan} categories={[...categories]} />
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-white/[0.055] px-4 py-3">
            {STACKABLE_CATEGORIES.map((category) => {
              const active = categories.has(category);
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCategory(category)}
                  className={cn(
                    'rounded-md border px-1.5 py-0.5 text-2xs transition-colors',
                    active
                      ? 'border-white/[0.14] bg-white/[0.06] text-graphite-100'
                      : 'border-white/[0.06] text-graphite-600 hover:text-graphite-400',
                  )}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Storage capacity trajectory"
          subtitle={
            plan.exhaustionYear !== null
              ? `Modelled demand overtakes usable capacity in year ${plan.exhaustionYear.toFixed(1)}.`
              : 'Modelled demand stays inside usable capacity for the whole horizon.'
          }
          padded={false}
        >
          <div className="px-2 pb-3 pt-3 sm:px-3">
            <CapacityChart plan={plan} currentMs={chartMs} />
          </div>
          {plan.capacitySteps.length > 1 && (
            <ul className="space-y-1 border-t border-white/[0.055] px-4 py-3">
              {plan.capacitySteps.slice(1).map((step) => (
                <li key={step.atMs} className="flex items-center justify-between gap-3 text-2xs">
                  <span className="text-graphite-400">
                    Year {(step.atMs / MS_PER_YEAR).toFixed(1)} · {step.reason}
                  </span>
                  <span className="hc-figure text-graphite-200">+{formatCapacity(step.addedTb)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          title="Capital versus operating"
          subtitle="How quickly the running cost overtakes the purchase price."
          actions={<TrendingUp className="h-4 w-4 text-graphite-500" />}
          padded={false}
        >
          <div className="px-2 pb-3 pt-3 sm:px-3">
            <CapexOpexChart plan={plan} />
          </div>
        </Panel>

        <Panel
          title="Lifecycle"
          subtitle="Commissioning, operation, growth, failure, replacement and retirement."
          actions={<LineChartIcon className="h-4 w-4 text-graphite-500" />}
        >
          <LifecycleTimeline
            plan={plan}
            currentMs={chartMs}
            onSeek={(atMs) => {
              pause();
              advance(Math.max(0, atMs - liveMs));
            }}
          />
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Cost efficiency" subtitle="Two different denominators, both stated.">
          <div className="space-y-4">
            <div>
              <div className="hc-label">Per usable terabyte-year</div>
              <div className="hc-figure mt-1 text-xl font-semibold text-graphite-50">
                {formatMoney(costPerUsableTbYear)}
              </div>
              <p className="mt-1 text-2xs leading-relaxed text-graphite-500">
                Total cost to date divided by usable capacity multiplied by years elapsed. Denominator
                is capacity you could have used, whether or not you filled it.
              </p>
            </div>
            <div className="border-t border-white/[0.06] pt-4">
              <div className="hc-label">Per stored terabyte-year</div>
              <div className="hc-figure mt-1 text-xl font-semibold text-graphite-50">
                {storedTbYears > 0 ? formatMoney(costPerStoredTbYear) : 'Not computable yet'}
              </div>
              <p className="mt-1 text-2xs leading-relaxed text-graphite-500">
                Total cost divided by the cumulative terabyte-years actually stored, integrated over
                the growth curve. This is the fairer figure when comparing builds of different sizes.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Where the money has gone" subtitle="Booked entries at the current simulated date.">
          {Object.keys(bookedTotals).length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-5 w-5" />}
              title="Nothing booked yet"
              description="Commission the system or step the clock forward to start recording entries."
            />
          ) : (
            <ul className="space-y-2">
              {(Object.keys(bookedTotals) as LedgerCategory[])
                .filter((category) => Math.abs(bookedTotals[category]) > 0)
                .sort((a, b) => Math.abs(bookedTotals[b]) - Math.abs(bookedTotals[a]))
                .map((category) => {
                  const amount = bookedTotals[category];
                  const share = total > 0 ? (Math.abs(amount) / Math.abs(total)) * 100 : 0;
                  return (
                    <li key={category}>
                      <div className="flex items-baseline justify-between gap-3 text-2xs">
                        <span className="text-graphite-300">{CATEGORY_LABELS[category]}</span>
                        <span
                          className={cn(
                            'hc-figure font-semibold',
                            amount < 0 ? 'text-emerald-300' : 'text-graphite-100',
                          )}
                        >
                          {formatMoney(amount)}
                        </span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-graphite-800">
                        <div
                          className="h-full rounded-full bg-amber-glow/70"
                          style={{ width: `${Math.min(100, share)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </Panel>

        <Panel title="Operating profile" subtitle="What this build draws and what it holds.">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'IT load', value: `${(derived.itPowerWatts / 1000).toFixed(2)} kW`, icon: <Gauge className="h-3.5 w-3.5" /> },
              { label: 'At the meter', value: `${(derived.facilityPowerWatts / 1000).toFixed(2)} kW`, icon: <Gauge className="h-3.5 w-3.5" /> },
              { label: 'Energy per year', value: `${Math.round(derived.annualEnergyKwh).toLocaleString('en-IN')} kWh`, icon: <PieChartIcon className="h-3.5 w-3.5" /> },
              { label: 'Energy per year', value: formatMoney(derived.annualElectricityPaise + derived.annualCoolingPaise), icon: <Wallet className="h-3.5 w-3.5" /> },
              { label: 'Installed raw', value: formatCapacity(derived.installedTb), icon: <HardDrive className="h-3.5 w-3.5" /> },
              { label: 'Usable', value: formatCapacity(derived.usableTb), icon: <HardDrive className="h-3.5 w-3.5" /> },
            ].map((row) => (
              <div key={row.label + row.value}>
                <div className="hc-label flex items-center gap-1.5 text-[0.625rem]">
                  {row.icon}
                  {row.label}
                </div>
                <div className="hc-figure mt-1 text-sm font-semibold text-graphite-100">{row.value}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-white/[0.06] pt-3 text-2xs leading-relaxed text-graphite-500">
            Facility energy is IT energy multiplied by PUE {config.facility.pue.toFixed(2)}. The
            overhead slice is billed separately as cooling energy so it is never counted twice.
            Energy accrued since the last bill: {formatMoney(accrued)}.
          </p>
        </Panel>
      </div>

      <CostReceiptSheet open={receiptOpen} onOpenChange={setReceiptOpen} receipt={receipt} />
    </div>
  );
}
