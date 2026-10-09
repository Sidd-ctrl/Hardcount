import { useState } from 'react';
import {
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SPEEDS, speedById, formatElapsed } from '@/domain/clock';
import { MS_PER_DAY, MS_PER_YEAR } from '@/domain/money';
import { nextEventAfter } from '@/domain/simulate';
import { useSimulation } from '@/store/simulation';
import { useSimNow } from '@/hooks/useSimNow';
import { notify } from '@/store/toasts';
import { cn } from '@/lib/cn';

export function PlaybackBar() {
  const phase = useSimulation((state) => state.phase);
  const speed = useSimulation((state) => state.speed);
  const plan = useSimulation((state) => state.plan);
  const play = useSimulation((state) => state.play);
  const pause = useSimulation((state) => state.pause);
  const reset = useSimulation((state) => state.reset);
  const setSpeed = useSimulation((state) => state.setSpeed);
  const advance = useSimulation((state) => state.advance);
  const jumpToNextEvent = useSimulation((state) => state.jumpToNextEvent);

  const nowMs = useSimNow(80);
  const elapsed = formatElapsed(nowMs);
  const [confirmReset, setConfirmReset] = useState(false);

  const running = phase === 'running';
  const complete = phase === 'complete';
  const next = nextEventAfter(plan, nowMs);
  const spec = speedById(speed);

  const stepButton = (label: string, onClick: () => void, title: string) => (
    <button
      key={label}
      type="button"
      title={title}
      onClick={onClick}
      className="hc-figure rounded-lg border border-white/[0.08] bg-graphite-850/80 px-2.5 py-1.5 text-2xs font-medium text-graphite-300 transition-colors hover:border-white/[0.16] hover:text-graphite-100 active:translate-y-px disabled:opacity-40"
      disabled={complete}
    >
      {label}
    </button>
  );

  return (
    <div className="hc-panel p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {phase === 'draft' ? (
            <Button variant="primary" size="md" onClick={play} icon={<Zap className="h-4 w-4" />}>
              Commission this system
            </Button>
          ) : (
            <Button
              variant={running ? 'secondary' : 'primary'}
              size="md"
              onClick={running ? pause : play}
              disabled={complete}
              icon={running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            >
              {running ? 'Pause' : 'Resume'}
            </Button>
          )}

          <Button
            variant="ghost"
            size="md"
            onClick={() => setConfirmReset(true)}
            icon={<RotateCcw className="h-4 w-4" />}
          >
            Reset
          </Button>

          <div className="ml-1 flex items-center gap-1.5">
            {stepButton('+1 day', () => advance(MS_PER_DAY), 'Advance one simulated day')}
            {stepButton('+1 month', () => advance(MS_PER_YEAR / 12), 'Advance one simulated month')}
            {stepButton('+1 year', () => advance(MS_PER_YEAR), 'Advance one simulated year')}
            <button
              type="button"
              onClick={jumpToNextEvent}
              title={next ? `Jump to: ${next.title}` : 'No further events'}
              className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-graphite-850/80 px-2.5 py-1.5 text-2xs font-medium text-graphite-300 transition-colors hover:border-white/[0.16] hover:text-graphite-100 active:translate-y-px"
            >
              <SkipForward className="h-3 w-3" />
              Next event
              <ChevronRight className="h-3 w-3 opacity-60" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
          <Segmented
            ariaLabel="Simulation speed"
            size="sm"
            value={speed}
            onChange={(value) => setSpeed(value)}
            options={SPEEDS.map((entry) => ({ value: entry.id, label: entry.label, hint: entry.hint }))}
          />
          <div className="text-right">
            <div className="hc-figure text-base font-semibold leading-none text-graphite-50">
              {elapsed.label}
            </div>
            <div className={cn('mt-1 text-2xs', running ? 'text-amber-glow' : 'text-graphite-500')}>
              {spec.hint}
            </div>
          </div>
        </div>
      </div>

      {next && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/[0.055] pt-3 text-2xs text-graphite-500">
          <span className="uppercase tracking-[0.12em]">Next recorded event</span>
          <span className="text-graphite-300">{next.title}</span>
          <span className="hc-figure text-graphite-500">
            in {Math.max(0, (next.atMs - nowMs) / MS_PER_DAY).toFixed(1)} simulated days
          </span>
        </div>
      )}

      {complete && (
        <div className="mt-3 rounded-lg border border-alert-glow/25 bg-alert-glow/[0.07] px-3 py-2 text-2xs text-alert-glow">
          The modelled horizon of {plan.horizonMs / MS_PER_YEAR} years has been reached. Extend the
          horizon in the build studio, or reset to start a new lifecycle.
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset this lifecycle?"
        description="The simulated clock returns to zero and the operating ledger is cleared. Your hardware configuration is kept, so the same starting conditions reproduce the same result."
        confirmLabel="Reset clock"
        destructive
        onConfirm={() => {
          reset();
          notify('Lifecycle reset', 'The clock is back at zero with the same configuration.', 'neutral');
        }}
      />
    </div>
  );
}
