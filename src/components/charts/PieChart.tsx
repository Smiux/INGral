import React, { useCallback } from 'react';
import { ChartBase } from './ChartBase';
import styles from './PieChart.module.css';
import type { ChartEvent, ActiveElement, ChartOptions } from 'chart.js';

interface PieChartData {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartData[];
  height?: number;
  options?: Record<string, unknown>;
  className?: string;
  showLabels?: boolean;
  showPercentages?: boolean;
  onSliceClick?: (index: number, value: number, label: string, percentage: number) => void;
  onHover?: (index: number | null, value: number | null, label: string | null, percentage: number | null) => void;
}

const defaultColors = [
  '#4f46e5', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316',
];

const PieChartComponent: React.FC<PieChartProps> = ({
  data,
  height = 300,
  options = {},
  className = '',
  showLabels = true,
  showPercentages = true,
  onSliceClick,
  onHover,
}) => {
  // 准备图表数据
  const prepareChartData = useCallback(() => {
    return data.map((item, index) => {
      return {
        name: item?.name || '',
        value: item?.value || 0,
        color: (item?.color || defaultColors[index % defaultColors.length]) as string,
        percentage: item?.percentage || (item?.value / data.reduce((sum, i) => sum + (i?.value || 0), 0) * 100),
      };
    });
  }, [data]);

  const chartData = prepareChartData();

  // 转换数据格式
  const chartJsData = {
    labels: chartData.map(item => item.name),
    datasets: [
      {
        data: chartData.map(item => item.value),
        backgroundColor: chartData.map(item => item.color),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  };

  // 配置图表选项
  const chartOptions: ChartOptions = {
    plugins: {
      legend: {
        display: showLabels,
        position: 'top',
      },
      tooltip: {
          enabled: true,
          callbacks: {
            label: function(tooltipItem: import('chart.js').TooltipItem<'pie'>) {
              const label = tooltipItem.label || '';
              const value = tooltipItem.parsed;
              const total = tooltipItem.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
    },
    ...options,
  };

  // 处理点击事件
  const handleChartClick = (_event: ChartEvent, elements: ActiveElement[]) => {
    if (elements.length > 0 && onSliceClick) {
      const element = elements[0];
      if (element) {
        const index = element.index;
        const label = chartJsData.labels?.[index] as string;
        const percentage = chartData[index]?.percentage || 0;
        const value = chartData[index]?.value || 0;
        onSliceClick(index, value, label, percentage);
      }
    }
  };

  // 处理悬停事件
  const handleChartHover = (_event: ChartEvent, elements: ActiveElement[]) => {
    if (onHover) {
      if (elements.length > 0) {
        const element = elements[0];
        if (element) {
          const index = element.index;
          const label = chartJsData.labels?.[index] as string;
          const percentage = chartData[index]?.percentage || 0;
          const value = chartData[index]?.value || 0;
          onHover(index, value, label, percentage);
        }
      } else {
        onHover(null, null, null, null);
      }
    }
  };

  return (
    <div
      className={`${styles.container} ${className}`}
      style={{ height: `${height}px` }}
    >
      <ChartBase
        chartType="pie"
        data={chartJsData}
        height={height}
        options={chartOptions}
        onChartClick={handleChartClick}
        onChartHover={handleChartHover}
      />
      {showLabels && !chartOptions.plugins?.legend?.display && (
        <div className={styles.legend}>
          {chartData.map((item, index) => (
            <div key={index} className={styles.legendItem}>
              <div
                className={styles.legendColor}
                style={{ backgroundColor: item.color }}
              />
              <span className={styles.legendText}>
                {item.name}
                {showPercentages && (
                  <span className={styles.legendPercentage}>
                    {' '}({item.percentage.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 只导出组件，避免react-refresh警告
export const PieChart = PieChartComponent;
export default PieChartComponent;
