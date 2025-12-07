import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { SemanticSearchResult } from '../../services/semanticSearchService';
import type { Graph, GraphVisibility } from '../../types';
import { GraphNodeType } from '../../types';
import { EnhancedNode, EnhancedGraphLink, LayoutType, LayoutDirection } from '../graph/GraphVisualization/types';
import { exportService } from '../../services/exportService';
import styles from './SearchResultsGraph.module.css';

interface SearchResultsGraphProps {
  results: SemanticSearchResult[];
  query: string;
}

const SearchResultsGraph: React.FC<SearchResultsGraphProps> = ({ results, query }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [layoutType, setLayoutType] = useState<LayoutType>('force');
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('top-bottom');
  const [exportLoading, setExportLoading] = useState(false); // 用于追踪导出状态

  // 转换搜索结果为图谱数据
  const transformResultsToGraphData = useCallback(() => {
    // 创建节点映射，确保每个结果都是唯一节点
    const nodeMap = new Map<string, EnhancedNode>();
    const links: EnhancedGraphLink[] = [];
    const conceptMap = new Map<string, EnhancedNode>();

    // 首先创建所有节点
    results.forEach(result => {
      const node: EnhancedNode = {
        id: result.id,
        title: result.title,
        type: result.type,
        content: result.content || '',
        x: Math.random() * width,
        y: Math.random() * height,
        connections: 0,
        semantic_score: result.semantic_score,
        search_rank: result.search_rank || 0,
        entity_matches: result.entity_matches || [],
        matched_concepts: result.matched_concepts || []
      };
      
      nodeMap.set(result.id, node);
      
      // 如果是概念，添加到概念映射
      if (result.type === 'concept') {
        conceptMap.set(result.title.toLowerCase(), node);
      }
    });

    // 创建链接：文章与概念之间的链接
    results.forEach(result => {
      if (result.type === 'article' && result.matched_concepts) {
        result.matched_concepts.forEach(concept => {
          const conceptNode = conceptMap.get(concept.toLowerCase());
          if (conceptNode) {
            const linkId = `${result.id}-${conceptNode.id}`;
            links.push({
              id: linkId,
              type: 'related',
              source: result.id,
              target: conceptNode.id
            });
            
            // 更新连接数
            nodeMap.get(result.id)!.connections += 1;
            conceptNode.connections += 1;
          }
        });
      }
    });

    // 创建相关文章之间的链接（基于共同概念）
    const articleNodes = Array.from(nodeMap.values()).filter(node => node.type === 'article');
    
    for (let i = 0; i < articleNodes.length; i++) {
      for (let j = i + 1; j < articleNodes.length; j++) {
        const article1 = articleNodes[i];
        const article2 = articleNodes[j];
        
        if (article1 && article2 && article1.matched_concepts && article2.matched_concepts) {
          // 查找共同概念
          const commonConcepts = article1.matched_concepts.filter((concept1: string) => 
            article2.matched_concepts!.some((concept2: string) => concept1 === concept2)
          );
          
          if (commonConcepts.length > 0) {
            const linkId = `${article1.id}-${article2.id}`;
            links.push({
              id: linkId,
              type: 'similar',
              source: article1.id,
              target: article2.id
            });
            
            // 更新连接数
            article1.connections += 1;
            article2.connections += 1;
          }
        }
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      links
    };
  }, [results, width, height]);

  // 初始化和更新图谱
  const updateGraph = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    if (!svg || !container) return;

    // 清空现有内容
    svg.selectAll('*').remove();

    // 获取数据
    const { nodes, links } = transformResultsToGraphData();
    
    if (nodes.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .text('没有足够的数据生成图谱');
      return;
    }

    // 创建缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    // 应用缩放
    svg.call(zoom as unknown as (selection: d3.Selection<SVGSVGElement | null, unknown, null, undefined>) => void);

    const g = svg.append('g');

    // 创建箭头标记
    svg.append('defs').selectAll('marker')
      .data(['arrowhead'])
      .enter().append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#999');

    // 创建力导向图
    if (layoutType === 'force') {
      // 创建力导向模拟
      const simulation = d3.forceSimulation(nodes as EnhancedNode[])
        .force('link', d3.forceLink(links as EnhancedGraphLink[]).id((d) => (d as EnhancedNode).id).distance(100).strength(0.5))
        .force('charge', d3.forceManyBody().strength(-500))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius((d) => 40 + (d as EnhancedNode).connections * 5));

      // 创建链接
      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => d.type === 'similar' ? 2 : 1)
        .attr('marker-end', d => d.type === 'related' ? 'url(#arrowhead)' : null);

      // 创建节点组
      const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .enter().append('g')
        .attr('class', styles.nodeGroup || 'node-group')
        .call(d3.drag<SVGGElement, EnhancedNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      // 添加节点圆形
      node.append('circle')
        .attr('r', d => 20 + d.connections * 5)
        .attr('fill', d => {
          if (d.type === 'concept') return '#8b5cf6';
          if (d.type === 'article') return '#3b82f6';
          return '#10b981';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('class', styles.nodeCircle || 'node-circle');

      // 添加节点文本
      node.append('text')
        .attr('dx', 0)
        .attr('dy', 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', 12)
        .attr('font-weight', 'bold')
        .text(d => d.title.length > 15 ? `${d.title.substring(0, 15)}...` : d.title);

      // 添加节点类型
      node.append('text')
        .attr('dx', 0)
        .attr('dy', 25)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', 10)
        .text(d => d.type || '');

      // 节点拖拽处理
      function dragstarted(event: d3.D3DragEvent<SVGGElement, EnhancedNode, EnhancedNode>, d: EnhancedNode) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event: d3.D3DragEvent<SVGGElement, EnhancedNode, EnhancedNode>, d: EnhancedNode) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event: d3.D3DragEvent<SVGGElement, EnhancedNode, EnhancedNode>, d: EnhancedNode) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      // 更新位置
      simulation.on('tick', () => {
        link
          .attr('x1', (d: EnhancedGraphLink) => (d.source as EnhancedNode).x || 0)
          .attr('y1', (d: EnhancedGraphLink) => (d.source as EnhancedNode).y || 0)
          .attr('x2', (d: EnhancedGraphLink) => (d.target as EnhancedNode).x || 0)
          .attr('y2', (d: EnhancedGraphLink) => (d.target as EnhancedNode).y || 0);

        node
          .attr('transform', (d: EnhancedNode) => `translate(${d.x || 0},${d.y || 0})`);
      });
    } else if (layoutType === 'tree') {
      // 树状布局
      // 找出所有文章节点作为根节点
      const articleNodes = nodes.filter(n => n.type === 'article');
      
      if (articleNodes.length > 0) {
        // 使用第一个文章节点作为根节点
        const rootNode = articleNodes[0];
        
        // 创建节点映射
        const nodeMap = new Map<string, EnhancedNode>(nodes.map(n => [n.id, n]));
        
        // 构建层次数据结构
        interface HierarchyNode extends EnhancedNode {
          children?: HierarchyNode[];
        }
        
        const buildHierarchy = (node: EnhancedNode): HierarchyNode => {
          // 查找指向该节点的子节点
          const children = links
            .filter(l => l.target === node.id && typeof l.source === 'string')
            .map(link => nodeMap.get(link.source as string))
            .filter((child): child is EnhancedNode => child !== undefined);
          
          return {
            ...node,
            children: children.length > 0 ? children.map(buildHierarchy) : []
          };
        };
        
        // 创建层次数据
        const rootData = buildHierarchy(rootNode as EnhancedNode);
        
        // 创建D3层次结构
        const root = d3.hierarchy(rootData);
        
        // 创建树布局
        const treeLayout = d3.tree<HierarchyNode>()
          .size([width - 100, height - 100])
          .separation((a, b) => a.parent === b.parent ? 1 : 2);
        
        // 计算布局
        treeLayout(root);
        
        // 创建链接
        g.append('g')
          .selectAll('path')
          .data(root.links())
          .enter().append('path')
          .attr('d', d => {
            const sourceX = (d.source.y || 0) + 50;
            const sourceY = (d.source.x || 0) + 50;
            const targetX = (d.target.y || 0) + 50;
            const targetY = (d.target.x || 0) + 50;
            
            return `M${sourceX},${sourceY} H${targetX} V${targetY}`;
          })
          .attr('fill', 'none')
          .attr('stroke', '#999')
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', 2);
        
        // 创建节点组
        const node = g.append('g')
          .selectAll('g')
          .data(root.descendants())
          .enter().append('g')
          .attr('transform', d => `translate(${(d.y || 0) + 50},${(d.x || 0) + 50})`);
        
        // 添加节点圆形
        node.append('circle')
          .attr('r', 25)
          .attr('fill', d => {
            if (d.data.type === 'concept') return '#8b5cf6';
            if (d.data.type === 'article') return '#3b82f6';
            return '#10b981';
          })
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
        
        // 添加节点文本
        node.append('text')
          .attr('dx', 0)
          .attr('dy', 5)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', 12)
          .text(d => d.data.title.length > 15 ? `${d.data.title.substring(0, 15)}...` : d.data.title);
      }
    }
  }, [layoutType, transformResultsToGraphData, width, height]);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
        setWidth(containerWidth);
        setHeight(containerHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 当数据或布局变化时更新图表
  useEffect(() => {
    updateGraph();
  }, [updateGraph]);

  // 导出图谱为JSON
  const exportGraphToJson = useCallback(async () => {
    setExportLoading(true);
    try {
      const { nodes, links } = transformResultsToGraphData();
      const graphData = {
        id: `search-results-graph-${Date.now()}`,
        author_id: 'system',
        title: `Search Results Graph: ${query}`,
        nodes,
        links,
        is_template: false,
        visibility: 'private',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const jsonContent = JSON.stringify(graphData, null, 2);
      const filename = `search-graph-${new Date().toISOString().slice(0, 10)}.json`;
      exportService.triggerDownload(jsonContent, filename, 'application/json');
    } catch (error) {
      console.error('Export graph to JSON failed:', error);
    } finally {
      setExportLoading(false);
    }
  }, [transformResultsToGraphData, query]);

  // 导出图谱为GraphML
  const exportGraphToGraphml = useCallback(async () => {
    setExportLoading(true);
    try {
      const { nodes, links } = transformResultsToGraphData();
      // Convert EnhancedNode to GraphNode
      const graphNodes = nodes.map(node => ({
        id: node.id,
        title: node.title,
        connections: node.connections || 0,
        type: GraphNodeType[(node.type as keyof typeof GraphNodeType) || 'ARTICLE'],
        description: node.content || '',
      }));
      // Convert EnhancedGraphLink to GraphLink
      const graphLinks = links.map(link => ({
        source: link.source as string,
        target: link.target as string,
        type: link.type || 'related',
        label: link.type || '',
        weight: 1.0,
      }));
      const graphData: Graph = {
        id: `search-results-graph-${Date.now()}`,
        author_id: 'search',
        author_name: 'Search Results',
        title: `Search Results Graph - ${query}`,
        nodes: graphNodes,
        links: graphLinks,
        is_template: false,
        visibility: 'public' as GraphVisibility, // Explicitly type as GraphVisibility
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // 编辑限制相关字段
        edit_count_24h: 0,
        edit_count_7d: 0,
        last_edit_date: new Date().toISOString(),
        is_change_public: true,
        is_slow_mode: false,
        is_unstable: false
      };
      
      const graphmlContent = await exportService.exportGraphToGraphml(graphData);
      const filename = `search-graph-${new Date().toISOString().slice(0, 10)}.graphml`;
      exportService.triggerDownload(graphmlContent, filename, 'application/xml;charset=utf-8');
    } catch (error) {
      console.error('Export graph to GraphML failed:', error);
    } finally {
      setExportLoading(false);
    }
  }, [transformResultsToGraphData, query]);

  // 导出图谱为PNG
  const exportGraphToPng = useCallback(async () => {
    setExportLoading(true);
    try {
      if (svgRef.current) {
        // Fix: exportGraphAsPng expects filename as second parameter
        const filename = `search-graph-${new Date().toISOString().slice(0, 10)}.png`;
        await exportService.exportGraphAsPng('#search-results-svg', filename);
      }
    } catch (error) {
      console.error('Export graph to PNG failed:', error);
    } finally {
      setExportLoading(false);
    }
  }, []);

  return (
    <div className={styles.container}>
      {/* 布局控制和导出选项 */}
      <div className={styles.layoutControls}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>布局类型:</label>
          <select
            className={styles.controlSelect}
            value={layoutType}
            onChange={(e) => setLayoutType(e.target.value as LayoutType)}
          >
            <option value="force">力导向布局</option>
            <option value="tree">树状布局</option>
            <option value="hierarchical">层级布局</option>
            <option value="circular">圆形布局</option>
            <option value="grid">网格布局</option>
          </select>
        </div>
        {layoutType === 'tree' || layoutType === 'hierarchical' && (
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>方向:</label>
            <select
              className={styles.controlSelect}
              value={layoutDirection}
              onChange={(e) => setLayoutDirection(e.target.value as LayoutDirection)}
            >
              <option value="top-bottom">从上到下</option>
              <option value="left-right">从左到右</option>
              <option value="bottom-top">从下到上</option>
              <option value="right-left">从右到左</option>
            </select>
          </div>
        )}
        {/* 导出选项 */}
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>导出图谱:</label>
          <div className={styles.exportButtons}>
            <button
              className={styles.exportButton}
              onClick={exportGraphToJson}
              disabled={exportLoading}
            >
              {exportLoading ? '导出中...' : 'JSON'}
            </button>
            <button
              className={styles.exportButton}
              onClick={exportGraphToGraphml}
              disabled={exportLoading}
            >
              {exportLoading ? '导出中...' : 'GraphML'}
            </button>
            <button
              className={styles.exportButton}
              onClick={exportGraphToPng}
              disabled={exportLoading}
            >
              {exportLoading ? '导出中...' : 'PNG'}
            </button>
          </div>
        </div>
      </div>

      {/* 图谱容器 */}
      <div className={styles.graphContainer} ref={containerRef}>
        <svg
          id="search-results-svg"
          ref={svgRef}
          width={width}
          height={height}
          className={styles.graphSvg}
        />
      </div>
    </div>
  );
};

export default SearchResultsGraph;