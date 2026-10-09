import { useEffect, useRef } from 'react';
import { echarts } from './echartsSetup';

export interface ChartProps {
  option: echarts.EChartsCoreOption;
  height?: number;
  ariaLabel: string;
  className?: string;
  onPointClick?: (params: { dataIndex: number }) => void;
}

export function Chart({ option, height = 280, ariaLabel, className, onPointClick }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const instance = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
    instanceRef.current = instance;

    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      instance.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !onPointClick) return;
    const handler = (params: unknown) => {
      const detail = params as { dataIndex?: number };
      if (typeof detail.dataIndex === 'number') onPointClick({ dataIndex: detail.dataIndex });
    };
    instance.on('click', handler);
    return () => {
      instance.off('click', handler);
    };
  }, [onPointClick]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ height, width: '100%' }}
    />
  );
}
