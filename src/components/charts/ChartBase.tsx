import { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import styles from './ChartBase.module.css';
import type { ChartData, ChartOptions, ChartEvent, ActiveElement } from 'chart.js';
import { DEFAULT_CHART_OPTIONS } from './chartUtils';

interface ChartBaseProps {
  chartType: string;
  data: ChartData;
  height?: number;
  options?: ChartOptions;
  className?: string;
  onChartClick?: (_event: ChartEvent, _elements: ActiveElement[]) => void;
  onChartHover?: (_event: ChartEvent, _elements: ActiveElement[]) => void;
  onChartInit?: (_chart: Chart) => void;
}

/**
 * 通用图表基础组件，抽象了Chart.js图表的共同逻辑
 * 包括：图表实例管理、初始化、更新和销毁
 */
export const ChartBase = ({
  chartType,
  data,
  height = 300,
  options = {},
  className = '',
  onChartClick,
  onChartHover,
  onChartInit
}: ChartBaseProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return undefined;
    }

    // 销毁现有图表
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // 合并默认选项和用户选项
    const mergedOptions = {
      ...DEFAULT_CHART_OPTIONS,
      ...options
    };

    // 添加事件处理
    if (onChartClick) {
      // 使用类型安全的方式添加onClick事件
      Object.assign(mergedOptions, { 'onClick': onChartClick });
    }

    if (onChartHover) {
      // 使用类型安全的方式添加onHover事件
      Object.assign(mergedOptions, { 'onHover': onChartHover });
    }

    // 创建新图表
    const chart = new Chart(canvasRef.current, {
      'type': chartType as keyof import('chart.js').ChartTypeRegistry,
      data,
      'options': mergedOptions
    });

    // 保存图表实例
    chartRef.current = chart;

    // 调用初始化回调
    if (onChartInit) {
      onChartInit(chart);
    }

    // 清理函数
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartType, data, options, height, onChartClick, onChartHover, onChartInit]);

  return (
    <div
      className={`${styles.container} ${className}`}
      style={{ 'height': `${height}px` }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};
