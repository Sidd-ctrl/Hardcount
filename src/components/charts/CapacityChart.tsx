import { useMemo } from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import { Chart } from './Chart';
import { AXIS_TEXT, BASE_TOOLTIP, GRID_BORDER, SPLIT_LINE } from './chartTheme';
import { MS_PER_YEAR, formatCapacity, formatNumber } from '@/domain/money';
import type { SimulationPlan } from '@/domain/types';

export interface CapacityChartProps {
  plan: SimulationPlan;
  currentMs: number;
  height?: number;
}

export function CapacityChart({ plan, currentMs, height = 280 }: CapacityChartProps) {
  const option = useMemo<EChartsCoreOption>(() => {
    const xData = plan.capacitySeries.map((point) => point.year);
    const nowYear = Math.round((currentMs / MS_PER_YEAR) * 100) / 100;

    const markLines: Record<string, unknown>[] = [
      {
        xAxis: nowYear,
        label: { formatter: 'now', color: '#c2c9d1', fontSize: 10, position: 'insideEndTop' },
        lineStyle: { color: 'rgba(194,201,209,0.5)', type: 'dashed', width: 1 },
      },
    ];

    if (plan.exhaustionYear !== null && plan.exhaustionYear <= plan.capacitySeries[plan.capacitySeries.length - 1].year) {
      markLines.push({
        xAxis: plan.exhaustionYear,
        label: {
          formatter: 'capacity exhausted',
          color: '#ff6b5e',
          fontSize: 10,
          position: 'insideEndTop',
        },
        lineStyle: { color: 'rgba(255,107,94,0.7)', type: 'solid', width: 1 },
      });
    }

    return {
      animationDuration: 500,
      grid: { left: 8, right: 18, top: 26, bottom: 8, containLabel: true },
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
          const point = plan.capacitySeries[params[0].dataIndex];
          if (!point) return '';
          const headroom = point.usableTb - point.demandTb;
          return `<div style="font-weight:600;margin-bottom:6px">Year ${point.year.toFixed(2)}</div>
            <div style="color:#5ab0f0">Usable capacity: ${formatCapacity(point.usableTb)}</div>
            <div style="color:#ffb547">Projected demand: ${formatCapacity(point.demandTb)}</div>
            <div style="color:${headroom >= 0 ? '#4fbf8f' : '#ff6b5e'}">Headroom: ${formatCapacity(headroom)}</div>`;
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
        axisLabel: { color: AXIS_TEXT, fontSize: 10, formatter: (value: number) => formatNumber(value, 0) },
        name: 'TB',
        nameTextStyle: { color: AXIS_TEXT, fontSize: 10, align: 'right' },
      },
      series: [
        {
          name: 'Usable capacity',
          type: 'line',
          step: 'end',
          showSymbol: false,
          data: plan.capacitySeries.map((point) => Math.round(point.usableTb * 100) / 100),
          lineStyle: { width: 2, color: '#5ab0f0' },
          areaStyle: { color: 'rgba(90,176,240,0.12)' },
          markLine: { silent: true, symbol: 'none', data: markLines },
        },
        {
          name: 'Projected demand',
          type: 'line',
          smooth: 0.2,
          showSymbol: false,
          data: plan.capacitySeries.map((point) => Math.round(point.demandTb * 100) / 100),
          lineStyle: { width: 2, color: '#ffb547', type: 'dashed' },
        },
      ],
    };
  }, [plan, currentMs]);

  return (
    <Chart option={option} height={height} ariaLabel="Line chart comparing projected storage demand against usable capacity" />
  );
}
