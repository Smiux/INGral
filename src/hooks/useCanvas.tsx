import * as React from 'react';
import { useRef, useCallback } from 'react';
// 使用默认颜色方案
import type { ChartData } from '../types/analytics';

// 定义本地类型以避免导入错误
interface ChartOptions {
  title?: string;
  labels?: string[];
  colors?: string[];
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  [key: string]: any;
}

// 添加缺失的BarChartDataItem类型定义
export type BarChartDataItem = number | { value: number };
export interface ChartDataset {
  data: number[] | { x: number; y: number }[] | { value: number; label: string }[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  tension?: number;
  fill?: boolean;
  borderRadius?: number | undefined;
  label?: string;
}

interface UseCanvasOptions extends ChartOptions {
  type: 'line' | 'bar' | 'pie';
  height: number;
  horizontal?: boolean;
  showLabels?: boolean;
  showPercentages?: boolean;
  roundedBars?: boolean;
  ringWidth?: number;
  showBorder?: boolean;
  padding?: number;
}

export interface PieDataItem {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
  label?: string;
}

export const useCanvas = (data: ChartData | PieDataItem[], options: UseCanvasOptions): { canvasRef: React.RefObject<HTMLCanvasElement>; drawChart: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void } => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 获取主题颜色 - 使用默认颜色方案
  const getThemeColors = useCallback(() => {
    return {
      text: '#333',
      grid: '#e0e0e0',
      background: '#fff',
      primary: '#4f46e5'
    };
  }, []);

  // 绘制折线图
  const drawLineChart = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void => {
    // 确保data是ChartData类型并进行类型保护
    const chartData = data as ChartData;
    if (!chartData || typeof chartData !== 'object' || !chartData.datasets || !Array.isArray(chartData.datasets) || chartData.datasets.length === 0) return;

    const colors = getThemeColors();
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const clientWidth = canvas.clientWidth || 0;
    const clientHeight = canvas.clientHeight || 0;
    const chartWidth = Math.max(0, clientWidth - padding.left - padding.right);
    const chartHeight = Math.max(0, clientHeight - padding.top - padding.bottom);
    
    // 清空画布
    ctx.clearRect(0, 0, clientWidth, clientHeight);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, clientWidth, clientHeight);

    // 计算数据范围
    const allData = chartData.datasets.flatMap(dataset => 
      Array.isArray(dataset?.data) ? dataset.data : []
    ).filter(value => typeof value === 'number');
    
    if (allData.length === 0) return;
    
    const maxValue = Math.max(...allData);
    const minValue = Math.min(...allData);
    const valueRange = maxValue - minValue || 1;
    const labelCount = Array.isArray(chartData.labels) ? chartData.labels.length : 1;
    
