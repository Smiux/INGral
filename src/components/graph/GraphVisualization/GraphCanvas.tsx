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
// 自定义比较函数，用于React.memo
const areEqual = (prevProps: GraphCanvasProps, nextProps: GraphCanvasProps) => {
  // 比较节点数量和链接数量
  if (prevProps.nodes.length !== nextProps.nodes.length ||
      prevProps.links.length !== nextProps.links.length) {
    return false;
  }
  
  // 比较选中节点
  if (prevProps.selectedNode?.id !== nextProps.selectedNode?.id ||
      prevProps.selectedNodes.length !== nextProps.selectedNodes.length) {
    return false;
  }
  
  // 比较布局类型和方向
  if (prevProps.layoutType !== nextProps.layoutType ||
      prevProps.layoutDirection !== nextProps.layoutDirection) {
    return false;
  }
  
  // 比较节点和链接间距
  if (prevProps.nodeSpacing !== nextProps.nodeSpacing ||
      prevProps.levelSpacing !== nextProps.levelSpacing) {
    return false;
  }
  
  // 比较框选状态
  if (prevProps.isBoxSelecting !== nextProps.isBoxSelecting) {
    return false;
  }
  
  // 比较主题颜色
  if (prevProps.theme.node.fill !== nextProps.theme.node.fill ||
      prevProps.theme.node.stroke !== nextProps.theme.node.stroke ||
      prevProps.theme.link.stroke !== nextProps.theme.link.stroke) {
    return false;
  }
  
  // 其他props变化较少，可以跳过比较
  return true;
};

