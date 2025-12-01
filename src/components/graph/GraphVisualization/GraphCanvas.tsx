/**
 * 图谱画布组件
 * 负责图谱的核心渲染和交互功能
 */
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GraphCanvasProps, EnhancedNode, EnhancedGraphLink } from './types';

/**
 * 图谱画布组件
 * @param props - 组件属性
 */
export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  links,
  isSimulationRunning,
  layoutType,
  layoutDirection,
  selectedNode,
  selectedNodes,
  onNodeClick,
  onNodeDragStart,
  onNodeDragEnd,
  onLinkClick,
  onCanvasClick,
  onCanvasDrop,
  theme,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<EnhancedNode, EnhancedGraphLink> | null>(null);

  // 计算鼠标在SVG坐标系中的位置
  const getMousePosition = (event: React.DragEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    
    const matrix = svg.getScreenCTM()?.inverse();
    if (!matrix) return { x: 0, y: 0 };
    
    const transformedPoint = point.matrixTransform(matrix);
    return { x: transformedPoint.x, y: transformedPoint.y };
  };

  // 处理拖拽进入事件
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  // 处理拖拽放置事件
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const { x, y } = getMousePosition(event);
    onCanvasDrop(event, x, y);
  };

  /**
   * 初始化D3模拟
   */
  useEffect(() => {
    if (!containerRef.current || !nodes.length) {return;}

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 创建或更新SVG
    const svg = d3.select(svgRef.current || containerRef.current)
      .selectAll('svg')
      .data([null])
      .join('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // 创建或更新主组
    const g = svg.selectAll('g')
      .data([null])
      .join('g');

    // 创建缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    // 使用类型断言修复call方法的类型错误
    (svg as unknown as d3.Selection<SVGSVGElement, unknown, null, undefined>).call(zoom as unknown as d3.ZoomBehavior<SVGSVGElement, unknown>);

    // 创建或更新链接，添加动画效果
    const link = g.selectAll<SVGLineElement, EnhancedGraphLink>('.link')
      .data(links, d => d.id)
      .join(
        // 进入动画
        enter => enter.append('line')
          .attr('class', 'link')
          .attr('stroke', theme.link.stroke)
          .attr('stroke-opacity', 0)
          .attr('stroke-width', 0)
          .call(enter => enter.transition()
            .duration(500)
            .attr('stroke-opacity', theme.link.strokeOpacity)
            .attr('stroke-width', theme.link.strokeWidth)
          ),
        // 更新动画
        update => update
          .attr('stroke', theme.link.stroke)
          .attr('stroke-opacity', theme.link.strokeOpacity)
          .attr('stroke-width', theme.link.strokeWidth),
        // 退出动画
        exit => exit.call(exit => exit.transition()
          .duration(300)
          .attr('stroke-opacity', 0)
          .attr('stroke-width', 0)
          .remove()
        )
      )
      .on('click', (event, link) => {
        event.stopPropagation();
        onLinkClick(link);
      });

    // 创建或更新节点组，添加动画效果
    const node = g.selectAll<SVGGElement, EnhancedNode>('.node')
      .data(nodes, d => d.id)
      .join(
        // 进入动画
        enter => enter.append('g')
          .attr('class', 'node')
          .attr('data-node-id', d => d.id)
          .attr('opacity', 0)
          .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
          .call(enter => enter.transition()
            .duration(500)
            .attr('opacity', 1)
          ),
        // 更新动画
        update => update
          .attr('opacity', 1)
          .call(update => update.transition()
            .duration(300)
            .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
          ),
        // 退出动画
        exit => exit.call(exit => exit.transition()
          .duration(300)
          .attr('opacity', 0)
          .remove()
        )
      )
      .call(d3.drag<SVGGElement, EnhancedNode>()
        .on('start', (event, d) => {
          if (!event.active) {simulationRef.current?.alphaTarget(0.3).restart();}
          d.fx = d.x;
          d.fy = d.y;
          onNodeDragStart(d);
          // 拖拽开始时的动画效果
          d3.select(event.currentTarget).transition()
            .duration(200)
            .select('circle')
            .attr('r', theme.node.radius * 1.2)
            .attr('stroke-width', theme.node.strokeWidth * 1.5);
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
          // 拖拽过程中的实时更新
          d3.select(event.currentTarget)
            .attr('transform', `translate(${event.x},${event.y})`);
        })
        .on('end', (event, d) => {
          if (!event.active) {simulationRef.current?.alphaTarget(0);}
          // 保留节点位置
          d.fx = d.x;
          d.fy = d.y;
          onNodeDragEnd(d);
          // 拖拽结束时的恢复动画
          d3.select(event.currentTarget).transition()
            .duration(200)
            .select('circle')
            .attr('r', theme.node.radius)
            .attr('stroke-width', theme.node.strokeWidth);
        }),
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
        // 点击时的动画效果
        d3.select(event.currentTarget).transition()
          .duration(200)
          .select('circle')
          .attr('r', theme.node.radius * 1.1)
          .transition()
          .duration(200)
          .attr('r', theme.node.radius);
      });

    // 创建或更新节点圆圈，添加动画效果
    node.selectAll<SVGCircleElement, EnhancedNode>('circle')
      .data(d => [d])
      .join(
        // 进入动画
        enter => enter.append('circle')
          .attr('r', 0)
          .attr('fill', d => {
            if (selectedNode?.id === d.id || selectedNodes.some(n => n.id === d.id)) {
              return '#3b82f6';
            }
            return theme.node.fill;
          })
          .attr('stroke', theme.node.stroke)
          .attr('stroke-width', theme.node.strokeWidth)
          .call(enter => enter.transition()
            .duration(500)
            .attr('r', theme.node.radius)
          ),
        // 更新动画
        update => update
          .attr('fill', d => {
            if (selectedNode?.id === d.id || selectedNodes.some(n => n.id === d.id)) {
              return '#3b82f6';
            }
            return theme.node.fill;
          })
          .attr('stroke', theme.node.stroke)
          .attr('stroke-width', theme.node.strokeWidth)
          .call(update => update.transition()
            .duration(300)
            .attr('r', theme.node.radius)
          ),
        // 退出动画
        exit => exit.call(exit => exit.transition()
          .duration(300)
          .attr('r', 0)
          .remove()
        )
      );

    // 创建或更新节点文本，添加动画效果
    node.selectAll<SVGTextElement, EnhancedNode>('text')
      .data(d => [d])
      .join(
        // 进入动画
        enter => enter.append('text')
          .text(d => d.title)
          .attr('x', 0)
          .attr('y', 4)
          .attr('text-anchor', 'middle')
          .attr('font-size', 0)
          .attr('fill', theme.node.textFill)
          .attr('pointer-events', 'none')
          .attr('dominant-baseline', 'middle')
          .call(enter => enter.transition()
            .duration(500)
            .attr('font-size', theme.node.fontSize)
          ),
        // 更新动画
        update => update
          .text(d => d.title)
          .attr('fill', theme.node.textFill)
          .call(update => update.transition()
            .duration(300)
            .attr('font-size', theme.node.fontSize)
          ),
        // 退出动画
        exit => exit.call(exit => exit.transition()
          .duration(300)
          .attr('font-size', 0)
          .remove()
        )
      );

    // 根据布局类型应用不同的布局算法
    if (layoutType === 'force') {
      // 力导向布局
      if (!simulationRef.current) {
        simulationRef.current = d3.forceSimulation(nodes)
          .force('link', d3.forceLink(links).id((d: d3.SimulationNodeDatum) => (d as EnhancedNode).id).distance(150))
          .force('charge', d3.forceManyBody().strength(-300))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(30));
      } else {
        simulationRef.current
          .nodes(nodes)
          .force('link', d3.forceLink(links).id((d: d3.SimulationNodeDatum) => (d as EnhancedNode).id).distance(150))
          .force('center', d3.forceCenter(width / 2, height / 2));
      }

      // 更新模拟状态
      if (isSimulationRunning) {
        simulationRef.current.alpha(0.3).restart();
      } else {
        simulationRef.current.stop();
      }

      // 更新节点和链接位置
      simulationRef.current.on('tick', () => {
        link
          .attr('x1', d => (d.source as EnhancedNode).x || 0)
          .attr('y1', d => (d.source as EnhancedNode).y || 0)
          .attr('x2', d => (d.target as EnhancedNode).x || 0)
          .attr('y2', d => (d.target as EnhancedNode).y || 0);

        node
          .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
      });
    } else {
      // 停止力导向模拟
      simulationRef.current?.stop();
      
      // 应用其他布局算法
      let layoutNodes = [...nodes];
      
      if (layoutType === 'hierarchical') {
        // 层次化布局
        const treeLayout = d3.tree<EnhancedNode>()
          .size(layoutDirection === 'top-bottom' ? [height - 100, width - 100] : [width - 100, height - 100])
          .separation(() => 1);
        
        // 构建层次数据结构
        // 创建节点映射
        const nodeMap = new Map(layoutNodes.map(n => [n.id, n]));
        
        // 创建父-子映射
        const parentChildMap = new Map<string, EnhancedNode[]>();
        
        // 初始化父-子映射
        layoutNodes.forEach(node => {
          parentChildMap.set(node.id, []);
        });
        
        // 根据链接构建父-子关系
        links.forEach(link => {
          const sourceId = (link.source as EnhancedNode).id;
          const targetId = (link.target as EnhancedNode).id;
          
          // 将target作为source的子节点
          const children = parentChildMap.get(sourceId) || [];
          const targetNode = nodeMap.get(targetId);
          if (targetNode) {
            children.push(targetNode);
            parentChildMap.set(sourceId, children);
          }
        });
        
        // 创建层次结构
        const root = d3.hierarchy(layoutNodes[0] || { id: 'root', title: 'Root', connections: 0 } as EnhancedNode, (d) => {
          return parentChildMap.get(d.id) || [];
        });
        
        // 计算布局
        treeLayout(root);
        
        // 更新节点位置
        root.each((d) => {
          const node = layoutNodes.find(n => n.id === d.data.id);
          if (node) {
            if (layoutDirection === 'top-bottom') {
              node.x = (d.y || 0) + 50;
              node.y = (d.x || 0) + 50;
            } else {
              node.x = (d.x || 0) + 50;
              node.y = (d.y || 0) + 50;
            }
          }
        });
      } else if (layoutType === 'circular') {
        // 圆形布局
        const radius = Math.min(width, height) / 2 - 50;
        const angleStep = (2 * Math.PI) / layoutNodes.length;
        
        layoutNodes.forEach((node, i) => {
          node.x = width / 2 + radius * Math.cos(i * angleStep);
          node.y = height / 2 + radius * Math.sin(i * angleStep);
        });
      } else if (layoutType === 'grid') {
        // 网格布局
        const columns = Math.ceil(Math.sqrt(layoutNodes.length));
        const cellSize = Math.min((width - 100) / columns, 100);
        
        layoutNodes.forEach((node, i) => {
          const row = Math.floor(i / columns);
          const col = i % columns;
          node.x = col * cellSize + 50;
          node.y = row * cellSize + 50;
        });
      }
      
      // 更新节点和链接位置
      link
        .attr('x1', d => (d.source as EnhancedNode).x || 0)
        .attr('y1', d => (d.source as EnhancedNode).y || 0)
        .attr('x2', d => (d.target as EnhancedNode).x || 0)
        .attr('y2', d => (d.target as EnhancedNode).y || 0);

      node
        .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    }

    // 处理窗口大小变化
    const handleResize = () => {
      if (!containerRef.current) {return;}
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      svg
        .attr('width', newWidth)
        .attr('height', newHeight)
        .attr('viewBox', `0 0 ${newWidth} ${newHeight}`);

      if (simulationRef.current) {
        simulationRef.current.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      simulationRef.current?.stop();
    };
  }, [nodes, links, isSimulationRunning, layoutType, layoutDirection, selectedNode, selectedNodes, onNodeClick, onNodeDragStart, onNodeDragEnd, onLinkClick, theme.node.fill, theme.node.stroke, theme.node.strokeWidth, theme.node.radius, theme.node.fontSize, theme.node.textFill, theme.link.stroke, theme.link.strokeWidth, theme.link.strokeOpacity, theme.backgroundColor]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ backgroundColor: theme.backgroundColor }}
      onClick={onCanvasClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};
