import React, { useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { Canvas } from '../../components/Canvas';
import type { CanvasRef } from '../../components/Canvas';
import { ChartData } from '../../types/analytics';
import styles from './BarChart.module.css';

interface BarChartProps {
  data: ChartData;
  height?: number;
  options?: Record<string, any>;
  className?: string;
  horizontal?: boolean;
}

const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  height = 300,
  options = {},
  className = '',
  horizontal = false
}) => {
  const { drawChart } = useCanvas(data, {
    type: 'bar',
    height,
    horizontal,
    ...options
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

// 导出命名和默认版本
export const BarChart = BarChartComponent;
export default BarChartComponent;

// 导出默认的mock数据供开发和测试使用
export const barChartMockData: ChartData = {
  labels: ['文章', '评论', '标签', '收藏', '点赞'],
  datasets: [
    {
      label: '数量',
      data: [150, 450, 80, 230, 520],
      backgroundColor: 'rgba(79, 70, 229, 0.5)'
    }
  ]
};