    // 绘制网格线
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // 水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      
      // 绘制Y轴标签
      ctx.setLineDash([]);
      ctx.fillStyle = colors.text;
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      const value = maxValue - (valueRange / 5) * i;
      ctx.fillText(value.toFixed(0), padding.left - 10, y + 4);
    }
    
    // 垂直网格线
    ctx.setLineDash([2, 2]);
    for (let i = 0; i < labelCount; i++) {
      const x = padding.left + (chartWidth / (labelCount - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
      
      // 绘制X轴标签
      ctx.setLineDash([]);
      ctx.fillStyle = colors.text;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        chartData.labels?.[i] || '', 
        x, 
        padding.top + chartHeight + 20
      );
    }
    
    // 绘制轴线
    ctx.setLineDash([]);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    
    // Y轴
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();
    
    // X轴
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
    
    // 绘制数据集
    chartData.datasets.forEach((dataset) => {
      const color = dataset.borderColor || colors.primary;
      const bgColor = dataset.backgroundColor || `${color}20`;
      
      // 绘制填充区域
      if (dataset.fill !== false) {
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        dataset.data.forEach((value, index) => {
          const x = padding.left + (chartWidth / (labelCount - 1)) * index;
          const y = padding.top + chartHeight - (((value as number) - minValue) / valueRange) * chartHeight;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
    });
        
        // 关闭填充区域
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.closePath();
        ctx.fill();
      }
      
      // 绘制线条
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      dataset.data.forEach((value, index) => {
        const x = padding.left + (chartWidth / (labelCount - 1)) * index;
        const y = padding.top + chartHeight - (((value as number) - minValue) / valueRange) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          // 使用贝塞尔曲线使线条更平滑
          if (dataset.tension && index > 0 && index < dataset.data.length - 1) {
            const prevX = padding.left + (chartWidth / (labelCount - 1)) * (index - 1);
            const prevY = padding.top + chartHeight - (((dataset.data[index - 1] as number) - minValue) / valueRange) * chartHeight;
            const nextX = padding.left + (chartWidth / (labelCount - 1)) * (index + 1);
            
            const cp1x = prevX + (x - prevX) * dataset.tension;
            const cp1y = prevY;
            const cp2x = x - (nextX - x) * dataset.tension;
            const cp2y = y;
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      
      ctx.stroke();
      
      // 绘制数据点
      ctx.fillStyle = color;
      dataset.data.forEach((value, index) => {
        const x = padding.left + (chartWidth / (labelCount - 1)) * index;
        const y = padding.top + chartHeight - ((value as number - minValue) / valueRange) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.background;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
  }, [data, options]);

  // 绘制柱状图
  const drawBarChart = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void => {
    // 确保data是ChartData类型并进行类型保护
    const chartData = data as ChartData;
    if (!chartData || typeof chartData !== 'object' || !chartData.datasets || !Array.isArray(chartData.datasets) || chartData.datasets.length === 0) return;

    const colors = getThemeColors();
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const clientWidth = canvas.clientWidth || 0;
    const clientHeight = canvas.clientHeight || 0;
    const chartWidth = Math.max(0, clientWidth - padding.left - padding.right);
    const chartHeight = Math.max(0, clientHeight - padding.top - padding.bottom);
    
    // 清空画布
    ctx.clearRect(0, 0, clientWidth, clientHeight);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, clientWidth, clientHeight);

    // 计算数据范围
    const allData = chartData.datasets.flatMap(dataset => 
      Array.isArray(dataset?.data) ? dataset.data : []
    ).filter(value => typeof value === 'number');
    
    if (allData.length === 0) return;
    
    const maxValue = Math.max(...allData);
    const minValue = Math.min(...allData);
    const valueRange = maxValue - minValue || 1;
    const labelCount = Array.isArray(chartData.labels) ? chartData.labels.length : 1;
    const datasetCount = chartData.datasets.length;
    const barWidth = Math.max(0, chartWidth / (labelCount * (datasetCount + 1)));
    
    // 绘制网格线和标签
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // 水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      
      // 绘制Y轴标签
      ctx.setLineDash([]);
      ctx.fillStyle = colors.text;
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      const value = maxValue - (valueRange / 5) * i;
      ctx.fillText(value.toFixed(0), padding.left - 10, y + 4);
    }
    
    // 绘制轴线
    ctx.setLineDash([]);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    
    // Y轴
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();
    
    // X轴
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
    
    // 定义柱状图数据项类型
      type BarChartDataItem = number;
      
      // 扩展类型定义
      interface ExtendedDataset extends ChartDataset {
        backgroundColor?: string | string[];
        borderRadius?: number | undefined;
        data: BarChartDataItem[];
      }
      
      // 绘制柱状图
      chartData.datasets.forEach((dataset, datasetIndex) => {
        if (!dataset || !Array.isArray(dataset.data)) return;
        
        const typedDataset = dataset as ExtendedDataset;
        typedDataset.data.forEach((value, index) => {
          if (typeof value !== 'number') return;
          
          const normalizedValue = (value - minValue) / valueRange;
          const barHeight = normalizedValue * chartHeight;
          const x = padding.left + (chartWidth / labelCount) * (index + 0.5) - 
                  (barWidth * datasetCount / 2) + (barWidth * datasetIndex);
          const y = padding.top + chartHeight - barHeight;
          
          // 获取柱状图颜色
          const backgroundColor = dataset.backgroundColor;
          const color = Array.isArray(backgroundColor)
            ? backgroundColor[index % backgroundColor.length]
            : (backgroundColor || `${colors.primary}80`);
          
          // 绘制柱状图
          ctx.fillStyle = typeof color === 'string' ? color : colors.primary;
          
          // 处理圆角
          const isRounded = options.roundedBars === true;
          const borderRadius = typeof (dataset as Record<string, any>).borderRadius === 'number' ? (dataset as Record<string, any>).borderRadius : 
                               (isRounded ? 4 : 0);
          
          if (borderRadius > 0) {
            ctx.beginPath();
            ctx.moveTo(x + borderRadius, y);
            ctx.lineTo(x + barWidth - borderRadius, y);
            ctx.arcTo(x + barWidth, y, x + barWidth, y + borderRadius, borderRadius);
            ctx.lineTo(x + barWidth, y + barHeight - borderRadius);
            ctx.arcTo(x + barWidth, y + barHeight, x + barWidth - borderRadius, y + barHeight, borderRadius);
            ctx.lineTo(x + borderRadius, y + barHeight);
            ctx.arcTo(x, y + barHeight, x, y + barHeight - borderRadius, borderRadius);
            ctx.lineTo(x, y + borderRadius);
            ctx.arcTo(x, y, x + borderRadius, y, borderRadius);
            ctx.fill();
          } else {
            // 简单矩形
            ctx.fillRect(x, y, barWidth, barHeight);
          }
          
          // 绘制数值标签
          if (options.showLabels) {
            ctx.fillStyle = colors.text;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(value.toFixed(0), x + barWidth / 2, y - 5);
          }
        });
        
        // 绘制X轴标签
        if (datasetIndex === 0 && Array.isArray(chartData.labels)) {
          chartData.labels.forEach((label, index) => {
            const x = padding.left + (chartWidth / labelCount) * (index + 0.5);
            ctx.fillStyle = colors.text;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(String(label), x, padding.top + chartHeight + 20);
          });
        }
      });
  }, [data, options]);

  // 绘制饼图
  const drawPieChart = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void => {
    if (!ctx || !canvas) return;
    
    // 添加数据验证
    if (!Array.isArray(data)) {
      console.warn('drawPieChart: data must be an array');
      return;
    }
    
    // 过滤和验证饼图数据格式
    const validPieData: PieDataItem[] = (data as any[]).filter((item): item is PieDataItem => {
      if (!item || typeof item !== 'object') return false;
      
      const typedItem = item as Partial<PieDataItem>;
      return typeof typedItem.value === 'number' && 
             typedItem.value > 0 &&
             (typeof typedItem.color === 'string' || typedItem.color === undefined);
    });
    
    if (validPieData.length === 0) {
      console.warn('drawPieChart: no valid data to display');
      return;
    }

    const colors = getThemeColors();
    const clientWidth = canvas.clientWidth || 0;
    const clientHeight = canvas.clientHeight || 0;
    
    // 确保canvas尺寸有效
    if (clientWidth <= 0 || clientHeight <= 0) {
      console.warn('drawPieChart: invalid canvas dimensions');
      return;
    }
    
    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;
    const padding = typeof options.padding === 'number' ? options.padding : 40;
    const radius = Math.max(0, Math.min(centerX, centerY) - padding);
    
    // 清空画布
    ctx.clearRect(0, 0, clientWidth, clientHeight);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, clientWidth, clientHeight);
    
    const totalValue = validPieData.reduce((sum, item) => sum + item.value, 0);
    
    if (totalValue <= 0) {
      console.warn('drawPieChart: total value must be greater than 0');
      return;
    }
    
    // 环形图宽度
    const ringWidth = typeof options.ringWidth === 'number' && options.ringWidth > 0 
      ? Math.min(radius * 0.8, Math.max(0, options.ringWidth)) // 限制最大宽度并确保非负
      : 0;
    
    // 绘制饼图
    let startAngle = -Math.PI / 2;
    
    validPieData.forEach((item: PieDataItem) => {
      const sliceAngle = (item.value / totalValue) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;
      
      // 绘制扇形
      ctx.beginPath();
      
      if (ringWidth > 0) {
        // 环形图
        const innerRadius = radius - ringWidth;
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
      } else {
        // 常规饼图
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
      }
      
      // 设置扇形颜色
      const color = item.color || colors.primary;
      ctx.fillStyle = typeof color === 'string' ? color : colors.primary;
      ctx.fill();
      
      // 绘制边框
      if (options.showBorder !== false) {
        ctx.strokeStyle = colors.background;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // 绘制标签
      if (options.showLabels === true) {
        const midAngle = startAngle + sliceAngle / 2;
        const labelRadius = ringWidth > 0 ? radius - ringWidth / 2 : radius * 0.7;
        const labelX = centerX + Math.cos(midAngle) * labelRadius;
        const labelY = centerY + Math.sin(midAngle) * labelRadius;
        
        ctx.fillStyle = colors.text;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 绘制标签文本
        const labelText = item.label && typeof item.label === 'string' ? item.label : String(item.name || 'Unknown');
        ctx.fillText(labelText, labelX, labelY);
        
        // 绘制百分比
        if (options.showPercentages === true) {
          const percentage = Math.round((item.value / totalValue) * 100);
          ctx.fillText(`${percentage}%`, labelX, labelY + 15);
        }
      }
      
      startAngle = endAngle;
    });
  }, [data, options]);

  // 根据类型选择绘制函数
  const drawChart = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void => {
    if (!ctx || !canvas) return;
    
    switch (options.type) {
      case 'line':
        if (Array.isArray(data) && 'labels' in data) {
          drawLineChart(ctx, canvas);
        }
        break;
      case 'bar':
        if (Array.isArray(data) && 'labels' in data) {
          drawBarChart(ctx, canvas);
        }
        break;
      case 'pie':
        drawPieChart(ctx, canvas);
        break;
      default:
        // 处理未知图表类型
        console.warn(`Unknown chart type: ${options.type}`);
        break;
    }
  }, [options.type, drawLineChart, drawBarChart, drawPieChart]);

  // 确保返回类型正确
  return {
    canvasRef,
    drawChart
  };
};

// 从components导入Canvas组件以避免重复定义
export { Canvas } from '../components/Canvas';

// 为了兼容旧版本，导出默认对象
export default {
  useCanvas
};