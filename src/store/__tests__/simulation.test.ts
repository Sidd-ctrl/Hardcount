import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSimulation } from '../simulation';
import { defaultConfig } from '@/domain/defaults';
import { expenditureAt } from '@/domain/simulate';
import { MS_PER_DAY, MS_PER_YEAR } from '@/domain/money';
import { STORAGE_KEY } from '../simulation';

const initialState = useSimulation.getState();

function freshStore() {
  useSimulation.setState({
    ...initialState,
    config: defaultConfig(),
    phase: 'draft',
    bankedMs: 0,
    anchorWallMs: null,
    startDate: null,
    scenarios: [],
  });
}

describe('simulation controller', () => {
  beforeEach(() => {
    localStorage.clear();
    freshStore();
  });

  it('starts in the draft phase with no capital committed to the clock', () => {
    const state = useSimulation.getState();
    expect(state.phase).toBe('draft');
    expect(state.bankedMs).toBe(0);
    expect(state.startDate).toBeNull();
    expect(state.plan.derived.initialCapexPaise).toBeGreaterThan(0);
  });

  it('commits the acquisition and starts the clock on purchase', () => {
    useSimulation.getState().purchase();
    const state = useSimulation.getState();
    expect(state.phase).toBe('running');
    expect(state.startDate).not.toBeNull();
    expect(state.anchorWallMs).not.toBeNull();
    const booked = state.plan.events.filter((event) => event.atMs === 0).length;
    expect(booked).toBeGreaterThan(0);
  });

  it('freezes simulated time on pause and resumes from the frozen point', () => {
    useSimulation.getState().purchase();
    const running = useSimulation.getState();
    const banked = MS_PER_YEAR * 2;
    useSimulation.setState({ bankedMs: banked, anchorWallMs: null, phase: 'paused' });

    const paused = useSimulation.getState();
    expect(paused.simMsAt(Date.now())).toBe(banked);
    expect(paused.simMsAt(Date.now() + MS_PER_YEAR * 40)).toBe(banked);

    paused.play();
    const resumed = useSimulation.getState();
    expect(resumed.phase).toBe('running');
    expect(resumed.simMsAt(Date.now())).toBeGreaterThanOrEqual(banked);
    void running;
  });

  it('recalculates the plan when the configuration changes', () => {
    const before = useSimulation.getState().plan.derived.initialCapexPaise;
    useSimulation.getState().patchConfig('storage', { driveCount: 48 });
    const after = useSimulation.getState().plan.derived.initialCapexPaise;
    expect(after).toBeGreaterThan(before);
  });

  it('clamps out-of-range configuration input instead of breaking the model', () => {
    useSimulation.getState().patchConfig('storage', { driveCount: -50 });
    expect(useSimulation.getState().config.storage.driveCount).toBe(1);
    useSimulation.getState().patchConfig('facility', { pue: 99 });
    expect(useSimulation.getState().config.facility.pue).toBe(3);
    expect(Number.isFinite(useSimulation.getState().plan.derived.usableTb)).toBe(true);
  });

  it('advances by explicit increments without touching the wall clock', () => {
    useSimulation.getState().purchase();
    useSimulation.getState().advance(MS_PER_DAY * 30);
    const afterStep = useSimulation.getState();
    expect(afterStep.bankedMs).toBe(MS_PER_DAY * 30);
    expect(expenditureAt(afterStep.plan, afterStep.bankedMs)).toBeGreaterThan(
      afterStep.plan.derived.initialCapexPaise,
    );
  });

  it('jumps to the next recorded lifecycle event', () => {
    useSimulation.getState().purchase();
    useSimulation.getState().jumpToNextEvent();
    const state = useSimulation.getState();
    const next = state.plan.events.find((event) => event.atMs > 0);
    expect(next).toBeDefined();
    expect(state.bankedMs).toBe(next?.atMs);
    expect(state.phase).toBe('paused');
  });

  it('stops at the horizon and marks the run complete', () => {
    useSimulation.getState().purchase();
    const horizon = useSimulation.getState().plan.horizonMs;
    useSimulation.getState().advance(horizon * 5);
    const state = useSimulation.getState();
    expect(state.bankedMs).toBe(horizon);
    expect(state.phase).toBe('complete');
    expect(expenditureAt(state.plan, state.bankedMs)).toBe(state.plan.projectedEndOfLifePaise);
  });

  it('resets the clock while keeping the configuration', () => {
    useSimulation.getState().purchase();
    useSimulation.getState().advance(MS_PER_YEAR);
    const configBefore = useSimulation.getState().config;
    useSimulation.getState().reset();
    const state = useSimulation.getState();
    expect(state.bankedMs).toBe(0);
    expect(state.phase).toBe('draft');
    expect(state.config).toEqual(configBefore);
  });

  it('saves, lists, reloads and deletes scenarios', () => {
    useSimulation.getState().purchase();
    const saved = useSimulation.getState().saveScenario();
    expect(useSimulation.getState().scenarios).toHaveLength(1);

    useSimulation.getState().patchConfig('storage', { driveCount: 90 });
    expect(useSimulation.getState().config.storage.driveCount).toBe(90);

    useSimulation.getState().loadScenario(saved.id);
    expect(useSimulation.getState().config.storage.driveCount).toBe(24);
    expect(useSimulation.getState().phase).toBe('draft');

    useSimulation.getState().removeScenario(saved.id);
    expect(useSimulation.getState().scenarios).toHaveLength(0);
  });

  it('persists state to local storage', () => {
    useSimulation.getState().purchase();
    useSimulation.getState().advance(MS_PER_DAY * 90);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.bankedMs).toBe(MS_PER_DAY * 90);
    expect(parsed.state.anchorWallMs).toBeUndefined();
  });
});

describe('restoring a saved simulation', () => {
  it('never assumes an inactive tab kept running', async () => {
    localStorage.clear();
    freshStore();
    useSimulation.getState().purchase();
    useSimulation.setState({ bankedMs: MS_PER_DAY * 45, phase: 'running' });

    vi.resetModules();
    const reloaded = await import('../simulation');
    const state = reloaded.useSimulation.getState();

    expect(state.anchorWallMs).toBeNull();
    expect(state.phase).toBe('paused');
    expect(state.bankedMs).toBe(MS_PER_DAY * 45);
    expect(state.simMsAt(Date.now() + MS_PER_YEAR * 20)).toBe(MS_PER_DAY * 45);
  });

  it('rebuilds the plan deterministically after a reload', async () => {
    localStorage.clear();
    freshStore();
    const config = defaultConfig();
    const startDate = '2026-01-01T00:00:00.000Z';
    useSimulation.setState({ config, startDate, bankedMs: MS_PER_YEAR * 2, phase: 'paused' });
    const before = useSimulation.getState().plan.projectedEndOfLifePaise;

    vi.resetModules();
    const reloaded = await import('../simulation');
    const state = reloaded.useSimulation.getState();

    expect(state.plan.projectedEndOfLifePaise).toBe(before);
    expect(state.config.storage.driveCount).toBe(config.storage.driveCount);
  });
});
