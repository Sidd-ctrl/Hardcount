import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Layers, Server, SlidersHorizontal, Sparkles } from 'lucide-react';
import { RackVisual } from '@/components/rack/RackVisual';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LiveCounter } from '@/components/simulation/LiveCounter';
import { PRESETS } from '@/domain/presets';
import { formatCapacity, formatMoneyCompact, formatPower } from '@/domain/money';
import { configSummary } from '@/domain/lifecycle';
import { useSimulation } from '@/store/simulation';
import { notify } from '@/store/toasts';

function RiseDelay({ delay, children, className }: { delay: number; children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : delay, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function IntroPage() {
  const navigate = useNavigate();
  const plan = useSimulation((state) => state.plan);
  const config = useSimulation((state) => state.config);
  const phase = useSimulation((state) => state.phase);
  const selectPreset = useSimulation((state) => state.selectPreset);
  const purchase = useSimulation((state) => state.purchase);
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), reduceMotion ? 0 : 1500);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  const derived = plan.derived;

  return (
    <div className="relative">
      <div className="hc-grid-bg pointer-events-none absolute inset-0 opacity-[0.55]" aria-hidden />

      <section className="relative mx-auto grid w-full max-w-[92rem] gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:pb-24 lg:pt-16">
        <div className="min-w-0">
          <RiseDelay delay={0.05}>
            <Badge tone="amber">
              <Sparkles className="h-3 w-3" />
              Deterministic lifetime cost model
            </Badge>
          </RiseDelay>

          <RiseDelay delay={0.14}>
            <h1 className="mt-5 max-w-2xl text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-graphite-50">
              You bought the hardware once.
              <span className="block text-graphite-400">You are paying for it every day.</span>
            </h1>
          </RiseDelay>

          <RiseDelay delay={0.24}>
            <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-graphite-400">
              HARDCOUNT turns an on-premises database build into a running financial instrument.
              Assemble the rack, commit the capital, start the clock and watch electricity, cooling,
              support, maintenance, failures and refreshes accumulate into the number nobody puts on
              the purchase order.
            </p>
          </RiseDelay>

          <RiseDelay delay={0.34}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild variant="primary" size="lg">
                <Link to="/studio">
                  <SlidersHorizontal className="h-4 w-4" />
                  Configure my infrastructure
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  selectPreset('growing-business');
                  purchase();
                  notify('Sample system commissioned', 'A 350 TB nearline array is now on the clock.', 'success');
                  navigate('/dashboard');
                }}
              >
                <Server className="h-4 w-4" />
                Explore a sample system
                <ArrowRight className="h-4 w-4 opacity-70" />
              </Button>
            </div>
          </RiseDelay>

          <RiseDelay delay={0.44}>
            <div className="mt-9 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.04] sm:grid-cols-4">
              {[
                { label: 'Upfront capital', value: formatMoneyCompact(derived.initialCapexPaise) },
                { label: 'Usable capacity', value: formatCapacity(derived.usableTb) },
                { label: 'Facility draw', value: formatPower(derived.facilityPowerWatts) },
                { label: 'Operating / year', value: formatMoneyCompact(derived.annualOpexPaise) },
              ].map((entry) => (
                <div key={entry.label} className="bg-graphite-900/70 px-3 py-3">
                  <div className="hc-label text-[0.625rem]">{entry.label}</div>
                  <div className="hc-figure mt-1 text-sm font-semibold text-graphite-100">{entry.value}</div>
                </div>
              ))}
            </div>
          </RiseDelay>
        </div>

        <RiseDelay delay={0.1} className="flex justify-center lg:justify-end">
          <div className="relative">
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 26, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <RackVisual config={config} live={phase === 'running'} intensity={0.6} />
            </motion.div>

            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 12 }}
              transition={{ duration: 0.7 }}
              className="hc-panel mt-6 w-[300px] max-w-full p-3.5"
            >
              <div className="hc-label">Current configuration</div>
              <p className="mt-1.5 text-xs leading-relaxed text-graphite-300">{configSummary(config)}</p>
              <div className="mt-3 flex items-baseline justify-between border-t border-white/[0.06] pt-3">
                <span className="text-2xs text-graphite-500">Purchase commitment</span>
                <span className="hc-figure text-lg font-semibold text-amber-glow">
                  {formatMoneyCompact(derived.initialCapexPaise)}
                </span>
              </div>
              <Link
                to="/studio"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] py-2 text-2xs font-medium text-graphite-300 transition-colors hover:border-white/[0.16] hover:text-graphite-100"
              >
                <Layers className="h-3 w-3" />
                Change the build
              </Link>
            </motion.div>
          </div>
        </RiseDelay>
      </section>

      <section className="relative mx-auto w-full max-w-[92rem] px-4 pb-16 sm:px-6">
        <RiseDelay delay={0.5}>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-graphite-100">
                The ledger is already running
              </h2>
              <p className="mt-1 text-xs text-graphite-400">
                This counter reads the same simulation state as every chart, table and receipt in the
                product. It is not a decorative number.
              </p>
            </div>
          </div>
        </RiseDelay>
        <LiveCounter />
      </section>

      <section className="relative mx-auto w-full max-w-[92rem] px-4 pb-20 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight text-graphite-100">
          Start from a plausible build
        </h2>
        <p className="mt-1 text-xs text-graphite-400">
          Illustrative starting profiles with editable prices and assumptions, not verified market
          data. Load one and change anything you disagree with.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PRESETS.map((preset, index) => (
            <RiseDelay key={preset.id} delay={0.55 + index * 0.06}>
              <button
                type="button"
                onClick={() => {
                  selectPreset(preset.id);
                  notify('Configuration loaded', preset.name, 'neutral');
                }}
                className="hc-panel group flex h-full w-full flex-col p-4 text-left transition-colors hover:border-white/[0.16]"
              >
                <span className="text-sm font-semibold text-graphite-100">{preset.name}</span>
                <span className="mt-1.5 flex-1 text-2xs leading-relaxed text-graphite-500">{preset.note}</span>
                <span className="mt-3 flex items-center gap-1.5 text-2xs font-medium text-amber-glow opacity-0 transition-opacity group-hover:opacity-100">
                  Load configuration
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            </RiseDelay>
          ))}
        </div>
      </section>
    </div>
  );
}
