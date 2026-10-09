import type { CapacityPoint, GrowthModelId, StorageConfig } from './types';

export function demandAtTb(storage: StorageConfig, years: number): number {
  const rate = storage.annualGrowthPct / 100;
  if (storage.growthModel === 'compound') {
    return storage.initialDataTb * Math.pow(1 + rate, years);
  }
  return storage.initialDataTb * (1 + rate * years);
}

export function growthLabel(model: GrowthModelId): string {
  return model === 'compound'
    ? 'Compounded annually on the previous year\u2019s total'
    : 'Linear: a fixed share of the starting volume added each year';
}

export function exhaustionYear(
  storage: StorageConfig,
  usableTb: number,
  horizonYears: number,
  steps: { atYears: number; usableTb: number }[] = [],
): number | null {
  if (usableTb <= 0) return 0;
  const resolution = 0.25;
  for (let year = 0; year <= horizonYears; year += resolution) {
    let capacity = usableTb;
    for (const step of steps) {
      if (step.atYears <= year) capacity = step.usableTb;
    }
    if (demandAtTb(storage, year) > capacity) {
      return Math.round(year * 100) / 100;
    }
  }
  return null;
}

export function capacitySeries(
  storage: StorageConfig,
  steps: { atMs: number; usableTb: number }[],
  horizonMs: number,
  msPerYear: number,
): CapacityPoint[] {
  const points: CapacityPoint[] = [];
  const samples = 120;
  for (let index = 0; index <= samples; index += 1) {
    const atMs = (horizonMs * index) / samples;
    const years = atMs / msPerYear;
    let usableTb = steps.length > 0 ? steps[0].usableTb : 0;
    for (const step of steps) {
      if (step.atMs <= atMs) usableTb = step.usableTb;
    }
    points.push({ year: Math.round(years * 100) / 100, atMs, demandTb: demandAtTb(storage, years), usableTb });
  }
  return points;
}
