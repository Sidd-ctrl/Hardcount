import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/components/charts/categoryTheme';
import { MS_PER_YEAR, formatMoney, toCsv } from '@/domain/money';
import { stageLabel } from '@/domain/lifecycle';
import { downloadTextFile, stamp } from '@/lib/download';
import type { LedgerCategory, LedgerEvent } from '@/domain/types';
import { cn } from '@/lib/cn';

export interface LedgerTableProps {
  events: LedgerEvent[];
  accruedEnergyPaise: number;
  totalPaise: number;
  categories: LedgerCategory[];
  onToggleCategory: (category: LedgerCategory) => void;
  activeCategories: Set<LedgerCategory>;
}

type SortKey = 'date' | 'amount' | 'category';

const PAGE_SIZE = 25;

export function LedgerTable({
  events,
  accruedEnergyPaise,
  totalPaise,
  categories,
  onToggleCategory,
  activeCategories,
}: LedgerTableProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = events.filter((event) => {
      if (!activeCategories.has(event.category)) return false;
      if (!needle) return true;
      return (
        event.title.toLowerCase().includes(needle) ||
        event.detail.toLowerCase().includes(needle) ||
        event.source.toLowerCase().includes(needle) ||
        (event.asset ?? '').toLowerCase().includes(needle)
      );
    });

    rows.sort((a, b) => {
      let delta = 0;
      if (sortKey === 'amount') delta = a.amountPaise - b.amountPaise;
      else if (sortKey === 'category') delta = a.category.localeCompare(b.category);
      else delta = a.atMs - b.atMs;
      return ascending ? delta : -delta;
    });

    return rows;
  }, [events, activeCategories, query, sortKey, ascending]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const filteredTotal = filtered.reduce((sum, event) => sum + (event.credit ? -event.amountPaise : event.amountPaise), 0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setAscending((value) => !value);
    else {
      setSortKey(key);
      setAscending(true);
    }
    setPage(0);
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['Simulated year', 'Category', 'Title', 'Detail', 'Quantity', 'Unit price (INR)', 'Amount (INR)', 'Recurrence', 'Source', 'Asset', 'Stage'],
    ];
    filtered.forEach((event) => {
      rows.push([
        (event.atMs / MS_PER_YEAR).toFixed(4),
        CATEGORY_LABELS[event.category],
        event.title,
        event.detail,
        event.quantity ?? '',
        event.unitPricePaise !== null ? (event.unitPricePaise / 100).toFixed(2) : '',
        ((event.credit ? -event.amountPaise : event.amountPaise) / 100).toFixed(2),
        event.recurrence ?? '',
        event.source,
        event.asset ?? '',
        stageLabel(event.stage),
      ]);
    });
    rows.push([]);
    rows.push(['Filtered total (INR)', '', '', '', '', '', (filteredTotal / 100).toFixed(2)]);
    rows.push(['Accrued energy not yet billed (INR)', '', '', '', '', '', (accruedEnergyPaise / 100).toFixed(2)]);
    rows.push(['Ledger total (INR)', '', '', '', '', '', (totalPaise / 100).toFixed(2)]);
    downloadTextFile(`hardcount-ledger-${stamp()}.csv`, toCsv(rows));
  };

  const headerCell = (key: SortKey, label: string, className?: string) => (
    <th scope="col" className={cn('px-3 py-2 text-left font-medium', className)}>
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className="inline-flex items-center gap-1 transition-colors hover:text-graphite-100"
      >
        {label}
        {sortKey === key &&
          (ascending ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {categories.map((category) => {
          const active = activeCategories.has(category);
          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleCategory(category)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-2xs transition-all',
                active
                  ? 'border-white/[0.14] bg-white/[0.06] text-graphite-100'
                  : 'border-white/[0.06] bg-transparent text-graphite-600 hover:text-graphite-400',
              )}
            >
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ background: active ? CATEGORY_COLORS[category] : '#3a424b' }}
              />
              {CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-[12rem] flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-graphite-850/90 px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-graphite-500" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Search the ledger"
            aria-label="Search ledger entries"
            className="w-full bg-transparent text-sm text-graphite-100 outline-none placeholder:text-graphite-600"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={exportCsv} icon={<Download className="h-3.5 w-3.5" />}>
          Export CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No entries match this view"
          description="Widen the category filter, clear the search, or advance the clock so more of the lifecycle has been booked."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[46rem] border-collapse text-left">
            <thead className="hc-label border-b border-white/[0.07] bg-graphite-850/80 text-[0.625rem]">
              <tr>
                {headerCell('date', 'Sim. date')}
                {headerCell('category', 'Category')}
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Entry
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((event) => {
                const open = expanded === event.id;
                return (
                  <tr key={event.id} className="group border-b border-white/[0.045] last:border-0">
                    <td colSpan={4} className="p-0">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setExpanded(open ? null : event.id)}
                        className="grid w-full grid-cols-[7rem_minmax(9rem,11rem)_minmax(0,1fr)_9rem] items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.025]"
                      >
                        <span className="hc-figure text-2xs text-graphite-400">
                          {(event.atMs / MS_PER_YEAR).toFixed(2)}y
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-2 w-2 shrink-0 rounded-[2px]"
                            style={{ background: CATEGORY_COLORS[event.category] }}
                          />
                          <span className="truncate text-2xs text-graphite-300">
                            {CATEGORY_LABELS[event.category]}
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-2xs text-graphite-100">{event.title}</span>
                          <span className="block truncate text-2xs text-graphite-600">{event.detail}</span>
                        </span>
                        <span
                          className={cn(
                            'hc-figure text-right text-xs font-semibold',
                            event.credit ? 'text-emerald-300' : 'text-graphite-100',
                          )}
                        >
                          {event.credit ? '\u2212' : ''}
                          {formatMoney(event.amountPaise)}
                        </span>
                      </button>
                      {open && (
                        <div className="grid gap-3 border-t border-white/[0.045] bg-graphite-900/60 px-3 py-3 sm:grid-cols-2">
                          <dl className="space-y-1.5 text-2xs">
                            <div className="flex justify-between gap-3">
                              <dt className="text-graphite-500">Quantity × unit price</dt>
                              <dd className="hc-figure text-graphite-200">
                                {event.quantity !== null && event.unitPricePaise !== null
                                  ? `${event.quantity} × ${formatMoney(event.unitPricePaise)}`
                                  : 'Not applicable'}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-graphite-500">Recurrence</dt>
                              <dd className="text-right text-graphite-200">{event.recurrence ?? 'One-off'}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-graphite-500">Lifecycle stage</dt>
                              <dd className="text-graphite-200">{stageLabel(event.stage)}</dd>
                            </div>
                            {event.asset && (
                              <div className="flex justify-between gap-3">
                                <dt className="text-graphite-500">Asset</dt>
                                <dd className="text-graphite-200">{event.asset}</dd>
                              </div>
                            )}
                          </dl>
                          <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-2xs leading-relaxed text-graphite-400">
                            <span className="hc-label mr-1.5 text-[0.5625rem]">Assumption</span>
                            {event.source}
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="hc-figure flex flex-wrap gap-x-5 gap-y-1 text-2xs text-graphite-500">
          <span>
            {filtered.length} entries ·{' '}
            <span className="text-graphite-200">{formatMoney(filteredTotal)}</span> filtered
          </span>
          {accruedEnergyPaise > 0 && (
            <span>
              Accrued, unbilled energy ·{' '}
              <span className="text-graphite-200">{formatMoney(accruedEnergyPaise)}</span>
            </span>
          )}
          <span>
            Counter total · <span className="text-amber-glow">{formatMoney(totalPaise)}</span>
          </span>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              Previous
            </Button>
            <span className="hc-figure text-2xs text-graphite-500">
              {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
