import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultConfig } from '@/domain/defaults';
import { normalizeConfig } from '@/domain/normalize';
import { presetById } from '@/domain/presets';
import { simulate, nextEventAfter } from '@/domain/simulate';
import { simulatedMs } from '@/domain/clock';
import type { HardwareConfig, Scenario, SimulationPlan, SpeedId } from '@/domain/types';

export type Phase = 'draft' | 'running' | 'paused' | 'complete';

export const STORAGE_KEY = 'hardcount.state.v1';

interface SimulationState {
  config: HardwareConfig;
  plan: SimulationPlan;
  phase: Phase;
  speed: SpeedId;
  bankedMs: number;
  anchorWallMs: number | null;
  startDate: string | null;
  scenarioName: string;
  scenarioNote: string;
  baselineScenarioId: string | null;
  scenarios: Scenario[];
  hydrateCount: number;
}

interface SimulationActions {
  patchConfig: <K extends keyof HardwareConfig>(section: K, patch: Partial<HardwareConfig[K]>) => void;
  replaceConfig: (config: HardwareConfig) => void;
  selectPreset: (presetId: string) => void;
  purchase: () => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: SpeedId) => void;
  advance: (deltaMs: number) => void;
  jumpToNextEvent: () => void;
  setScenarioName: (name: string) => void;
  setScenarioNote: (note: string) => void;
  saveScenario: () => Scenario;
  loadScenario: (id: string) => void;
  removeScenario: (id: string) => void;
  setBaseline: (id: string | null) => void;
  simMsAt: (wallNow: number) => number;
}

export type SimulationStore = SimulationState & SimulationActions;

function planFor(config: HardwareConfig): SimulationPlan {
  return simulate(config);
}

function clampToHorizon(value: number, horizonMs: number): number {
  return Math.max(0, Math.min(value, horizonMs));
}

function buildPlan(config: HardwareConfig, bankedMs: number) {
  const plan = planFor(config);
  return { plan, bankedMs: clampToHorizon(bankedMs, plan.horizonMs) };
}

const initialConfig = normalizeConfig(defaultConfig());

