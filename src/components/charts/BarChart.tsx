import React, { useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvasHook';
import { Canvas } from '../../components/canvas/Canvas';
import type { CanvasRef } from '../../components/canvas/Canvas';
import type { ChartData } from '../../types/analytics';
import styles from './BarChart.module.css';

interface BarChartProps {
  data: ChartData;
  height?: number;
  options?: Record<string, unknown>;
  className?: string;
  horizontal?: boolean;
}

const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  height = 300,
  options = {},
  className = '',
  horizontal = false,
}) => {
  const { drawChart } = useCanvas(data, {
    type: 'bar',
    height,
    horizontal,
    ...options,
  });

  // 创建一个正确类型的ref传递给Canvas组件
  const canvasRef = useRef<CanvasRef>(null);

  return (
    <div
      className={`${styles.container} ${className} ${horizontal ? styles.horizontal : ''}`}
      style={{ height: `${height || 300}px` }}
    >
      <Canvas ref={canvasRef} height={height} onDraw={drawChart} />
    </div>
  );
};

// 只导出组件，避免react-refresh警告
export const BarChart = BarChartComponent;
export default BarChartComponent;
