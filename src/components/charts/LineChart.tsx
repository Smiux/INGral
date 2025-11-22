import React, { useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { Canvas } from '../../components/Canvas';
import type { CanvasRef } from '../../components/Canvas';
import { ChartData } from '../../types/analytics';
import styles from './LineChart.module.css';

interface LineChartProps {
  data: ChartData;
  height?: number;
  options?: Record<string, any>;
  className?: string;
}

const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  height = 300,
  options = {},
  className = ''
}) => {
  const { drawChart } = useCanvas(data, {
    type: 'line',
    height,
    ...options
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

// 导出命名和默认版本
export const LineChart = LineChartComponent;
export default LineChartComponent;

// 导出默认的mock数据供开发和测试使用
export const lineChartMockData: ChartData = {
  labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
  datasets: [
    {
      label: '页面访问量',
      data: [1200, 1900, 1500, 2400, 2100, 3000, 2700],
      borderColor: '#4f46e5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      fill: true,
      tension: 0.4
    }
  ]
};