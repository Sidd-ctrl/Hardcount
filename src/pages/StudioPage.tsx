import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Boxes,
  Cpu,
  HardDrive,
  Landmark,
  Network,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
  Zap,
} from 'lucide-react';
import { ConfigSection } from '@/components/config/ConfigSection';
import { OptionGrid } from '@/components/config/OptionGrid';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { NumberField } from '@/components/ui/NumberField';
import { RangeField } from '@/components/ui/RangeField';
import { Switch } from '@/components/ui/Switch';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RackVisual } from '@/components/rack/RackVisual';
import {
  COOLING_OPTIONS,
  DRIVE_TYPES,
  PROCESSOR_CLASSES,
  RAID_LEVELS,
  REDUNDANCY_MODES,
  drivePriceFor,
} from '@/domain/catalog';
import {
  formatCapacity,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPower,
} from '@/domain/money';
import { growthLabel } from '@/domain/capacity';
import { configSummary } from '@/domain/lifecycle';
import { useSimulation } from '@/store/simulation';
import { notify } from '@/store/toasts';
import { cn } from '@/lib/cn';
import type {
  BOMLine,
  CoolingId,
  DriveTypeId,
  ProcessorClassId,
  RaidLevelId,
  RedundancyId,
} from '@/domain/types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[0.8125rem] text-graphite-300">{label}</span>
      <div className="w-full sm:w-52">{children}</div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  accent,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  accent?: 'amber' | 'steel';
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.8125rem] text-graphite-300">{label}</span>
        <span className="hc-figure text-[0.8125rem] font-semibold text-graphite-100">
          {formatNumber(value, step < 1 ? 2 : 0)}
          {unit ? <span className="ml-0.5 text-2xs text-graphite-500">{unit}</span> : null}
        </span>
      </div>
      <RangeField
        ariaLabel={label}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        accent={accent}
      />
    </div>
  );
}

function MoneyRow({
  label,
  value,
  onChange,
  info,
  reference,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  info?: string;
  reference?: number;
}) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-1.5">
        <NumberField
          ariaLabel={label}
          value={value}
          onChange={onChange}
          format="money"
          prefix="₹"
          step={1000}
          className="flex-1"
        />
        {reference !== undefined && (
          <button
            type="button"
            title="Restore the illustrative reference price"
            onClick={() => onChange(reference)}
            className="shrink-0 rounded-lg border border-white/[0.08] px-2 py-1.5 text-2xs text-graphite-400 transition-colors hover:border-white/[0.16] hover:text-graphite-200"
          >
            Ref
          </button>
        )}
      </div>
      {info && <span className="mt-1 block text-2xs text-graphite-500">{info}</span>}
    </Row>
  );
}

