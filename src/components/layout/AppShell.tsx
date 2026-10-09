import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { LiveTicker } from '@/components/simulation/LiveTicker';
import { HorizonWatcher } from './HorizonWatcher';

const LINKS = [
  { to: '/studio', label: 'Build' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/scenarios', label: 'Compare' },
  { to: '/method', label: 'Method' },
];

function Wordmark() {
  return (
    <NavLink to="/" className="group flex shrink-0 items-center gap-2.5" aria-label="HARDCOUNT home">
      <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-graphite-750 to-graphite-850">
        <span className="flex flex-col gap-[3px]">
          <span className="block h-[3px] w-3.5 rounded-[1px] bg-graphite-500" />
          <span className="block h-[3px] w-3.5 rounded-[1px] bg-graphite-500" />
          <span className="block h-[3px] w-3.5 rounded-[1px] bg-graphite-600" />
        </span>
        <span className="absolute right-[5px] top-[5px] h-[3px] w-[3px] rounded-full bg-amber-glow" />
      </span>
      <span className="leading-none">
        <span className="block text-[0.9375rem] font-semibold tracking-[0.18em] text-graphite-50">
          HARDCOUNT
        </span>
        <span className="mt-0.5 hidden text-2xs text-graphite-500 sm:block">
          Every byte has a lifetime cost
        </span>
      </span>
    </NavLink>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isIntro = location.pathname === '/';

  return (
    <div className="flex min-h-screen flex-col">
      <HorizonWatcher />
      <header className="hc-no-print sticky top-0 z-40 border-b border-white/[0.06] bg-graphite-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[92rem] items-center gap-4 px-4 sm:px-6">
          <Wordmark />

          <nav aria-label="Primary" className="hc-scroll-y hidden min-w-0 flex-1 items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium transition-colors',
                    isActive
                      ? 'bg-white/[0.07] text-graphite-50'
                      : 'text-graphite-400 hover:bg-white/[0.04] hover:text-graphite-200',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <LiveTicker />
          </div>
        </div>

        <div className="border-t border-white/[0.05] px-2 py-1.5 md:hidden">
          <nav aria-label="Primary mobile" className="hc-scroll-y flex items-center gap-1 overflow-x-auto">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-white/[0.07] text-graphite-50'
                      : 'text-graphite-400 hover:text-graphite-200',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className={cn('flex-1', isIntro ? '' : 'mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 sm:py-8')}>
        {children}
      </main>

      <footer className="hc-no-print border-t border-white/[0.06] bg-graphite-950/60">
        <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-3 px-4 py-6 text-2xs leading-relaxed text-graphite-500 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <p className="max-w-2xl">
            HARDCOUNT is a deterministic cost model, not a quotation. Hardware prices, tariffs, labour
            rates, failure rates and maintenance costs are illustrative starting values you can edit.
            Every projection is an estimate produced from the assumptions currently loaded, shown in
            Indian rupees on a cash basis.
          </p>
          <p className="shrink-0 sm:text-right">
            Runs entirely in your browser.
            <br />
            No backend, no accounts, no API keys.
          </p>
        </div>
      </footer>
    </div>
  );
}
