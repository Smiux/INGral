import React from 'react';
import { ChartBase } from './ChartBase';
import styles from './LineChart.module.css';
import type { ChartData, ChartOptions, ChartEvent, ActiveElement } from 'chart.js';

interface LineChartProps {
  data: ChartData<'line'>;
  height?: number;
  options?: Record<string, unknown>;
  className?: string;
  onPointClick?: (_index: number, _value: number, _label: string) => void;
  onHover?: (_index: number | null, _value: number | null, _label: string | null) => void;
}

const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  height = 300,
  options = {},
  className = '',
  onPointClick,
  onHover
}) => {
  // 准备图表数据
  const chartData = {
    'labels': data.labels || [],
    'datasets': data.datasets?.map(dataset => ({
      'label': dataset.label || '',
      'data': dataset.data || [],
      'borderColor': dataset.borderColor || '#3b82f6',
      'backgroundColor': dataset.backgroundColor || 'rgba(79, 70, 229, 0.1)',
      'borderWidth': dataset.borderWidth || 2,
      'fill': dataset.fill !== undefined ? dataset.fill : true,
      'tension': dataset.tension || 0.3,
      'pointRadius': dataset.pointRadius || 5,
      'pointHoverRadius': dataset.pointHoverRadius || 8
    })) || []
  };

  // 配置图表选项
  const chartOptions: ChartOptions = {
    'plugins': {
      'legend': {
        'position': 'top'
      },
      'tooltip': {
        'enabled': true
      }
    },
    'scales': {
      'y': {
        'beginAtZero': true
      }
    },
    // 启用交互
    'interaction': {
      'intersect': false,
      'mode': 'index'
    },
    ...options
  };

  // 处理点击事件
  const handleChartClick = (_event: ChartEvent, elements: ActiveElement[]) => {
    if (elements.length > 0 && onPointClick) {
      const element = elements[0];
      if (element) {
        const index = element.index;
        const value = chartData.datasets[0]?.data[index] as number;
        const label = chartData.labels?.[index] as string;
        onPointClick(index, value, label);
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
          const value = chartData.datasets[0]?.data[index] as number;
          const label = chartData.labels?.[index] as string;
          onHover(index, value, label);
        }
      } else {
        onHover(null, null, null);
      }
    }
  };

  return (
    <ChartBase
      chartType="line"
      data={chartData}
      height={height}
      options={chartOptions}
      className={`${styles.container} ${className}`}
      onChartClick={handleChartClick}
      onChartHover={handleChartHover}
    />
  );
};

// 只导出组件，避免react-refresh警告
export const LineChart = LineChartComponent;
export default LineChartComponent;
