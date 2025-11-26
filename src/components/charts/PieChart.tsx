import React, { useRef } from 'react';
import { useCanvas, PieDataItem } from '../../hooks/useCanvas';
import { Canvas } from '../../components/Canvas';
import type { CanvasRef } from '../../components/Canvas';
// 移除不存在的ChartOptions导入
import styles from './PieChart.module.css';

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
}

const defaultColors = [
  '#4f46e5', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'
];

const PieChartComponent: React.FC<PieChartProps> = ({
  data,
  height = 300,
  options = {},
  className = '',
  showLabels = true,
  showPercentages = true
}) => {
  // 准备图表数据，使用类型断言确保color属性处理正确
  const chartData = data.map((item, index) => {
    // 创建一个新对象，确保所有必要的属性都有值
    return {
      name: item?.name || '',
      value: item?.value || 0,
      // 使用类型断言确保color被视为字符串
      color: (item?.color || defaultColors[index % defaultColors.length]) as string,
      // 只有当percentage存在时才添加
      ...(item?.percentage !== undefined && { percentage: item.percentage })
    };
  });

  // 使用类型断言来避免类型错误
  const { drawChart } = useCanvas(chartData as PieDataItem[], {
    type: 'pie',
    height,
    showLabels,
    showPercentages,
    ...options
  });
  
  // 创建一个正确类型的ref传递给Canvas组件
  const canvasRef = useRef<CanvasRef>(null);

  return (
    <div 
      className={`${styles.container} ${className}`}
      style={{ height: `${height}px` }}
    >
      <Canvas ref={canvasRef} height={height} onDraw={drawChart} />
      {showLabels && (
        <div className={styles.legend}>
          {chartData.map((item, index) => (
            <div key={index} className={styles.legendItem}>
              <div 
                className={styles.legendColor} 
                style={{ backgroundColor: item.color }}
              />
              <span className={styles.legendText}>
                {item.name}
                {showPercentages && item.percentage && (
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