export function StudioPage() {
  const navigate = useNavigate();
  const config = useSimulation((state) => state.config);
  const plan = useSimulation((state) => state.plan);
  const phase = useSimulation((state) => state.phase);
  const patch = useSimulation((state) => state.patchConfig);
  const purchase = useSimulation((state) => state.purchase);
  const saveScenario = useSimulation((state) => state.saveScenario);
  const scenarioName = useSimulation((state) => state.scenarioName);
  const setScenarioName = useSimulation((state) => state.setScenarioName);
  const [showSave, setShowSave] = useState(false);

  const derived = plan.derived;
  const drive = DRIVE_TYPES[config.storage.driveType];
  const referenceDrivePrice = drivePriceFor(config.storage.driveType, config.storage.capacityPerDriveTb);

  const bomByGroup = useMemo(() => {
    const groups: Record<'compute' | 'storage' | 'facility', BOMLine[]> = {
      compute: [],
      storage: [],
      facility: [],
    };
    derived.bom.forEach((line) => {
      if (line.group !== 'service') groups[line.group].push(line);
    });
    return groups;
  }, [derived.bom]);

  const bomTotal = derived.bom.reduce((sum, line) => sum + line.quantity * line.unitPricePaise, 0);
  const paybackYears = derived.annualOpexPaise > 0 ? derived.initialCapexPaise / derived.annualOpexPaise : null;

  const changeDriveType = (next: DriveTypeId) => {
    const spec = DRIVE_TYPES[next];
    const capacity = spec.capacities.includes(config.storage.capacityPerDriveTb)
      ? config.storage.capacityPerDriveTb
      : spec.capacities[spec.capacities.length - 2] ?? spec.capacities[0];
    patch('storage', {
      driveType: next,
      capacityPerDriveTb: capacity,
      driveUnitPrice: drivePriceFor(next, capacity),
    });
  };

  const changeCapacity = (capacity: number) => {
    patch('storage', {
      capacityPerDriveTb: capacity,
      driveUnitPrice: drivePriceFor(config.storage.driveType, capacity),
    });
  };

  const changeCooling = (cooling: CoolingId) => {
    patch('facility', { cooling, pue: COOLING_OPTIONS[cooling].referencePue });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-graphite-50">Build studio</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-graphite-400">
              Every field below feeds the same financial engine as the ledger, the charts and the
              receipt. Prices start from illustrative reference values — overwrite anything that does
              not match your environment.
            </p>
          </div>
          <Badge tone="steel">{configSummary(config)}</Badge>
        </header>

        <ConfigSection
          id="compute"
          title="Compute infrastructure"
          summary={`${config.compute.serverCount} node(s) · ${PROCESSOR_CLASSES[config.compute.processorClass].family} · ${config.compute.ramGbPerServer} GB each`}
          icon={<Cpu className="h-4 w-4" />}
          defaultOpen
          badge={
            <span className="hc-figure shrink-0 text-xs font-semibold text-graphite-200">
              {formatMoneyCompact(
                bomByGroup.compute.reduce((sum, line) => sum + line.quantity * line.unitPricePaise, 0),
              )}
            </span>
          }
        >
          <Field label="Availability model" info="Sets the minimum node count and how a hardware fault affects the service.">
            <OptionGrid<RedundancyId>
              ariaLabel="Availability model"
              columns={3}
              value={config.compute.redundancy}
              onChange={(redundancy) =>
                patch('compute', {
                  redundancy,
                  serverCount: Math.max(config.compute.serverCount, REDUNDANCY_MODES[redundancy].minServers),
                })
              }
              options={(Object.keys(REDUNDANCY_MODES) as RedundancyId[]).map((id) => ({
                value: id,
                label: REDUNDANCY_MODES[id].label,
                detail: REDUNDANCY_MODES[id].blurb,
                metric: `min ${REDUNDANCY_MODES[id].minServers} node(s)`,
              }))}
            />
          </Field>

          <Field label="Processor class" info="Approximate platform price and typical power draw per node.">
            <OptionGrid<ProcessorClassId>
              ariaLabel="Processor class"
              columns={4}
              value={config.compute.processorClass}
              onChange={(processorClass) => patch('compute', { processorClass })}
              options={(Object.keys(PROCESSOR_CLASSES) as ProcessorClassId[]).map((id) => ({
                value: id,
                label: PROCESSOR_CLASSES[id].label,
                detail: PROCESSOR_CLASSES[id].blurb,
                metric: `${formatMoneyCompact(PROCESSOR_CLASSES[id].basePrice)} · ${PROCESSOR_CLASSES[id].baseWatts} W`,
              }))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <SliderRow
              label="Database servers"
              value={config.compute.serverCount}
              onChange={(serverCount) => patch('compute', { serverCount })}
              min={REDUNDANCY_MODES[config.compute.redundancy].minServers}
              max={24}
            />
            <SliderRow
              label="Sockets per server"
              value={config.compute.socketsPerServer}
              onChange={(socketsPerServer) => patch('compute', { socketsPerServer })}
              min={1}
              max={PROCESSOR_CLASSES[config.compute.processorClass].maxSockets}
            />
            <SliderRow
              label="Memory per server"
              value={config.compute.ramGbPerServer}
              onChange={(ramGbPerServer) => patch('compute', { ramGbPerServer })}
              min={32}
              max={2048}
              step={32}
              unit="GB"
              accent="steel"
            />
            <div className="flex items-end">
              <Switch
                checked={config.compute.dedicatedAppServer}
                onChange={(dedicatedAppServer) => patch('compute', { dedicatedAppServer })}
                label="Dedicated application server"
                description="Separates the query tier from the storage tier. Adds one entry-class node."
              />
            </div>
          </div>
        </ConfigSection>

        <ConfigSection
          id="storage"
          title="Storage infrastructure"
          summary={`${config.storage.driveCount} × ${config.storage.capacityPerDriveTb} TB ${drive.short} · ${RAID_LEVELS[config.storage.raidLevel].label} · ${formatCapacity(derived.usableTb)} usable`}
          icon={<HardDrive className="h-4 w-4" />}
          defaultOpen
          badge={
            <span className="hc-figure shrink-0 text-xs font-semibold text-graphite-200">
              {formatMoneyCompact(
                bomByGroup.storage.reduce((sum, line) => sum + line.quantity * line.unitPricePaise, 0),
              )}
            </span>
          }
        >
          <Field label="Media class" info="Drives price per terabyte, idle power draw and the default annual failure rate.">
            <OptionGrid<DriveTypeId>
              ariaLabel="Media class"
              columns={3}
              value={config.storage.driveType}
              onChange={changeDriveType}
              options={(Object.keys(DRIVE_TYPES) as DriveTypeId[]).map((id) => ({
                value: id,
                label: DRIVE_TYPES[id].label,
                detail: DRIVE_TYPES[id].blurb,
                metric: `${formatMoneyCompact(DRIVE_TYPES[id].pricePerTb)}/TB · ${DRIVE_TYPES[id].watts} W`,
              }))}
            />
          </Field>

          <Field label="Capacity per drive">
            <div className="flex flex-wrap gap-1.5">
              {drive.capacities.map((capacity) => (
                <button
                  key={capacity}
                  type="button"
                  onClick={() => changeCapacity(capacity)}
                  className={cn(
                    'hc-figure rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    config.storage.capacityPerDriveTb === capacity
                      ? 'border-amber-glow/45 bg-amber-glow/[0.08] text-amber-glow'
                      : 'border-white/[0.07] bg-graphite-850/60 text-graphite-300 hover:border-white/[0.15]',
                  )}
                >
                  {capacity} TB
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <SliderRow
              label="Data drives"
              value={config.storage.driveCount}
              onChange={(driveCount) => patch('storage', { driveCount })}
              min={RAID_LEVELS[config.storage.raidLevel].minDrives}
              max={180}
            />
            <SliderRow
              label="Hot spares on the shelf"
              value={config.storage.spareDrives}
              onChange={(spareDrives) => patch('storage', { spareDrives })}
              min={0}
              max={20}
            />
          </div>

          <MoneyRow
            label="Price per drive"
            value={config.storage.driveUnitPrice}
            onChange={(driveUnitPrice) => patch('storage', { driveUnitPrice })}
            reference={referenceDrivePrice}
            info={`Reference model: ${formatMoney(drive.pricePerTb)} per terabyte for ${drive.label}.`}
          />

          <Field label="Redundancy layout" info="Determines how much of the installed capacity is actually addressable.">
            <OptionGrid<RaidLevelId>
              ariaLabel="Redundancy layout"
              columns={4}
              value={config.storage.raidLevel}
              onChange={(raidLevel) =>
                patch('storage', {
                  raidLevel,
                  driveCount: Math.max(config.storage.driveCount, RAID_LEVELS[raidLevel].minDrives),
                })
              }
              options={(Object.keys(RAID_LEVELS) as RaidLevelId[]).map((id) => ({
                value: id,
                label: RAID_LEVELS[id].label,
                detail: RAID_LEVELS[id].blurb,
                metric: `${(derived.redundancyEfficiency * 100).toFixed(0)}% now · min ${RAID_LEVELS[id].minDrives}`,
              }))}
            />
          </Field>

          <div className="grid gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-3">
            <div>
              <div className="hc-label text-[0.625rem]">Installed raw</div>
              <div className="hc-figure mt-1 text-lg font-semibold text-graphite-100">
                {formatCapacity(derived.installedTb)}
              </div>
            </div>
            <div>
              <div className="hc-label text-[0.625rem]">After redundancy</div>
              <div className="hc-figure mt-1 text-lg font-semibold text-steel-glow">
                {formatCapacity(derived.arrayTb)}
              </div>
            </div>
            <div>
              <div className="hc-label text-[0.625rem]">Usable for the database</div>
              <div className="hc-figure mt-1 text-lg font-semibold text-amber-glow">
                {formatCapacity(derived.usableTb)}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Data already stored">
              <NumberField
                ariaLabel="Data already stored"
                value={config.storage.initialDataTb}
                onChange={(initialDataTb) => patch('storage', { initialDataTb })}
                format="decimal"
                suffix="TB"
                step={5}
              />
            </Row>
            <SliderRow
              label="Annual storage growth"
              value={config.storage.annualGrowthPct}
              onChange={(annualGrowthPct) => patch('storage', { annualGrowthPct })}
              min={0}
              max={80}
              step={1}
              unit="%"
              accent="steel"
            />
            <Row label="Growth model">
              <Segmented
                ariaLabel="Growth model"
                size="sm"
                value={config.storage.growthModel}
                onChange={(growthModel) => patch('storage', { growthModel })}
                options={[
                  { value: 'compound', label: 'Compound', hint: growthLabel('compound') },
                  { value: 'linear', label: 'Linear', hint: growthLabel('linear') },
                ]}
              />
            </Row>
            <div className="space-y-3">
              <SliderRow
                label="Reserved headroom"
                value={config.storage.reservePct}
                onChange={(reservePct) => patch('storage', { reservePct })}
                min={0}
                max={40}
                unit="%"
                accent="steel"
              />
              <SliderRow
                label="Media replacement interval"
                value={config.storage.replacementIntervalYears}
                onChange={(replacementIntervalYears) => patch('storage', { replacementIntervalYears })}
                min={2}
                max={10}
                unit=" yrs"
                accent="steel"
              />
            </div>
          </div>
        </ConfigSection>

        <ConfigSection
          id="facility"
          title="Facility, power and connectivity"
          summary={`${COOLING_OPTIONS[config.facility.cooling].label} · PUE ${config.facility.pue.toFixed(2)} · ${formatPower(derived.facilityPowerWatts)} at the meter`}
          icon={<Network className="h-4 w-4" />}
          badge={
            <span className="hc-figure shrink-0 text-xs font-semibold text-graphite-200">
              {formatMoneyCompact(derived.facilityCapexPaise)}
            </span>
          }
        >
          <Field label="Cooling approach" info="Sets the reference Power Usage Effectiveness. PUE already includes cooling energy, so no separate cooling multiplier is applied.">
            <OptionGrid<CoolingId>
              ariaLabel="Cooling approach"
              columns={3}
              value={config.facility.cooling}
              onChange={changeCooling}
              options={(Object.keys(COOLING_OPTIONS) as CoolingId[]).map((id) => ({
                value: id,
                label: COOLING_OPTIONS[id].label,
                detail: COOLING_OPTIONS[id].blurb,
                metric: `${formatMoneyCompact(COOLING_OPTIONS[id].cost)} · PUE ${COOLING_OPTIONS[id].referencePue.toFixed(2)}`,
              }))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyRow label="Rack and mounting" value={config.facility.rackCost} onChange={(rackCost) => patch('facility', { rackCost })} />
            <MoneyRow label="UPS and power protection" value={config.facility.upsCost} onChange={(upsCost) => patch('facility', { upsCost })} />
            <MoneyRow label="Switching and cabling" value={config.facility.networkCost} onChange={(networkCost) => patch('facility', { networkCost })} />
            <MoneyRow label="Server room overhead" value={config.facility.roomMonthlyOverhead} onChange={(roomMonthlyOverhead) => patch('facility', { roomMonthlyOverhead })} info="Floor space, housekeeping and shared building services, billed monthly." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Electricity tariff">
              <NumberField
                ariaLabel="Electricity tariff"
                value={config.facility.electricityRate / 100}
                onChange={(rate) => patch('facility', { electricityRate: Math.round(rate * 100) })}
                format="decimal"
                prefix="₹"
                suffix="/kWh"
                step={0.25}
              />
            </Row>
            <div className="space-y-2">
              <SliderRow
                label="Power Usage Effectiveness"
                value={config.facility.pue}
                onChange={(pue) => patch('facility', { pue })}
                min={1}
                max={2.2}
                step={0.01}
                accent="steel"
              />
              <p className="text-2xs leading-relaxed text-graphite-500">
                Facility energy = IT energy × PUE. The overhead slice is billed as cooling energy so it
                is counted once, not twice.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <div className="hc-label text-[0.625rem]">IT load</div>
                <div className="hc-figure mt-1 text-sm font-semibold text-graphite-100">
                  {formatPower(derived.itPowerWatts)}
                </div>
              </div>
              <div>
                <div className="hc-label text-[0.625rem]">At the meter</div>
                <div className="hc-figure mt-1 text-sm font-semibold text-graphite-100">
                  {formatPower(derived.facilityPowerWatts)}
                </div>
              </div>
              <div>
                <div className="hc-label text-[0.625rem]">Energy per year</div>
                <div className="hc-figure mt-1 text-sm font-semibold text-graphite-100">
                  {formatNumber(derived.annualEnergyKwh, 0)} kWh
                </div>
              </div>
              <div>
                <div className="hc-label text-[0.625rem]">Energy bill per year</div>
                <div className="hc-figure mt-1 text-sm font-semibold text-amber-glow">
                  {formatMoneyCompact(derived.annualElectricityPaise + derived.annualCoolingPaise)}
                </div>
              </div>
            </div>
          </div>
        </ConfigSection>

        <ConfigSection
          id="service"
          title="Service, people and operations"
          summary={`${formatMoneyCompact(derived.annualFixedOpexPaise)} per year before energy and maintenance`}
          icon={<Wrench className="h-4 w-4" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SliderRow
              label="Included warranty"
              value={config.service.warrantyYears}
              onChange={(warrantyYears) => patch('service', { warrantyYears })}
              min={0}
              max={7}
              unit=" yrs"
              accent="steel"
            />
            <SliderRow
              label="Post-warranty support contract"
              value={config.service.supportContractPct}
              onChange={(supportContractPct) => patch('service', { supportContractPct })}
              min={0}
              max={30}
              step={0.5}
              unit="% of hardware"
              accent="steel"
            />
            <MoneyRow
              label="Preventive maintenance visit"
              value={config.service.maintenanceCostPerEvent}
              onChange={(maintenanceCostPerEvent) => patch('service', { maintenanceCostPerEvent })}
            />
            <SliderRow
              label="Maintenance visits per year"
              value={config.service.maintenanceEventsPerYear}
              onChange={(maintenanceEventsPerYear) => patch('service', { maintenanceEventsPerYear })}
              min={0}
              max={12}
            />
            <MoneyRow
              label="Database administration"
              value={config.service.dbaMonthlyCost}
              onChange={(dbaMonthlyCost) => patch('service', { dbaMonthlyCost })}
              info="Retained cover for patching, tuning and incident response, billed monthly."
            />
            <MoneyRow
              label="Monitoring and backup software"
              value={config.service.monitoringMonthlyCost}
              onChange={(monitoringMonthlyCost) => patch('service', { monitoringMonthlyCost })}
            />
            <MoneyRow
              label="Physical security"
              value={config.service.securityMonthlyCost}
              onChange={(securityMonthlyCost) => patch('service', { securityMonthlyCost })}
            />
            <SliderRow
              label="Equipment insurance"
              value={config.service.insurancePctOfHardware}
              onChange={(insurancePctOfHardware) => patch('service', { insurancePctOfHardware })}
              min={0}
              max={6}
              step={0.1}
              unit="% of hardware / yr"
              accent="steel"
            />
            <MoneyRow
              label="Contract labour rate"
              value={config.service.laborHourlyRate}
              onChange={(laborHourlyRate) => patch('service', { laborHourlyRate })}
              info="Used for commissioning, maintenance visits, drive swaps and shelf installs."
            />
            <MoneyRow
              label="Cost of downtime"
              value={config.service.downtimeHourlyCost}
              onChange={(downtimeHourlyCost) => patch('service', { downtimeHourlyCost })}
              info="Business impact per hour of degraded service. Set to zero to exclude it."
            />
          </div>
        </ConfigSection>

        <ConfigSection
          id="assumptions"
          title="Horizon and modelled assumptions"
          summary={`${config.assumptions.horizonYears}-year model · ${config.assumptions.inflationPct}% escalation ${config.assumptions.escalateCosts ? 'on' : 'off'}`}
          icon={<SlidersHorizontal className="h-4 w-4" />}
        >
          <Field label="Modelled ownership horizon" info="How long the simulation runs before decommissioning is offered.">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                ariaLabel="Horizon preset"
                value={String(config.assumptions.horizonYears)}
                onChange={(value) => patch('assumptions', { horizonYears: Number(value) })}
                options={[
                  { value: '5', label: '5 years' },
                  { value: '10', label: '10 years' },
                  { value: '15', label: '15 years' },
                ]}
              />
              <div className="w-28">
                <NumberField
                  ariaLabel="Custom horizon in years"
                  value={config.assumptions.horizonYears}
                  onChange={(horizonYears) => patch('assumptions', { horizonYears })}
                  min={1}
                  max={25}
                  suffix="yrs"
                />
              </div>
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <SliderRow
              label="Annual cost escalation"
              value={config.assumptions.inflationPct}
              onChange={(inflationPct) => patch('assumptions', { inflationPct })}
              min={0}
              max={15}
              step={0.5}
              unit="%"
              accent="steel"
            />
            <div className="flex items-end">
              <Switch
                checked={config.assumptions.escalateCosts}
                onChange={(escalateCosts) => patch('assumptions', { escalateCosts })}
                label="Escalate recurring and replacement costs"
                description="Off means every figure is expressed in today's rupees. The chart can still deflate to real terms."
              />
            </div>
            <SliderRow
              label="Commissioning labour"
              value={config.assumptions.commissioningHours}
              onChange={(commissioningHours) => patch('assumptions', { commissioningHours })}
              min={0}
              max={400}
              step={4}
              unit=" hrs"
              accent="steel"
            />
            <SliderRow
              label="Server refresh interval"
              value={config.assumptions.serverRefreshIntervalYears}
              onChange={(serverRefreshIntervalYears) => patch('assumptions', { serverRefreshIntervalYears })}
              min={3}
              max={12}
              unit=" yrs"
              accent="steel"
            />
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-steel-glow" />
              <span className="text-[0.8125rem] font-semibold text-graphite-100">Capacity growth policy</span>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Row label="Expansion shelf size">
                <NumberField
                  ariaLabel="Expansion shelf size"
                  value={config.assumptions.upgradeShelfTb}
                  onChange={(upgradeShelfTb) => patch('assumptions', { upgradeShelfTb })}
                  format="decimal"
                  suffix="TB"
                  step={8}
                />
              </Row>
              <div className="flex items-end">
                <Switch
                  checked={config.assumptions.autoExpandCapacity}
                  onChange={(autoExpandCapacity) => patch('assumptions', { autoExpandCapacity })}
                  label="Buy capacity when demand crosses 90%"
                  description="Off leaves the array to run out so you can see the exhaustion point on the chart."
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-alert-glow" />
              <span className="text-[0.8125rem] font-semibold text-graphite-100">Failure scenario</span>
            </div>
            <p className="mt-1.5 text-2xs leading-relaxed text-graphite-500">
              Failures are deterministic. The same seed and annual failure rate always produce the same
              schedule, so a comparison between two builds stays fair.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Switch
                checked={config.assumptions.modelDriveFailures}
                onChange={(modelDriveFailures) => patch('assumptions', { modelDriveFailures })}
                label="Model drive failures"
                description="Adds a restock purchase, swap labour and optional downtime for each failure."
              />
              <SliderRow
                label="Annual failure rate"
                value={config.assumptions.driveFailureAfrPct}
                onChange={(driveFailureAfrPct) => patch('assumptions', { driveFailureAfrPct })}
                min={0}
                max={8}
                step={0.1}
                unit="% AFR"
                accent="steel"
              />
              <SliderRow
                label="Downtime per failure"
                value={config.assumptions.downtimeHoursPerFailure}
                onChange={(downtimeHoursPerFailure) => patch('assumptions', { downtimeHoursPerFailure })}
                min={0}
                max={24}
                step={0.5}
                unit=" hrs"
                accent="steel"
              />
              <Row label="Deterministic seed">
                <NumberField
                  ariaLabel="Failure schedule seed"
                  value={config.assumptions.failureSeed}
                  onChange={(failureSeed) => patch('assumptions', { failureSeed })}
                  min={1}
                  max={999999}
                  step={1}
                />
              </Row>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-graphite-300" />
              <span className="text-[0.8125rem] font-semibold text-graphite-100">End of life</span>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Switch
                checked={config.assumptions.includeDecommission}
                onChange={(includeDecommission) => patch('assumptions', { includeDecommission })}
                label="Model decommissioning"
                description="Data migration off the estate, certified media destruction and rack removal."
              />
              <MoneyRow
                label="Decommissioning budget"
                value={config.assumptions.decommissionCost}
                onChange={(decommissionCost) => patch('assumptions', { decommissionCost })}
              />
              <SliderRow
                label="Resale recovery"
                value={config.assumptions.resaleRecoveryPct}
                onChange={(resaleRecoveryPct) => patch('assumptions', { resaleRecoveryPct })}
                min={0}
                max={40}
                step={1}
                unit="% of residual value"
                accent="steel"
              />
            </div>
            <p className="mt-3 text-2xs leading-relaxed text-graphite-500">
              Modelled residual asset value at the end of the horizon:{' '}
              <span className="hc-figure text-graphite-300">{formatMoney(plan.residualValuePaise)}</span>.
              Recovery is credited once, against that residual value only.
            </p>
          </div>
        </ConfigSection>
      </div>

      <aside className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start">
        <Panel title="Live bill of materials" subtitle="Every line becomes one ledger entry on day zero.">
          <div className="space-y-4">
            {(Object.keys(bomByGroup) as (keyof typeof bomByGroup)[]).map((group) => (
              <div key={group}>
                <div className="hc-label mb-1.5 capitalize">{group}</div>
                <ul className="space-y-1.5">
                  {bomByGroup[group].map((line) => (
                    <li
                      key={line.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-2xs text-graphite-200">{line.label}</div>
                        <div className="hc-figure mt-0.5 text-2xs text-graphite-500">
                          {line.quantity} × {formatMoney(line.unitPricePaise)}
                        </div>
                      </div>
                      <span className="hc-figure shrink-0 text-2xs font-semibold text-graphite-100">
                        {formatMoney(line.quantity * line.unitPricePaise)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-3">
            <div className="flex justify-between text-2xs text-graphite-400">
              <span>Hardware and facility</span>
              <span className="hc-figure text-graphite-100">{formatMoney(bomTotal)}</span>
            </div>
            <div className="flex justify-between text-2xs text-graphite-400">
              <span>Commissioning labour</span>
              <span className="hc-figure text-graphite-100">{formatMoney(derived.commissioningPaise)}</span>
            </div>
            <div className="flex justify-between pt-1.5 text-sm font-semibold">
              <span className="text-graphite-200">Initial capital</span>
              <span className="hc-figure text-amber-glow">{formatMoney(derived.initialCapexPaise)}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Projected outcome" subtitle={`${config.assumptions.horizonYears}-year model, ${config.assumptions.escalateCosts ? 'escalated' : 'constant'} prices`}>
          <div className="space-y-3">
            {[
              { label: 'Recurring operating cost / year', value: derived.annualOpexPaise, tone: 'text-graphite-100' },
              { label: 'Cost per usable terabyte', value: derived.costPerUsableTbPaise, tone: 'text-graphite-100' },
              {
                label: 'Projected end-of-life total',
                value: plan.projectedEndOfLifePaise,
                tone: 'text-amber-glow',
              },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3">
                <span className="text-2xs text-graphite-400">{row.label}</span>
                <span className={cn('hc-figure text-sm font-semibold', row.tone)}>
                  {formatMoney(row.value)}
                </span>
              </div>
            ))}
            {paybackYears !== null && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className="text-2xs leading-relaxed text-graphite-400">
                  At the current operating rate, running this system for{' '}
                  <span className="hc-figure text-graphite-200">{paybackYears.toFixed(1)} years</span>{' '}
                  costs as much again as building it.
                </p>
              </div>
            )}
            {plan.exhaustionYear !== null && (
              <div className="rounded-lg border border-alert-glow/25 bg-alert-glow/[0.06] px-3 py-2.5">
                <p className="text-2xs leading-relaxed text-alert-glow">
                  Projected demand exceeds usable capacity in year{' '}
                  <span className="hc-figure">{plan.exhaustionYear.toFixed(1)}</span>.
                  {config.assumptions.autoExpandCapacity
                    ? ' An expansion shelf is already scheduled in the ledger.'
                    : ' Enable automatic expansion, or accept the shortfall.'}
                </p>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Rack preview" subtitle="Reflects the configuration you have selected.">
          <RackVisual config={config} live={phase === 'running'} compact intensity={0.5} />
        </Panel>

        <div className="hc-panel space-y-3 p-4">
          <Field label="Scenario name">
            <input
              value={scenarioName}
              onChange={(event) => setScenarioName(event.target.value)}
              placeholder="Untitled build"
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-graphite-850/90 px-2.5 text-sm text-graphite-100 outline-none transition-colors focus:border-amber-glow/45"
            />
          </Field>
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="md"
              icon={<Zap className="h-4 w-4" />}
              onClick={() => {
                purchase();
                notify('System commissioned', 'The acquisition is booked and the clock is running.', 'success');
                navigate('/dashboard');
              }}
            >
              {phase === 'draft' ? 'Buy and start the clock' : 'Rebuy with this configuration'}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                icon={<Save className="h-4 w-4" />}
                onClick={() => setShowSave((value) => !value)}
              >
                Save scenario
              </Button>
              <Button asChild variant="ghost" size="md" className="flex-1">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            </div>
          </div>
          {showSave && (
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-2xs leading-relaxed text-graphite-400">
                Saved as <span className="text-graphite-200">{scenarioName || 'Untitled build'}</span> with
                a projected {config.assumptions.horizonYears}-year total of{' '}
                <span className="hc-figure text-amber-glow">
                  {formatMoney(plan.projectedEndOfLifePaise)}
                </span>
                . Compare it against other builds on the comparison page.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-2.5 w-full"
                onClick={() => {
                  const saved = saveScenario();
                  setShowSave(false);
                  notify('Scenario saved', saved.name, 'success');
                }}
              >
                Confirm and save
              </Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
