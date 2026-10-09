import { useMemo } from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import { Chart } from './Chart';
import { AXIS_TEXT, BASE_TOOLTIP, GRID_BORDER, SPLIT_LINE } from './chartTheme';
import { MS_PER_YEAR, formatMoney, formatMoneyCompact } from '@/domain/money';
import type { ChartView, SimulationPlan } from '@/domain/types';

export interface ExpenditureChartProps {
  plan: SimulationPlan;
  view: ChartView;
  inflationPct: number;
  currentMs: number;
  height?: number;
}

function realCumulative(plan: SimulationPlan, inflationPct: number): number[] {
  const factor = inflationPct / 100;
  let running = 0;
  let previous = 0;
  return plan.monthlySeries.map((point) => {
    const delta = point.cumulativePaise - previous;
    previous = point.cumulativePaise;
    running += delta / Math.pow(1 + factor, point.atMs / MS_PER_YEAR);
    return running;
  });
}

export function ExpenditureChart({ plan, view, inflationPct, currentMs, height = 300 }: ExpenditureChartProps) {
  const option = useMemo<EChartsCoreOption>(() => {
    if (view === 'annual') {
      return {
        animationDuration: 500,
        grid: { left: 8, right: 16, top: 26, bottom: 8, containLabel: true },
        tooltip: {
          ...BASE_TOOLTIP,
          trigger: 'axis',
          axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.04)' } },
          formatter: (params: { dataIndex: number }[]) => {
            const entry = plan.annualSlices[params[0].dataIndex];
            if (!entry) return '';
            return `<div style="font-weight:600;margin-bottom:6px">Year ${entry.year}</div>
              <div style="color:#ffb547">Spend this year: ${formatMoney(entry.spendPaise)}</div>
              <div style="color:#7b8794">Cumulative: ${formatMoney(entry.cumulativePaise)}</div>`;
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
        series: [
          {
            type: 'bar',
            data: plan.annualSlices.map((slice) => Math.round(slice.spendPaise / 100)),
            itemStyle: {
              borderRadius: [3, 3, 0, 0],
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#ffb547' },
                  { offset: 1, color: 'rgba(224,139,28,0.35)' },
                ],
              },
            },
            barMaxWidth: 34,
          },
        ],
      };
    }

    const cumulative = view === 'real' ? realCumulative(plan, inflationPct) : plan.monthlySeries.map((point) => point.cumulativePaise);
    const xData = plan.monthlySeries.map((point) => Math.round((point.atMs / MS_PER_YEAR) * 100) / 100);

    return {
      animationDuration: 500,
      grid: { left: 8, right: 18, top: 26, bottom: 8, containLabel: true },
      tooltip: {
        ...BASE_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: 'rgba(255,181,71,0.4)' } },
        formatter: (params: { dataIndex: number }[]) => {
          const entry = plan.monthlySeries[params[0].dataIndex];
          if (!entry) return '';
          const value = cumulative[params[0].dataIndex];
          const suffix = view === 'real' ? ' (year-0 prices)' : '';
          return `<div style="font-weight:600;margin-bottom:6px">Year ${(entry.atMs / MS_PER_YEAR).toFixed(2)}</div>
            <div style="color:#ffb547">Cumulative: ${formatMoney(value)}${suffix}</div>
            <div style="color:#5ab0f0">Capital: ${formatMoney(entry.capexPaise)}</div>
            <div style="color:#7b8794">Operating: ${formatMoney(entry.opexPaise)}</div>`;
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
          type: 'line',
          smooth: 0.18,
          showSymbol: false,
          data: cumulative.map((value) => Math.round(value / 100)),
          lineStyle: { width: 2, color: '#ffb547' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255,181,71,0.26)' },
                { offset: 1, color: 'rgba(255,181,71,0)' },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: 'none',
            label: {
              formatter: 'now',
              color: '#c2c9d1',
              fontSize: 10,
              position: 'insideEndTop',
            },
            lineStyle: { color: 'rgba(194,201,209,0.55)', type: 'dashed', width: 1 },
            data: [{ xAxis: Math.round((currentMs / MS_PER_YEAR) * 100) / 100 }],
          },
        },
      ],
    };
  }, [plan, view, inflationPct, currentMs]);

  const label =
    view === 'annual'
      ? 'Bar chart of modelled expenditure for each simulated year'
      : view === 'real'
        ? 'Line chart of cumulative expenditure deflated to year-zero prices'
        : 'Line chart of cumulative expenditure over the modelled lifecycle';

  return <Chart option={option} height={height} ariaLabel={label} />;
}
