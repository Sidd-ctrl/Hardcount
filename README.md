# HARDCOUNT

**Every byte has a lifetime cost.**
You bought the hardware once. You're paying for it every day.

HARDCOUNT is an interactive financial simulator for on-premises physical database infrastructure. You assemble a rack, commit the capital, start the clock and watch electricity, cooling, support, maintenance, failures and refreshes accumulate into the number nobody puts on the purchase order.

It runs entirely in the browser. No backend, no accounts, no API keys.

---

## What it does

1. **Build studio** — assemble a database system from real components: servers, sockets, memory, media class, drive count, RAID layout, hot spares, rack, UPS, switching, cooling, tariff, warranty, support contracts, DBA cover, insurance, labour rates and the failure scenario. Every field recalculates the projection immediately.
2. **Commission** — the acquisition is booked to the ledger as a set of day-zero entries and the simulated clock starts.
3. **Run the lifecycle** — accelerate time from 1× to one simulated year per second and watch the counter accumulate. Pause, reset, or step by a day, a month, a year, or straight to the next recorded event.
4. **Financial dashboard** — lifetime expenditure curve, cost composition, storage capacity trajectory, capital versus operating spend, lifecycle timeline, and two clearly defined cost-efficiency measures.
5. **Physical cost ledger** — every rupee traced to an entry with its quantity, unit price, recurrence rule and source assumption. Filterable, searchable, sortable, exportable to CSV. The cumulative total reconciles with the counter.
6. **Scenario lab** — save builds and compare them on a synchronised cumulative-cost chart with a labelled baseline. It deliberately does not declare a winner.
7. **Cost receipt** — a printable, CSV-exportable operational record of everything spent up to the current simulated date.

---

## Running it

```bash
npm install
npm run dev        # development server
npm run build      # production build into dist/
npm run preview    # serve the production build
npm test           # run the full test suite
npm run lint       # eslint over src
```

Requires Node 18 or newer.

### Deploying to Netlify

The repository is configured for Netlify already:

- `netlify.toml` sets the build command to `npm run build` and the publish directory to `dist`
- `public/_redirects` rewrites every path to `/index.html` so deep links like `/dashboard` survive a refresh
- `vite.config.ts` uses an absolute asset base, so bundle URLs resolve correctly from the site root

Drag the repository into Netlify, or connect it to a Git remote and let Netlify build it. Nothing else is required.

---

## The financial model

### Accounting method

| Property | Choice |
| --- | --- |
| Currency | Indian rupee, held internally as an **integer count of paise** |
| Basis | **Cash**, not accrual and not depreciated |
| Cooling | Represented through **PUE only** — no second multiplier |
| Recovery | Credited **once**, against modelled residual value |

Net modelled total cost of ownership:

```
net TCO = (day-zero capital + subsequent capital)
        + operating expenditure
        + incident and decommissioning cost
        − asset recovery credited
```

Economic depreciation is never mixed into that figure. Residual asset value is reported separately on the receipt.

### Formulas

**Energy**

```
kWh          = (watts / 1000) × operating hours
facility kWh = IT kWh × PUE
cooling kWh  = facility kWh − IT kWh
cost         = kWh × tariff per kWh
```

The IT slice is billed as *electricity* and the overhead slice as *cooling energy* — two separate ledger categories, so cooling is visible without being counted twice. Operating hours are 24 × 365.25 per simulated year.

**Usable capacity**

```
array TB = drive count × capacity per drive × redundancy efficiency
usable TB = array TB × (1 − reserve %)
```

| Layout | Efficiency |
| --- | --- |
| JBOD | 1 |
| RAID 5 | (n − 1) / n |
| RAID 6 | (n − 2) / n |
| RAID 10 | floor(n / 2) / n |

Hot spares are purchased hardware but add no usable capacity.

**Demand growth**

```
compound: demand(t) = initial × (1 + g)^t
linear:   demand(t) = initial × (1 + g · t)
```

**Escalation**

```
factor(t) = (1 + inflation)^t
```

Applied to recurring, maintenance, replacement and failure costs when escalation is on. With it off, every figure is in today's rupees and the chart's real-terms view collapses onto the nominal one — the dashboard says so explicitly rather than implying a difference that is not there.

**Cost per capacity unit**

```
per usable TB-year = total cost / (usable TB × years elapsed)
per stored TB-year = total cost / cumulative stored TB-years
```

Cumulative stored terabyte-years is the integral of the demand curve, so a build that fills slowly is not credited with capacity it never used. Both measures are shown side by side because they answer different questions.

### Lifecycle stages modelled

| Stage | What is booked |
| --- | --- |
| Acquisition | Servers, memory, application node, data drives, hot spares, rack, UPS, switching, cooling |
| Commissioning | Rack installation, database deployment, backup and monitoring setup |
| Daily operations | Energy, DBA retainers, software, security, room overhead, insurance, post-warranty support |
| Capacity growth | Expansion shelves when projected demand crosses 90% of usable capacity |
| Preventive maintenance | Scheduled visits with parts and labour |
| Hardware failure | Deterministic drive failures with restock, swap labour and optional downtime |
| Upgrade / replacement | Media refresh at the configured interval, server platform refresh |
| Decommissioning | Migration, sanitisation, disposal, and asset recovery as a credit |

