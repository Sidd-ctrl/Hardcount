import { useMemo } from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import { Chart } from './Chart';
import { AXIS_TEXT, BASE_TOOLTIP, CATEGORY_COLORS, CATEGORY_LABELS, GRID_BORDER, SPLIT_LINE } from './chartTheme';
import { formatMoney, formatMoneyCompact } from '@/domain/money';
import type { LedgerCategory, SimulationPlan } from '@/domain/types';

export interface CompositionChartProps {
  plan: SimulationPlan;
  categories: LedgerCategory[];
  height?: number;
}

export function CompositionChart({ plan, categories, height = 300 }: CompositionChartProps) {
  const option = useMemo<EChartsCoreOption>(() => {
    const series = categories
      .filter((category) =>
        plan.annualSlices.some((slice) => Math.abs(slice.byCategory[category] ?? 0) > 0),
      )
      .map((category) => ({
        name: CATEGORY_LABELS[category],
        type: 'bar' as const,
        stack: 'total',
        barMaxWidth: 30,
        emphasis: { focus: 'series' as const },
        itemStyle: { color: CATEGORY_COLORS[category] },
        data: plan.annualSlices.map((slice) => Math.round((slice.byCategory[category] ?? 0) / 100)),
      }));

    return {
      animationDuration: 500,
      grid: { left: 8, right: 16, top: 20, bottom: 8, containLabel: true },
      legend: {
        type: 'scroll',
        bottom: 0,
        textStyle: { color: AXIS_TEXT, fontSize: 10 },
        itemWidth: 9,
        itemHeight: 9,
        icon: 'roundRect',
      },
      tooltip: {
        ...BASE_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.04)' } },
        formatter: (params: { dataIndex: number; seriesName: string; value: number; color: string }[]) => {
          const head = `<div style="font-weight:600;margin-bottom:6px">Year ${params[0].dataIndex + 1}</div>`;
          const rows = params
            .filter((row) => Math.abs(row.value) > 0)
            .map(
              (row) =>
                `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">
                  <span style="width:8px;height:8px;border-radius:2px;background:${row.color}"></span>
                  <span style="flex:1">${row.seriesName}</span>
                  <span class="hc-figure">${formatMoney(row.value * 100)}</span>
                </div>`,
            )
            .join('');
          return head + rows;
        },
      },
      xAxis: {
        type: 'category',
        data: plan.annualSlices.map((slice) => `Y${slice.year}`),
        axisLine: { lineStyle: { color: GRID_BORDER } },
        axisTick: { show: false },
        axisLabel: { color: AXIS_TEXT, fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: SPLIT_LINE } },
        axisLabel: { color: AXIS_TEXT, fontSize: 10, formatter: (value: number) => formatMoneyCompact(value * 100) },
      },
      series,
    };
  }, [plan, categories]);

  return (
    <Chart
      option={option}
      height={height}
      ariaLabel="Stacked bar chart of annual expenditure split by cost category"
    />
  );
}
