import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowUpCircle, Cable, Landmark, PackageCheck, ShieldAlert, Wrench } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/components/charts/categoryTheme';
import { MS_PER_YEAR, formatMoney } from '@/domain/money';
import { majorEvents } from '@/domain/simulate';
import { stageLabel } from '@/domain/lifecycle';
import type { LedgerEvent, SimulationPlan } from '@/domain/types';
import { cn } from '@/lib/cn';

export interface LifecycleTimelineProps {
  plan: SimulationPlan;
  currentMs: number;
  onSeek?: (atMs: number) => void;
}

const STAGE_ORDER: LedgerEvent['stage'][] = [
  'acquisition',
  'commissioning',
  'operation',
  'growth',
  'maintenance',
  'failure',
  'upgrade',
  'decommission',
];

function eventIcon(event: LedgerEvent) {
  switch (event.category) {
    case 'incident':
    case 'downtime':
      return <ShieldAlert className="h-3 w-3" />;
    case 'upgrade':
      return <ArrowUpCircle className="h-3 w-3" />;
    case 'replacement':
      return <PackageCheck className="h-3 w-3" />;
    case 'maintenance':
      return <Wrench className="h-3 w-3" />;
    case 'decommission':
    case 'recovery':
      return <Landmark className="h-3 w-3" />;
    case 'hardware':
    case 'facility':
      return <Cable className="h-3 w-3" />;
    default:
      return <AlertTriangle className="h-3 w-3" />;
  }
}

export function LifecycleTimeline({ plan, currentMs, onSeek }: LifecycleTimelineProps) {
  const [selected, setSelected] = useState<LedgerEvent | null>(null);
  const events = useMemo(() => majorEvents(plan), [plan]);
  const horizonYears = plan.horizonMs / MS_PER_YEAR;
  const position = (atMs: number) => (plan.horizonMs > 0 ? (atMs / plan.horizonMs) * 100 : 0);

  const stagesPresent = STAGE_ORDER.filter((stage) => events.some((event) => event.stage === stage));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {stagesPresent.map((stage) => (
          <span
            key={stage}
            className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-0.5 text-2xs text-graphite-400"
          >
            {stageLabel(stage)}
          </span>
        ))}
      </div>

      <div className="relative pb-2 pt-6">
        <div className="relative h-1.5 w-full rounded-full bg-graphite-800">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-steel-deep via-amber-deep to-amber-glow"
            style={{ width: `${Math.min(100, position(currentMs))}%` }}
          />
        </div>

        <div className="absolute inset-x-0 top-0 h-6">
          {Array.from({ length: Math.floor(horizonYears) + 1 }).map((_, index) => (
            <div
              key={index}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${(index / horizonYears) * 100}%` }}
            >
              <span className="h-2 w-px bg-white/[0.12]" />
              <span className="hc-figure mt-0.5 -translate-x-1/2 text-[0.5625rem] text-graphite-600">
                {index === 0 ? 'now' : `${index}y`}
              </span>
            </div>
          ))}
        </div>

        {events.map((event) => {
          const left = position(event.atMs);
          const isActive = selected?.id === event.id;
          return (
            <button
              key={event.id}
              type="button"
              aria-label={`${event.title}, ${formatMoney(event.amountPaise)}`}
              onClick={() => {
                setSelected(isActive ? null : event);
                onSeek?.(event.atMs);
              }}
              className="group absolute top-[0.15rem] -translate-x-1/2 rounded-full p-0.5 transition-transform hover:scale-125"
              style={{ left: `${left}%` }}
            >
              <span
                className={cn(
                  'block h-2.5 w-2.5 rounded-full border transition-all',
                  isActive
                    ? 'border-white bg-amber-glow'
                    : event.credit
                      ? 'border-emerald-300/60 bg-emerald-400/80'
                      : 'border-black/40',
                )}
                style={isActive ? undefined : { background: CATEGORY_COLORS[event.category] }}
              />
            </button>
          );
        })}

        <motion.div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2"
          style={{ left: `${Math.min(100, position(currentMs))}%` }}
          animate={{ left: `${Math.min(100, position(currentMs))}%` }}
          transition={{ duration: 0.18, ease: 'linear' }}
        >
          <span className="block h-4 w-px bg-graphite-100/70" />
        </motion.div>
      </div>

      {selected ? (
        <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span style={{ color: CATEGORY_COLORS[selected.category] }}>{eventIcon(selected)}</span>
                <span className="text-[0.8125rem] font-semibold text-graphite-100">{selected.title}</span>
              </div>
              <p className="mt-1 text-2xs leading-relaxed text-graphite-400">{selected.detail}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-graphite-500">
                <span>
                  Stage: <span className="text-graphite-300">{stageLabel(selected.stage)}</span>
                </span>
                <span>
                  Category:{' '}
                  <span className="text-graphite-300">{CATEGORY_LABELS[selected.category]}</span>
                </span>
                <span className="hc-figure">
                  Simulated time:{' '}
                  <span className="text-graphite-300">
                    year {(selected.atMs / MS_PER_YEAR).toFixed(2)}
                  </span>
                </span>
              </div>
              <p className="mt-2 text-2xs leading-relaxed text-graphite-500">{selected.source}</p>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  'hc-figure text-lg font-semibold',
                  selected.credit ? 'text-emerald-300' : 'text-amber-glow',
                )}
              >
                {selected.credit ? '\u2212' : ''}
                {formatMoney(selected.amountPaise)}
              </div>
              {selected.quantity !== null && selected.unitPricePaise !== null && (
                <div className="hc-figure mt-0.5 text-2xs text-graphite-500">
                  {selected.quantity} × {formatMoney(selected.unitPricePaise)}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-2xs text-graphite-500">
          Select a marker to inspect the event. Only purchases, replacements, upgrades, failures and
          decommissioning are plotted, so the track stays readable.
        </p>
      )}
    </div>
  );
}
