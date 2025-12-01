import React, { useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvasHook';
import { Canvas } from '../../components/canvas/Canvas';
import type { CanvasRef } from '../../components/canvas/Canvas';
import type { ChartData } from '../../types/analytics';
import styles from './LineChart.module.css';

interface LineChartProps {
  data: ChartData;
  height?: number;
  options?: Record<string, unknown>;
  className?: string;
}

const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  height = 300,
  options = {},
  className = '',
}) => {
  const { drawChart } = useCanvas(data, {
    type: 'line',
    height,
    ...options,
  });

  // 创建一个正确类型的ref传递给Canvas组件
  const canvasRef = useRef<CanvasRef>(null);

  return (
    <div
      className={`${styles.container} ${className}`}
      style={{ height: height || 300 }}
    >
      <Canvas ref={canvasRef} height={height} onDraw={drawChart} />
    </div>
  );
};

// 只导出组件，避免react-refresh警告
export const LineChart = LineChartComponent;
export default LineChartComponent;
