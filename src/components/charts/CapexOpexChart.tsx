import { useMemo } from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import { Chart } from './Chart';
import { AXIS_TEXT, BASE_TOOLTIP, GRID_BORDER, SPLIT_LINE } from './chartTheme';
import { MS_PER_YEAR, formatMoney, formatMoneyCompact } from '@/domain/money';
import type { SimulationPlan } from '@/domain/types';

export interface CapexOpexChartProps {
  plan: SimulationPlan;
  height?: number;
}

export function CapexOpexChart({ plan, height = 260 }: CapexOpexChartProps) {
  const option = useMemo<EChartsCoreOption>(() => {
    const xData = plan.monthlySeries.map((point) => Math.round((point.atMs / MS_PER_YEAR) * 100) / 100);

    return {
      animationDuration: 500,
      grid: { left: 8, right: 18, top: 30, bottom: 8, containLabel: true },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: AXIS_TEXT, fontSize: 10 },
        itemWidth: 10,
        itemHeight: 8,
      },
      tooltip: {
        ...BASE_TOOLTIP,
        trigger: 'axis',
        formatter: (params: { dataIndex: number }[]) => {
          const point = plan.monthlySeries[params[0].dataIndex];
          if (!point) return '';
          const total = point.capexPaise + point.opexPaise;
          const share = total > 0 ? (point.opexPaise / total) * 100 : 0;
          return `<div style="font-weight:600;margin-bottom:6px">Year ${(point.atMs / MS_PER_YEAR).toFixed(2)}</div>
            <div style="color:#5ab0f0">Capital: ${formatMoney(point.capexPaise)}</div>
            <div style="color:#ffb547">Operating: ${formatMoney(point.opexPaise)}</div>
            <div style="color:#7b8794;margin-top:4px">Operating share: ${share.toFixed(1)}%</div>`;
        },
      },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLine: { lineStyle: { color: GRID_BORDER } },
        axisTick: { show: false },
        axisLabel: { color: AXIS_TEXT, fontSize: 10, formatter: (value: string) => `${Number(value).toFixed(0)}y` },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: SPLIT_LINE } },
        axisLabel: { color: AXIS_TEXT, fontSize: 10, formatter: (value: number) => formatMoneyCompact(value * 100) },
      },
      series: [
        {
          name: 'Capital',
          type: 'line',
          stack: 'split',
          smooth: 0.15,
          showSymbol: false,
          data: plan.monthlySeries.map((point) => Math.round(point.capexPaise / 100)),
          lineStyle: { width: 1.5, color: '#5ab0f0' },
          areaStyle: { color: 'rgba(90,176,240,0.22)' },
        },
        {
          name: 'Operating',
          type: 'line',
          stack: 'split',
          smooth: 0.15,
          showSymbol: false,
          data: plan.monthlySeries.map((point) => Math.round(point.opexPaise / 100)),
          lineStyle: { width: 1.5, color: '#ffb547' },
          areaStyle: { color: 'rgba(255,181,71,0.2)' },
        },
      ],
    };
  }, [plan]);

  return (
    <Chart
      option={option}
      height={height}
      ariaLabel="Stacked area chart separating cumulative capital expenditure from cumulative operating expenditure"
    />
  );
}
