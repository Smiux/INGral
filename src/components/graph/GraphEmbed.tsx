import { useEffect, useRef, useState, useCallback } from 'react';
import { Download, Save, Edit, X, Check, Trash2 } from 'lucide-react';
import { graphService } from '../../services/graphService';
import { GraphCanvasReactFlow } from './GraphVisualization/GraphCanvasReactFlow';
import type { EnhancedNode, EnhancedGraphLink, LayoutType } from './GraphVisualization/types';

import type { GraphNode, GraphLink } from '../../types';

interface GraphEmbedProps {
  graphId: string;
  width?: number | string;
  height?: number | string;
  interactive?: boolean;
  layoutType?: LayoutType;
  theme?: string;
  onUpdate?: (graphData: { nodes: EnhancedNode[]; links: EnhancedGraphLink[] }) => void;
}

export const GraphEmbed: React.FC<GraphEmbedProps> = ({
  graphId,
  width = 800,
  height = 600,
  interactive = true,
  layoutType = 'force',
  onUpdate
}) => {
  const [nodes, setNodes] = useState<EnhancedNode[]>([]);
  const [links, setLinks] = useState<EnhancedGraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<EnhancedNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<EnhancedGraphLink | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<'node' | 'link' | null>(null);
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeType, setNodeType] = useState('concept');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkType, setLinkType] = useState('related');
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        // 首先检查graphId是否是直接的数据，如果是则直接使用
        if (graphId.startsWith('{')) {
          // 直接从graphId解析数据（用于嵌入场景）
          const graphData = JSON.parse(graphId);
          const enhancedNodes: EnhancedNode[] = graphData.nodes.map((node: { id?: string; title: string; connections?: number; type?: string; content?: string; x?: number; y?: number }) => ({
            id: node.id || `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            title: node.title,
            connections: node.connections || 0,
            type: node.type || 'concept',
            content: node.content || '',
            x: node.x || 0,
            y: node.y || 0
          }));

          const enhancedLinks: EnhancedGraphLink[] = graphData.links.map((link: { id?: string; source: string | number; target: string | number; type?: string; label?: string; weight?: number }, index: number) => ({
            id: link.id || `link-${index}`,
            source: link.source,
            target: link.target,
            type: link.type || 'related',
            label: link.label || '',
            weight: link.weight || 1.0
          }));

          setNodes(enhancedNodes);
          setLinks(enhancedLinks);
        } else {
          // 从服务器加载数据
          const graph = await graphService.getGraphById(graphId);
          if (!graph) {
            setError('Graph not found');
            return;
          }

          // Convert graph nodes to EnhancedNode format
          const enhancedNodes: EnhancedNode[] = graph.nodes.map((node: GraphNode) => ({
            id: node.id,
            title: node.title,
            connections: node.connections,
            type: node.type || 'concept',
            content: node.content || '',
            x: node.x || 0,
            y: node.y || 0
          }));

          // Convert graph links to EnhancedGraphLink format
          const enhancedLinks: EnhancedGraphLink[] = graph.links.map((link: GraphLink, index: number) => ({
            id: `link-${index}`,
            source: link.source,
            target: link.target,
            type: link.type || 'related',
            label: link.label || '',
            weight: link.weight || 1.0
          }));

          setNodes(enhancedNodes);
          setLinks(enhancedLinks);
        }
      } catch (err) {
        console.error('Error loading embedded graph:', err);
        setError('Failed to load graph');
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [graphId, layoutType]);

  // 处理节点点击
  const handleNodeClick = useCallback((node: EnhancedNode) => {
    if (interactive) {
      setSelectedNode(node);
      setSelectedLink(null);
      if (isEditing) {
        setEditMode('node');
        setNodeTitle(node.title);
        setNodeType(node.type || 'concept');
      }
    }
  }, [interactive, isEditing]);

  // 处理链接点击
  const handleLinkClick = useCallback((link: EnhancedGraphLink) => {
    if (interactive) {
      setSelectedLink(link);
      setSelectedNode(null);
      if (isEditing) {
        setEditMode('link');
        setLinkLabel(link.label || '');
        setLinkType(link.type || 'related');
      }
    }
  }, [interactive, isEditing]);

  // 处理画布点击
  const handleCanvasClick = useCallback(() => {
    if (interactive) {
      setSelectedNode(null);
      setSelectedLink(null);
      setEditMode(null);
    }
  }, [interactive]);

  // 处理节点拖拽开始
  const handleNodeDragStart = useCallback(() => {
    // React Flow handles drag behavior internally
  }, []);

  // 处理节点拖拽结束
  const handleNodeDragEnd = useCallback(() => {
    // React Flow handles drag behavior internally
  }, []);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (editMode === 'node' && selectedNode) {
      // 更新节点
      const updatedNodes = nodes.map(node => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            title: nodeTitle,
            type: nodeType
          };
        }
        return node;
      });
      setNodes(updatedNodes);
    } else if (editMode === 'link' && selectedLink) {
      // 更新链接
      const updatedLinks = links.map(link => {
        if (link.id === selectedLink.id) {
          return {
            ...link,
            label: linkLabel,
            type: linkType
          };
        }
        return link;
      });
      setLinks(updatedLinks);
    }
    setEditMode(null);
    // 通知父组件更新
    onUpdate?.({ nodes, links });
  }, [editMode, selectedNode, nodeTitle, nodeType, selectedLink, linkLabel, linkType, nodes, links, onUpdate]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditMode(null);
  }, []);

  // 删除选中节点
  const handleDeleteSelected = useCallback(() => {
    if (selectedNode) {
      // 删除节点和相关链接
      const updatedNodes = nodes.filter(node => node.id !== selectedNode.id);
      const updatedLinks = links.filter(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as EnhancedNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as EnhancedNode).id;
        return sourceId !== selectedNode.id && targetId !== selectedNode.id;
      });
      setNodes(updatedNodes);
      setLinks(updatedLinks);
      setSelectedNode(null);
      setEditMode(null);
      // 通知父组件更新
      onUpdate?.({ nodes: updatedNodes, links: updatedLinks });
    } else if (selectedLink) {
      // 删除链接
      const updatedLinks = links.filter(link => link.id !== selectedLink.id);
      setLinks(updatedLinks);
      setSelectedLink(null);
      setEditMode(null);
      // 通知父组件更新
      onUpdate?.({ nodes, links: updatedLinks });
    }
  }, [selectedNode, selectedLink, nodes, links, onUpdate]);

  // 导出图表为PNG
  const handleExportPNG = useCallback(() => {
    if (!svgRef.current) return;

    try {
      const svg = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const pngDataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngDataUrl;
        link.download = `graph-${graphId}-${Date.now()}.png`;
        link.click();
      };
      img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
    } catch (error) {
      console.error('Error exporting PNG:', error);
      alert('导出PNG失败');
    }
  }, [graphId]);

  // 切换编辑模式
  const toggleEditMode = useCallback(() => {
    setIsEditing(prev => !prev);
    setEditMode(null);
  }, []);

  // 保存图表
  const handleSaveGraph = useCallback(() => {
    // 保存图表到服务器或触发更新
    onUpdate?.({ nodes, links });
    alert('图表已保存');
  }, [nodes, links, onUpdate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full" style={{ height }}>
        <div className="text-gray-500">Loading graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full" style={{ height }}>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col"
      style={{ width, height }}
    >
      {/* 图表工具栏 */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleEditMode}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isEditing 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            {isEditing ? <Check size={16} /> : <Edit size={16} />}
            {isEditing ? '编辑模式' : '开始编辑'}
          </button>
          
          {isEditing && (
            <button
              onClick={handleSaveGraph}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-all"
            >
              <Save size={16} />
              保存
            </button>
          )}
          
          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-all"
          >
            <Download size={16} />
            导出PNG
          </button>
        </div>
        
        {isEditing && selectedNode && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-all"
            >
              <Trash2 size={16} />
              删除
            </button>
          </div>
        )}
      </div>

      {/* 编辑面板 */}
      {isEditing && editMode && (
        <div className="bg-gray-100 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
          {editMode === 'node' ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">节点编辑</h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium min-w-[60px]">标题:</label>
                <input
                  type="text"
                  value={nodeTitle}
                  onChange={(e) => setNodeTitle(e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium min-w-[60px]">类型:</label>
                <select
                  value={nodeType}
                  onChange={(e) => setNodeType(e.target.value as 'concept' | 'article' | 'resource')}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="concept">概念</option>
                  <option value="article">文章</option>
                  <option value="resource">资源</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">链接编辑</h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium min-w-[60px]">标签:</label>
                <input
                  type="text"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium min-w-[60px]">类型:</label>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value as 'related' | 'hierarchy' | 'causal' | 'association')}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="related">相关</option>
                  <option value="hierarchy">层级</option>
                  <option value="causal">因果</option>
                  <option value="association">关联</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 图表画布 */}
      <div className="flex-1 relative">
        <GraphCanvasReactFlow
          nodes={nodes}
          links={links}
          onNodeClick={handleNodeClick}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragEnd={handleNodeDragEnd}
          onLinkClick={handleLinkClick}
          onCanvasClick={handleCanvasClick}
        />
      </div>
    </div>
  );
};

// 3D Graph Embed Component
export const GraphEmbed3D: React.FC<GraphEmbedProps> = ({
  graphId,
  width = 800,
  height = 600
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        const graph = await graphService.getGraphById(graphId);
        if (!graph) {
          setError('Graph not found');
          return;
        }

        // 3D graph rendering will be implemented here
        // For now, we'll show a placeholder
        setLoading(false);
      } catch (err) {
        console.error('Error loading 3D embedded graph:', err);
        setError('Failed to load 3D graph');
        setLoading(false);
      }
    };

    loadGraph();
  }, [graphId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full" style={{ height }}>
        <div className="text-gray-500">Loading 3D graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full" style={{ height }}>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="border rounded-lg overflow-hidden bg-white shadow-sm"
      style={{ width, height }}
    >
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">3D Graph Visualization Coming Soon</div>
      </div>
    </div>
  );
};

// Graph Embed Wrapper Component
export const GraphEmbedWrapper: React.FC<GraphEmbedProps & { type?: '2d' | '3d' }> = ({
  type = '2d',
  ...props
}) => {
  return type === '3d' ? (
    <GraphEmbed3D {...props} />
  ) : (
    <GraphEmbed {...props} />
  );
};