Failures are **deterministic**. A seeded generator with a carry accumulator honours the configured annual failure rate over the horizon, and the same seed always produces the same dates. Nothing catastrophic happens that the configuration did not ask for, and the failure model can be switched off entirely.

### The simulation clock

Cost is a pure function of the plan and the elapsed **simulated** milliseconds. The renderer never contributes to it.

- Speeds are 1×, 60×, one simulated day per second, one simulated month per second, one simulated year per second
- Between monthly billing boundaries energy accrues continuously, which is what makes the counter tick smoothly while still reconciling to the penny
- Pausing banks the elapsed simulated time and clears the wall-clock anchor, so nothing accrues while paused
- State is persisted to `localStorage` **without** a running anchor. On reload the simulation comes back paused at the banked instant — an inactive tab is never assumed to have kept running

The test suite asserts that reaching the same simulated instant at every one of the five speeds produces an identical total, and that stepping in monthly increments matches a single multi-year jump.

---

## About the numbers

**The hardware prices, electricity tariffs, labour rates, failure rates and maintenance costs shipped with HARDCOUNT are illustrative reference values chosen to make the model usable immediately.** They are not verified current market data and no supplier or tariff authority has confirmed them. Every one of them is editable in the build studio.

If a live pricing feed were ever connected, the source, retrieval date and applicable region would have to be displayed next to every figure. Nothing in this build claims that.

Every projection is an estimate derived from the assumptions you can see and edit. It is a way to understand consequences, not a guarantee about future spend.

### Explicitly not modelled

Database engine licensing, network egress and bandwidth, staff training and turnover, tax treatment and capital allowances, disaster recovery at a second site, and currency movement on imported hardware.

---

## Project structure

```
src/
  domain/          pure TypeScript simulation engine, no React
    types.ts       data model
    money.ts       integer paise arithmetic and Indian number formatting
    catalog.ts     reference specifications for processors, media, RAID, cooling
    defaults.ts    the default configuration
    presets.ts     the four bundled starting profiles
    schema.ts      zod validation of every configuration field
    normalize.ts   range clamping so bad input cannot break the model
    derive.ts      bill of materials, power, capacity, capex and opex
    capacity.ts    demand projection and exhaustion
    lifecycle.ts   deterministic event generation
    simulate.ts    plan assembly, expenditure at time t, reconciliation
    receipt.ts     the cost receipt and its insight
    clock.ts       speed definitions and simulated-time arithmetic
  store/           zustand controllers and local persistence
  hooks/           the rAF ticker and the simulated-now hook
  components/
    ui/            design system primitives
    rack/          the physical rack visualisation
    charts/        ECharts wrapper and chart definitions
    config/        build-studio controls
    ledger/        the ledger table
    timeline/      the lifecycle timeline
    receipt/       the printable cost receipt
    layout/        app shell, navigation, horizon watcher
    simulation/    the live counter and playback controls
  pages/           intro, studio, dashboard, ledger, scenarios, method
```

Financial calculations live entirely in `src/domain`. No component performs a money calculation, and nothing derives expenditure from animation duration or render frequency.

---

## Technology

React 18 · TypeScript · Vite · Tailwind CSS · Radix UI · Framer Motion · ECharts · Zustand · Zod · date-fns · Vitest · React Testing Library

Animation responsibilities are deliberately narrow: Framer Motion handles interface transitions and the opening sequence, CSS handles the rack's ambient motion. GSAP is not used, because there is no timeline that needs it and two animation systems would compete. ECharts is the single charting solution.

Heavy modules are code-split. The landing page ships without ECharts; charts load only when you open the dashboard or the scenario lab.

---

## Testing

```bash
npm test
```

Sixty-six tests across five files cover:

- **Financial engine** — redundancy efficiency, usable capacity, power and PUE, energy and tariff arithmetic, bill-of-materials reconciliation, integer-paise integrity, and the effect of adding drives on both capacity and cooling
- **Lifecycle generation** — determinism, seed stability, single-booking of capital, warranty-gated support, optional failure and decommissioning models, and non-finite guard rails across every bundled preset
- **Reconciliation** — ledger plus accrued energy equals the counter at an arbitrary instant and at the horizon, energy split counted exactly once, monotonicity, and the receipt summing to the counter
- **Clock semantics** — freeze on pause, speed multipliers, acceleration neutrality across all five speeds, horizon clamping
- **Controller** — purchase, pause, resume, reset, configuration clamping, explicit stepping, event jumping, scenario save and reload, `localStorage` persistence, and restoration after a reload
- **User journey** — rendered React tests that walk commissioning, acceleration, the ledger, the build studio, the scenario lab, confirmation dialogs and chart labelling

The journey tests have already caught three real defects during development: `Button asChild` rendering nothing, the accessible slider lacking a name, and manual stepping leaving the clock running after a pause.

---

## Accessibility and performance

- Charts expose an image role with a descriptive label
- Controls are semantic, keyboard reachable, with a visible focus ring
- Motion honours `prefers-reduced-motion`, and a reduced-motion path skips the opening sequence
- The receipt has a dedicated print layout — black on white, nothing else on the page
- No external font or network requests; the landing bundle is React, Framer Motion and the app shell
