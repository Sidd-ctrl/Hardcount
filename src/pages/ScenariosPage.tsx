import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Chart } from '@/components/charts/Chart';
import { AXIS_TEXT, BASE_TOOLTIP, GRID_BORDER, SPLIT_LINE } from '@/components/charts/chartTheme';
import type { EChartsCoreOption } from 'echarts/core';
import { MS_PER_YEAR, formatCapacity, formatMoney, formatMoneyCompact } from '@/domain/money';
import { simulate } from '@/domain/simulate';
import { configSummary } from '@/domain/lifecycle';
import { PRESETS } from '@/domain/presets';
import { useSimulation } from '@/store/simulation';
import { notify } from '@/store/toasts';
import { cn } from '@/lib/cn';
import type { HardwareConfig, Scenario } from '@/domain/types';

interface ComparisonEntry {
  id: string;
  name: string;
  note: string;
  config: HardwareConfig;
  origin: 'saved' | 'preset' | 'current';
}

const PALETTE = ['#ffb547', '#5ab0f0', '#4fbf8f', '#c084fc', '#ff6b5e', '#e0b341'];

export function ScenariosPage() {
  const scenarios = useSimulation((state) => state.scenarios);
  const config = useSimulation((state) => state.config);
  const plan = useSimulation((state) => state.plan);
  const saveScenario = useSimulation((state) => state.saveScenario);
  const loadScenario = useSimulation((state) => state.loadScenario);
  const removeScenario = useSimulation((state) => state.removeScenario);
  const selectPreset = useSimulation((state) => state.selectPreset);
  const baselineId = useSimulation((state) => state.baselineScenarioId);
  const setBaseline = useSimulation((state) => state.setBaseline);

  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const entries = useMemo<ComparisonEntry[]>(() => {
    const saved: ComparisonEntry[] = scenarios.map((scenario: Scenario) => ({
      id: scenario.id,
      name: scenario.name,
      note: scenario.note || 'Saved build',
      config: scenario.config,
      origin: 'saved',
    }));
    const presets: ComparisonEntry[] = PRESETS.map((preset) => ({
      id: `preset-${preset.id}`,
      name: preset.name,
      note: preset.note,
      config: preset.build(),
      origin: 'preset',
    }));
    const current: ComparisonEntry = {
      id: 'current',
      name: 'Current build',
      note: 'Whatever is loaded in the studio right now',
      config,
      origin: 'current',
    };
    return [current, ...saved, ...presets];
  }, [scenarios, config]);

  const results = useMemo(() => {
    const map = new Map<string, { entry: ComparisonEntry; plan: ReturnType<typeof simulate> }>();
    entries.forEach((entry) => {
      if (entry.id !== 'current' && !selected.includes(entry.id)) return;
      map.set(entry.id, { entry, plan: simulate(entry.config) });
    });
    return [...map.values()];
  }, [entries, selected]);

  const baseline = results.find((row) => row.entry.id === baselineId) ?? results[0];

  const chartOption = useMemo<EChartsCoreOption>(() => {
    const horizonYears = Math.max(...results.map((row) => row.plan.horizonMs / MS_PER_YEAR), 1);
    const samples = 120;

    return {
      animationDuration: 500,
      grid: { left: 8, right: 18, top: 34, bottom: 8, containLabel: true },
      legend: {
        top: 0,
        type: 'scroll',
        textStyle: { color: AXIS_TEXT, fontSize: 10 },
        itemWidth: 10,
        itemHeight: 8,
      },
      tooltip: {
        ...BASE_TOOLTIP,
        trigger: 'axis',
        valueFormatter: (value: number) => formatMoney(value * 100),
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: Array.from({ length: samples + 1 }, (_, index) => ((index / samples) * horizonYears).toFixed(2)),
        axisLine: { lineStyle: { color: GRID_BORDER } },
        axisTick: { show: false },
        axisLabel: { color: AXIS_TEXT, fontSize: 10, formatter: (value: string) => `${Number(value).toFixed(0)}y` },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: SPLIT_LINE } },
        axisLabel: { color: AXIS_TEXT, fontSize: 10, formatter: (value: number) => formatMoneyCompact(value * 100) },
      },
      series: results.map((row, index) => {
        const step = row.plan.horizonMs / samples;
        const data: number[] = [];
        for (let sample = 0; sample <= samples; sample += 1) {
          const atMs = Math.min(sample * step, row.plan.horizonMs);
          let cumulative = 0;
          let lastEnergyMs = 0;
          for (const event of row.plan.events) {
            if (event.atMs > atMs) break;
            cumulative += event.credit ? -event.amountPaise : event.amountPaise;
            if (event.category === 'electricity' || event.category === 'cooling') {
              lastEnergyMs = Math.max(lastEnergyMs, event.atMs);
            }
          }
          cumulative += Math.round(row.plan.derived.energyPaisePerMs * (atMs - lastEnergyMs));
          data.push(Math.round(cumulative / 100));
        }
        return {
          name: row.entry.name,
          type: 'line' as const,
          smooth: 0.15,
          showSymbol: false,
          data,
          lineStyle: { width: 2, color: PALETTE[index % PALETTE.length] },
          itemStyle: { color: PALETTE[index % PALETTE.length] },
        };
      }),
    };
  }, [results]);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-graphite-50">Scenario lab</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-graphite-400">
            Compare builds on the same clock. Select at least two configurations to plot them
            together. Differences are only meaningful when the service requirement and the usable
            capacity assumption are comparable, so both are shown in the table.
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          icon={<Save className="h-4 w-4" />}
          onClick={() => {
            const saved = saveScenario();
            setSelected((current) => [...current, saved.id]);
            setBaseline('current');
            notify('Scenario saved to the lab', saved.name, 'success');
          }}
        >
          Save current build
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Panel title="Available configurations" subtitle="Presets are illustrative starting points, not verified market builds.">
          <ul className="space-y-1.5">
            {entries.map((entry) => {
              const isSelected = entry.id === 'current' || selected.includes(entry.id);
              return (
                <li key={entry.id}>
                  <div
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3 transition-colors',
                      isSelected
                        ? 'border-amber-glow/35 bg-amber-glow/[0.05]'
                        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={entry.id === 'current'}
                      onChange={() => toggle(entry.id)}
                      aria-label={`Compare ${entry.name}`}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#ffb547]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[0.8125rem] font-medium text-graphite-100">
                          {entry.name}
                        </span>
                        {entry.origin === 'current' && (
                          <span className="shrink-0 rounded border border-amber-glow/30 px-1 text-[0.5625rem] uppercase tracking-wide text-amber-glow">
                            live
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-2xs leading-snug text-graphite-500">
                        {entry.note}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {entry.id !== 'current' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (entry.origin === 'preset') selectPreset(entry.id.replace('preset-', ''));
                              else loadScenario(entry.id);
                              notify('Configuration loaded', entry.name, 'neutral');
                            }}
                            className="rounded-md border border-white/[0.08] px-1.5 py-0.5 text-2xs text-graphite-400 transition-colors hover:border-white/[0.16] hover:text-graphite-200"
                          >
                            Load in studio
                          </button>
                        )}
                        {entry.origin === 'saved' && (
                          <button
                            type="button"
                            aria-label={`Delete ${entry.name}`}
                            onClick={() => setPendingDelete(entry.id)}
                            className="rounded-md border border-white/[0.08] p-1 text-graphite-500 transition-colors hover:border-alert-glow/40 hover:text-alert-glow"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="min-w-0 space-y-5">
          {results.length < 2 ? (
            <Panel title="Synchronised cumulative cost">
              <EmptyState
                icon={<FlaskConical className="h-5 w-5" />}
                title="Select another configuration to compare"
                description="The current build is always plotted. Add at least one more from the list to see the curves diverge."
              />
            </Panel>
          ) : (
            <Panel
              title="Synchronised cumulative cost"
              subtitle="All scenarios start at year zero on the same simulated clock."
              padded={false}
            >
              <div className="px-2 pb-3 pt-3 sm:px-3">
                <Chart
                  option={chartOption}
                  height={320}
                  ariaLabel="Line chart comparing cumulative cost across the selected configurations"
                />
              </div>
            </Panel>
          )}

          <Panel title="Side by side" subtitle="Differences are measured against the selected baseline.">
            {results.length === 0 ? (
              <EmptyState title="Nothing to compare yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[54rem] border-collapse text-left text-2xs">
                  <thead className="hc-label border-b border-white/[0.07] text-[0.625rem]">
                    <tr>
                      <th scope="col" className="px-2 py-2 font-medium">Scenario</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Baseline</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Initial capital</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Opex / year</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Lifetime total</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Δ vs baseline</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Usable TB</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">₹ / usable TB</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Major events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row) => {
                      const derived = row.plan.derived;
                      const delta = baseline ? row.plan.projectedEndOfLifePaise - baseline.plan.projectedEndOfLifePaise : 0;
                      const majorCount = row.plan.events.filter(
                        (event) =>
                          event.category === 'upgrade' ||
                          event.category === 'replacement' ||
                          event.category === 'decommission',
                      ).length;
                      const isBaseline = baseline?.entry.id === row.entry.id;

                      return (
                        <tr key={row.entry.id} className="border-b border-white/[0.045] last:border-0">
                          <td className="px-2 py-2.5">
                            <div className="text-graphite-100">{row.entry.name}</div>
                            <div className="mt-0.5 text-[0.625rem] text-graphite-600">
                              {configSummary(row.entry.config)} ·{' '}
                              {row.entry.config.assumptions.horizonYears}y
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => setBaseline(row.entry.id)}
                              className={cn(
                                'rounded-md border px-1.5 py-0.5 text-[0.625rem] transition-colors',
                                isBaseline
                                  ? 'border-amber-glow/40 bg-amber-glow/[0.08] text-amber-glow'
                                  : 'border-white/[0.08] text-graphite-500 hover:text-graphite-300',
                              )}
                            >
                              {isBaseline ? 'baseline' : 'set'}
                            </button>
                          </td>
                          <td className="hc-figure px-2 py-2.5 text-right text-graphite-200">
                            {formatMoney(derived.initialCapexPaise)}
                          </td>
                          <td className="hc-figure px-2 py-2.5 text-right text-graphite-200">
                            {formatMoney(derived.annualOpexPaise)}
                          </td>
                          <td className="hc-figure px-2 py-2.5 text-right font-semibold text-graphite-50">
                            {formatMoney(row.plan.projectedEndOfLifePaise)}
                          </td>
                          <td
                            className={cn(
                              'hc-figure px-2 py-2.5 text-right font-semibold',
                              isBaseline
                                ? 'text-graphite-500'
                                : delta > 0
                                  ? 'text-alert-glow'
                                  : 'text-emerald-300',
                            )}
                          >
                            {isBaseline ? '—' : `${delta > 0 ? '+' : '\u2212'}${formatMoneyCompact(Math.abs(delta))}`}
                          </td>
                          <td className="hc-figure px-2 py-2.5 text-right text-graphite-200">
                            {formatCapacity(derived.usableTb)}
                          </td>
                          <td className="hc-figure px-2 py-2.5 text-right text-graphite-200">
                            {formatMoney(derived.costPerUsableTbPaise)}
                          </td>
                          <td className="hc-figure px-2 py-2.5 text-right text-graphite-400">{majorCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-3 border-t border-white/[0.06] pt-3 text-2xs leading-relaxed text-graphite-500">
              A lower lifetime total is not automatically the better decision. If two builds deliver
              different usable capacity or different availability, compare the cost per usable
              terabyte column and read the assumptions behind each one before drawing a conclusion.
              HARDCOUNT does not pick a winner for you.
            </p>
          </Panel>

          <Panel title="Current build summary">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="hc-label">Initial capital</dt>
                <dd className="hc-figure mt-1 text-base font-semibold text-graphite-50">
                  {formatMoney(plan.derived.initialCapexPaise)}
                </dd>
              </div>
              <div>
                <dt className="hc-label">Operating cost per year</dt>
                <dd className="hc-figure mt-1 text-base font-semibold text-graphite-50">
                  {formatMoney(plan.derived.annualOpexPaise)}
                </dd>
              </div>
              <div>
                <dt className="hc-label">Projected lifetime</dt>
                <dd className="hc-figure mt-1 text-base font-semibold text-amber-glow">
                  {formatMoney(plan.projectedEndOfLifePaise)}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
              <Button asChild variant="secondary" size="sm">
                <Link to="/studio">
                  <Plus className="h-3.5 w-3.5" />
                  Edit this build
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this scenario?"
        description="The saved configuration is removed from the lab. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) {
            removeScenario(pendingDelete);
            setSelected((current) => current.filter((id) => id !== pendingDelete));
            notify('Scenario deleted', undefined, 'neutral');
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
