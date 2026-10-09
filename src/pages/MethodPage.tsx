import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { COOLING_OPTIONS, DRIVE_TYPES, PROCESSOR_CLASSES } from '@/domain/catalog';
import { formatMoney } from '@/domain/money';
import { configSummary } from '@/domain/lifecycle';
import { useSimulation } from '@/store/simulation';

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <code className="hc-figure mt-1.5 block rounded-lg border border-white/[0.07] bg-graphite-950/60 px-3 py-2.5 text-2xs leading-relaxed text-graphite-200">
      {children}
    </code>
  );
}

function Definition({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/[0.055] py-3 first:border-0 first:pt-0">
      <dt className="text-[0.8125rem] font-medium text-graphite-100">{term}</dt>
      <dd className="mt-1 text-2xs leading-relaxed text-graphite-400">{children}</dd>
    </div>
  );
}

export function MethodPage() {
  const plan = useSimulation((state) => state.plan);
  const config = useSimulation((state) => state.config);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-graphite-50">How the model works</h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-graphite-400">
          HARDCOUNT is a deterministic cost model. The same configuration, the same starting state and
          the same amount of simulated time always produce the same rupee figures, on any device, at
          any playback speed. This page states every formula and every assumption it relies on.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Accounting method" subtitle="What the headline number actually is.">
          <dl>
            <Definition term="Currency representation">
              Every monetary value is held internally as an integer count of paise, one hundredth of a
              rupee. Nothing is accumulated as a floating-point rupee value, so rounding drift cannot
              build up over a fifteen-year ledger. Display values are rounded once, at the edge.
            </Definition>
            <Definition term="Cash basis">
              The headline total cost of ownership is a cash figure: initial and subsequent capital
              outlays, plus operating charges, plus modelled incident and decommissioning costs, minus
              any asset recovery credited at retirement. Economic depreciation is deliberately not
              mixed into that number.
            </Definition>
            <Definition term="Net modelled TCO">
              <Formula>
                net TCO = (day-zero capital + subsequent capital) + operating expenditure + incident
                and decommissioning cost − asset recovery credited
              </Formula>
              Residual asset value is reported separately on the receipt and is never subtracted twice.
            </Definition>
            <Definition term="No double counting">
              A replacement drive is booked once, as a purchase. Its power draw is already inside the
              IT load used by the energy model, so no second energy charge is raised for it. Cooling is
              represented through PUE alone; there is no separate cooling multiplier stacked on top.
            </Definition>
            <Definition term="Reconciliation">
              The counter equals the sum of every ledger entry at or before the current simulated
              instant, plus energy accrued since the last billing boundary. The ledger page shows both
              parts separately so the arithmetic can be checked by hand.
            </Definition>
          </dl>
        </Panel>

        <Panel title="Formulas" subtitle="Exactly what the engine computes.">
          <dl>
            <Definition term="Energy consumption">
              <Formula>kWh = (watts / 1000) × operating hours</Formula>
              Operating hours are 24 × 365.25 per simulated year. IT load is the sum of server
              platforms, memory, drives and switching.
            </Definition>
            <Definition term="Facility energy and cooling">
              <Formula>
                facility kWh = IT kWh × PUE{'\n'}cooling kWh = facility kWh − IT kWh
              </Formula>
              Both slices are billed at the same tariff and posted as separate ledger categories, so
              cooling is visible without being counted twice.
            </Definition>
            <Definition term="Electricity cost">
              <Formula>cost = kWh × tariff per kWh</Formula>
              Posted monthly. Between billing boundaries the cost accrues continuously per millisecond
              of simulated time, which is what makes the counter tick smoothly.
            </Definition>
            <Definition term="Usable capacity">
              <Formula>
                array TB = drive count × capacity per drive × redundancy efficiency{'\n'}usable TB =
                array TB × (1 − reserve %)
              </Formula>
              RAID 10 yields floor(n/2)/n, RAID 6 yields (n−2)/n, RAID 5 yields (n−1)/n, JBOD yields 1.
              Hot spares are purchased but do not add usable capacity.
            </Definition>
            <Definition term="Demand growth">
              <Formula>
                compound: demand(t) = initial × (1 + g)^t{'\n'}linear: demand(t) = initial × (1 + g·t)
              </Formula>
              t is measured in simulated years. The model in use is stated on the capacity chart.
            </Definition>
            <Definition term="Cost escalation">
              <Formula>factor(t) = (1 + inflation)^t</Formula>
              Applied to recurring, maintenance, replacement and failure costs when escalation is
              switched on. With it off, every figure is expressed in today's rupees and the chart's
              real-terms view collapses onto the nominal one.
            </Definition>
            <Definition term="Cost per capacity unit">
              <Formula>
                per usable TB-year = total cost / (usable TB × years elapsed){'\n'}per stored TB-year =
                total cost / cumulative stored TB-years
              </Formula>
              Cumulative stored terabyte-years is the integral of the demand curve, so a build that
              fills slowly is not credited with capacity it never used.
            </Definition>
          </dl>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="The simulation clock" subtitle="Why speeding up time cannot change the bill.">
          <dl>
            <Definition term="Simulated time is the only input">
              Cost is a pure function of the plan and the elapsed simulated milliseconds. The renderer
              never contributes to it. Playback speed only controls how much simulated time elapses per
              real second.
            </Definition>
            <Definition term="Pause freezes the clock">
              Pausing banks the elapsed simulated time and clears the wall-clock anchor. Nothing
              accrues while paused, and resuming continues from the banked value.
            </Definition>
            <Definition term="Reloading does not fast-forward">
              State is stored in localStorage without a running anchor. On reload the simulation comes
              back paused at the banked instant. An inactive tab is never assumed to have kept running.
            </Definition>
            <Definition term="Deterministic failures">
              Drive failures are scheduled from a seeded generator with an explicit carry accumulator,
              so the annual failure rate is honoured over the horizon and the same seed always yields
              the same dates. Nothing catastrophic happens that the configuration did not ask for.
            </Definition>
            <Definition term="Verified by test">
              The suite asserts that reaching the same simulated instant at 1×, 60×, one day per
              second, one month per second and one year per second produces an identical total, and
              that stepping in monthly increments matches a single multi-year jump.
            </Definition>
          </dl>
        </Panel>

        <Panel title="Reference values in use" subtitle="Illustrative, editable, and not a market feed.">
          <p className="text-2xs leading-relaxed text-graphite-500">
            These are the numbers the engine started with for the configuration currently loaded. They
            are plausible placeholders chosen to make the model usable immediately. They are not
            verified current prices, and no supplier or tariff authority has confirmed them. Overwrite
            anything that does not match your environment.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[26rem] border-collapse text-left text-2xs">
              <thead className="hc-label border-b border-white/[0.07] text-[0.625rem]">
                <tr>
                  <th scope="col" className="px-2 py-2 font-medium">Component</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Price</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Power</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(PROCESSOR_CLASSES).map((cpu) => (
                  <tr key={cpu.id} className="border-b border-white/[0.045]">
                    <td className="px-2 py-2 text-graphite-300">{cpu.label}</td>
                    <td className="hc-figure px-2 py-2 text-right text-graphite-200">
                      {formatMoney(cpu.basePrice)}
                    </td>
                    <td className="hc-figure px-2 py-2 text-right text-graphite-400">{cpu.baseWatts} W</td>
                  </tr>
                ))}
                {Object.values(DRIVE_TYPES).map((drive) => (
                  <tr key={drive.id} className="border-b border-white/[0.045]">
                    <td className="px-2 py-2 text-graphite-300">{drive.label} per TB</td>
                    <td className="hc-figure px-2 py-2 text-right text-graphite-200">
                      {formatMoney(drive.pricePerTb)}
                    </td>
                    <td className="hc-figure px-2 py-2 text-right text-graphite-400">{drive.watts} W</td>
                  </tr>
                ))}
                {Object.values(COOLING_OPTIONS).map((cooling) => (
                  <tr key={cooling.id} className="border-b border-white/[0.045]">
                    <td className="px-2 py-2 text-graphite-300">{cooling.label}</td>
                    <td className="hc-figure px-2 py-2 text-right text-graphite-200">
                      {formatMoney(cooling.cost)}
                    </td>
                    <td className="hc-figure px-2 py-2 text-right text-graphite-400">
                      PUE {cooling.referencePue.toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-2 py-2 text-graphite-300">Electricity tariff</td>
                  <td className="hc-figure px-2 py-2 text-right text-graphite-200">
                    {formatMoney(config.facility.electricityRate)}/kWh
                  </td>
                  <td className="px-2 py-2 text-right text-graphite-500">editable</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 border-t border-white/[0.06] pt-3 text-2xs leading-relaxed text-graphite-500">
            If a live pricing feed were ever connected, the source, retrieval date and region would
            have to be shown next to every figure. Nothing in this build claims that.
          </p>
        </Panel>
      </div>

      <Panel title="Currently loaded configuration" subtitle="The exact inputs behind every number you see.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="hc-label">Build</div>
            <div className="mt-1 text-2xs leading-relaxed text-graphite-200">{configSummary(config)}</div>
          </div>
          <div>
            <div className="hc-label">Horizon</div>
            <div className="hc-figure mt-1 text-2xs text-graphite-200">
              {config.assumptions.horizonYears} years
            </div>
          </div>
          <div>
            <div className="hc-label">Escalation</div>
            <div className="hc-figure mt-1 text-2xs text-graphite-200">
              {config.assumptions.escalateCosts ? `${config.assumptions.inflationPct}% per year` : 'none'}
            </div>
          </div>
          <div>
            <div className="hc-label">Projected end of life</div>
            <div className="hc-figure mt-1 text-2xs font-semibold text-amber-glow">
              {formatMoney(plan.projectedEndOfLifePaise)}
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <div className="hc-label mb-2">Explicitly not modelled</div>
          <div className="flex flex-wrap gap-1.5">
            {[
              'Software licensing for the database engine',
              'Network egress and bandwidth charges',
              'Staff training and turnover',
              'Tax treatment and capital allowances',
              'Disaster recovery at a second site',
              'Currency movement on imported hardware',
            ].map((item) => (
              <Badge key={item} tone="neutral">
                {item}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-2xs leading-relaxed text-graphite-500">
            Every projection shown in HARDCOUNT is an estimate derived from the assumptions you can
            see and edit. It is a way to understand consequences, not a guarantee about future spend.
            Residual value, resale recovery and failure counts in particular are modelling choices
            rather than forecasts.
          </p>
        </div>
      </Panel>

      <Panel title="Performance and accessibility notes">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="hc-label">Rendering</div>
            <p className="mt-1.5 text-2xs leading-relaxed text-graphite-400">
              Financial values are computed outside React's render path and stored in the simulation
              state. Animated number updates never feed back into the model. Heavy chart and page
              modules are code-split and loaded on demand.
            </p>
          </div>
          <div>
            <div className="hc-label">Accessibility</div>
            <p className="mt-1.5 text-2xs leading-relaxed text-graphite-400">
              Charts expose an image role with a descriptive label. Controls are semantic, keyboard
              reachable and show a visible focus ring. Motion honours the operating system's
              reduced-motion preference, and the print layout is a clean black-on-white receipt.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
