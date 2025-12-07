/**
 * 图谱画布组件
 * 负责图谱的核心渲染和交互功能
 */
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GraphCanvasProps, EnhancedNode, EnhancedGraphLink } from './types';
import { NodeAggregationUtils } from '../../../utils/graphPerformanceUtils';



// 定义Worker响应类型
type WorkerResponse = {
  type: 'tick' | 'end';
  payload?: {
    nodes: Array<{ id: string; x: number; y: number }>;
    links: Array<{ id: string; source: string | { id: string }; target: string | { id: string } }>;
    alpha: number;
  };
};

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
  nodeSpacing = 50,
  levelSpacing = 100,
  forceParameters,
  selectedNode,
  selectedNodes,
  onNodeClick,
  onNodeDragStart,
  onNodeDragEnd,
  onLinkClick,
  onCanvasClick,
  onCanvasDrop,
  onBoxSelectStart,
  onBoxSelectUpdate,
  onBoxSelectEnd,
  isBoxSelecting,
  boxSelection,
  theme,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<EnhancedNode, EnhancedGraphLink> | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const nodeRefs = useRef<Map<string, EnhancedNode>>(new Map());
  const linkRefs = useRef<Map<string, EnhancedGraphLink>>(new Map());
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

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

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      // 停止并关闭Worker
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

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

  // 处理鼠标按下事件，开始框选
  const handleMouseDown = (event: React.MouseEvent) => {
    // 只有在空白区域点击才开始框选
    if (event.target === event.currentTarget) {
      const { x, y } = getMousePosition(event as unknown as React.DragEvent);
      onBoxSelectStart(x, y);
    }
  };

  // 处理鼠标移动事件，更新框选区域
  const handleMouseMove = (event: React.MouseEvent) => {
    const { x, y } = getMousePosition(event as unknown as React.DragEvent);
    onBoxSelectUpdate(x, y);
  };

  // 处理鼠标释放事件，结束框选
  const handleMouseUp = () => {
    onBoxSelectEnd();
  };

  // 处理鼠标离开事件，结束框选
  const handleMouseLeave = () => {
    onBoxSelectEnd();
  };

  // 初始化D3模拟和渲染
  useEffect(() => {
    if (!containerRef.current || !nodes.length) {
      return;
    }

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // 检查是否需要聚合节点（当节点数量超过一定阈值时）
    const shouldAggregate = nodes.length > 50;
    
    // 执行节点聚合
    const {
      nodes: layoutNodes,
      links: layoutLinks,
      aggregated
    } = shouldAggregate
      ? NodeAggregationUtils.aggregateNodes(nodes, links, 30, 3)
      : { nodes, links, aggregated: false };
    
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

    // 保存g引用，用于后续更新
    gRef.current = g as unknown as d3.Selection<SVGGElement, unknown, null, undefined>;

    // 创建缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    // 应用缩放行为，添加正确的类型断言
    svg.call(zoom as unknown as (selection: d3.Selection<SVGSVGElement | d3.BaseType, null, SVGSVGElement | HTMLDivElement, unknown>) => void);

    // 清除旧的节点和链接
    g.selectAll('.node').remove();
    g.selectAll('.link').remove();
    g.selectAll('.box-selection').remove();

    // 暂时不使用虚拟渲染，直接使用所有节点和链接
    const visibleNodes = layoutNodes;
    const visibleLinks = layoutLinks;

    // 创建链接
    const link = g.selectAll<SVGLineElement, EnhancedGraphLink>('.link')
      .data(visibleLinks)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', theme.link.stroke)
      .attr('stroke-width', theme.link.strokeWidth)
      .attr('stroke-opacity', theme.link.strokeOpacity)
      .style('pointer-events', 'stroke')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onLinkClick(d);
      });

    // 创建节点
    const node = g.selectAll<SVGGElement, EnhancedNode>('.node')
      .data(visibleNodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d, event as React.MouseEvent);
      })
      .call(d3.drag<SVGGElement, EnhancedNode>()
        .on('start', (event, d) => {
          onNodeDragStart(d);
          if (!event.active && simulationRef.current) {
            simulationRef.current.alphaTarget(0.3).restart();
          }
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
          if (simulationRef.current) {
            simulationRef.current.alpha(0.3);
          }
        })
        .on('end', (event, d) => {
          onNodeDragEnd(d);
          if (!event.active && simulationRef.current) {
            simulationRef.current.alphaTarget(0);
          }
          d.fx = null;
          d.fy = null;
        })
      );

    // 添加节点圆
    node.append('circle')
      .attr('r', theme.node.radius)
      .attr('fill', (d) => {
        if (selectedNode?.id === d.id || selectedNodes?.some(node => node.id === d.id)) {
          return '#FF6B6B';
        }
        return theme.node.fill;
      })
      .attr('stroke', (d) => {
        if (selectedNode?.id === d.id || selectedNodes?.some(node => node.id === d.id)) {
          return '#FF5252';
        }
        return theme.node.stroke;
      })
      .attr('stroke-width', (d) => {
        if (selectedNode?.id === d.id || selectedNodes?.some(node => node.id === d.id)) {
          return 3;
        }
        return theme.node.strokeWidth;
      });

    // 添加节点文本
    node.append('text')
      .text((d) => d.title || d.id)
      .attr('x', 0)
      .attr('y', theme.node.radius + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', theme.node.fontSize)
      .attr('fill', theme.node.textFill)
      .attr('pointer-events', 'none')
      .style('user-select', 'none');

    // 为聚合节点添加展开/折叠指示器
    node.filter((d) => {
      return !!d._isAggregated && !!d._aggregatedNodes && d._aggregatedNodes.length > 0;
    })
      .append('path')
      .attr('d', 'M -15 -5 L -5 -5 L -10 5 Z')
      .attr('fill', theme.node.textFill)
      .attr('transform', (d) => `translate(${-theme.node.radius - 10}, ${-theme.node.radius - 10}) rotate(${d.isExpanded ? 0 : 90})`)
      .style('pointer-events', 'all')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        // 切换展开状态
        d.isExpanded = !d.isExpanded;
        // 触发重绘或更新
        onNodeClick(d, event as React.MouseEvent);
      });

    // 为聚合节点添加特殊样式
    node.filter((d) => {
      return !!d._isAggregated;
    })
      .select('circle')
      .attr('stroke-width', theme.node.strokeWidth * 2)
      .attr('fill', `${theme.node.fill}80`);

    // 根据布局类型应用不同的布局算法
    if (layoutType === 'force') {
      // 力导向布局 - 优化：根据节点数量动态调整参数和算法
      const isLargeGraph = layoutNodes.length > 100;
      const isVeryLargeGraph = layoutNodes.length > 500;
      
      // 初始化或更新Worker
      if (!workerRef.current) {
        // 创建Worker实例
        workerRef.current = new Worker(new URL('../../../workers/ForceLayoutWorker.ts', import.meta.url), {
          type: 'module'
        });
        
        // 处理Worker消息
        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { type, payload } = event.data;
          
          if (!payload) return;
          
          if (type === 'tick') {
            // 更新节点和链接位置
            payload.nodes.forEach(updatedNode => {
              const node = nodeRefs.current.get(updatedNode.id);
              if (node) {
                node.x = updatedNode.x;
                node.y = updatedNode.y;
              }
            });
            
            // 更新节点和链接的可视化
            const currentG = gRef.current;
            if (currentG) {
              currentG.selectAll<SVGLineElement, EnhancedGraphLink>('.link')
                .attr('x1', d => (d.source as EnhancedNode).x || 0)
                .attr('y1', d => (d.source as EnhancedNode).y || 0)
                .attr('x2', d => (d.target as EnhancedNode).x || 0)
                .attr('y2', d => (d.target as EnhancedNode).y || 0);
            
              currentG.selectAll<SVGGElement, EnhancedNode>('.node')
                .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);
            }
          } else if (type === 'end') {
            // 模拟结束
            if (simulationRef.current) {
              simulationRef.current.alpha(0);
            }
          }
        };
      }
      
      // 向Worker发送初始化或更新消息
      workerRef.current.postMessage({
        type: 'init',
        payload: {
          nodes: layoutNodes.map(n => ({
            id: n.id,
            x: n.x,
            y: n.y,
            fx: n.fx,
            fy: n.fy,
            type: n.type,
            connections: n.connections || 0
          })),
          links: layoutLinks.map(l => ({
            id: l.id,
            source: typeof l.source === 'string' || typeof l.source === 'number' ? l.source : (l.source as EnhancedNode).id,
            target: typeof l.target === 'string' || typeof l.target === 'number' ? l.target : (l.target as EnhancedNode).id,
            type: l.type
          })),
          width,
          height,
          forceParameters,
          isLargeGraph,
          isVeryLargeGraph
        }
      });
    } else if (layoutType === 'tree') {
      // 树形布局
      const root = d3.hierarchy(layoutNodes[0] as EnhancedNode, (d) => {
        return layoutLinks
          .filter(l => {
            const sourceId = typeof l.source === 'string' || typeof l.source === 'number' ? l.source : (l.source as EnhancedNode).id;
            return sourceId === d.id;
          })
          .map(l => {
            const targetId = typeof l.target === 'string' || typeof l.target === 'number' ? l.target : (l.target as EnhancedNode).id;
            return layoutNodes.find(n => n.id === targetId);
          })
          .filter((n): n is EnhancedNode => n !== undefined);
      });

      // 应用树形布局
      const treeLayout = d3.tree<EnhancedNode>()
        .size([width - 100, height - 100]);

      treeLayout(root);

      // 更新节点位置
      root.each((d) => {
        const node = layoutNodes.find(n => n.id === d.data.id);
        if (node && d.x !== undefined && d.y !== undefined) {
          node.x = d.x + 50;
          node.y = d.y + 50;
        }
      });
    } else if (layoutType === 'hierarchical') {
      // 分层布局 - 基于节点属性的分层
      
      // 支持多种分层属性
      const hierarchyAttribute = 'type'; // 可配置为其他属性，如重要性、连接数等
      
      // 根据节点属性分组
      const nodesByLevel = new Map<string, EnhancedNode[]>();
      
      // 按指定属性分组节点
      layoutNodes.forEach(node => {
        const levelKey = node[hierarchyAttribute as keyof EnhancedNode]?.toString() || 'default';
        if (!nodesByLevel.has(levelKey)) {
          nodesByLevel.set(levelKey, []);
        }
        nodesByLevel.get(levelKey)?.push(node);
      });
      
      // 将分组转换为数组，并支持自定义排序
      const levelGroups = Array.from(nodesByLevel.entries())
        // 按层级键排序
        .sort(([a], [b]) => a.localeCompare(b))
        // 对每层内的节点按连接数排序，连接数多的节点排在前面
        .map(([key, nodes]) => [key, nodes.sort((a, b) => (b.connections || 0) - (a.connections || 0))]) as Array<[string, EnhancedNode[]]>;

      // 计算每层节点的位置
      const verticalPadding = levelSpacing;
      let currentY = verticalPadding;
      
      levelGroups.forEach(([, currentLevelNodes]) => {
        // 确保currentLevelNodes是EnhancedNode[]类型
        if (Array.isArray(currentLevelNodes)) {
          // 计算该层节点的总宽度
          const levelWidth = (currentLevelNodes.length - 1) * nodeSpacing;
          // 计算起始X坐标，使层居中
          let currentX = width / 2 - levelWidth / 2;
          
          // 设置节点位置
          currentLevelNodes.forEach(node => {
            node.x = currentX;
            node.y = currentY;
            currentX += nodeSpacing;
          });
          
          // 移动到下一层
          currentY += verticalPadding;
        }
      });
    } else if (layoutType === 'radial') {
      // 径向布局
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 3;
      
      // 按连接数排序节点，连接数多的节点靠近中心
      const sortedNodes = [...layoutNodes].sort((a, b) => (b.connections || 0) - (a.connections || 0));
      
      // 分配角度
      sortedNodes.forEach((node, index) => {
        const angle = (index / sortedNodes.length) * 2 * Math.PI;
        const nodeRadius = radius * Math.sqrt(index / sortedNodes.length); // 基于索引的径向距离
        
        node.x = centerX + nodeRadius * Math.cos(angle);
        node.y = centerY + nodeRadius * Math.sin(angle);
      });
    }

    // 更新节点和链接位置
    node.transition()
      .duration(500)
      .ease(d3.easeQuadInOut)
      .attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`);
    
    link.transition()
      .duration(500)
      .ease(d3.easeQuadInOut)
      .attr('x1', (d) => (d.source as EnhancedNode).x || 0)
      .attr('y1', (d) => (d.source as EnhancedNode).y || 0)
      .attr('x2', (d) => (d.target as EnhancedNode).x || 0)
      .attr('y2', (d) => (d.target as EnhancedNode).y || 0);

    // 添加展开/折叠指示器（如果节点被聚合）
    if (aggregated) {
      node.append('path')
        .attr('d', 'M -15 -5 L -5 -5 L -10 5 Z')
        .attr('fill', theme.node.textFill)
        .attr('transform', 'translate(0, 0) rotate(0)')
        .style('pointer-events', 'all')
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          // 处理节点展开/折叠逻辑
          console.log('Toggle node:', d.id);
        });
    }

    // 保存节点和链接引用，用于后续更新
    nodes.forEach(n => nodeRefs.current.set(n.id, n));
    links.forEach(l => linkRefs.current.set(l.id, l));

    // 处理窗口大小变化
    const handleResize = () => {
      if (!containerRef.current) { return; }
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

    // 保存当前模拟引用用于清理
    const currentSimulation = simulationRef.current;

    return () => {
      window.removeEventListener('resize', handleResize);
      currentSimulation?.stop();
    };
  }, [nodes, links, isSimulationRunning, layoutType, layoutDirection, nodeSpacing, levelSpacing, forceParameters, selectedNode, selectedNodes, onNodeClick, onNodeDragStart, onNodeDragEnd, onLinkClick, theme.node.fill, theme.node.stroke, theme.node.strokeWidth, theme.node.radius, theme.node.fontSize, theme.node.textFill, theme.link.stroke, theme.link.strokeWidth, theme.link.strokeOpacity, theme.backgroundColor]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ backgroundColor: theme.backgroundColor }}
      onClick={onCanvasClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      tabIndex={0}
      role="application"
      aria-label="知识图谱可视化"
      aria-describedby="graph-description"
    >
      {/* 图谱描述，供屏幕阅读器使用 */}
      <div id="graph-description" className="sr-only">
        这是一个交互式知识图谱可视化，包含 {nodes.length} 个节点和 {links.length} 个链接。
        您可以使用鼠标拖拽节点来重新排列它们，使用鼠标滚轮来缩放视图，按住鼠标左键拖动来平移视图。
        点击节点可以查看详细信息，点击链接可以查看链接属性。
      </div>
      <svg ref={svgRef} id="knowledge-graph-svg" className="w-full h-full" aria-labelledby="graph-description" role="img" aria-describedby="graph-stats">
        {/* 图谱统计信息，供屏幕阅读器使用 */}
        <title>知识图谱</title>
        <desc aria-live="polite" id="graph-stats">
          共 {nodes.length} 个节点，{links.length} 个链接。
        </desc>
      </svg>
      
      {/* 框选区域 */}
      {isBoxSelecting && boxSelection && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20 pointer-events-none"
          style={{
            left: Math.min(boxSelection.x1, boxSelection.x2),
            top: Math.min(boxSelection.y1, boxSelection.y2),
            width: Math.abs(boxSelection.x2 - boxSelection.x1),
            height: Math.abs(boxSelection.y2 - boxSelection.y1)
          }}
          aria-label="框选区域"
        />
      )}
    </div>
  );
};
