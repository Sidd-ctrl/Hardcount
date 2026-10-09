import * as Dialog from '@radix-ui/react-dialog';
import { Download, Lightbulb, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCapacity, formatMoney, toCsv } from '@/domain/money';
import { receiptToRows } from '@/domain/receipt';
import { downloadTextFile, stamp } from '@/lib/download';
import type { CostReceipt } from '@/domain/receipt';

export interface CostReceiptSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: CostReceipt;
}

function Dashed() {
  return (
    <div
      className="my-3 h-px w-full"
      style={{
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 4px, transparent 4px 8px)',
      }}
    />
  );
}

export function CostReceiptSheet({ open, onOpenChange, receipt }: CostReceiptSheetProps) {
  const dateLabel = (date: Date) =>
    date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const handlePrint = () => window.print();

  const handleExport = () => {
    downloadTextFile(`hardcount-receipt-${receipt.reference}-${stamp()}.csv`, toCsv(receiptToRows(receipt)));
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="hc-no-print fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(38rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-graphite-850 shadow-raised">
          <div className="hc-no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.07] bg-graphite-850/95 px-4 py-3 backdrop-blur-xl">
            <Dialog.Title className="text-sm font-semibold text-graphite-50">Cost receipt</Dialog.Title>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleExport} icon={<Download className="h-3.5 w-3.5" />}>
                CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={handlePrint} icon={<Printer className="h-3.5 w-3.5" />}>
                Print
              </Button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close receipt"
                  className="rounded-md p-1 text-graphite-500 transition-colors hover:text-graphite-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="hc-print-area bg-graphite-900 p-5 font-mono text-[0.8125rem] text-graphite-200 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold tracking-[0.22em] text-graphite-50">HARDCOUNT</div>
                <div className="mt-1 text-2xs tracking-wide text-graphite-500">
                  Modelled cost of ownership statement
                </div>
              </div>
              <div className="text-right text-2xs leading-relaxed text-graphite-500">
                <div className="text-graphite-300">{receipt.reference}</div>
                <div>Issued {dateLabel(receipt.asOfDate)}</div>
              </div>
            </div>

            <Dashed />

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-2xs">
              <dt className="text-graphite-500">System</dt>
              <dd className="text-right text-graphite-200">{receipt.configSummary}</dd>
              <dt className="text-graphite-500">Commissioned</dt>
              <dd className="text-right text-graphite-200">{dateLabel(receipt.startDate)}</dd>
              <dt className="text-graphite-500">Statement as of</dt>
              <dd className="text-right text-graphite-200">{dateLabel(receipt.asOfDate)}</dd>
              <dt className="text-graphite-500">Simulated period</dt>
              <dd className="text-right text-graphite-200">{receipt.elapsedYears.toFixed(2)} years</dd>
            </dl>

            <Dashed />

            <ul className="space-y-2">
              {receipt.lines.map((line) => (
                <li key={line.label} className="flex items-start justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] leading-tight text-graphite-100">
                      {line.label}
                    </span>
                    <span className="mt-0.5 block text-2xs leading-snug text-graphite-500">{line.note}</span>
                  </span>
                  <span className="hc-figure shrink-0 text-[0.8125rem] font-semibold text-graphite-100">
                    {line.credit ? '\u2212' : ''}
                    {formatMoney(line.amountPaise)}
                  </span>
                </li>
              ))}
            </ul>

            <Dashed />

            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[0.8125rem] font-semibold tracking-wide text-graphite-100">
                Total net ownership cost
              </span>
              <span className="hc-figure text-lg font-semibold text-amber-glow">
                {formatMoney(receipt.netPaise)}
              </span>
            </div>

            <p className="mt-1.5 text-2xs leading-relaxed text-graphite-500">
              Cash basis. Includes energy accrued since the last billing cycle of{' '}
              {formatMoney(receipt.accruedEnergyPaise)}. Excludes economic depreciation.
            </p>

            <Dashed />

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-2xs">
              <div>
                <dt className="text-graphite-500">Installed capacity</dt>
                <dd className="hc-figure text-graphite-200">{formatCapacity(receipt.installedTb)}</dd>
              </div>
              <div>
                <dt className="text-graphite-500">Usable capacity now</dt>
                <dd className="hc-figure text-graphite-200">{formatCapacity(receipt.usableTb)}</dd>
              </div>
              <div>
                <dt className="text-graphite-500">Modelled consumption</dt>
                <dd className="hc-figure text-graphite-200">{formatCapacity(receipt.consumedTb)}</dd>
              </div>
              <div>
                <dt className="text-graphite-500">Headroom remaining</dt>
                <dd className="hc-figure text-graphite-200">{formatCapacity(receipt.availableTb)}</dd>
              </div>
              <div>
                <dt className="text-graphite-500">Residual asset value</dt>
                <dd className="hc-figure text-graphite-200">{formatMoney(receipt.residualValuePaise)}</dd>
              </div>
              <div>
                <dt className="text-graphite-500">Recovery realised</dt>
                <dd className="hc-figure text-emerald-300">{formatMoney(receipt.recoveryPaise)}</dd>
              </div>
            </dl>

            {receipt.insight && (
              <>
                <Dashed />
                <div className="rounded-lg border border-amber-glow/20 bg-amber-glow/[0.05] p-3">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-glow" />
                    <p className="text-2xs leading-relaxed text-graphite-200">{receipt.insight}</p>
                  </div>
                </div>
              </>
            )}

            <Dashed />

            <p className="text-center text-2xs leading-relaxed text-graphite-600">
              Generated from the loaded HARDCOUNT assumptions. Illustrative model, not a quotation.
              <br />
              Every line above reconciles with the on-screen expenditure counter.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
