import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SemanticSearchResult } from '../../services/semanticSearchService';
import { GraphNodeType, type Graph, GraphVisibility } from '../../types';
import { EnhancedNode, EnhancedGraphConnection, LayoutType, LayoutDirection } from '../graph/GraphVisualization/types';
import { exportService } from '../../services/exportService';
import { GraphCanvasReactFlow } from '../graph/GraphVisualization/GraphCanvasReactFlow';
import styles from './SearchResultsGraph.module.css';

interface SearchResultsGraphProps {
  results: SemanticSearchResult[];
  query: string;
}

const SearchResultsGraph: React.FC<SearchResultsGraphProps> = ({ results, query }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [layoutType, setLayoutType] = useState<LayoutType>('force');
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('top-bottom');
  // 用于追踪导出状态
  const [exportLoading, setExportLoading] = useState(false);
  const [nodes, setNodes] = useState<EnhancedNode[]>([]);
  const [links, setLinks] = useState<EnhancedGraphConnection[]>([]);

  // 转换搜索结果为图谱数据
  const transformResultsToGraphData = useCallback(() => {
    // 创建节点映射，确保每个结果都是唯一节点
    const nodeMap = new Map<string, EnhancedNode>();
    const graphLinks: EnhancedGraphConnection[] = [];
    const conceptMap = new Map<string, EnhancedNode>();

    // 首先创建所有节点
    results.forEach(result => {
      const node: EnhancedNode = {
        'id': result.id,
        'title': result.title,
        'type': result.type,
        'shape': 'rect',
        'connections': 0,
        'style': {
          'fill': '#3b82f6',
          'stroke': '#2563eb',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': {
          'isExpanded': false,
          'isFixed': false,
          'isSelected': false,
          'isHovered': false,
          'isDragging': false,
          'isCollapsed': false
        },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': result.content || ''
        },
        'layout': {
          'x': Math.random() * width,
          'y': Math.random() * height,
          'isFixed': false,
          'isExpanded': false
        },
        'group': {
          'isGroup': false,
          'memberIds': [],
          'isGroupExpanded': false
        },
        'handles': {
          'handleCount': 4,
          'handlePositions': ['top', 'right', 'bottom', 'left'],
          'lockedHandles': {},
          'handleLabels': {}
        },
        'aggregation': {
          '_isAggregated': false,
          '_aggregatedNodes': [],
          '_averageImportance': 0,
          '_clusterCenter': { 'x': 0, 'y': 0 },
          '_clusterSize': 0,
          '_aggregationLevel': 0
        },
        'semantics': {
          'semantic_score': result.semantic_score,
          'search_rank': result.search_rank || 0,
          'entity_matches': result.entity_matches ? result.entity_matches.map(entity => ({
            'text': entity.text || '',
            'type': entity.type || '',
            'score': 0
          })) : [],
          'matched_concepts': result.matched_concepts ? result.matched_concepts.map(concept => ({ 'id': concept.toLowerCase(), 'name': concept, 'relevance': 1 })) : []
        }
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
            graphLinks.push({
              'id': linkId,
              'type': 'related',
              'source': result.id,
              'target': conceptNode.id,
              'weight': 1.0,
              'style': {
                'stroke': '#94a3b8',
                'strokeWidth': 2
              },
              'metadata': {
                'createdAt': Date.now(),
                'updatedAt': Date.now(),
                'version': 1
              },
              'state': {
                'isSelected': false,
                'isHovered': false,
                'isEditing': false
              },
              'curveControl': {
                'controlPointsCount': 0,
                'controlPoints': [],
                'curveType': 'default',
                'locked': false
              },
              'animation': {
                'dynamicEffect': 'none',
                'isAnimating': false
              }
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

    for (let i = 0; i < articleNodes.length; i += 1) {
      for (let j = i + 1; j < articleNodes.length; j += 1) {
        const article1 = articleNodes[i];
        const article2 = articleNodes[j];

        if (article1 && article2 && article1.semantics?.matched_concepts && article2.semantics?.matched_concepts) {
          // 查找共同概念
          const commonConcepts = article1.semantics.matched_concepts.filter((concept1: { name: string }) =>
            article2.semantics!.matched_concepts!.some((concept2: { name: string }) => concept1.name.toLowerCase() === concept2.name.toLowerCase())
          );

          if (commonConcepts.length > 0) {
            const linkId = `${article1.id}-${article2.id}`;
            graphLinks.push({
              'id': linkId,
              'type': 'similar',
              'source': article1.id,
              'target': article2.id,
              'weight': 1.0,
              'style': {
                'stroke': '#94a3b8',
                'strokeWidth': 2
              },
              'metadata': {
                'createdAt': Date.now(),
                'updatedAt': Date.now(),
                'version': 1
              },
              'state': {
                'isSelected': false,
                'isHovered': false,
                'isEditing': false
              },
              'curveControl': {
                'controlPointsCount': 0,
                'controlPoints': [],
                'curveType': 'default',
                'locked': false
              },
              'animation': {
                'dynamicEffect': 'none',
                'isAnimating': false
              }
            });

            // 更新连接数
            article1.connections += 1;
            article2.connections += 1;
          }
        }
      }
    }

    return {
      'nodes': Array.from(nodeMap.values()),
      'links': graphLinks
    };
  }, [results, width, height]);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { 'width': containerWidth, 'height': containerHeight } = containerRef.current.getBoundingClientRect();
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
    const { 'nodes': newNodes, 'links': newLinks } = transformResultsToGraphData();
    setNodes(newNodes);
    setLinks(newLinks);
  }, [transformResultsToGraphData]);

  // 导出图谱为JSON
  const exportGraphToJson = useCallback(async () => {
    setExportLoading(true);
    try {
      const graphData = {
        'id': `search-results-graph-${Date.now()}`,
        'author_id': 'system',
        'title': `Search Results Graph: ${query}`,
        nodes,
        links,
        'is_template': false,
        'visibility': 'private',
        'created_at': new Date().toISOString(),
        'updated_at': new Date().toISOString()
      };

      const jsonContent = JSON.stringify(graphData, null, 2);
      const filename = `search-graph-${new Date().toISOString()
        .slice(0, 10)}.json`;
      exportService.triggerDownload(jsonContent, filename, 'application/json');
    } catch (error) {
      console.error('Export graph to JSON failed:', error);
    } finally {
      setExportLoading(false);
    }
  }, [nodes, links, query]);

  // 导出图谱为GraphML
  const exportGraphToGraphml = useCallback(async () => {
    setExportLoading(true);
    try {
      // Convert EnhancedNode to GraphNode
      const graphNodes = nodes.map(node => ({
        'id': node.id,
        'title': node.title,
        'connections': node.connections || 0,
        'type': GraphNodeType[(node.type as keyof typeof GraphNodeType) || 'ARTICLE'],
        'description': node.metadata.content || ''
      }));
      // Convert EnhancedGraphLink to GraphLink
      const graphLinks = links.map(link => ({
        'source': link.source as string,
        'target': link.target as string,
        'type': link.type || 'related',
        'label': link.type || '',
        'weight': 1.0
      }));
      const graphData: Graph = {
        'id': `search-results-graph-${Date.now()}`,
        'author_id': 'search',
        'author_name': 'Search Results',
        'title': `Search Results Graph - ${query}`,
        'nodes': graphNodes,
        'links': graphLinks,
        'is_template': false,
        // Explicitly type as GraphVisibility
        'visibility': 'public' as GraphVisibility,
        'created_at': new Date().toISOString(),
        'updated_at': new Date().toISOString(),
        // 编辑限制相关字段
        'edit_count_24h': 0,
        'edit_count_7d': 0,
        'last_edit_date': new Date().toISOString(),
        'is_change_public': true,
        'is_slow_mode': false,
        'is_unstable': false
      };

      const graphmlContent = await exportService.exportGraphToGraphml(graphData);
      const filename = `search-graph-${new Date().toISOString()
        .slice(0, 10)}.graphml`;
      exportService.triggerDownload(graphmlContent, filename, 'application/xml;charset=utf-8');
    } catch (error) {
      console.error('Export graph to GraphML failed:', error);
    } finally {
      setExportLoading(false);
    }
  }, [nodes, links, query]);

  // 导出图谱为PNG
  const exportGraphToPng = useCallback(async () => {
    setExportLoading(true);
    try {
      // Fix: exportGraphAsPng expects filename as second parameter
      const filename = `search-graph-${new Date().toISOString()
        .slice(0, 10)}.png`;
      await exportService.exportGraphAsPng('#search-results-graph', filename);
    } catch (error) {
      console.error('Export graph to PNG failed:', error);
    } finally {
      setExportLoading(false);
    }
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
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
      <div className={styles.graphContainer} style={{ width, height }} id="search-results-graph">
        {nodes.length > 0 ? (
          <GraphCanvasReactFlow
            nodes={nodes}
            connections={links}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-gray-500">
            没有足够的数据生成图谱
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsGraph;
