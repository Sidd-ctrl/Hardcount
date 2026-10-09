import { describe, expect, it } from 'vitest';
import { SPEEDS, simulatedMs, formatElapsed } from '../clock';
import { defaultConfig } from '../defaults';
import { expenditureAt, simulate } from '../simulate';
import { MS_PER_DAY, MS_PER_YEAR } from '../money';

const plan = simulate(defaultConfig());

describe('simulation clock', () => {
  it('freezes simulated time while the anchor is cleared', () => {
    const frozen = simulatedMs(MS_PER_DAY * 12, null, 'year', Date.now() + 1e9);
    expect(frozen).toBe(MS_PER_DAY * 12);
  });

  it('advances simulated time by the speed multiplier only', () => {
    const wall = 1_700_000_000_000;
    const oneDayPerSecond = simulatedMs(0, wall, 'day', wall + 1000);
    expect(oneDayPerSecond).toBeCloseTo(MS_PER_DAY, 0);
  });

  it('exposes the five documented virtual speeds', () => {
    expect(SPEEDS.map((speed) => speed.id)).toEqual(['1x', '60x', 'day', 'month', 'year']);
    SPEEDS.forEach((speed) => expect(speed.simMsPerRealMs).toBeGreaterThan(0));
  });

  it('formats elapsed simulated time into a readable clock', () => {
    const elapsed = formatElapsed(MS_PER_YEAR * 2 + MS_PER_DAY * 3);
    expect(elapsed.years).toBe(2);
    expect(elapsed.days).toBe(3);
    expect(elapsed.label).toMatch(/^2y 003d/);
  });
});

describe('acceleration neutrality', () => {
  const target = MS_PER_YEAR * 4;

  it('produces the same modelled expenditure for the same simulated period at every speed', () => {
    const wall = 1_700_000_000_000;
    const results = SPEEDS.map((speed) => {
      const realMsNeeded = target / speed.simMsPerRealMs;
      const reached = simulatedMs(0, wall, speed.id, wall + realMsNeeded);
      return { id: speed.id, reached, total: expenditureAt(plan, reached) };
    });

    results.forEach((result) => {
      expect(result.reached).toBeCloseTo(target, 0);
      expect(result.total).toBe(results[0].total);
    });
  });

  it('reaches the same total whether time is stepped in months or taken in one jump', () => {
    const stepped = Array.from({ length: 48 }, (_, index) => (index + 1) * (MS_PER_YEAR / 12));
    const lastStep = stepped[stepped.length - 1];
    expect(expenditureAt(plan, lastStep)).toBe(expenditureAt(plan, target));
  });

  it('does not derive expenditure from wall-clock elapsed time', () => {
    const a = expenditureAt(plan, MS_PER_YEAR);
    const b = expenditureAt(plan, MS_PER_YEAR);
    expect(a).toBe(b);
    expect(expenditureAt(plan, MS_PER_YEAR + 1)).toBeGreaterThanOrEqual(a);
  });

  it('clamps expenditure to the configured horizon', () => {
    const atHorizon = expenditureAt(plan, plan.horizonMs);
    expect(expenditureAt(plan, plan.horizonMs * 10)).toBe(atHorizon);
  });
});