export const useSimulation = create<SimulationStore>()(
  persist(
    (set, get) => ({
      config: initialConfig,
      plan: planFor(initialConfig),
      phase: 'draft',
      speed: 'day',
      bankedMs: 0,
      anchorWallMs: null,
      startDate: null,
      scenarioName: 'Untitled build',
      scenarioNote: '',
      baselineScenarioId: null,
      scenarios: [],
      hydrateCount: 0,

      patchConfig: (section, patch) => {
        const current = get();
        const next = normalizeConfig({
          ...current.config,
          [section]: { ...current.config[section], ...patch },
        });
        const { plan, bankedMs } = buildPlan(next, current.bankedMs);
        set({ config: next, plan, bankedMs });
      },

      replaceConfig: (config) => {
        const current = get();
        const next = normalizeConfig(config);
        const { plan, bankedMs } = buildPlan(next, current.bankedMs);
        set({ config: next, plan, bankedMs });
      },

      selectPreset: (presetId) => {
        const preset = presetById(presetId);
        if (!preset) return;
        const next = normalizeConfig(preset.build());
        const { plan } = buildPlan(next, 0);
        set({
          config: next,
          plan,
          bankedMs: 0,
          anchorWallMs: null,
          startDate: null,
          phase: 'draft',
          scenarioName: preset.name,
        });
      },

      purchase: () => {
        const current = get();
        const startDate = new Date().toISOString();
        const { plan } = buildPlan(current.config, 0);
        set({
          startDate,
          plan,
          bankedMs: 0,
          anchorWallMs: Date.now(),
          phase: 'running',
        });
      },

      play: () => {
        const current = get();
        if (current.phase === 'draft') {
          get().purchase();
          return;
        }
        if (current.bankedMs >= current.plan.horizonMs) return;
        set({ anchorWallMs: Date.now(), phase: 'running' });
      },

      pause: () => {
        const current = get();
        if (current.anchorWallMs === null) {
          set({ phase: current.phase === 'draft' ? 'draft' : 'paused' });
          return;
        }
        const nowMs = simulatedMs(current.bankedMs, current.anchorWallMs, current.speed, Date.now());
        const bankedMs = clampToHorizon(nowMs, current.plan.horizonMs);
        set({
          bankedMs,
          anchorWallMs: null,
          phase: bankedMs >= current.plan.horizonMs ? 'complete' : 'paused',
        });
      },

      reset: () => {
        const current = get();
        const { plan } = buildPlan(current.config, 0);
        set({ bankedMs: 0, anchorWallMs: null, phase: 'draft', plan });
      },

      setSpeed: (speed) => {
        const current = get();
        if (current.anchorWallMs === null) {
          set({ speed });
          return;
        }
        const nowMs = simulatedMs(current.bankedMs, current.anchorWallMs, current.speed, Date.now());
        set({
          bankedMs: clampToHorizon(nowMs, current.plan.horizonMs),
          anchorWallMs: Date.now(),
          speed,
        });
      },

      advance: (deltaMs) => {
        const current = get();
        if (current.phase === 'draft') {
          get().purchase();
        }
        const state = get();
        const base =
          state.anchorWallMs === null
            ? state.bankedMs
            : simulatedMs(state.bankedMs, state.anchorWallMs, state.speed, Date.now());
        const bankedMs = clampToHorizon(base + deltaMs, state.plan.horizonMs);
        const reachedEnd = bankedMs >= state.plan.horizonMs;
        const phase: Phase = reachedEnd ? 'complete' : state.phase === 'draft' ? 'running' : state.phase;
        set({
          bankedMs,
          anchorWallMs: phase === 'running' && !reachedEnd ? Date.now() : null,
          phase,
        });
      },

      jumpToNextEvent: () => {
        const current = get();
        const base =
          current.anchorWallMs === null
            ? current.bankedMs
            : simulatedMs(current.bankedMs, current.anchorWallMs, current.speed, Date.now());
        const next = nextEventAfter(current.plan, base);
        if (!next) {
          set({ bankedMs: current.plan.horizonMs, anchorWallMs: null, phase: 'complete' });
          return;
        }
        if (current.phase === 'draft') get().purchase();
        set({ bankedMs: next.atMs, anchorWallMs: null, phase: 'paused' });
      },

      setScenarioName: (scenarioName) => set({ scenarioName }),
      setScenarioNote: (scenarioNote) => set({ scenarioNote }),

      saveScenario: () => {
        const current = get();
        const plan = current.plan;
        const scenario: Scenario = {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          name: current.scenarioName.trim() || 'Untitled build',
          note: current.scenarioNote.trim(),
          config: JSON.parse(JSON.stringify(current.config)) as HardwareConfig,
          savedAtMs: Date.now(),
          totalPaise: plan.projectedEndOfLifePaise,
          capexPaise: plan.derived.initialCapexPaise,
          annualOpexPaise: plan.derived.annualOpexPaise,
          usableTb: plan.derived.usableTb,
        };
        set({ scenarios: [...current.scenarios, scenario] });
        return scenario;
      },

      loadScenario: (id) => {
        const current = get();
        const scenario = current.scenarios.find((entry) => entry.id === id);
        if (!scenario) return;
        const config = normalizeConfig(scenario.config);
        const { plan } = buildPlan(config, 0);
        set({
          config,
          plan,
          bankedMs: 0,
          anchorWallMs: null,
          startDate: null,
          phase: 'draft',
          scenarioName: scenario.name,
          scenarioNote: scenario.note,
        });
      },

      removeScenario: (id) => {
        const current = get();
        set({
          scenarios: current.scenarios.filter((entry) => entry.id !== id),
          baselineScenarioId: current.baselineScenarioId === id ? null : current.baselineScenarioId,
        });
      },

      setBaseline: (baselineScenarioId) => set({ baselineScenarioId }),

      simMsAt: (wallNow) => {
        const state = get();
        return clampToHorizon(
          simulatedMs(state.bankedMs, state.anchorWallMs, state.speed, wallNow),
          state.plan.horizonMs,
        );
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        config: state.config,
        phase: state.phase,
        speed: state.speed,
        bankedMs: state.bankedMs,
        startDate: state.startDate,
        scenarioName: state.scenarioName,
        scenarioNote: state.scenarioNote,
        baselineScenarioId: state.baselineScenarioId,
        scenarios: state.scenarios,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<SimulationState> | undefined;
        if (!saved) return current;
        const config = normalizeConfig(saved.config ?? current.config);
        const startDate = saved.startDate ?? null;
        const plan = planFor(config);
        const bankedMs = clampToHorizon(saved.bankedMs ?? 0, plan.horizonMs);
        const savedPhase = saved.phase ?? 'draft';
        return {
          ...current,
          config,
          plan,
          bankedMs,
          anchorWallMs: null,
          startDate,
          phase: savedPhase === 'running' ? 'paused' : savedPhase,
          speed: saved.speed ?? 'day',
          scenarioName: saved.scenarioName ?? current.scenarioName,
          scenarioNote: saved.scenarioNote ?? current.scenarioNote,
          baselineScenarioId: saved.baselineScenarioId ?? null,
          scenarios: saved.scenarios ?? [],
          hydrateCount: current.hydrateCount + 1,
        };
      },
    },
  ),
);

export function useSimulationDate(): Date {
  const startDate = useSimulation((state) => state.startDate);
  return startDate ? new Date(startDate) : new Date();
}
