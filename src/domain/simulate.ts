import { capacitySeries, exhaustionYear } from './capacity';
import { deriveModel } from './derive';
import { buildLifecycle, horizonMsFor } from './lifecycle';
import { MS_PER_YEAR, roundPaise } from './money';
import type {
  AnnualSlice,
  HardwareConfig,
  LedgerCategory,
  LedgerEvent,
  MonthlyPoint,
  SimulationPlan,
} from './types';

const EMPTY_CATEGORIES: LedgerCategory[] = [
  'hardware',
  'facility',
  'commissioning',
  'electricity',
  'cooling',
  'software',
  'labor',
  'support',
  'maintenance',
  'replacement',
  'upgrade',
  'incident',
  'downtime',
  'security',
  'overhead',
  'decommission',
  'recovery',
];

function emptyTotals(): Record<LedgerCategory, number> {
  return EMPTY_CATEGORIES.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {} as Record<LedgerCategory, number>);
}

export function simulate(config: HardwareConfig): SimulationPlan {
  const derived = deriveModel(config);
  const lifecycle = buildLifecycle({ config, derived });
  const horizonMs = horizonMsFor(config.assumptions.horizonYears);

  const capacitySteps = lifecycle.capacitySteps;
  const series = capacitySeries(config.storage, capacitySteps, horizonMs, MS_PER_YEAR);

  const stepsForExhaustion = capacitySteps.map((step) => ({
    atYears: step.atMs / MS_PER_YEAR,
    usableTb: step.usableTb,
  }));

  const exhaustion = config.assumptions.autoExpandCapacity
    ? exhaustionYear(config.storage, derived.usableTb, config.assumptions.horizonYears, stepsForExhaustion)
    : exhaustionYear(config.storage, derived.usableTb, config.assumptions.horizonYears, []);

  const annualSlices = buildAnnualSlices(lifecycle.events, config.assumptions.horizonYears);
  const monthlySeries = buildMonthlySeries(
    lifecycle.events,
    horizonMs,
    derived.energyPaisePerMs,
    config.assumptions.horizonYears * 12,
  );

  const finalSlice = annualSlices[annualSlices.length - 1];
  const projectedEndOfLifePaise = finalSlice ? finalSlice.cumulativePaise : 0;

  return {
    derived,
    events: lifecycle.events,
    capacitySteps,
    capacitySeries: series,
    annualSlices,
    monthlySeries,
    horizonMs,
    exhaustionYear: exhaustion,
    projectedEndOfLifePaise,
    residualValuePaise: lifecycle.residualValuePaise,
    recoveryPaise: lifecycle.recoveryPaise,
  };
}

function buildAnnualSlices(events: LedgerEvent[], horizonYears: number): AnnualSlice[] {
  const slices: AnnualSlice[] = [];
  const totals = emptyTotals();
  let index = 0;
  let cumulative = 0;

  for (let year = 1; year <= horizonYears; year += 1) {
    const end = year * MS_PER_YEAR;
    const slice = emptyTotals();
    let spend = 0;

    while (index < events.length && events[index].atMs <= end) {
      const event = events[index];
      const signed = event.credit ? -event.amountPaise : event.amountPaise;
      slice[event.category] += signed;
      totals[event.category] += signed;
      spend += signed;
      index += 1;
    }

    cumulative += spend;
    slices.push({
      year,
      atMs: end,
      spendPaise: spend,
      cumulativePaise: cumulative,
      byCategory: slice,
    });
  }

  return slices;
}

function buildMonthlySeries(
  events: LedgerEvent[],
  horizonMs: number,
  energyPaisePerMs: number,
  months: number,
): MonthlyPoint[] {
  const points: MonthlyPoint[] = [];
  const step = horizonMs / months;
  let index = 0;
  let capex = 0;
  let opex = 0;
  let lastEnergyMs = 0;

  for (let month = 0; month <= months; month += 1) {
    const atMs = Math.min(step * month, horizonMs);

    while (index < events.length && events[index].atMs <= atMs) {
      const event = events[index];
      const signed = event.credit ? -event.amountPaise : event.amountPaise;
      if (event.stage === 'acquisition' || event.stage === 'commissioning') capex += signed;
      else opex += signed;
      if (event.category === 'electricity' || event.category === 'cooling') {
        lastEnergyMs = Math.max(lastEnergyMs, event.atMs);
      }
      index += 1;
    }

    const accrual = roundPaise(energyPaisePerMs * Math.max(0, Math.min(atMs, horizonMs) - lastEnergyMs));
    points.push({ atMs, cumulativePaise: capex + opex + accrual, capexPaise: capex, opexPaise: opex + accrual });
  }

  return points;
}

export function expenditureAt(plan: SimulationPlan, atMs: number): number {
  const clamped = Math.max(0, Math.min(atMs, plan.horizonMs));
  let total = 0;
  let lastEnergyMs = 0;

  for (const event of plan.events) {
    if (event.atMs > clamped) break;
    total += event.credit ? -event.amountPaise : event.amountPaise;
    if (event.category === 'electricity' || event.category === 'cooling') {
      lastEnergyMs = Math.max(lastEnergyMs, event.atMs);
    }
  }

  return total + roundPaise(plan.derived.energyPaisePerMs * (clamped - lastEnergyMs));
}

export function accruedEnergyAt(plan: SimulationPlan, atMs: number): number {
  const clamped = Math.max(0, Math.min(atMs, plan.horizonMs));
  let lastEnergyMs = 0;
  for (const event of plan.events) {
    if (event.atMs > clamped) break;
    if (event.category === 'electricity' || event.category === 'cooling') {
      lastEnergyMs = Math.max(lastEnergyMs, event.atMs);
    }
  }
  return roundPaise(plan.derived.energyPaisePerMs * (clamped - lastEnergyMs));
}

export function eventsUpTo(plan: SimulationPlan, atMs: number): LedgerEvent[] {
  const clamped = Math.max(0, Math.min(atMs, plan.horizonMs));
  const result: LedgerEvent[] = [];
  for (const event of plan.events) {
    if (event.atMs > clamped) break;
    result.push(event);
  }
  return result;
}

export function categoryTotals(events: LedgerEvent[]): Record<LedgerCategory, number> {
  const totals = emptyTotals();
  for (const event of events) {
    totals[event.category] += event.credit ? -event.amountPaise : event.amountPaise;
  }
  return totals;
}

export function nextEventAfter(plan: SimulationPlan, atMs: number): LedgerEvent | null {
  for (const event of plan.events) {
    if (event.atMs > atMs) return event;
  }
  return null;
}

export function majorEvents(plan: SimulationPlan): LedgerEvent[] {
  const threshold = Math.max(
    plan.derived.initialCapexPaise * 0.05,
    plan.derived.annualOpexPaise * 0.15,
  );
  return plan.events.filter(
    (event) =>
      event.amountPaise >= threshold ||
      event.category === 'upgrade' ||
      event.category === 'replacement' ||
      event.category === 'decommission' ||
      event.category === 'recovery',
  );
}

export { emptyTotals as emptyCategoryTotals };
