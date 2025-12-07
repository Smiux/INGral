import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import * as d3Sankey from 'd3-sankey';
import styles from './SankeyChart.module.css';

// 桑基图节点类型
interface SankeyNode {
  id: string;
  name: string;
}

// 桑基图链接类型
interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

// 桑基图数据类型
interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// 桑基图配置类型
interface SankeyConfig {
  nodeWidth?: number;
  nodePadding?: number;
  colorScheme?: string[];
  showLabels?: boolean;
  showValues?: boolean;
  showTooltip?: boolean;
}

// D3桑基图生成的节点类型
interface D3SankeyNode {
  id: string;
  name: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  index: number;
  links: D3SankeyLink[];
}

// D3桑基图生成的链接类型
interface D3SankeyLink {
  source: D3SankeyNode | string;
  target: D3SankeyNode | string;
  value: number;
  width: number;
  index: number;
}

// D3桑基图结果类型
interface D3SankeyResult {
  nodes: D3SankeyNode[];
  links: D3SankeyLink[];
}

interface SankeyChartProps {
  data: SankeyData;
  height?: number;
  config?: SankeyConfig;
  className?: string;
  onNodeClick?: (node: SankeyNode) => void;
  onLinkClick?: (link: SankeyLink) => void;
}

const SankeyChartComponent: React.FC<SankeyChartProps> = ({
  data,
  height = 500,
  config = {},
  className = '',
  onNodeClick,
  onLinkClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.nodes.length === 0 || data.links.length === 0) return;

    // 清空容器
    containerRef.current.innerHTML = '';

    const {
      nodeWidth = 20,
      nodePadding = 10,
      colorScheme = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
      showLabels = true,
      showValues = true,
      showTooltip = true,
    } = config;

    // 设置尺寸
    const width = containerRef.current.clientWidth || 800;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 创建SVG
    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建桑基图生成器
    const sankey = d3Sankey.sankey<D3SankeyNode, D3SankeyLink>()
      .nodeId((d: D3SankeyNode) => d.id)
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 6]]);

    // 转换数据
    const sankeyData = sankey({
      nodes: data.nodes as unknown as D3SankeyNode[],
      links: data.links as unknown as D3SankeyLink[],
    }) as unknown as D3SankeyResult;

    // 创建颜色比例尺
    const colorScale = d3.scaleOrdinal<string>()
      .domain(data.nodes.map(d => d.name))
      .range(colorScheme);

    // 创建链接路径生成器
    const linkPath = d3Sankey.sankeyLinkHorizontal();

    // 存储tooltip引用
    const tooltipRef = { tooltip: null as d3.Selection<HTMLDivElement, unknown, null, undefined> | null };

    // 添加链接
    svg.append('g')
      .selectAll('.sankey-link')
      .data(sankeyData.links)
      .join('path')
      .attr('class', `${styles.sankeyLink}`)
      .attr('d', linkPath)
      .attr('stroke', (d: D3SankeyLink) => {
        // 根据链接源节点颜色确定链接颜色
        const sourceNode = sankeyData.nodes.find(n => n.id === (typeof d.source === 'string' ? d.source : d.source.id));
        return sourceNode ? colorScale(sourceNode.name) : '#ccc';
      })
      .attr('stroke-width', (d: D3SankeyLink) => Math.max(1, d.width))
      .attr('fill', 'none')
      .style('cursor', onLinkClick ? 'pointer' : 'default')
      .on('mouseover', function(event, d: D3SankeyLink) {
        // 添加悬停效果
        d3.select(this)
          .attr('stroke-opacity', 0.8)
          .style('stroke-width', Math.max(2, (d.width || 0) + 1));
        
        if (showTooltip) {
          // 创建工具提示
          const link = data.links.find(l => 
            l.source === (typeof d.source === 'string' ? d.source : d.source.id) &&
            l.target === (typeof d.target === 'string' ? d.target : d.target.id)
          );
          
          if (link) {
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
              .html(`<strong>${link.source} → ${link.target}</strong><br/>Value: ${link.value}`);
          }
        }
      })
      .on('mouseout', function() {
        // 恢复原始样式
        d3.select(this)
          .attr('stroke-opacity', 0.5)
          .style('stroke-width', function(d: unknown) {
            const sankeyLink = d as D3SankeyLink;
            return Math.max(1, sankeyLink.width || 0);
          });
        
        // 移除工具提示
        if (tooltipRef.tooltip) {
          tooltipRef.tooltip.remove();
          tooltipRef.tooltip = null;
        }
      })
      .on('click', function(_event: Event, d: D3SankeyLink) {
        if (onLinkClick) {
          const link = data.links.find(l => 
            l.source === (typeof d.source === 'string' ? d.source : d.source.id) &&
            l.target === (typeof d.target === 'string' ? d.target : d.target.id)
          );
          if (link) {
            onLinkClick(link);
          }
        }
      });

    // 添加节点组
    const nodes = svg.append('g')
      .selectAll('.sankey-node')
      .data(sankeyData.nodes)
      .join('g')
      .attr('class', `${styles.sankeyNode}`)
      .attr('transform', (d: D3SankeyNode) => `translate(${d.x0},${d.y0})`)
      .style('cursor', onNodeClick ? 'pointer' : 'default');

    // 添加节点矩形
    nodes.append('rect')
      .attr('height', (d: D3SankeyNode) => d.y1 - d.y0)
      .attr('width', (d: D3SankeyNode) => d.x1 - d.x0)
      .attr('fill', (d: D3SankeyNode) => colorScale(d.name))
      .attr('stroke', '#000')
      .attr('stroke-width', 1)
      .on('click', function(_event: Event, d: D3SankeyNode) {
        if (onNodeClick) {
          const node = data.nodes.find(n => n.id === d.id);
          if (node) {
            onNodeClick(node);
          }
        }
      })
      .on('mouseover', function(event, d: D3SankeyNode) {
        // 添加悬停效果
        d3.select(this)
          .attr('opacity', 0.8);
        
        if (showTooltip) {
          // 创建工具提示
          const node = data.nodes.find(n => n.id === d.id);
          if (node) {
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
              .html(`<strong>${node.name}</strong>`);
          }
        }
      })
      .on('mouseout', function() {
        // 恢复原始样式
        d3.select(this)
          .attr('opacity', 1);
        
        // 移除工具提示
        if (tooltipRef.tooltip) {
          tooltipRef.tooltip.remove();
          tooltipRef.tooltip = null;
        }
      });

    // 添加节点标签
    if (showLabels) {
      nodes.append('text')
        .attr('x', (d: D3SankeyNode) => (d.x1 < innerWidth / 2 ? d.x1 + 6 : d.x0 - 6))
        .attr('y', (d: D3SankeyNode) => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d: D3SankeyNode) => (d.x1 < innerWidth / 2 ? 'start' : 'end'))
        .attr('font-size', '12px')
        .attr('fill', 'var(--text-primary)')
        .text((d: D3SankeyNode) => d.name)
        .style('pointer-events', 'none')
        .call((text: d3.Selection<SVGTextElement, D3SankeyNode, SVGElement, unknown>) => {
          text.filter((d: D3SankeyNode) => (d.x1 - d.x0) < 100 || (d.y1 - d.y0) < 20).remove();
        });
    }

    // 添加链接数值标签
    if (showValues) {
      svg.append('g')
        .selectAll('.sankey-link-label')
        .data(sankeyData.links)
        .join('text')
        .attr('class', styles.sankeyLinkLabel as string)
        .attr('x', (d: D3SankeyLink) => {
          // 计算文本x位置
          const sourceX = typeof d.source === 'string' ? 0 : d.source.x1;
          const targetX = typeof d.target === 'string' ? 0 : d.target.x0;
          return sourceX + (targetX - sourceX) / 2;
        })
        .attr('y', (d: D3SankeyLink) => {
          // 计算文本y位置
          const sourceY = typeof d.source === 'string' ? 0 : (d.source.y0 + d.source.y1) / 2;
          const targetY = typeof d.target === 'string' ? 0 : (d.target.y0 + d.target.y1) / 2;
          return (sourceY + targetY) / 2;
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', 'var(--text-primary)')
        .attr('pointer-events', 'none')
        .text((d: D3SankeyLink) => Math.round(d.value))
        .call((text) => {
          text.filter((d: D3SankeyLink) => (d.width || 0) < 10).remove();
        });
    }

  }, [data, height, config, onNodeClick, onLinkClick]);

  return (
    <div
      className={`${styles.container} ${className}`}
      ref={containerRef}
      style={{ height: `${height}px` }}
    />
  );
};

// 只导出组件，避免react-refresh警告
export const SankeyChart = SankeyChartComponent;
export default SankeyChartComponent;