export const GraphCanvas: React.FC<GraphCanvasProps> = React.memo(({
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
    // 保存当前引用到变量，避免在清理时引用已经改变的ref值
    const currentWorker = workerRef.current;
    const currentSimulation = simulationRef.current;
    const currentNodeRefs = nodeRefs.current;
    const currentLinkRefs = linkRefs.current;
    
    return () => {
      // 停止并关闭Worker
      if (currentWorker) {
        currentWorker.postMessage({ type: 'stop' });
        currentWorker.terminate();
        workerRef.current = null;
      }
      
      // 清理simulationRef
      if (currentSimulation) {
        currentSimulation.stop();
        simulationRef.current = null;
      }
      
      // 清理gRef
      gRef.current = null;
      
      // 清理nodeRefs和linkRefs
      currentNodeRefs.clear();
      currentLinkRefs.clear();
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
      links: layoutLinks
    } = shouldAggregate
      ? NodeAggregationUtils.aggregateNodes(nodes, links, 30, 3)
      : { nodes, links };
    
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

    // 保存当前缩放变换
    const zoomTransform = { k: 1, x: 0, y: 0 };
    
    // 创建缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        // 更新缩放变换
        zoomTransform.k = event.transform.k;
        zoomTransform.x = event.transform.x;
        zoomTransform.y = event.transform.y;
        
        g.attr('transform', event.transform);
        
        // 动态更新可见节点
        updateVisibleElements(zoomTransform, width, height, layoutNodes, layoutLinks, g, theme);
      });

    // 应用缩放行为，添加正确的类型断言
    svg.call(zoom as unknown as (selection: d3.Selection<SVGSVGElement | d3.BaseType, null, SVGSVGElement | HTMLDivElement, unknown>) => void);

    // 清除旧的节点和链接
    g.selectAll('.node').remove();
    g.selectAll('.link').remove();
    g.selectAll('.box-selection').remove();
    
    // 初始渲染
    updateVisibleElements(zoomTransform, width, height, layoutNodes, layoutLinks, g, theme);
    
    // 动态更新可见元素的函数
    function updateVisibleElements(transform: { k: number; x: number; y: number }, svgWidth: number, svgHeight: number, allNodes: EnhancedNode[], allLinks: EnhancedGraphLink[], g: d3.Selection<SVGGElement | d3.BaseType, null, SVGSVGElement | d3.BaseType, null>, theme: GraphCanvasProps['theme']) {
      // 计算可见区域的边界（考虑缩放和平移变换）
      const visibleRect = {
        x1: -transform.x / transform.k,
        y1: -transform.y / transform.k,
        x2: (svgWidth - transform.x) / transform.k,
        y2: (svgHeight - transform.y) / transform.k
      };
      
      // 过滤可见节点（仅在可见区域内或附近的节点）
      const nodeMargin = 50; // 边距，提前渲染可见区域外一定范围的节点
      const filteredNodes = allNodes.filter(node => {
        if (node.x === undefined || node.y === undefined) return true;
        return node.x >= visibleRect.x1 - nodeMargin &&
               node.x <= visibleRect.x2 + nodeMargin &&
               node.y >= visibleRect.y1 - nodeMargin &&
               node.y <= visibleRect.y2 + nodeMargin;
      });
      
      // 过滤可见链接（至少有一个端点在可见区域内）
      const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredLinks = allLinks.filter(link => {
        const sourceId = typeof link.source === 'string' || typeof link.source === 'number' 
          ? String(link.source) 
          : (link.source as EnhancedNode).id;
        const targetId = typeof link.target === 'string' || typeof link.target === 'number' 
          ? String(link.target) 
          : (link.target as EnhancedNode).id;
        
        return visibleNodeIds.has(sourceId) || visibleNodeIds.has(targetId);
      });
      
      // 更新链接
      const link = g.selectAll<SVGLineElement, EnhancedGraphLink>('.link')
        .data(filteredLinks, d => {
          // 使用source-target-type作为链接的唯一标识
          const sourceId = typeof d.source === 'string' || typeof d.source === 'number' ? d.source : (d.source as EnhancedNode).id;
          const targetId = typeof d.target === 'string' || typeof d.target === 'number' ? d.target : (d.target as EnhancedNode).id;
          return `${sourceId}-${targetId}-${d.type}`;
        });
      
      // 移除旧链接
      link.exit().remove();
      
      // 添加新链接
      link.enter()
        .append('line')
        .attr('class', 'link')
        .attr('stroke', theme.link.stroke)
        .attr('stroke-width', theme.link.strokeWidth)
        .attr('stroke-opacity', theme.link.strokeOpacity)
        .style('pointer-events', 'stroke')
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          onLinkClick(d);
        })
        .merge(link)
        .attr('x1', d => {
          const source = typeof d.source === 'string' || typeof d.source === 'number' 
            ? allNodes.find(n => n.id === d.source) 
            : d.source as EnhancedNode;
          return source?.x || 0;
        })
        .attr('y1', d => {
          const source = typeof d.source === 'string' || typeof d.source === 'number' 
            ? allNodes.find(n => n.id === d.source) 
            : d.source as EnhancedNode;
          return source?.y || 0;
        })
        .attr('x2', d => {
          const target = typeof d.target === 'string' || typeof d.target === 'number' 
            ? allNodes.find(n => n.id === d.target) 
            : d.target as EnhancedNode;
          return target?.x || 0;
        })
        .attr('y2', d => {
          const target = typeof d.target === 'string' || typeof d.target === 'number' 
            ? allNodes.find(n => n.id === d.target) 
            : d.target as EnhancedNode;
          return target?.y || 0;
        });
      
      // 更新节点
      const node = g.selectAll<SVGGElement, EnhancedNode>('.node')
        .data(filteredNodes, d => d.id);
      
      // 移除旧节点
      node.exit().remove();
      
      // 添加新节点
      const nodeEnter = node.enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          onNodeClick(d, event as React.MouseEvent);
        })
        .call(d3.drag<SVGGElement, EnhancedNode>())
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
        });
      
      // 添加节点形状
      nodeEnter.each(function(d) {
        const g = d3.select(this);
        const shape = d.shape || 'circle';
        const radius = theme.node.radius;
        const isSelected = selectedNode?.id === d.id || selectedNodes?.some(node => node.id === d.id);
        const fill = isSelected ? '#FF6B6B' : theme.node.fill;
        const stroke = isSelected ? '#FF5252' : theme.node.stroke;
        const strokeWidth = isSelected ? 3 : theme.node.strokeWidth;
        
        // 根据shape属性渲染不同的形状
        switch (shape) {
          case 'circle':
            g.append('circle')
              .attr('r', radius)
              .attr('fill', fill)
              .attr('stroke', stroke)
              .attr('stroke-width', strokeWidth);
            break;
          case 'rectangle':
            g.append('rect')
              .attr('width', radius * 2)
              .attr('height', radius * 1.5)
              .attr('x', -radius)
              .attr('y', -radius * 0.75)
              .attr('rx', 5)
              .attr('ry', 5)
              .attr('fill', fill)
              .attr('stroke', stroke)
              .attr('stroke-width', strokeWidth);
            break;
          case 'triangle':
            g.append('path')
              .attr('d', `M 0 ${-radius} L ${radius} ${radius} L ${-radius} ${radius} Z`)
              .attr('fill', fill)
              .attr('stroke', stroke)
              .attr('stroke-width', strokeWidth);
            break;
          case 'hexagon':
            const hexPath = `M ${radius} 0 L ${radius/2} ${radius*Math.sqrt(3)/2} L ${-radius/2} ${radius*Math.sqrt(3)/2} L ${-radius} 0 L ${-radius/2} ${-radius*Math.sqrt(3)/2} L ${radius/2} ${-radius*Math.sqrt(3)/2} Z`;
            g.append('path')
              .attr('d', hexPath)
              .attr('fill', fill)
              .attr('stroke', stroke)
              .attr('stroke-width', strokeWidth);
            break;
          case 'diamond':
            g.append('path')
              .attr('d', `M 0 ${-radius} L ${radius} 0 L 0 ${radius} L ${-radius} 0 Z`)
              .attr('fill', fill)
              .attr('stroke', stroke)
              .attr('stroke-width', strokeWidth);
            break;
          default:
            // 默认渲染为圆形
            g.append('circle')
              .attr('r', radius)
              .attr('fill', fill)
              .attr('stroke', stroke)
              .attr('stroke-width', strokeWidth);
        }
      });
      
      // 添加节点文本
      nodeEnter.append('text')
        .text((d) => d.title || d.id)
        .attr('x', 0)
        .attr('y', theme.node.radius + 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', theme.node.fontSize)
        .attr('fill', theme.node.textFill)
        .attr('pointer-events', 'none')
        .style('user-select', 'none');
      
      // 为聚合节点添加展开/折叠指示器
      nodeEnter.filter((d) => {
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
      
      // 合并并更新现有节点
      node.merge(nodeEnter)
        .attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`);
      
      // 保存节点和链接引用，只保存可见节点和链接，减少内存占用
      nodeRefs.current.clear();
      linkRefs.current.clear();
      
      filteredNodes.forEach(n => nodeRefs.current.set(n.id, n));
      filteredLinks.forEach(l => {
        const sourceId = typeof l.source === 'string' || typeof l.source === 'number' ? l.source : (l.source as EnhancedNode).id;
        const targetId = typeof l.target === 'string' || typeof l.target === 'number' ? l.target : (l.target as EnhancedNode).id;
        linkRefs.current.set(`${sourceId}-${targetId}-${l.type}`, l);
      });
    }

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
            // 更新节点位置
            payload.nodes.forEach(updatedNode => {
              const node = layoutNodes.find(n => n.id === updatedNode.id);
              if (node) {
                node.x = updatedNode.x;
                node.y = updatedNode.y;
              }
            });
            
            // 更新节点和链接的可视化
            const currentG = gRef.current;
            if (currentG) {
              // 只更新可见链接
              currentG.selectAll<SVGLineElement, EnhancedGraphLink>('.link')
                .attr('x1', d => {
                  const source = typeof d.source === 'string' || typeof d.source === 'number' 
                    ? layoutNodes.find(n => n.id === d.source) 
                    : d.source as EnhancedNode;
                  return source?.x || 0;
                })
                .attr('y1', d => {
                  const source = typeof d.source === 'string' || typeof d.source === 'number' 
                    ? layoutNodes.find(n => n.id === d.source) 
                    : d.source as EnhancedNode;
                  return source?.y || 0;
                })
                .attr('x2', d => {
                  const target = typeof d.target === 'string' || typeof d.target === 'number' 
                    ? layoutNodes.find(n => n.id === d.target) 
                    : d.target as EnhancedNode;
                  return target?.x || 0;
                })
                .attr('y2', d => {
                  const target = typeof d.target === 'string' || typeof d.target === 'number' 
                    ? layoutNodes.find(n => n.id === d.target) 
                    : d.target as EnhancedNode;
                  return target?.y || 0;
                });
            
              // 只更新可见节点
              currentG.selectAll<SVGGElement, EnhancedNode>('.node')
                .attr('transform', d => {
                  const node = layoutNodes.find(n => n.id === d.id);
                  if (node && node.x !== undefined && node.y !== undefined) {
                    return `translate(${node.x}, ${node.y})`;
                  }
                  return `translate(${d.x || 0}, ${d.y || 0})`;
                });
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
            id: `${typeof l.source === 'string' || typeof l.source === 'number' ? l.source : (l.source as EnhancedNode).id}-${typeof l.target === 'string' || typeof l.target === 'number' ? l.target : (l.target as EnhancedNode).id}-${l.type}`,
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
    // 只更新可见节点和链接
    const currentG = gRef.current;
    if (currentG) {
      // 更新可见链接
      currentG.selectAll<SVGLineElement, EnhancedGraphLink>('.link')
        .transition()
        .duration(500)
        .ease(d3.easeQuadInOut)
        .attr('x1', d => {
          const source = typeof d.source === 'string' || typeof d.source === 'number' 
            ? layoutNodes.find(n => n.id === d.source) 
            : d.source as EnhancedNode;
          return source?.x || 0;
        })
        .attr('y1', d => {
          const source = typeof d.source === 'string' || typeof d.source === 'number' 
            ? layoutNodes.find(n => n.id === d.source) 
            : d.source as EnhancedNode;
          return source?.y || 0;
        })
        .attr('x2', d => {
          const target = typeof d.target === 'string' || typeof d.target === 'number' 
            ? layoutNodes.find(n => n.id === d.target) 
            : d.target as EnhancedNode;
          return target?.x || 0;
        })
        .attr('y2', d => {
          const target = typeof d.target === 'string' || typeof d.target === 'number' 
            ? layoutNodes.find(n => n.id === d.target) 
            : d.target as EnhancedNode;
          return target?.y || 0;
        });
    
      // 更新可见节点
      currentG.selectAll<SVGGElement, EnhancedNode>('.node')
        .transition()
        .duration(500)
        .ease(d3.easeQuadInOut)
        .attr('transform', d => {
          const node = layoutNodes.find(n => n.id === d.id);
          return `translate(${node?.x || 0}, ${node?.y || 0})`;
        });
    }

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
  }, [nodes, links, isSimulationRunning, layoutType, layoutDirection, nodeSpacing, levelSpacing, forceParameters, selectedNode, selectedNodes, onNodeClick, onNodeDragStart, onNodeDragEnd, onLinkClick, theme]);

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
}, areEqual);
