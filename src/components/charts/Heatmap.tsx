import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import styles from './Heatmap.module.css';

// 热力图数据类型
interface HeatmapData {
  x: string;
  y: string;
  value: number;
}

// 热力图配置类型
interface HeatmapConfig {
  xLabel?: string;
  yLabel?: string;
  colorScheme?: string[];
  showLegend?: boolean;
  cellSize?: number;
  spacing?: number;
}

interface HeatmapProps {
  data: HeatmapData[];
  height?: number;
  config?: HeatmapConfig;
  className?: string;
}

const HeatmapComponent: React.FC<HeatmapProps> = ({
  data,
  height = 400,
  config = {},
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // 清空容器
    containerRef.current.innerHTML = '';

    const {
      xLabel = 'X Axis',
      yLabel = 'Y Axis',
      colorScheme = ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
      showLegend = true,
      cellSize = 30,
      spacing = 2,
    } = config;

    // 提取唯一的x和y值
    const xValues = [...new Set(data.map(d => d.x))].sort();
    const yValues = [...new Set(data.map(d => d.y))].sort();

    // 创建颜色比例尺
    const valueExtent = d3.extent(data, d => d.value) as [number, number];
    const colorScale = d3.scaleSequential<number>()
      .domain(valueExtent)
      .interpolator(d3.interpolateRgbBasis(colorScheme));

    // 设置尺寸
    const width = containerRef.current.clientWidth || 600;
    const margin = { top: 50, right: showLegend ? 100 : 50, bottom: 100, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 创建SVG
    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建x比例尺
    const xScale = d3.scaleBand<string>()
      .domain(xValues)
      .range([0, innerWidth])
      .paddingInner(spacing / cellSize);

    // 创建y比例尺
    const yScale = d3.scaleBand<string>()
      .domain(yValues)
      .range([0, innerHeight])
      .paddingInner(spacing / cellSize);

    // 创建x轴
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    // 添加x轴标签
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 20)
      .attr('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .text(xLabel);

    // 创建y轴
    svg.append('g')
      .call(d3.axisLeft(yScale));

    // 添加y轴标签
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -margin.left + 20)
      .attr('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .text(yLabel);

    // 存储tooltip引用
    const tooltipRef = { tooltip: null as d3.Selection<HTMLDivElement, unknown, null, undefined> | null };

    // 创建热力图单元格
    svg.selectAll('.heatmap-cell')
      .data(data)
      .join('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', d => xScale(d.x) as number)
      .attr('y', d => yScale(d.y) as number)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.value))
      .attr('stroke', '#fff')
      .attr('stroke-width', spacing)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        // 添加悬停效果
        d3.select(this)
          .style('opacity', 0.8)
          .style('stroke', '#000')
          .style('stroke-width', 2);
        
        // 创建工具提示
        tooltipRef.tooltip = d3.select(containerRef.current)
          .append('div')
          .attr('class', styles.tooltip as string)
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 30}px`)
          .html(`<strong>${d.x} × ${d.y}</strong><br/>Value: ${d.value}`);
      })
      .on('mouseout', function() {
        // 恢复原始样式
        d3.select(this)
          .style('opacity', 1)
          .style('stroke', '#fff')
          .style('stroke-width', spacing);
        
        // 移除工具提示
        if (tooltipRef.tooltip) {
          tooltipRef.tooltip.remove();
          tooltipRef.tooltip = null;
        }
      });

    // 添加图例
    if (showLegend) {
      const legendWidth = 20;
      
      const legend = svg.append('g')
        .attr('transform', `translate(${innerWidth + 50}, 0)`);
      
      // 添加颜色条
      const legendScale = d3.scaleLinear()
        .domain(valueExtent)
        .range([0, innerHeight]);
      
      const legendAxis = d3.axisRight(legendScale)
        .ticks(5);
      
      const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'heatmap-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
      
      colorScheme.forEach((color, i) => {
        gradient.append('stop')
          .attr('offset', `${(i / (colorScheme.length - 1)) * 100}%`)
          .attr('stop-color', color);
      });
      
      legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', legendWidth)
        .attr('height', innerHeight)
        .style('fill', 'url(#heatmap-gradient)')
        .style('stroke', '#000')
        .style('stroke-width', 1);
      
      legend.append('g')
        .attr('transform', `translate(${legendWidth + 5}, 0)`)
        .call(legendAxis);
      
      // 添加图例标题
      legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text('Value');
    }

  }, [data, height, config]);

  return (
    <div
      className={`${styles.container} ${className}`}
      ref={containerRef}
      style={{ height: `${height}px` }}
    />
  );
};

// 只导出组件，避免react-refresh警告
export const Heatmap = HeatmapComponent;
export default HeatmapComponent;
