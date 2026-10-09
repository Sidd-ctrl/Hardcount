import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../defaults';
import { PRESETS } from '../presets';
import { accruedEnergyAt, categoryTotals, eventsUpTo, expenditureAt, simulate } from '../simulate';
import { buildReceipt } from '../receipt';
import { MS_PER_YEAR } from '../money';
import type { HardwareConfig } from '../types';

const START = new Date('2026-01-01T00:00:00.000Z');

function withHorizon(config: HardwareConfig, years: number): HardwareConfig {
  return { ...config, assumptions: { ...config.assumptions, horizonYears: years } };
}

describe('lifecycle event generation', () => {
  const plan = simulate(defaultConfig());

  it('is deterministic for an identical configuration and start date', () => {
    const again = simulate(defaultConfig());
    expect(again.events.length).toBe(plan.events.length);
    expect(again.projectedEndOfLifePaise).toBe(plan.projectedEndOfLifePaise);
    expect(again.events.map((event) => event.id).join('|')).toBe(
      plan.events.map((event) => event.id).join('|'),
    );
  });

  it('produces stable failure scheduling from the configured seed', () => {
    const config = defaultConfig();
    const a = simulate(config);
    const b = simulate({ ...config, assumptions: { ...config.assumptions, failureSeed: 999999 } });
    const aFailures = a.events.filter((event) => event.category === 'incident').map((event) => event.atMs);
    const bFailures = b.events.filter((event) => event.category === 'incident').map((event) => event.atMs);
    expect(aFailures.length).toBeGreaterThan(0);
    expect(aFailures.join(',')).not.toBe(bFailures.join(','));
    const repeated = simulate(config);
    expect(repeated.events.filter((event) => event.category === 'incident').map((event) => event.atMs).join(',')).toBe(
      aFailures.join(','),
    );
  });

  it('records the acquisition once and never re-bills it', () => {
    const hardware = plan.events.filter((event) => event.category === 'hardware');
    const bomIds = plan.derived.bom.filter((line) => line.category === 'hardware').map((line) => line.id);
    expect(hardware.length).toBe(bomIds.length);
    expect(plan.events.filter((event) => event.id === 'capex-storage-data-drives').length).toBe(1);
  });

  it('charges the support contract only after the warranty ends', () => {
    const supportYears = plan.events
      .filter((event) => event.category === 'support')
      .map((event) => Math.floor(event.atMs / MS_PER_YEAR) + 1);
    const warranty = defaultConfig().service.warrantyYears;
    supportYears.forEach((year) => expect(year).toBeGreaterThan(warranty));
  });

  it('emits no failure events when the failure model is switched off', () => {
    const config = defaultConfig();
    const quiet = simulate({ ...config, assumptions: { ...config.assumptions, modelDriveFailures: false } });
    expect(quiet.events.filter((event) => event.category === 'incident').length).toBe(0);
    expect(quiet.events.filter((event) => event.category === 'downtime').length).toBe(0);
  });

  it('omits decommissioning and recovery when they are disabled', () => {
    const config = defaultConfig();
    const without = simulate({ ...config, assumptions: { ...config.assumptions, includeDecommission: false } });
    expect(without.events.filter((event) => event.category === 'decommission').length).toBe(0);
    expect(without.events.filter((event) => event.category === 'recovery').length).toBe(0);
  });

  it('schedules capacity expansion only when auto-expansion is enabled', () => {
    const config = defaultConfig();
    const manual = simulate({ ...config, assumptions: { ...config.assumptions, autoExpandCapacity: false } });
    expect(manual.events.filter((event) => event.category === 'upgrade').length).toBe(0);
    expect(manual.capacitySteps.length).toBe(1);
    expect(manual.exhaustionYear).not.toBeNull();
  });

  it('generates events for every bundled preset without producing non-finite amounts', () => {
    PRESETS.forEach((preset) => {
      const presetPlan = simulate(preset.build());
      expect(presetPlan.events.length).toBeGreaterThan(10);
      presetPlan.events.forEach((event) => {
        expect(Number.isFinite(event.amountPaise)).toBe(true);
        expect(Number.isInteger(event.amountPaise)).toBe(true);
        expect(event.atMs).toBeGreaterThanOrEqual(0);
        expect(event.atMs).toBeLessThanOrEqual(presetPlan.horizonMs);
      });
    });
  });
});

describe('ledger reconciliation', () => {
  const config = withHorizon(defaultConfig(), 10);
  const plan = simulate(config);

  it('reconciles the live counter with the ledger at an arbitrary point in time', () => {
    const atMs = MS_PER_YEAR * 3.37;
    const events = eventsUpTo(plan, atMs);
    const booked = events.reduce((sum, event) => sum + (event.credit ? -event.amountPaise : event.amountPaise), 0);
    const accrued = accruedEnergyAt(plan, atMs);
    expect(booked + accrued).toBe(expenditureAt(plan, atMs));
  });

  it('reconciles the ledger with the projected end-of-life total', () => {
    const totals = categoryTotals(eventsUpTo(plan, plan.horizonMs));
    const sum = Object.values(totals).reduce((acc, value) => acc + value, 0);
    expect(sum).toBe(plan.projectedEndOfLifePaise);
  });

  it('splits energy into IT load and PUE overhead exactly once', () => {
    const totals = categoryTotals(eventsUpTo(plan, plan.horizonMs));
    const combined = (totals.electricity ?? 0) + (totals.cooling ?? 0);
    const annual = plan.derived.annualElectricityPaise + plan.derived.annualCoolingPaise;
    const expected = annual * config.assumptions.horizonYears;
    expect(Math.abs(combined - expected)).toBeLessThan(annual * 0.01);
  });

  it('never lets the counter exceed the projected end-of-life figure', () => {
    [0, MS_PER_YEAR, MS_PER_YEAR * 5, plan.horizonMs, plan.horizonMs * 3].forEach((atMs) => {
      expect(expenditureAt(plan, atMs)).toBeLessThanOrEqual(plan.projectedEndOfLifePaise);
    });
  });

  it('is monotonic over simulated time', () => {
    let previous = -1;
    for (let year = 0; year <= 10; year += 0.5) {
      const total = expenditureAt(plan, year * MS_PER_YEAR);
      expect(total).toBeGreaterThanOrEqual(previous);
      previous = total;
    }
  });

  it('produces a receipt whose lines sum to the counter', () => {
    const atMs = MS_PER_YEAR * 4.5;
    const receipt = buildReceipt(config, plan, atMs, START, 'test build');
    const lineTotal = receipt.lines.reduce((sum, line) => sum + line.amountPaise, 0);
    expect(lineTotal).toBe(receipt.grossPaise);
    expect(receipt.grossPaise).toBe(expenditureAt(plan, atMs));
    expect(receipt.availableTb).toBeCloseTo(receipt.usableTb - receipt.consumedTb, 6);
  });
});
