import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { Plus, Edit, Save, Trash2, ChevronDown, User, List, ArrowUpRight, Upload, Home, Settings, Palette, X, Download, FileText, FileJson, Database } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { saveGraphData, fetchGraphById, deleteGraph, getUserGraphs, getTemplates } from '../utils/article';
import { GraphLink, Graph, GraphNode } from '../types';
import { useAuth } from '../hooks/useAuth';
import exportService from '../services/exportService';
import { KeyboardShortcuts } from './keyboard/KeyboardShortcuts';

// 节点数据接口
interface NodeData {
  id?: string | number;
  name?: string;
  title?: string; // 添加title属性
  created_by?: string;
  connections?: number;
  created_at?: string;
}

// 链接数据接口
interface LinkData {
  id?: string | number;
  source?: string | number | NodeData;
  target?: string | number | NodeData;
  type?: string;
  created_at?: string;
}

// 图表数据接口
interface GraphData {
  id?: string | number;
  name?: string; // 修改为可选属性
  nodes: NodeData[];
  links: LinkData[];
  is_template?: boolean;
  created_at?: string; // 添加创建时间属性
}


interface EnhancedNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  slug?: string;
  connections: number;
  content?: string;
  is_custom?: boolean;
  created_by?: string; // 改为可选字段，与GraphNode接口保持一致
  createdAt?: number;
  type?: 'concept' | 'article' | 'resource' | string;
}

interface EnhancedGraphLink extends d3.SimulationLinkDatum<EnhancedNode> {
  type: string;
  id: string;
  // 明确声明source和target的类型，支持节点对象或ID
  source: EnhancedNode | string | number;
  target: EnhancedNode | string | number;
}

export function GraphVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<EnhancedNode, EnhancedGraphLink> | null>(null);
  const [nodes, setNodes] = useState<EnhancedNode[]>([]);
  const [links, setLinks] = useState<EnhancedGraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<EnhancedNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkSourceNode, setLinkSourceNode] = useState<EnhancedNode | null>(null);
  const auth = useAuth();
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  // 鼠标位置状态，用于绘制临时连接线
  const [mousePosition, setMousePosition] = useState<{x: number, y: number} | null>(null);
  // 自动连接建议节点
  const [suggestedTargetNodes, setSuggestedTargetNodes] = useState<EnhancedNode[]>([]);
  // 视图范围状态，用于节点的动态加载和可见性控制
  const [viewBounds, setViewBounds] = useState<{x1: number, y1: number, x2: number, y2: number}>({
    x1: -Infinity,
    y1: -Infinity,
    x2: Infinity,
    y2: Infinity
  });
  // 布局算法类型
  const [layoutType, setLayoutType] = useState<'force' | 'hierarchical' | 'circular' | 'grid'>('force');
  // 布局方向（仅用于层次化布局）
  const [layoutDirection, setLayoutDirection] = useState<'top-bottom' | 'left-right'>('top-bottom');
  // 是否应用新布局
  const [applyLayout, setApplyLayout] = useState(false);

  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeContent, setNodeContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [graphName, setGraphName] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showGraphList, setShowGraphList] = useState(false);
   
  // 使用具体的GraphType类型替代any
  interface GraphType {
    id: string;
    name: string;
    nodes: number;
    edges: number;
    created_at: string;
  }
  const [userGraphs, setUserGraphs] = useState<GraphType[]>([]);
   
  // 使用更具体的类型替代any
  interface TemplateItem {
    id: string;
    name: string;
    category: string;
    description?: string;
    nodes: EnhancedNode[];
    links: EnhancedGraphLink[];
  }
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // 防抖搜索功能
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(templateSearchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [templateSearchQuery]);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('全部');
  const [shiftPressed, setShiftPressed] = useState(false);

  const [currentTransform, setCurrentTransform] = useState(d3.zoomIdentity);
  const [zoomLevel, setZoomLevel] = useState(100); // 缩放百分比
  // 用于节流tick事件的时间戳引用
  const lastTickUpdate = useRef(Date.now());
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  
  // 添加showNotification函数，用于显示通知
  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error') => {
    setNotification({ message, type });
    // 3秒后自动关闭通知
    setTimeout(() => setNotification(null), 3000);
  }, []);
  const [batchSelectionMode, setBatchSelectionMode] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<EnhancedNode[]>([]);
  
  // 节点搜索和筛选功能
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');
  const [debouncedNodeSearchQuery, setDebouncedNodeSearchQuery] = useState('');
  
  // 防抖搜索功能
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNodeSearchQuery(nodeSearchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [nodeSearchQuery]);
  
  // 样式自定义功能
  // 节点样式
  const [nodeStyle, setNodeStyle] = useState({
    color: '#8b5cf6', // 默认紫色
    size: 20, // 默认半径
    borderColor: '#fff',
    borderWidth: 2
  });
  
  // 链接样式
  const [linkStyle, setLinkStyle] = useState({
    color: '#999',
    opacity: 0.6,
    width: 2,
    dasharray: 'none' // 实线
  });
  
  // 样式面板显示状态
  const [showStylePanel, setShowStylePanel] = useState(false);

  // 导入导出功能
  const [showImportExportDialog, setShowImportExportDialog] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'export' | 'import'>('export');
  const [importFile, setImportFile] = useState<File | null>(null);

  // 节点聚类功能
  const [isClusteringEnabled, setIsClusteringEnabled] = useState(false);
  const [clusteringAlgorithm, setClusteringAlgorithm] = useState<'kmeans' | 'hierarchical' | 'community'>('kmeans');
  const [clusterCount, setClusterCount] = useState(3);
  const [clusters, setClusters] = useState<Record<string, number>>({}); // 节点ID到聚类ID的映射
  const [clusterColors, setClusterColors] = useState<string[]>([]); // 每个聚类的颜色
  
  // 操作历史记录，用于支持撤销和前进功能
  type RecentAction = 
    | { type: 'addNode'; nodeId: string; timestamp: number; data?: { node: EnhancedNode; links: EnhancedGraphLink[] } }
    | { type: 'deleteNode'; nodeId: string; timestamp: number; data: { node: EnhancedNode; links: EnhancedGraphLink[] } }
    | { type: 'addLink'; linkId: string; timestamp: number; data: EnhancedGraphLink }
    | { type: 'deleteLink'; linkId: string; timestamp: number; data: EnhancedGraphLink };
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [futureActions, setFutureActions] = useState<RecentAction[]>([]); // 用于前进功能
  // 定义复制节点的接口
  interface CopiedNodeInfo {
    node: EnhancedNode;
    timestamp: number;
  }

  // 添加复制节点相关状态
   
  const [copiedNode, setCopiedNode] = useState<CopiedNodeInfo | null>(null);
  const [copiedNodes, setCopiedNodes] = useState<EnhancedNode[]>([]);
  
  // 动态工具栏状态
  const [toolbarDisplayMode, setToolbarDisplayMode] = useState<'always' | 'dynamic'>('always');
  const [isMouseInToolbarArea, setIsMouseInToolbarArea] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  // 根据搜索和分类过滤模板
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // 搜索过滤 - 使用防抖后的搜索查询
      const matchesSearch = debouncedSearchQuery === '' ||
        (template.name && template.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
        (template.description && template.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
      
      // 分类过滤
      const matchesCategory = selectedTemplateCategory === '全部' || template.category === selectedTemplateCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [templates, debouncedSearchQuery, selectedTemplateCategory]);
  
  // 节点聚类功能
  // 简单的k-means聚类算法实现
  const kmeansClustering = useCallback((nodes: EnhancedNode[], k: number) => {
    if (nodes.length === 0 || k <= 0 || k > nodes.length) {
      return {};
    }
    
    // 初始化聚类结果
    const clusters: Record<string, number> = {};
    
    // 如果只有一个聚类，所有节点都属于同一个聚类
    if (k === 1) {
      nodes.forEach(node => {
        clusters[node.id] = 0;
      });
      return clusters;
    }
    
    // 准备节点数据（使用连接数和类型作为特征）
    const nodeFeatures = nodes.map(node => {
      // 检查节点类型是否存在，默认为concept
      const nodeType = node.type || 'concept';
      const typeValue = nodeType === 'concept' ? 0 : nodeType === 'article' ? 1 : nodeType === 'resource' ? 2 : 3;
      return {
        id: node.id,
        connections: node.connections || 0,
        type: typeValue
      };
    });
    
    // 归一化特征值
    const connectionsMin = Math.min(...nodeFeatures.map(n => n.connections));
    const connectionsMax = Math.max(...nodeFeatures.map(n => n.connections));
    const typeMin = Math.min(...nodeFeatures.map(n => n.type));
    const typeMax = Math.max(...nodeFeatures.map(n => n.type));
    
    const normalize = (value: number, min: number, max: number) => {
      return max === min ? 0 : (value - min) / (max - min);
    };
    
    const normalizedFeatures = nodeFeatures.map(n => ({
      id: n.id,
      connections: normalize(n.connections, connectionsMin, connectionsMax),
      type: normalize(n.type, typeMin, typeMax)
    }));
    
    // 随机初始化k个中心点
    const centroids: typeof normalizedFeatures[number][] = [];
    const selectedIndices = new Set<number>();
    
    while (selectedIndices.size < k) {
      const randomIndex = Math.floor(Math.random() * normalizedFeatures.length);
      if (!selectedIndices.has(randomIndex)) {
        selectedIndices.add(randomIndex);
        const randomFeature = normalizedFeatures[randomIndex];
        if (randomFeature) {
          centroids.push(randomFeature);
        }
      }
    }
    
    // 迭代聚类
    const maxIterations = 100;
    let converged = false;
    let iteration = 0;
    
    while (!converged && iteration < maxIterations) {
      // 1. 分配每个节点到最近的中心点
      const newClusters: Record<string, number> = {};
      normalizedFeatures.forEach(node => {
        let minDistance = Infinity;
        let closestCentroidIndex = 0;
        
        centroids.forEach((centroid, index) => {
          const distance = Math.sqrt(
            Math.pow(node.connections - centroid.connections, 2) +
            Math.pow(node.type - centroid.type, 2)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroidIndex = index;
          }
        });
        
        newClusters[node.id] = closestCentroidIndex;
      });
      
      // 2. 更新中心点
      const newCentroids: typeof normalizedFeatures[number][] = [];
      for (let i = 0; i < k; i++) {
        const clusterNodes = normalizedFeatures.filter(n => newClusters[n.id] === i);
        if (clusterNodes.length === 0) {
          // 如果某个聚类没有节点，保留原中心点
          const centroid = centroids[i];
          if (centroid) {
            newCentroids.push(centroid);
          }
        } else {
          const avgConnections = clusterNodes.reduce((sum, node) => sum + node.connections, 0) / clusterNodes.length;
          const avgType = clusterNodes.reduce((sum, node) => sum + node.type, 0) / clusterNodes.length;
          
          newCentroids.push({
            id: `centroid-${i}`,
            connections: avgConnections,
            type: avgType
          });
        }
      }
      
      // 3. 检查是否收敛
      converged = true;
      for (let i = 0; i < centroids.length; i++) {
        const centroid = centroids[i];
        const newCentroid = newCentroids[i];
        if (centroid && newCentroid) {
          if (
            Math.abs(centroid.connections - newCentroid.connections) > 0.001 ||
            Math.abs(centroid.type - newCentroid.type) > 0.001
          ) {
            converged = false;
            break;
          }
        }
      }
      
      // 更新聚类结果和中心点
      Object.assign(clusters, newClusters);
      centroids.splice(0, centroids.length, ...newCentroids);
      iteration++;
    }
    
    return clusters;
  }, []);
  
  // 执行聚类
  const performClustering = useCallback(() => {
    if (nodes.length === 0 || clusterCount <= 0) return;
    
    let newClusters: Record<string, number> = {};
    
    switch (clusteringAlgorithm) {
      case 'kmeans':
        newClusters = kmeansClustering(nodes, clusterCount);
        break;
      default:
        newClusters = kmeansClustering(nodes, clusterCount);
    }
    
    // 生成聚类颜色
    const newClusterColors = Array.from({ length: clusterCount }, (_, index) => {
      // 生成不同的颜色
      const hue = (index * 137.5) % 360; // 使用黄金角分布颜色
      return `hsl(${hue}, 70%, 60%)`;
    });
    
    setClusters(newClusters);
    setClusterColors(newClusterColors);
    showNotification(`已完成节点聚类，共生成${Object.keys(newClusters).length}个聚类`, 'info');
  }, [nodes, clusterCount, clusteringAlgorithm, kmeansClustering, showNotification]);
  
  // 切换聚类显示
  const toggleClustering = useCallback(() => {
    setIsClusteringEnabled(prev => !prev);
    if (!isClusteringEnabled) {
      performClustering();
    }
  }, [isClusteringEnabled, performClustering]);

  // 当节点或链接数据变化时，更新聚类结果
  useEffect(() => {
    if (isClusteringEnabled) {
      performClustering();
    }
  }, [nodes, links, isClusteringEnabled]); // 移除performClustering依赖，避免无限循环

  // 加载用户图表


  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 定义临时图表数据接口
        interface TempGraphData {
          nodes: Array<{ id: string; title: string; connections?: number }>;
          links: Array<{ source: string; target: string; type?: string }>;
        }
        
        // 直接使用空数据，后续会从用户交互或真实数据库获取数据
        const data: TempGraphData = { nodes: [], links: [] };
        
        // 定义临时类型用于数据验证
        interface RawNodeData {
          id: string;
          title: string;
          connections?: number;
        }
        
        interface RawLinkData {
          source: string;
          target: string;
          type?: string;
        }
        
        // 过滤和验证节点数据，确保每个节点都有必要的属性
        const validNodes = data['nodes'].filter((node: unknown): node is RawNodeData => {
          if (!node || typeof node !== 'object') return false;
          const nodeObj = node as Record<string, unknown>;
          return typeof nodeObj?.id === 'string' && typeof nodeObj?.title === 'string';
        });
        
        // 如果过滤后没有有效节点，使用默认节点
        const safeNodes = validNodes.length > 0 ? validNodes : [
          { id: 'safe-1', title: '默认知识节点', connections: 0 }
        ];
        
        // 过滤和验证链接数据，确保每个链接都有必要的属性
        const validLinks = data['links'].filter((link: unknown): link is RawLinkData => {
          if (!link || typeof link !== 'object') return false;
          const linkObj = link as Record<string, unknown>;
          return typeof linkObj?.source === 'string' && typeof linkObj?.target === 'string';
        });
        
        // 转换节点数据格式
        const enhancedNodes = safeNodes.map((node: RawNodeData) => ({
          ...node,
          connections: typeof node.connections === 'number' ? node.connections : 0
        }));
        
        // 确保所有links都有id和type属性
        const enhancedLinks = validLinks.map((link: RawLinkData, index: number) => ({
          ...link,
          id: `link-${Date.now()}-${index}`,
          type: link.type || 'related'
        }));
        
        // 安全地更新状态
        setNodes(enhancedNodes);
        setLinks(enhancedLinks as EnhancedGraphLink[]);
        setIsSimulationRunning(true);
        
        // 显示加载成功通知
        showNotification('知识图谱加载成功', 'success');
      } catch (error) {
        console.error('Unexpected error in loadData:', error);
        
        // 确保状态正确更新，使用空数据
        setNodes([]);
        setLinks([]);
        setIsSimulationRunning(false);
        
        // 显示错误通知
        try {
          if (typeof showNotification === 'function') {
            showNotification('加载数据失败，请稍后重试', 'error');
          }
        } catch (notifyError) {
          console.error('Error showing notification:', notifyError);
        }
      } finally {
        // 确保加载状态被重置，即使在错误情况下
        setIsLoading(false);
      }
    };

    loadData();
  }, [showNotification]); // 移除不必要的loadData依赖，loadData是useEffect内部定义的



  // 移除未使用的nodesWithConnections计算
  
  // 通知状态已在组件顶部定义
  
  // 已在其他地方定义
  
  // 加载用户图表相关函数
  const loadUserGraphs = useCallback(async () => {
    if (!user) return;
    
    try {
      // 获取用户创建的图表
      const graphs = await getUserGraphs(user['id']);
      // 转换格式以适应UI显示需求
      const formattedGraphs = (graphs || []).filter(graph => {
        // 类型保护
        const g = graph as GraphData;
        return !g.is_template && Array.isArray(g.nodes) && Array.isArray(g.links);
      }).map(graph => {
        const g = graph as GraphData;
        return {
          id: String(g.id || ''),
          name: String(g.name || '未命名图表'),
          nodes: g.nodes.length || 0,
          edges: g.links.length || 0,
          created_at: String(g.created_at || new Date().toISOString())
        };
      });
      setUserGraphs(formattedGraphs);
      
      // 显示加载成功通知
      if (typeof showNotification === 'function') {
        showNotification('用户图表加载成功', 'success');
      }
    } catch (error) {
      console.error('Error loading user graphs:', error);
      showNotification('加载用户图表失败', 'error');
    }
  }, [user, showNotification, setUserGraphs]);
  
  // 加载图表模板
  const loadTemplates = useCallback(async () => {
    try {
      // 使用真实数据库数据加载模板
      const templatesData = await getTemplates();
      
      const formattedTemplates: TemplateItem[] = templatesData.map((template) => {
        const graphData = template.graph_data as unknown as { 
          nodes?: Array<{ id?: string; title?: string; connections?: number; created_by?: string }>; 
          links?: Array<{ 
            id?: string; 
            source: string | { id: string }; 
            target: string | { id: string }; 
            type?: string;
          }> 
        };
        return {
          id: String(template.id),
          name: (template.title || 'Untitled Template') as string,
          category: 'default', // 使用默认分类
          description: `节点: ${graphData.nodes?.length || 0}, 连接: ${graphData.links?.length || 0}`,
          nodes: (graphData.nodes || []).map((n) => ({
            id: n.id || `node-${Math.random().toString(36).substring(2, 11)}`,
            title: n.title || 'Untitled Node',
            connections: n.connections || 0,
            created_by: n.created_by || 'system'
          })),
          links: (graphData.links || []).map((l) => ({
            id: l.id || `template-link-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            source: typeof l.source === 'object' ? String(l.source.id) : String(l.source),
            target: typeof l.target === 'object' ? String(l.target.id) : String(l.target),
            type: l.type || 'default'
          }))
        };
      });
      setTemplates(formattedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      showNotification('加载图表模板失败', 'error');
    }
  }, [showNotification]);



  // 然后使用它们
  useEffect(() => {
    if (user) {
      loadUserGraphs();
      loadTemplates();
    }
  }, [user, loadUserGraphs, loadTemplates]);

  // 先定义所有需要的函数
  const addNode = useCallback((x: number, y: number, isBatchMode: boolean = false) => {
    // 生成更可靠的节点ID
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const newNode: EnhancedNode = {
      id: nodeId,
      title: isBatchMode ? `节点` : `新节点`,
      connections: 0,
      x,
      y,
      is_custom: true,
      created_by: user?.['id'] || 'system',
      content: '',
      // 添加创建时间戳，用于动画效果
      createdAt: Date.now()
    };
    
    setNodes(prev => {
      const updatedNodes = [...prev, newNode];
      // 立即更新模拟，确保节点显示
      if (simulationRef.current) {
        try {
          const currentLinks = Array.isArray(links) ? links : [];
          simulationRef.current
            .nodes(updatedNodes)
            .force('link', d3.forceLink(currentLinks).id((d: d3.SimulationNodeDatum) => (d as EnhancedNode).id).distance(150))
            .alpha(0.3)
            .restart();
        } catch (error) {
          console.error('Error restarting simulation:', error);
        }
      }
      return updatedNodes;
    });
    
    // 添加到最近操作历史，支持撤销
    if (typeof setRecentActions === 'function') {
      setRecentActions(prev => [
        { type: 'addNode', nodeId, timestamp: Date.now() },
        ...(Array.isArray(prev) ? prev : []).slice(0, 9) // 保留最近10个操作
      ]);
    }
    
    if (!isBatchMode) {
      // 单个节点创建时自动选中并聚焦
      setSelectedNode(newNode);
      setSelectedNodes([newNode]);
      setNodeTitle(newNode.title);
      setNodeContent('');
      
      // 改进用户提示，更清晰的指导
      showNotification('节点已创建，按Enter编辑标题，Shift+Enter编辑内容', 'info');
    } else {
      // 批量模式下添加到选中列表
      setSelectedNodes(prev => [...prev, newNode]);
    }
    
    // 添加新节点的高亮动画效果
    setTimeout(() => {
      try {
        if (containerRef.current) {
          const svgElement = containerRef.current.querySelector('svg');
          if (svgElement) {
            const svg = d3.select(svgElement);
            const newNodeElement = svg.select(`[data-node-id="${nodeId}"]`);
            if (!newNodeElement.empty()) {
              newNodeElement
                .transition()
                .duration(600)
                .style('stroke-width', '3px')
                .style('stroke', '#3b82f6')
                .transition()
                .duration(600)
                .style('stroke-width', '2px')
                .style('stroke', null);
            }
          }
        }
      } catch (animationError) {
        console.warn('Error animating new node:', animationError);
      }
    }, 100);
  }, [user?.['id'], nodes, links, setNodes, setSelectedNode, setSelectedNodes, setNodeTitle, setNodeContent, showNotification, setRecentActions, simulationRef, containerRef]);

  const deleteSelectedNodes = useCallback(() => {
    if (selectedNodes.length === 0) return;
    
    const nodeIds = new Set(selectedNodes.map(node => node?.id || ''));
    
    // 从节点列表中移除选中的节点
    setNodes(prev => prev.filter(node => !nodeIds.has(String(node?.id || ''))));
    
    // 删除与这些节点相关的连接
    setLinks(prev => prev.filter(
        link => {
          const sourceId = typeof link['source'] === 'object' ? String(link['source']['id']) : String(link['source']);
          const targetId = typeof link['target'] === 'object' ? String(link['target']['id']) : String(link['target']);
          return !nodeIds.has(String(sourceId)) && !nodeIds.has(String(targetId));
        }
      ));
    
    // 重置选择状态
    setSelectedNode(null);
    setSelectedNodes([]);
    
    // 显示删除成功通知
    showNotification(`已删除 ${selectedNodes.length} 个节点`, 'success');
  }, [selectedNodes, setNodes, setLinks, setSelectedNode, setSelectedNodes, showNotification]); // 添加所有必要的依赖项

  const removeNode = useCallback((nodeOrId: string | number | EnhancedNode) => {
    const nodeId = typeof nodeOrId === 'object' ? (nodeOrId as EnhancedNode).id : nodeOrId;
    
    // 获取要删除的节点及其相关链接
    const nodeToDelete = nodes.find(node => node.id === nodeId);
    if (!nodeToDelete) return;
    
    const relatedLinks = links.filter(link => {
      const sourceId = typeof link?.source === 'object' ? String((link.source as EnhancedNode).id || '') : String(link?.source || '');
      const targetId = typeof link?.target === 'object' ? String((link.target as EnhancedNode).id || '') : String(link?.target || '');
      return String(sourceId) === String(nodeId) || String(targetId) === String(nodeId);
    });
    
    // 删除节点
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    
    // 删除与该节点相关的连接
    setLinks(prev => prev.filter(link => {
      const sourceId = typeof link?.source === 'object' ? String((link.source as EnhancedNode).id || '') : String(link?.source || '');
      const targetId = typeof link?.target === 'object' ? String((link.target as EnhancedNode).id || '') : String(link?.target || '');
      return String(sourceId) !== String(nodeId) && String(targetId) !== String(nodeId);
    }));
    
    // 添加到最近操作历史，支持撤销
    setRecentActions(prev => [
      { type: 'deleteNode', nodeId: String(nodeId), timestamp: Date.now(), data: { node: nodeToDelete, links: relatedLinks } }, 
      ...prev.slice(0, 9) // 保留最近10个操作
    ]);
    
    // 清空未来操作历史
    setFutureActions([]);
    
    // 如果删除的是当前选中的节点，重置选择状态
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(null);
      setSelectedNodes([]);
    }
    
    // 显示删除成功通知
    showNotification('节点已删除', 'success');
  }, [nodes, links, selectedNode, setNodes, setLinks, setSelectedNode, setSelectedNodes, showNotification, setRecentActions, setFutureActions]);

  const copySelectedNodes = useCallback(() => {
    if (selectedNodes.length > 0 || selectedNode) {
      setCopiedNodes(selectedNodes.length > 0 ? selectedNodes : [selectedNode!]);
    }
  }, [selectedNodes, selectedNode]);

  const pasteNodes = useCallback(() => {
    // 优先处理单个节点的复制粘贴
    if (copiedNode) {
      const offsetX = 50;
      const offsetY = 50;
      
      const newNode: EnhancedNode = {
        ...copiedNode.node,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        x: (copiedNode.node.x || 0) + offsetX,
        y: (copiedNode.node.y || 0) + offsetY,
        is_custom: true,
        created_by: user?.['id'] || 'system',
      };
      
      setNodes(prev => [...prev, newNode]);
      setSelectedNodes([newNode]);
      setSelectedNode(newNode);
      setNotification({ message: '已粘贴节点', type: 'success' });
      setTimeout(() => setNotification(null), 2000);
      return;
    }
    
    // 处理多个节点的复制粘贴
    if (!copiedNodes || copiedNodes.length === 0) return;
    
    const offsetX = 50;
    const offsetY = 50;
    
    const newNodes = copiedNodes.map(node => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: node.title || '复制的节点',
      x: (node.x || 0) + offsetX,
      y: (node.y || 0) + offsetY,
      is_custom: true,
      connections: typeof node.connections === 'number' ? node.connections : 0
    } as EnhancedNode));
    
    setNodes(prev => [...prev, ...newNodes]);
    setSelectedNodes(newNodes);
    if (newNodes.length > 0) {
      setSelectedNode(newNodes[0] as EnhancedNode | null);
    }
  }, [copiedNodes, copiedNode, user]); // 添加必要的依赖项

  const connectSelectedNodes = useCallback(() => {
    if (selectedNodes.length !== 2) return;
    
    const [node1, node2] = selectedNodes;
    
    // 确保node1和node2存在且有id属性
    if (!node1 || !node2 || !node1.id || !node2.id) {
      return;
    }
    
    // 检查连接是否已存在
    const connectionExists = links.some(link => {
      const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
      const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
      return (String(sourceId) === String(node1.id) && String(targetId) === String(node2.id)) || 
             (String(sourceId) === String(node2.id) && String(targetId) === String(node1.id));
    });
    
    if (!connectionExists) {
      const newLink: EnhancedGraphLink = {
        id: Date.now().toString(),
        source: node1.id, // 使用点符号访问并确保id存在
        target: node2.id,
        type: 'default',
      };
      
      setLinks(prev => [...prev, newLink]);
      
      // 更新节点连接数
      setNodes(prev => prev.map(node => {
        if (node.id === node1.id || node.id === node2.id) {
          return { ...node, connections: node.connections + 1 };
        }
        return node;
      }));
    }
  }, [selectedNodes, links, setLinks, setNodes]);

  // 键盘事件处理函数在后面定义

  // 添加新节点
  // addNode函数在后面定义

  // 增强版批量添加节点功能
  const addMultipleNodes = useCallback((x: number, y: number, gridSize = 3, spacing = 80) => {
    if (!user) return;
    
    const nodesToAdd: EnhancedNode[] = [];
    const timestamp = Date.now();
    
    // 创建节点网格
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const nodeX = x + (i - Math.floor(gridSize / 2)) * spacing;
        const nodeY = y + (j - Math.floor(gridSize / 2)) * spacing;
        
        const newNode: EnhancedNode = {
          id: `custom-${timestamp}-${i}-${j}-${Math.random().toString(36).substr(2, 9)}`,
          title: `Node ${i},${j}`,
          connections: 0,
          x: nodeX,
          y: nodeY,
          is_custom: true,
          created_by: user?.['id'] || 'system',
          createdAt: Date.now(),
          content: ''
        };
        
        nodesToAdd.push(newNode);
      }
    }
    
    setNodes(prev => [...prev, ...nodesToAdd]);
    
    // 显示通知
    setNotification({ 
      message: `成功添加 ${nodesToAdd.length} 个节点`, 
      type: 'success' 
    });
    setTimeout(() => setNotification(null), 3000);
    
    // 如果是批量选择模式，选中新添加的节点
    if (batchSelectionMode) {
      setSelectedNodes(prev => [...prev, ...nodesToAdd]);
    }
  }, [user, batchSelectionMode]);
  
  // 删除选中的节点函数在后面定义
  // 复制节点函数在后面定义
  // 粘贴节点函数在后面定义
  // 连接节点函数在后面定义
  // 移除节点函数在后面定义

  // 切换编辑模式
  const toggleEditMode = useCallback(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setIsEditMode(prev => !prev);
    setIsAddingLink(false);
    setLinkSourceNode(null);
  }, [user, navigate]);

  // 计算节点内容相似度（简单的标题匹配）
  const calculateContentSimilarity = (node1: EnhancedNode, node2: EnhancedNode): number => {
    if (!node1.title || !node2.title) return 0;
    
    const title1 = node1.title.toLowerCase();
    const title2 = node2.title.toLowerCase();
    
    // 检查是否有相同的关键词
    const words1 = title1.split(/\s+/);
    const words2 = title2.split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word) && word.length > 2);
    return commonWords.length;
  };

  // 计算节点类型匹配度
  const calculateTypeMatch = (node1: EnhancedNode, node2: EnhancedNode): number => {
    // 使用节点的type属性，默认为concept
    const type1 = node1.type || 'concept';
    const type2 = node2.type || 'concept';
    
    // 相同类型的节点匹配度更高
    if (type1 === type2) return 2;
    // 文章和概念之间的匹配度较高
    if ((type1 === 'article' && type2 === 'concept') || (type1 === 'concept' && type2 === 'article')) return 1;
    // 其他组合匹配度较低
    return 0;
  };

  // 计算二度连接关系（共同邻居）
  const calculateCommonNeighbors = (node: EnhancedNode): Record<string, number> => {
    const commonNeighbors: Record<string, number> = {};
    
    // 获取所有直接连接的节点
    const directNeighbors = new Set<string>();
    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
      const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
      
      if (sourceId === node.id) {
        directNeighbors.add(targetId);
      } else if (targetId === node.id) {
        directNeighbors.add(sourceId);
      }
    });
    
    // 对于每个直接邻居，找到它们的邻居（二度连接）
    directNeighbors.forEach(neighborId => {
      links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
        const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
        
        // 找到邻居的邻居，排除自身和直接邻居
        if (sourceId === neighborId && targetId !== node.id && !directNeighbors.has(targetId)) {
          commonNeighbors[targetId] = (commonNeighbors[targetId] || 0) + 1;
        } else if (targetId === neighborId && sourceId !== node.id && !directNeighbors.has(sourceId)) {
          commonNeighbors[sourceId] = (commonNeighbors[sourceId] || 0) + 1;
        }
      });
    });
    
    return commonNeighbors;
  };

  // 开始添加连接
  const startAddLink = useCallback((node: EnhancedNode) => {
    // 确保在编辑模式下才能添加连接
    if (!isEditMode) return;
    
    setLinkSourceNode(node);
    setIsAddingLink(true);
    
    // 计算自动连接建议
    const commonNeighbors = calculateCommonNeighbors(node);
    
    const suggestedTargets = nodes
      .filter(target => target.id !== node.id) // 排除自身
      .filter(target => {
        // 检查是否已有连接
        const exists = links.some(link => {
          const sourceId = typeof link?.source === 'object' ? String((link.source as EnhancedNode).id || '') : String(link?.source || '');
          const targetId = typeof link?.target === 'object' ? String((link.target as EnhancedNode).id || '') : String(link?.target || '');
          return (String(sourceId) === String(node.id) && String(targetId) === String(target.id)) ||
                 (String(sourceId) === String(target.id) && String(targetId) === String(node.id));
        });
        return !exists;
      })
      // 计算每个节点的推荐分数
      .map(target => {
        const contentSimilarity = calculateContentSimilarity(node, target);
        const typeMatch = calculateTypeMatch(node, target);
        const commonNeighborScore = commonNeighbors[target.id] || 0;
        const connectionCountScore = Math.max(0, 5 - target.connections); // 连接数越少，分数越高
        
        // 综合分数：内容相似度(30%) + 类型匹配(25%) + 共同邻居(30%) + 连接数(15%)
        const score = (contentSimilarity * 0.3) + (typeMatch * 0.25) + (commonNeighborScore * 0.3) + (connectionCountScore * 0.15);
        
        return {
          node: target,
          score
        };
      })
      // 按分数降序排序
      .sort((a, b) => b.score - a.score)
      // 提取节点
      .map(item => item.node)
      // 最多推荐5个目标
      .slice(0, 5);
    
    setSuggestedTargetNodes(suggestedTargets);
  }, [isEditMode, nodes, links]);

  // 完成添加连接
  const completeAddLink = useCallback((targetNode: EnhancedNode) => {
    if (!linkSourceNode || !targetNode || linkSourceNode.id === targetNode.id) return;
    
    // 检查是否已经存在相同的连接
    const exists = links.some(link => {
      const sourceId = typeof link?.source === 'object' ? String((link.source as EnhancedNode).id || '') : String(link?.source || '');
      const targetId = typeof link?.target === 'object' ? String((link.target as EnhancedNode).id || '') : String(link?.target || '');
      return (String(sourceId) === String(linkSourceNode.id) && String(targetId) === String(targetNode.id)) ||
             (String(sourceId) === String(targetNode.id) && String(targetId) === String(linkSourceNode.id));
    });

    if (!exists) {
      const newLink: EnhancedGraphLink = {
        id: `link-${Date.now()}`,
        source: linkSourceNode['id'], // 使用ID而不是对象引用，避免引用问题
        target: targetNode['id'],
        type: 'related'
      };
      setLinks(prev => [...prev, newLink]);
      
      // 更新节点连接数
      setNodes(prev => prev.map(node => {
        if (node['id'] === linkSourceNode['id'] || node['id'] === targetNode['id']) {
          return { ...node, connections: node['connections'] + 1 };
        }
        return node;
      }));
      
      // 添加到最近操作历史，支持撤销
      setRecentActions(prev => [
        { type: 'addLink', linkId: newLink.id, timestamp: Date.now(), data: newLink },
        ...prev.slice(0, 9) // 保留最近10个操作
      ]);
      
      // 清空未来操作历史
      setFutureActions([]);
      
      // 显示成功通知
      showNotification('连接已添加', 'success');
      
      // 重置模拟以包含新连接
    if (simulationRef.current) {
      simulationRef.current
        .force('link', d3.forceLink([...links, newLink]).id((d: d3.SimulationNodeDatum) => (d as EnhancedNode).id).distance(150))
        .alpha(0.3)
        .restart();
    }
    } else {
      // 显示已存在连接的通知
      showNotification('该连接已存在', 'info');
    }

    // 重置状态
    setIsAddingLink(false);
    setLinkSourceNode(null);
    setSuggestedTargetNodes([]);
  }, [linkSourceNode, links, setRecentActions, setFutureActions, showNotification]);

  // 取消添加连接
  const cancelAddLink = useCallback(() => {
    setIsAddingLink(false);
    setLinkSourceNode(null);
    setMousePosition(null);
    setSuggestedTargetNodes([]);
  }, []);

  // 移除连接
  const removeLink = useCallback((linkId: string) => {
    const linkToRemove = links.find(link => link['id'] === linkId);
    if (!linkToRemove) return;

    // 获取链接源和目标的ID，处理可能是数字ID或对象的情况
    const sourceId = typeof linkToRemove['source'] === 'object' ? linkToRemove['source']['id'] : String(linkToRemove['source']);
      const targetId = typeof linkToRemove['target'] === 'object' ? linkToRemove['target']['id'] : String(linkToRemove['target']);

    // 更新节点连接数
    setNodes(prev => prev.map(node => {
      if (node['id'] === sourceId || node['id'] === targetId) {
        return { ...node, connections: Math.max(0, node['connections'] - 1) };
      }
      return node;
    }));

    // 添加到最近操作历史，支持撤销
    setRecentActions(prev => [
      { type: 'deleteLink', linkId, timestamp: Date.now(), data: linkToRemove },
      ...prev.slice(0, 9) // 保留最近10个操作
    ]);
    
    // 清空未来操作历史
    setFutureActions([]);
    
    setLinks(prev => prev.filter(link => link.id !== linkId));
  }, [links, setRecentActions, setFutureActions]);

  // 保存节点属性
  const saveNodeChanges = useCallback(() => {
    if (!selectedNode) return;
    
    // 创建更新后的节点
    const updatedNode = {
      ...selectedNode,
      title: nodeTitle,
      content: nodeContent
    };
    
    // 更新nodes状态
    setNodes(prev => prev.map(node => {
      if (node.id === selectedNode.id) {
        return updatedNode;
      }
      return node;
    }));
    
    // 同时更新selectedNode状态，确保UI显示最新内容
    setSelectedNode(updatedNode);
    
    // 显示保存成功的通知
    showNotification('节点内容已保存', 'success');
  }, [selectedNode, nodeTitle, nodeContent, showNotification, setNodes, setSelectedNode]);

  // 这些函数已经在前面定义过了

  // 加载特定图表
  const loadGraph = useCallback(async (graphId: string) => {
    setIsLoading(true);
    try {
      const graph = await fetchGraphById(graphId);
      if (graph) {
        // 获取基础数据
        // 使用mock数据代替fetchGraphData并添加类型注解
      const baseData: { nodes: EnhancedNode[], links: EnhancedGraphLink[] } = { 
        nodes: [], 
        links: [] 
      };
        
        // 为baseData.links添加id属性，以符合EnhancedGraphLink接口要求
        if (baseData && baseData.links) {
          baseData.links = baseData.links.map((link: EnhancedGraphLink, index: number) => ({
            ...link,
            id: `link-base-${index}-${Date.now()}`
          }));
        }
        
        // 合并基础节点和图表节点，添加类型注解
        const allNodes: EnhancedNode[] = [...(baseData?.['nodes'] || [])];
        const graphNodes = (graph['nodes'] as EnhancedNode[]).map((node: EnhancedNode) => ({
          ...node,
          connections: 0
        }));
        
        // 确保没有重复节点
        const existingIds = new Set(allNodes.map(n => n['id']));
        graphNodes.forEach(node => {
          if (!existingIds.has(node['id'])) {
            allNodes.push(node);
            existingIds.add(node['id']);
          }
        });

        // 处理链接，确保每个link都有id属性
        const graphLinks = (graph['links'] as GraphLink[]).map((link: GraphLink, index: number) => ({
          ...link,
          id: `graph-link-${Date.now()}-${index}`,
          source: typeof link['source'] === 'string' ? link['source'] : String(link['source']),
            target: typeof link['target'] === 'string' ? link['target'] : String(link['target']),
            type: link['type'] || 'default'
        }));

        // 计算连接数
        const allLinks = [...(baseData?.['links'] || []), ...graphLinks];
        allNodes.forEach(node => {
          node['connections'] = allLinks.filter(
            link => {
              // 安全地处理source和target
              const sourceId = String(link['source']);
              const targetId = String(link['target']);
              const nodeId = String(node['id']);
              return sourceId === nodeId || targetId === nodeId;
            }
          ).length;
        });

        // 确保baseData.links中的链接也有id属性
        const enhancedBaseLinks = (baseData?.['links'] || []).map((link: EnhancedGraphLink, index: number) => ({
          ...link,
          id: `base-link-${Date.now()}-${index}`,
          source: typeof link['source'] === 'string' ? link['source'] : String(link['source']),
          target: typeof link['target'] === 'string' ? link['target'] : String(link['target']),
          type: link['type'] || 'default'
        }));
        
        setNodes(allNodes as EnhancedNode[]);
        setLinks([...enhancedBaseLinks, ...graphLinks]);
        setGraphName((graph as GraphData).name || '未命名图表');
        showNotification('图表加载成功', 'success');
      } else {
        showNotification('图表不存在或已被删除', 'error');
      }
    } catch (error) {
      console.error('Error loading graph:', error);
      showNotification('加载图表失败，请重试', 'error');
      // 加载失败时使用默认数据
      const defaultNodes: EnhancedNode[] = [
        { id: 'default-1', title: '知识节点1', connections: 1, created_by: 'system' },
        { id: 'default-2', title: '知识节点2', connections: 1, created_by: 'system' },
        { id: 'default-3', title: '知识节点3', connections: 1, created_by: 'system' }
      ];
      const defaultLinks: EnhancedGraphLink[] = [
        { id: 'default-link-1', source: 'default-1', target: 'default-2', type: 'related' },
        { id: 'default-link-2', source: 'default-2', target: 'default-3', type: 'related' }
      ];
      setNodes(defaultNodes);
      setLinks(defaultLinks);
    } finally {
      setIsLoading(false);
      setShowGraphList(false);
    }
  }, [showNotification]);

  // 从模板创建新图表
  const createFromTemplate = useCallback(async (templateId: string) => {
    setIsLoading(true);
    try {
      const template = await fetchGraphById(templateId);
      if (template) {
        // 获取基础数据
        // 使用mock数据代替fetchGraphData
        const baseData = { nodes: [], links: [] };
        
        // 创建新的节点ID，避免冲突
        const nodeIdMap: Record<string, string> = {};
        const templateData = template as GraphData;
        const newNodes = (templateData.nodes || []).map((node: NodeData) => {
          const newId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          nodeIdMap[String(node['id'])] = newId;
          return {
            ...node,
            id: newId,
            created_by: user?.['id'] || 'system',
            connections: 0,
            // 为新创建的节点添加创建时间
            created_at: new Date().toISOString()
          };
        });

        // 更新链接的节点ID
        const newLinks = (templateData.links || []).map((link: LinkData) => ({
          id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          source: nodeIdMap[typeof link['source'] === 'string' ? link['source'] : String(link['source'])] || String(link['source']),
          target: nodeIdMap[typeof link['target'] === 'string' ? link['target'] : String(link['target'])] || String(link['target']),
          type: link['type'] || 'default',
          // 添加链接创建时间
          created_at: new Date().toISOString()
        }));

        // 为baseData.links添加id属性
        const enhancedBaseLinks = (baseData?.['links'] || []).map((link: EnhancedGraphLink, index: number) => ({
          ...link,
          id: link['id'] || `base-link-${index}-${Date.now()}`
        }));
        
        // 合并所有节点和链接
        const allNodes = [...(baseData?.['nodes'] || []), ...newNodes];
        const allLinks = [...enhancedBaseLinks, ...newLinks];

        // 计算连接数
        allNodes.forEach(node => {
          node['connections'] = allLinks.filter(
            link => {
              const sourceId = typeof link['source'] === 'object' ? String(link['source']['id']) : String(link['source']);
              const targetId = typeof link['target'] === 'object' ? String(link['target']['id']) : String(link['target']);
              return sourceId === String(node['id']) || targetId === String(node['id']);
            }
          ).length;
          // 确保每个节点都有title属性
          node['title'] = node['title'] || node['name'] || String(node['id']) || '未命名节点';
        });

        setNodes(allNodes as EnhancedNode[]);
        setLinks(allLinks);
        setGraphName(`${templateData['name'] || '未命名模板'} (副本)`);
        setIsEditMode(true);
        showNotification('成功从模板创建图表', 'success');
      } else {
        showNotification('模板不存在或已被删除', 'error');
      }
    } catch (error) {
      console.error('Error creating from template:', error);
      showNotification('从模板创建图表失败，请重试', 'error');
    } finally {
      setIsLoading(false);
      setShowTemplates(false);
    }
  }, [user, showNotification]);

  // 打开保存对话框
  const openSaveDialog = useCallback(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setGraphName(graphName || '未命名图表');
    setShowSaveDialog(true);
  }, [user, navigate, graphName]);

  // 保存图表
  const saveGraph = useCallback(async () => {
    if (!user || !graphName.trim()) {
      showNotification('请先输入图表名称', 'info');
      return;
    }
    
    setIsSaving(true);
    try {
      // 转换节点格式，只保留必要的属性，过滤掉D3.js的临时属性
      const formattedNodes = nodes.map(node => {
        // 只保留核心节点属性，排除D3.js模拟的临时属性
        const { id, title, slug, connections, content, is_custom, created_by } = node;
        return {
          id,
          title,
          slug,
          connections,
          content,
          is_custom,
          created_by
        };
      });
      
      // 转换links格式以匹配saveGraphData的要求
      const formattedLinks = links.map(link => ({
        source: typeof link['source'] === 'object' ? { id: String(link['source']['id']) } : String(link['source']),
        target: typeof link['target'] === 'object' ? { id: String(link['target']['id']) } : String(link['target']),
        type: link['type'],
        id: link['id']
      }));
      
      const success = await saveGraphData({
        userId: user['id'],
        title: graphName.trim(),
        nodes: formattedNodes,
        links: formattedLinks,
        isTemplate: isTemplate
      });
      
      if (success) {
        showNotification(isTemplate ? '模板保存成功' : '图表保存成功', 'success');
        setShowSaveDialog(false);
        await loadUserGraphs(); // 刷新用户图表列表
        
        // 如果保存为模板，也刷新模板列表
        if (isTemplate) {
          await loadTemplates();
        }
      } else {
        showNotification('保存失败，请重试', 'error');
      }
    } catch (error) {
      console.error('Error saving graph:', error);
      showNotification('保存失败：' + (error instanceof Error ? error.message : '未知错误'), 'error');
    } finally {
      setIsSaving(false);
    }
  }, [user, graphName, nodes, links, isTemplate, loadUserGraphs, loadTemplates, showNotification]);

  // 删除图表
  const handleDeleteGraph = useCallback(async (graphId: string) => {
    if (!user) {
      showNotification('请先登录', 'info');
      return;
    }
    
    if (window.confirm('确定要删除这个图表吗？此操作不可恢复。')) {
      try {
        const success = await deleteGraph(graphId);
        if (success) {
          showNotification('图表删除成功', 'success');
          await loadUserGraphs();
        } else {
          showNotification('删除失败，请重试', 'error');
        }
      } catch (error) {
        console.error('Error deleting graph:', error);
        showNotification('删除失败：' + (error instanceof Error ? error.message : '未知错误'), 'error');
      }
    }
  }, [user, loadUserGraphs, showNotification]);

  // 应用布局算法
  const handleApplyLayout = useCallback(() => {
    setApplyLayout(true);
    showNotification(`已应用${layoutType === 'force' ? '力导向' : layoutType === 'hierarchical' ? '层次化' : layoutType === 'circular' ? '圆形' : '网格'}布局`, 'success');
  }, [layoutType, showNotification]);

  // 重置视图到初始状态（回到原点）
  const resetView = useCallback(() => {
    // 重置视图时关闭所有打开的弹窗
    setShowSaveDialog(false);
    setShowImportExportDialog(false);
    
    if (simulationRef.current && containerRef.current) {
      const svgElement = containerRef.current.querySelector('svg') as SVGSVGElement;
      const mainGroup = d3.select(svgElement).select('g');
      
      if (svgElement && mainGroup) {
        // 创建一个新的缩放标识，设置为初始状态
        const initialTransform = d3.zoomIdentity;
        setCurrentTransform(initialTransform);
        setZoomLevel(100); // 重置缩放百分比
        
        // 使用动画过渡到初始视图
        d3.select(svgElement).transition().duration(500).call(
          d3.zoom<SVGSVGElement, unknown>().transform, initialTransform
        );
        
        // 重置模拟的中心
        if (simulationRef.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          simulationRef.current.force('center', d3.forceCenter(width / 2, height / 2));
          simulationRef.current.alpha(0.3).restart(); // 短暂重启以应用新的中心
        }
        
        setNotification({ message: '视图已重置', type: 'info' });
      }
    }
  }, [simulationRef, containerRef, setCurrentTransform, setNotification, setZoomLevel, setShowSaveDialog, setShowImportExportDialog]);

  // 处理键盘控制
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Shift键用于批量选择
    if (event.key === 'Shift') {
      setShiftPressed(true);
    }
    
    // N键添加新节点
    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      if (isEditMode && containerRef.current) {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const x = rect.width / 2;
        const y = rect.height / 2;
        addNode(x, y);
      }
    }
    
    // B键切换批量选择模式
    if (event.key === 'b' || event.key === 'B') {
      event.preventDefault();
      if (isEditMode) {
        setBatchSelectionMode(prev => !prev);
        setNotification({ 
          message: `批量选择模式已${!batchSelectionMode ? '开启' : '关闭'}`, 
          type: 'info' 
        });
        setTimeout(() => setNotification(null), 2000);
      }
    }
    
    // Delete键或D键删除选中的节点
    if (event.key === 'Delete' || event.key === 'Backspace' || event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      if (isEditMode && selectedNodes.length > 0) {
        deleteSelectedNodes();
      } else if (isEditMode && selectedNode) {
        removeNode(selectedNode.id);
      }
    }
    
    // ESC键取消操作或清除选择
    if (event.key === 'Escape') {
      event.preventDefault();
      if (isAddingLink) {
        cancelAddLink();
      } else {
        setSelectedNode(null);
        setSelectedNodes([]);
      }
    }
    
    // 空格键重置视图
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      // 使用resetView函数统一处理视图重置
      resetView();
    }
    
    // 撤销操作 (Ctrl+Z)
    if (event.ctrlKey && (event.key === 'z' || event.key === 'Z')) {
      event.preventDefault();
      if (isEditMode && recentActions.length > 0) {
        const lastAction = recentActions[0];
        if (lastAction && lastAction.type === 'addNode' && lastAction.nodeId) {
          // 保存当前状态用于前进
          const nodeToRestore = nodes.find(n => n.id === lastAction.nodeId);
          const linksToRestore = links.filter(link => {
            const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
            const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
            return sourceId === lastAction.nodeId || targetId === lastAction.nodeId;
          });
            
          // 撤销添加节点
          setNodes(prev => prev.filter(node => node.id !== lastAction.nodeId));
          // 移除相关链接
          setLinks(prev => prev.filter(link => {
            const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
            const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
            return sourceId !== lastAction.nodeId && targetId !== lastAction.nodeId;
          }));
          // 更新操作历史：将撤销的操作移到futureActions
          setRecentActions(prev => prev.slice(1));
          if (nodeToRestore) {
            setFutureActions(prev => [{ 
              type: 'addNode',
              nodeId: lastAction.nodeId,
              timestamp: lastAction.timestamp,
              data: { node: nodeToRestore, links: linksToRestore } 
            }, ...prev]);
          }
          showNotification('已撤销添加节点', 'info');
          // 重启模拟
          if (simulationRef.current) {
            simulationRef.current.alpha(0.3).restart();
          }
        }
      }
    }
    
    // 前进操作 (Ctrl+Y)
    if (event.ctrlKey && (event.key === 'y' || event.key === 'Y')) {
      event.preventDefault();
      if (isEditMode && futureActions.length > 0) {
        const nextAction = futureActions[0];
        if (nextAction && nextAction.type === 'addNode' && nextAction.nodeId && nextAction.data?.node) {
          // 前进添加节点
          const { data } = nextAction;
          if (data && data.node) {
            setNodes(prev => [...prev, data.node]);
            // 恢复相关链接
            if (data.links && data.links.length > 0) {
              setLinks(prev => [...prev, ...data.links]);
            }
          }
          // 更新操作历史：将前进的操作移回recentActions
          setFutureActions(prev => prev.slice(1));
          setRecentActions(prev => [nextAction, ...prev]);
          showNotification('已前进添加节点', 'info');
          // 重启模拟
          if (simulationRef.current) {
            simulationRef.current.alpha(0.3).restart();
          }
        }
      }
    }
    
    // Ctrl+C复制选中的节点
    if (event.ctrlKey && (event.key === 'c' || event.key === 'C')) {
      event.preventDefault();
      if (isEditMode && selectedNodes.length > 0) {
        copySelectedNodes();
      } else if (isEditMode && selectedNode) {
        // 复制单个节点
        setCopiedNode({ node: selectedNode, timestamp: Date.now() });
        setNotification({ message: '已复制节点', type: 'info' });
        setTimeout(() => setNotification(null), 2000);
      }
    }
    
    // Ctrl+V粘贴节点
    if (event.ctrlKey && (event.key === 'v' || event.key === 'V')) {
      event.preventDefault();
      if (isEditMode && containerRef.current) {
        pasteNodes();
      }
    }
    
    // Ctrl+L连接选中的节点
    if (event.ctrlKey && (event.key === 'l' || event.key === 'L')) {
      event.preventDefault();
      if (isEditMode) {
        connectSelectedNodes();
      }
    }
    
    // WASD或箭头键移动视角
    const moveAmount = 20;
    let newX = currentTransform.x;
    let newY = currentTransform.y;
    
    const svg = containerRef.current?.querySelector('svg g');
    if (!svg) return;
    
    switch (event.key) {
      case 'n':
      case 'N':
        event.preventDefault();
        // 快速添加节点 - 居中位置
        if (isEditMode && typeof addNode === 'function') {
          const centerX = containerRef.current?.clientWidth || 800;
          const centerY = containerRef.current?.clientHeight || 600;
          addNode(centerX / 2, centerY / 2);
        }
        break;
      case 'w':
      case 'W':
      case 'ArrowUp':
        event.preventDefault();
        newY += moveAmount;
        break;
      case 's':
      case 'S':
      case 'ArrowDown':
        event.preventDefault();
        newY -= moveAmount;
        break;
      case 'a':
      case 'A':
      case 'ArrowLeft':
        event.preventDefault();
        newX += moveAmount;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newX -= moveAmount;
        break;
      case '+':
        case '=':
          event.preventDefault();
          // 放大，确保在限制范围内
          if (simulationRef.current && containerRef.current) {
            const svgElement = containerRef.current.querySelector('svg') as SVGSVGElement;
            if (svgElement && currentTransform.k < 5) { // 确保未达到最大缩放
              // 计算新的缩放比例，确保不超过最大值，调整缩放敏感度为10%增量
              const newScale = Math.min(currentTransform.k * 1.1, 5);
              const scaleFactor = newScale / currentTransform.k;
              
              d3.select(svgElement).transition().duration(200).call(
                d3.zoom<SVGSVGElement, unknown>().scaleBy, scaleFactor
              );
            }
          }
          break;
        case '-':
        case '_':
          event.preventDefault();
          // 缩小，确保在限制范围内
          if (simulationRef.current && containerRef.current) {
            const svgElement = containerRef.current.querySelector('svg') as SVGSVGElement;
            if (svgElement && currentTransform.k > 0.1) { // 确保未达到最小缩放
              // 计算新的缩放比例，确保不低于最小值，调整缩放敏感度为10%减量
              const newScale = Math.max(currentTransform.k * 0.9, 0.1);
              const scaleFactor = newScale / currentTransform.k;
              
              d3.select(svgElement).transition().duration(200).call(
                d3.zoom<SVGSVGElement, unknown>().scaleBy, scaleFactor
              );
            }
          }
          break;
    }
    
    // 应用新的平移
    if (newX !== currentTransform.x || newY !== currentTransform.y) {
      const newTransform = d3.zoomIdentity.translate(newX, newY).scale(currentTransform.k);
      setCurrentTransform(newTransform);
      svg.setAttribute('transform', newTransform.toString());
    }
  }, [isEditMode, currentTransform, addNode, batchSelectionMode, selectedNodes, selectedNode, deleteSelectedNodes, removeNode, isAddingLink, cancelAddLink, copySelectedNodes, pasteNodes, connectSelectedNodes, setShiftPressed, setNotification, setCopiedNode, simulationRef, containerRef, recentActions, resetView, showNotification]); // 移除未定义的 suggestedTargetNodes 依赖项

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Shift') {
      setShiftPressed(false);
    }
  }, [setShiftPressed]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 更新视图范围
    // 使用容器尺寸作为视图边界

    // 重用现有SVG或创建新的
    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> = d3.select(containerRef.current).select('svg');
    let mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    let linkGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    let nodeGroup: d3.Selection<SVGGElement, unknown, null, undefined>;

    if (svg.empty()) {
      // 创建新的SVG结构
      svg = d3.select(containerRef.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('style', 'display: block'); // 确保SVG正确显示
        
      // 添加背景矩形，确保整个区域可点击，提高点击检测可靠性
      svg.append('rect')
        .attr('class', 'background-rect')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all');
        
      mainGroup = svg.append('g');
      linkGroup = mainGroup.append('g').attr('class', 'links');
      nodeGroup = mainGroup.append('g').attr('class', 'nodes');

      // 设置缩放，添加缩放范围限制（0.5-3倍）
      svg.call(d3.zoom<SVGSVGElement, unknown>()
              .scaleExtent([0.1, 5]) // 统一缩放范围为10%-500%
              .on('zoom', (event) => {
          mainGroup.attr('transform', event.transform);
          setCurrentTransform(event.transform);
        })
      );

      // 应用初始变换
      if (currentTransform) {
        mainGroup.attr('transform', currentTransform.toString());
      }
    } else {
      // 重用现有结构
      mainGroup = svg.select('g');
      linkGroup = mainGroup.select('.links');
      nodeGroup = mainGroup.select('.nodes');
      
      // 更新SVG尺寸
      svg.attr('width', width).attr('height', height);
    }

    // 应用不同布局算法
    const applyLayoutAlgorithm = (nodes: EnhancedNode[], links: EnhancedGraphLink[], layoutType: string) => {
      const newNodes = [...nodes];
      
      switch (layoutType) {
        case 'hierarchical': {
          // 简单的层次化布局实现
          const levels: { [key: string]: number } = {};
          const children: { [key: string]: string[] } = {};
          const parents: { [key: string]: string[] } = {};
          
          // 初始化父子关系
          links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : String(link.source);
            const targetId = typeof link.target === 'object' ? link.target.id : String(link.target);
            
            if (!children[sourceId]) children[sourceId] = [];
            if (!parents[targetId]) parents[targetId] = [];
            
            children[sourceId].push(targetId);
            parents[targetId].push(sourceId);
          });
          
          // 找出根节点（没有父节点的节点）
          const roots = newNodes.filter(node => {
            const nodeParents = parents[node.id];
            return !nodeParents || nodeParents.length === 0;
          });
          
          // 递归计算层级
          const calculateLevel = (nodeId: string, level: number) => {
            levels[nodeId] = level;
            if (children[nodeId]) {
              children[nodeId].forEach(childId => {
                if (!levels[childId] || levels[childId] < level + 1) {
                  calculateLevel(childId, level + 1);
                }
              });
            }
          };
          
          roots.forEach(root => calculateLevel(root.id, 0));
          
          // 计算每个层级的节点
          const levelNodes: { [key: number]: string[] } = {};
          newNodes.forEach(node => {
            const level = levels[node.id] || 0;
            if (!levelNodes[level]) levelNodes[level] = [];
            levelNodes[level].push(node.id);
          });
          
          const maxLevel = Math.max(...Object.keys(levelNodes).map(Number), 0);
          const levelHeight = height / (maxLevel + 1);
          
          // 应用布局
          newNodes.forEach(node => {
            const level = levels[node.id] || 0;
            const currentLevelNodes = levelNodes[level] || [];
            const levelNodeIndex = currentLevelNodes.indexOf(node.id);
            const levelWidth = width / (currentLevelNodes.length + 1);
            
            if (layoutDirection === 'top-bottom') {
              node.x = levelWidth * (levelNodeIndex + 1);
              node.y = levelHeight * (level + 1);
            } else {
              node.x = levelHeight * (level + 1);
              node.y = levelWidth * (levelNodeIndex + 1);
            }
          });
          break;
          }
          
        case 'circular': {
          // 圆形布局实现
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = Math.min(width, height) / 3;
          
          newNodes.forEach((node, index) => {
            const angle = (index / newNodes.length) * 2 * Math.PI;
            node.x = centerX + Math.cos(angle) * radius;
            node.y = centerY + Math.sin(angle) * radius;
          });
          break;
          }
          
        case 'grid': {
          // 网格布局实现
          const gridSize = Math.ceil(Math.sqrt(newNodes.length));
          const cellSize = Math.min(width, height) / (gridSize + 1);
          
          newNodes.forEach((node, index) => {
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            node.x = (col + 1) * cellSize;
            node.y = (row + 1) * cellSize;
          });
          break;
          }
          
        case 'force':
        default: {
          // 力导向布局，使用默认的位置或保留现有位置
          newNodes.forEach(node => {
            if (!node.x || !node.y) {
              node.x = Math.random() * (width - 200) + 100;
              node.y = Math.random() * (height - 200) + 100;
            }
          });
          break;
          }
      }
      
      return newNodes;
    };
    
    // 应用布局算法
    const nodesWithLayout = applyLayout ? applyLayoutAlgorithm(nodes, links, layoutType) : nodes;
    // 只有当nodesWithLayout与原nodes不同时才更新状态，避免无限循环
    if (nodesWithLayout !== nodes) {
      setNodes(nodesWithLayout);
    }
    setApplyLayout(false);
    
    // 创建或更新模拟
    let simulation = simulationRef.current;
    if (!simulation || isSimulationRunning) {
      simulation = d3.forceSimulation<EnhancedNode, EnhancedGraphLink>(nodesWithLayout)
        .force('link', d3.forceLink<EnhancedNode, EnhancedGraphLink>(links)
          .id(d => d.id)
          .distance(150)
        )
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(60)); // 添加碰撞检测

      // 优化大型图表性能
      if (nodes.length > 100) {
        simulation
          .alphaMin(0.01)
          .alphaDecay(0.02)
          .velocityDecay(0.4);
      }
      
      // 对于非力导向布局，使用静态位置
      if (layoutType !== 'force') {
        simulation.alpha(0).stop();
      }

      simulationRef.current = simulation;
    } else {
      // 更新现有模拟的节点和链接
      simulation
        .nodes(nodesWithLayout)
        .force('link', d3.forceLink(links).id((d: d3.SimulationNodeDatum) => (d as EnhancedNode).id).distance(150))
        .force('center', d3.forceCenter(width / 2, height / 2));
      
      // 对于非力导向布局，使用静态位置
      if (layoutType !== 'force') {
        simulation.alpha(0).stop();
      }
    }

    // 绘制临时连接线（从源节点到鼠标位置）
    const tempLink = mainGroup.selectAll<SVGLineElement, unknown>('.temp-link')
      .data(isAddingLink && linkSourceNode ? [{}] : []);
    
    // 内联函数来获取节点位置，避免变量提升问题
    const getNodePositionInline = (node: EnhancedNode | null | undefined) => {
      if (!node) {
        return {x: 0, y: 0};
      }
      return {x: node.x || 0, y: node.y || 0};
    };
    
    // 绘制主临时线
    tempLink
      .enter()
      .append('line')
      .attr('class', 'temp-link')
      .attr('stroke', '#10b981')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .merge(tempLink)
      .attr('x1', linkSourceNode ? getNodePositionInline(linkSourceNode).x : 0)
      .attr('y1', linkSourceNode ? getNodePositionInline(linkSourceNode).y : 0)
      .attr('x2', mousePosition ? mousePosition.x : 0)
      .attr('y2', mousePosition ? mousePosition.y : 0);
    
    tempLink.exit().remove();
    
    // 绘制自动连接建议线
    const suggestionLinks = mainGroup.selectAll<SVGLineElement, EnhancedNode>('.suggestion-link')
      .data(isAddingLink && linkSourceNode ? suggestedTargetNodes : []);
    
    suggestionLinks
      .enter()
      .append('line')
      .attr('class', 'suggestion-link')
      .attr('stroke', '#6366f1')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .merge(suggestionLinks)
      .attr('x1', getNodePositionInline(linkSourceNode).x)
      .attr('y1', getNodePositionInline(linkSourceNode).y)
      .attr('x2', d => getNodePositionInline(d).x)
      .attr('y2', d => getNodePositionInline(d).y);
    
    suggestionLinks.exit().remove();

    // 过滤节点：结合搜索筛选和可见范围筛选
    const baseFilteredNodes = debouncedNodeSearchQuery.trim() 
      ? nodes.filter((node) => {
          const matchesSearch = node.title.toLowerCase().includes(debouncedNodeSearchQuery.toLowerCase()) ||
                               (node.content && node.content.toLowerCase().includes(debouncedNodeSearchQuery.toLowerCase()));
          return matchesSearch;
        })
      : nodes;
    
    // 过滤可见节点，实现动态加载
    // 对于新创建的节点（可能还没有位置信息），总是显示
    const filteredNodes = baseFilteredNodes.filter((node) => {
      if (!node.x || !node.y) {
        return true; // 没有位置信息的节点总是可见
      }
      const pos = getNodePosition(node);
      // 检查节点是否在可见范围内
      return pos.x >= viewBounds.x1 && 
             pos.x <= viewBounds.x2 && 
             pos.y >= viewBounds.y1 && 
             pos.y <= viewBounds.y2;
    });
    
    // 过滤可见链接，只保留与可见节点相关的链接
    const visibleNodeIds = new Set(filteredNodes.map(node => node.id));
    const filteredLinks = links.filter(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source);
      const targetId = typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target);
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });
    
    // 更新模拟中的链接，只使用可见链接
    if (simulationRef.current) {
      simulationRef.current.force('link', d3.forceLink(filteredLinks).id((d: d3.SimulationNodeDatum) => (d as EnhancedNode).id).distance(150));
    }
    
    // 更新链接 - 只渲染可见链接
    const link = linkGroup.selectAll('line')
      .data(filteredLinks, (d) => (d as EnhancedGraphLink).id)
      .join(
        enter => enter.append('line')
          .attr('stroke', linkStyle.color)
          .attr('stroke-opacity', linkStyle.opacity)
          .attr('stroke-width', linkStyle.width)
          .attr('stroke-dasharray', linkStyle.dasharray)
          .attr('cursor', isEditMode ? 'pointer' : 'default'),
        update => update
          .attr('stroke', linkStyle.color)
          .attr('stroke-opacity', linkStyle.opacity)
          .attr('stroke-width', linkStyle.width)
          .attr('stroke-dasharray', linkStyle.dasharray),
        exit => exit.remove()
      );
    
    // 更新链接文本 - 只渲染可见链接
    linkGroup.selectAll('.link-text')
      .data(filteredLinks, (d) => (d as EnhancedGraphLink).id)
      .join(
        enter => {
          // 为链接文本创建foreignObject以支持LaTeX
          return enter.append('foreignObject')
            .attr('class', 'link-text')
            .attr('width', 150) // 设置足够的宽度
            .attr('height', 40) // 设置足够的高度
            .style('pointer-events', 'none')
            .each(function(d: EnhancedGraphLink) {
              const textDiv = d3.select(this).append('div')
                .attr('class', 'link-text-content')
                .style('text-align', 'center')
                .style('font-size', '10px')
                .style('color', '#333')
                .style('background', 'rgba(255, 255, 255, 0.8)')
                .style('padding', '2px 5px')
                .style('border-radius', '3px')
                .style('white-space', 'nowrap');
              
              // 初始渲染
              const linkType = d.type || '';
              if (linkType.includes('$') || linkType.includes('\\(') || linkType.includes('\\[')) {
                try {
                  katex.render(linkType, textDiv.node() as HTMLElement, {
                    throwOnError: false,
                    displayMode: linkType.includes('\\['),
                  });
                } catch (error) {
                  console.error('Error rendering link LaTeX:', error);
                  textDiv.text(linkType);
                }
              } else {
                textDiv.text(linkType);
              }
            });
        },
        update => {
          // 更新链接文本
          update.select('.link-text-content')
            .each(function(d: EnhancedGraphLink) {
              const textDiv = d3.select(this);
              const linkType = d.type || '';
              
              if (linkType.includes('$') || linkType.includes('\\(') || linkType.includes('\\[')) {
                try {
                  katex.render(linkType, this as HTMLElement, {
                    throwOnError: false,
                    displayMode: linkType.includes('\\['),
                  });
                } catch (error) {
                  console.error('Error updating link LaTeX:', error);
                  textDiv.text(linkType);
                }
              } else {
                textDiv.text(linkType);
              }
            });
          return update;
        },
        exit => exit.remove()
      );
    
    // 根据是否编辑模式动态添加/移除删除按钮 - 只针对可见链接
    if (isEditMode) {
      linkGroup.selectAll('.link-delete')
        .data(filteredLinks, (d) => (d as EnhancedGraphLink).id)
        .join(
          enter => {
            const g = enter.append('g')
              .attr('class', 'link-delete')
              .style('cursor', 'pointer')
              .on('click', (event, d) => {
                event.stopPropagation();
                removeLink(d.id);
              });

            g.append('circle')
              .attr('r', 6)
              .attr('fill', 'red')
              .attr('stroke', 'white')
              .attr('stroke-width', 1);

            g.append('text')
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .attr('fill', 'white')
              .attr('font-size', '8px')
              .text('×');
            return g;
          },
          update => update,
          exit => exit.remove()
        );
    } else {
      linkGroup.selectAll('.link-delete').remove();
    }
    
    // 创建节点 - 使用优化的join模式和键函数，只渲染可见节点
    const node = nodeGroup.selectAll('g')
      .data(filteredNodes, (d) => (d as EnhancedNode).id)
      .join(
        enter => {
          const g = enter.append('g')
            .attr('cursor', isEditMode ? 'pointer' : 'default')
            .attr('data-node-id', (d) => d.id)
            .call(d3.drag<SVGGElement, EnhancedNode>()
              .on('start', dragstarted)
              .on('drag', dragged)
              .on('end', dragended)
            )
            .on('click', (event, d) => {
        event.stopPropagation();
        if (isAddingLink) {
          completeAddLink(d);
        } else if (isEditMode) {
          if (batchSelectionMode || shiftPressed) {
            // 批量选择模式下，添加或移除节点
            if (selectedNodes.some(node => node.id === d.id)) {
              // 如果节点已选中，则移除
              setSelectedNodes(prev => prev.filter(node => node.id !== d.id));
            } else {
              // 如果节点未选中，则添加
              setSelectedNodes(prev => [...prev, d]);
            }
          } else {
            // 普通模式下，再次点击已选中的节点时直接开始添加连接
            if (selectedNode && selectedNode.id === d.id) {
              startAddLink(d);
            } else {
              // 否则先选择节点，让用户能够看到节点信息后再添加连接
              setSelectedNode(d);
              setSelectedNodes([]); // 清除批量选择
              setNodeTitle(d.title);
              setNodeContent(d.content || '');
            }
          }
        } else {
          // 非编辑模式下，点击选择节点
          setSelectedNode(d);
          setSelectedNodes([]);
        }
      })
            .on('dblclick', (event) => {
              event.stopPropagation();
              if (isEditMode) {
                const point = d3.pointer(event, svg.node() as Element);
                addNode(point[0], point[1]);
              }
            });
            
          // 初始化节点形状和标签
          g.append('circle')
            .attr('r', 20) // 增大节点尺寸
            .attr('fill', '#6366f1')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
          
          // 自动连接建议指示器
          g.append('circle')
            .attr('class', 'suggestion-indicator')
            .attr('r', 26)
            .attr('fill', 'none')
            .attr('stroke', '#6366f1')
            .attr('stroke-opacity', 0)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,2');
          
          // 连接目标指示器（用于显示正在连接的节点）
          g.append('circle')
            .attr('class', 'target-indicator')
            .attr('r', 26)
            .attr('fill', 'none')
            .attr('stroke', '#10b981')
            .attr('stroke-opacity', 0)
            .attr('stroke-width', 3);
            
          // 为节点文本创建一个包装元素，以支持LaTeX渲染
            g.append('foreignObject')
              .attr('width', 100) // 设置足够的宽度
              .attr('height', 50) // 设置足够的高度
              .attr('x', -50) // 居中对齐
              .attr('y', -25) // 居中对齐
              .style('pointer-events', 'none')
              .append('div')
              .attr('class', 'node-text')
              .style('text-align', 'center')
              .style('font-size', '12px')
              .style('color', '#333')
              .style('line-height', '1.2')
              .each(function(d: EnhancedNode) {
                const div = d3.select(this);
                // 渲染LaTeX内容
                try {
                  const title = d.title.length > 30 ? `${d.title.substring(0, 30)}...` : d.title;
                  if (title.includes('$') || title.includes('\\(') || title.includes('\\[')) {
                    katex.render(title, this as HTMLElement, {
                      throwOnError: false,
                      displayMode: title.includes('\\[') || (title.startsWith('$') && title.endsWith('$') && title.length > 2),
                    });
                  } else {
                    div.text(title);
                  }
                } catch (error) {
                  console.error('Error rendering node LaTeX:', error);
                  div.text(d.title.length > 30 ? `${d.title.substring(0, 30)}...` : d.title);
                }
              });
            
          g.append('title')
            .text(d => d.title);
            
          return g;
        },
        update => {
          // 更新节点但保留已有元素
          return update;
        },
        exit => exit.remove()
      );
      
      // 无论新增还是更新的节点，都更新其状态
      node
        .attr('data-node-id', d => d.id)
        .select('circle')
        .attr('r', nodeStyle.size) // 使用自定义节点大小
        .attr('fill', d => {
          // 检查是否在批量选中的节点中
          const isBatchSelected = selectedNodes.some(node => node.id === d.id);
          if (d.id === selectedNode?.id) return '#ef4444';
          if (isBatchSelected) return '#f97316'; // 橙色表示批量选中
          if (isAddingLink && d.id === linkSourceNode?.id) return '#10b981';
          // 检查节点是否正在被拖拽
          const isDragging = d3.select(`[data-node-id="${d.id}"]`).classed('dragging');
          if (isDragging) return '#3b82f6'; // 拖拽中的节点使用蓝色高亮
          // 搜索高亮
          if (debouncedNodeSearchQuery.trim()) {
            const matchesSearch = d.title.toLowerCase().includes(debouncedNodeSearchQuery.toLowerCase()) ||
                                 (d.content && d.content.toLowerCase().includes(debouncedNodeSearchQuery.toLowerCase()));
            if (matchesSearch) return '#f59e0b'; // 橙色高亮匹配节点
          }
          // 聚类颜色
          if (isClusteringEnabled && clusters[d.id] !== undefined && clusterColors.length > 0) {
            const clusterIndex = clusters[d.id];
            if (clusterIndex !== undefined) {
              return clusterColors[clusterIndex % clusterColors.length] || (d.is_custom ? nodeStyle.color : '#6366f1');
            }
          }
          return d.is_custom ? nodeStyle.color : '#6366f1'; // 使用自定义节点颜色
        })
        .attr('stroke', d => {
          // 检查节点是否正在被拖拽
          const isDragging = d3.select(`[data-node-id="${d.id}"]`).classed('dragging');
          if (isDragging) return '#0ea5e9'; // 拖拽中的节点使用更亮的蓝色边框
          // 搜索高亮节点边框
          if (debouncedNodeSearchQuery.trim()) {
            const matchesSearch = d.title.toLowerCase().includes(debouncedNodeSearchQuery.toLowerCase()) ||
                                 (d.content && d.content.toLowerCase().includes(debouncedNodeSearchQuery.toLowerCase()));
            if (matchesSearch) return '#d97706'; // 深橙色边框
          }
          return nodeStyle.borderColor; // 使用自定义边框颜色
        })
        .attr('stroke-width', d => {
          // 批量选中的节点有更宽的边框
          const isBatchSelected = selectedNodes.some(node => node.id === d.id);
          // 检查节点是否正在被拖拽
          const isDragging = d3.select(`[data-node-id="${d.id}"]`).classed('dragging');
          // 搜索高亮节点边框加粗
          if (debouncedNodeSearchQuery.trim()) {
            const matchesSearch = d.title.toLowerCase().includes(debouncedNodeSearchQuery.toLowerCase()) ||
                                 (d.content && d.content.toLowerCase().includes(debouncedNodeSearchQuery.toLowerCase()));
            if (matchesSearch) return nodeStyle.borderWidth * 1.5; // 搜索结果边框加粗1.5倍
          }
          return isBatchSelected || isDragging ? nodeStyle.borderWidth * 1.5 : nodeStyle.borderWidth; // 使用自定义边框宽度
        })
        .attr('filter', d => {
          // 为搜索结果添加阴影效果
          if (debouncedNodeSearchQuery.trim()) {
            const matchesSearch = d.title.toLowerCase().includes(debouncedNodeSearchQuery.toLowerCase()) ||
                                 (d.content && d.content.toLowerCase().includes(debouncedNodeSearchQuery.toLowerCase()));
            if (matchesSearch) {
              return 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))';
            }
          }
          return null;
        });
      
      // 更新自动连接建议指示器
      node.select('.suggestion-indicator')
        .attr('stroke-opacity', (d) => {
          return isAddingLink && suggestedTargetNodes.some(node => node.id === d.id) ? 0.8 : 0;
        });
      
      // 更新连接目标指示器
      node.select('.target-indicator')
        .attr('stroke-opacity', (d) => {
          // 排除源节点
          if (isAddingLink && linkSourceNode && d.id !== linkSourceNode.id) {
            // 检查是否已有连接
            const exists = links.some(link => {
              const sourceId = typeof link?.source === 'object' ? String((link.source as EnhancedNode).id || '') : String(link?.source || '');
              const targetId = typeof link?.target === 'object' ? String((link.target as EnhancedNode).id || '') : String(link?.target || '');
              return (String(sourceId) === String(linkSourceNode.id) && String(targetId) === String(d.id)) ||
                     (String(sourceId) === String(d.id) && String(targetId) === String(linkSourceNode.id));
            });
            // 如果没有连接，则显示目标指示器
            return exists ? 0 : 0.8;
          }
          return 0;
        });
      
      // 更新节点文本，使用foreignObject中的div元素
      node.select('foreignObject')
        .select('div')
        .each(function(d: EnhancedNode) {
          const div = d3.select(this);
          // 渲染LaTeX内容
          try {
            const title = d.title.length > 30 ? `${d.title.substring(0, 30)}...` : d.title;
            if (title.includes('$') || title.includes('(') || title.includes('[')) {
              katex.render(title, this as HTMLElement, {
                throwOnError: false,
                displayMode: title.includes('[') || (title.startsWith('$') && title.endsWith('$') && title.length > 2),
              });
            } else {
              div.text(title);
            }
          } catch (error) {
            console.error('Error rendering node LaTeX:', error);
            div.text(d.title.length > 30 ? `${d.title.substring(0, 30)}...` : d.title);
          }
        });
      
      node.select('title')
        .text(d => d.title);

    // 为节点组添加数据属性以便选择
    node.attr('data-node-id', d => d.id);
    
    // 为节点添加点击事件处理
    node.on('click', (event: MouseEvent) => {
      event.stopPropagation(); // 阻止冒泡到SVG，防止空白区域点击处理
      
      // 使用更具体的类型定义来访问d3的__data__属性
      interface D3Element extends HTMLElement {
        __data__?: EnhancedNode;
      }
      const clickedNode = (event.currentTarget as D3Element)?.__data__;
      if (!clickedNode) return; // 防御性检查
      
      // 正常的节点点击处理逻辑保持不变
      if (isAddingLink && linkSourceNode) {
        completeAddLink(clickedNode);
      } else {
        // 处理节点选择
        if (batchSelectionMode || shiftPressed) {
          // 批量选择模式
          if (selectedNodes.some(n => n.id === clickedNode.id)) {
            // 如果已选中，则取消选择
            setSelectedNodes(prev => prev.filter(n => n.id !== clickedNode.id));
            if (selectedNode?.id === clickedNode.id) {
              setSelectedNode(null);
            }
          } else {
            // 添加到选中列表
            setSelectedNodes(prev => [...prev, clickedNode]);
            setSelectedNode(clickedNode);
          }
        } else {
          // 单选模式
          setSelectedNode(clickedNode);
          setSelectedNodes([clickedNode]);
          
          // 更新表单值
          setNodeTitle(clickedNode.title);
          setNodeContent(clickedNode.content || '');
        }
      }
    });
    
    // 允许在空白区域双击添加节点
    svg.on('dblclick', (event) => {
      try {
        // 安全地检查事件目标
        const isBackgroundTarget = event.target === svg.node() || 
          ((event.target as Element)?.tagName === 'rect' && 
           (event.target as Element).getAttribute('class')?.includes('background-rect'));
          
        // 确保事件目标是SVG本身或主背景
        if (isEditMode && isBackgroundTarget) {
          try {
            const point = d3.pointer(event, svg.node() as Element);
            if (typeof addNode === 'function') {
              addNode(point[0], point[1]);
              
              // 高亮显示新创建的节点
              setTimeout(() => {
                try {
                  // 修复索引错误 - 数组索引应该是length-1
                  const lastNode = nodes[nodes.length - 1];
                  if (lastNode) {
                    // 可以在这里添加视觉反馈，如闪烁动画等
                  }
                } catch (highlightError) {
                  console.warn('Error highlighting new node:', highlightError);
                }
              }, 100);
            }
          } catch (addNodeError) {
            console.warn('Error adding node on double click:', addNodeError);
          }
        }
      } catch (error) {
        // 捕获所有异常，防止图表崩溃
        console.warn('Error in SVG double click handler:', error);
      }
    });

    // Shift+Click 添加多个节点
    svg.on('click', (event) => {
      try {
        // 安全地检查事件目标
        const isBackgroundTarget = event.target === svg.node() || 
          ((event.target as Element)?.tagName === 'rect' && 
           (event.target as Element).getAttribute('class')?.includes('background-rect'));
          
        // 确保事件目标是SVG本身或主背景，并且按下了Shift键
        if (isEditMode && shiftPressed && isBackgroundTarget) {
          try {
            const point = d3.pointer(event, svg.node() as Element);
            // 使用批量模式添加节点
            if (typeof addNode === 'function') {
              addNode(point[0], point[1], true);
              
              // 提供视觉反馈
              if (typeof showNotification === 'function') {
                showNotification('已添加节点，继续点击添加更多', 'info');
              }
            }
          } catch (addNodeError) {
            console.warn('Error adding node on click:', addNodeError);
          }
        }
        
        // 确保事件目标是SVG本身或主背景
        if (isEditMode && shiftPressed && !isAddingLink && isBackgroundTarget) {
          try {
            const point = d3.pointer(event, svg.node() as Element);
            if (typeof addMultipleNodes === 'function') {
              addMultipleNodes(point[0], point[1]);
            }
          } catch (addMultiNodeError) {
            console.warn('Error adding multiple nodes:', addMultiNodeError);
          }
        } else if (!isAddingLink && !shiftPressed) {
          try {
            // 单击空白区域时取消选择 - 安全地更新状态
            setSelectedNode(null);
            setSelectedNodes([]);
          } catch (selectionError) {
            console.warn('Error clearing selection:', selectionError);
          }
        }
      } catch (error) {
        // 捕获所有异常，防止图表崩溃
        console.warn('Error in SVG click handler:', error);
      }
    });

    // 优化拖拽函数
    function dragstarted(event: d3.D3DragEvent<SVGGElement, EnhancedNode, EnhancedNode>) {
      if (simulation) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        const subject = event.subject;
        // 锁定节点位置
        subject.fx = subject.x;
        subject.fy = subject.y;
        
        // 暂停模拟以获得更好的拖拽体验
        simulation.stop();
      }
      
      // 增强拖拽视觉反馈：高亮当前拖拽节点
      // 由于event.target是DragBehavior，我们需要直接操作节点元素
      const draggedNodeId = event.subject.id;
      const draggedNodeElement = svg.select(`[data-node-id="${draggedNodeId}"]`);
      draggedNodeElement.classed('dragging', true);
      
      // 添加拖拽阴影效果
      draggedNodeElement.style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))');
      draggedNodeElement.style('z-index', '1000'); // 确保拖拽节点在最上层
      
      // 显示连接点 - 增强版
      const connectionPoints = [
        { x: 0, y: -25, position: 'top' },
        { x: 25, y: 0, position: 'right' },
        { x: 0, y: 25, position: 'bottom' },
        { x: -25, y: 0, position: 'left' }
      ];
      
      connectionPoints.forEach(point => {
        draggedNodeElement.append('circle')
          .attr('class', 'connection-point')
          .attr('cx', point.x)
          .attr('cy', point.y)
          .attr('r', 0) // 初始半径为0，用于动画
          .attr('fill', '#10b981')
          .attr('stroke', 'white')
          .attr('stroke-width', 2)
          .attr('opacity', 0) // 初始透明度为0，用于动画
          // 添加出现动画
          .transition()
          .duration(200)
          .attr('r', 6) // 增大连接点尺寸
          .attr('opacity', 1) // 完全不透明
          .attr('stroke-width', 3); // 增粗边框
      });
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, EnhancedNode, EnhancedNode>) {
      const subject = event.subject;
      // 更新节点位置
      subject.fx = event.x;
      subject.fy = event.y;
      
      // 手动触发模拟一次以更新连接
      if (simulation) {
        simulation.tick();
      }
      
      // 立即更新所有相关元素位置
      node.attr('transform', d => `translate(${d.x}, ${d.y})`);
      
      // 立即更新连接位置
      link
        .attr('x1', d => getNodePosition(d.source).x)
        .attr('y1', d => getNodePosition(d.source).y)
        .attr('x2', d => getNodePosition(d.target).x)
        .attr('y2', d => getNodePosition(d.target).y);
        
      // 更新连接删除按钮位置
      if (isEditMode) {
        svg.selectAll<SVGGElement, EnhancedGraphLink>('.link-delete')
          .attr('transform', (d: EnhancedGraphLink) => {
            const sourcePos = getNodePosition(d.source);
            const targetPos = getNodePosition(d.target);
            const midX = (sourcePos.x + targetPos.x) / 2;
            const midY = (sourcePos.y + targetPos.y) / 2;
            return `translate(${midX}, ${midY})`;
          });
      }
      
      // 更新连接文字位置
      try {
        svg.selectAll<SVGTextElement, EnhancedGraphLink>('.link-text')
          .attr('x', (d: EnhancedGraphLink) => {
            const sourcePos = getNodePosition(d.source);
            const targetPos = getNodePosition(d.target);
            return (sourcePos.x + targetPos.x) / 2;
          })
          .attr('y', (d: EnhancedGraphLink) => {
            const sourcePos = getNodePosition(d.source);
            const targetPos = getNodePosition(d.target);
            return (sourcePos.y + targetPos.y) / 2;
          });
      } catch (linkTextError) {
        console.warn('Error updating link text during drag:', linkTextError);
      }
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, EnhancedNode, EnhancedNode>) {
      const subject = event.subject;
      // In edit mode, keep nodes fixed in position after dragging
      if (isEditMode) {
        subject.fx = event.x;
        subject.fy = event.y;
      } else {
        subject.fx = null;
        subject.fy = null;
        // 在非编辑模式下重新启动模拟
        if (simulation) {
          if (!event.active) simulation.alphaTarget(0);
          simulation.alpha(0.1).restart();
        }
      }
      
      // 移除拖拽视觉反馈
      // 由于event.target是DragBehavior，我们需要直接操作节点元素
      const draggedNodeId = event.subject.id;
      const draggedNodeElement = svg.select(`[data-node-id="${draggedNodeId}"]`);
      draggedNodeElement.classed('dragging', false);
      
      // 移除拖拽阴影效果
      draggedNodeElement.style('filter', null);
      draggedNodeElement.style('z-index', null);
      
      // 移除连接点 - 添加消失动画
      svg.selectAll('.connection-point')
        .transition()
        .duration(200)
        .attr('r', 0)
        .attr('opacity', 0)
        .attr('stroke-width', 0)
        .remove();
    }

    // 处理窗口大小变化，平滑调整图表
    const handleResize = () => {
      if (!containerRef.current || !simulationRef.current) return;
      
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      // 更新SVG尺寸
      d3.select(container).select('svg')
        .attr('width', width)
        .attr('height', height);
      
      // 更新模拟的中心点，平滑过渡
      simulationRef.current
        .force('center', d3.forceCenter(width / 2, height / 2))
        .alpha(0.3)
        .restart();
    };
    
    // 添加窗口大小变化的监听
    window.addEventListener('resize', handleResize);
    
    // 优化缩放和平移性能
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5]) // 统一缩放范围为10%-500%
      .translateExtent([[-5000, -5000], [5000, 5000]]) // 扩展平移范围
      .filter((event: MouseEvent) => {
        // 阻止在编辑文本框等情况下的缩放
        const target = event.target as HTMLElement;
        return !target.closest('input, textarea');
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        // 应用变换
        mainGroup.attr('transform', event.transform.toString());
        setCurrentTransform(event.transform);
        // 更新缩放百分比
        setZoomLevel(Math.round(event.transform.k * 100));
      });
      
    svg.call(zoomBehavior);
    
    // 辅助函数：获取节点位置 - 使用函数声明以支持提升
    function getNodePosition(nodeOrId: EnhancedNode | string | number): {x: number, y: number} {
      if (typeof nodeOrId === 'object') {
        return {x: nodeOrId.x || 0, y: nodeOrId.y || 0};
      } else {
        const node = nodes.find(n => n.id === String(nodeOrId));
        return {x: node?.x || 0, y: node?.y || 0};
      }
    };
    
    // 将zoomBehavior存储在闭包中供后续使用

    // Update positions on simulation tick with throttling
    simulation.on('tick', () => {
      try {
        // 仅在需要时更新视图，添加节流逻辑
        if (Date.now() - lastTickUpdate.current > 16) { // 约60fps
          // 添加防御性检查，确保d3选择器有效
          if (link && link.size() > 0) {
            // Update links with consistent node position handling
            link
              .attr('x1', d => getNodePosition(d.source).x)
              .attr('y1', d => getNodePosition(d.source).y)
              .attr('x2', d => getNodePosition(d.target).x)
              .attr('y2', d => getNodePosition(d.target).y);
          }

          // 添加防御性检查，确保d3选择器有效
          if (node && node.size() > 0) {
            // Update node positions with null/undefined check
            node
              .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);
          }

          // Update link delete button positions
          if (isEditMode && svg && svg.size() > 0) {
            try {
              svg.selectAll<SVGGElement, EnhancedGraphLink>('.link-delete')
                .attr('transform', (d: EnhancedGraphLink) => {
                  const sourcePos = getNodePosition(d.source);
                  const targetPos = getNodePosition(d.target);
                  
                  const midX = (sourcePos.x + targetPos.x) / 2;
                  const midY = (sourcePos.y + targetPos.y) / 2;
                  return `translate(${midX}, ${midY})`;
                });
            } catch (linkDeleteError) {
              // 隔离错误，确保链接删除按钮更新失败不会影响整个tick处理
              console.warn('Error updating link delete buttons:', linkDeleteError);
            }
          }
          
          // Update link text positions
          try {
            svg.selectAll<SVGTextElement, EnhancedGraphLink>('.link-text')
              .attr('x', (d: EnhancedGraphLink) => {
                const sourcePos = getNodePosition(d.source);
                const targetPos = getNodePosition(d.target);
                return (sourcePos.x + targetPos.x) / 2;
              })
              .attr('y', (d: EnhancedGraphLink) => {
                const sourcePos = getNodePosition(d.source);
                const targetPos = getNodePosition(d.target);
                return (sourcePos.y + targetPos.y) / 2;
              });
          } catch (linkTextError) {
            console.warn('Error updating link text:', linkTextError);
          }
          
          lastTickUpdate.current = Date.now();
        }
      } catch (error) {
        // 捕获任何异常，防止整个图表停止工作
        console.warn('Error in simulation tick handler:', error);
      }
    });

    // 添加鼠标移动事件监听，用于绘制临时连接线
    svg.on('mousemove', (event: MouseEvent) => {
      if (isAddingLink && linkSourceNode) {
        const point = d3.pointer(event, svg.node() as Element);
        setMousePosition({ x: point[0], y: point[1] });
      }
    });
    
    // Clear selection or cancel link creation when clicking background
    svg.on('click', () => {
      if (isAddingLink) {
        cancelAddLink();
      } else {
        setSelectedNode(null);
      }
    });
    
    // 应用初始变换
    if (currentTransform) {
      mainGroup.attr('transform', currentTransform.toString());
    }
    
    // 更新视图范围，用于节点的动态加载
    const updateViewBounds = () => {
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const scale = currentTransform ? currentTransform.k : 1;
      const x = currentTransform ? currentTransform.x : 0;
      const y = currentTransform ? currentTransform.y : 0;
      
      // 计算可见区域的边界（考虑缩放和平移）
      const padding = 200; // 额外的 padding，提前加载周围节点
      const x1 = (-x / scale) - padding;
      const y1 = (-y / scale) - padding;
      const x2 = (-x / scale) + (containerRect.width / scale) + padding;
      const y2 = (-y / scale) + (containerRect.height / scale) + padding;
      
      setViewBounds({ x1, y1, x2, y2 });
    };
    
    // 初始化视图范围
    updateViewBounds();

    return () => {
      window.removeEventListener('resize', handleResize);
      simulation.stop();
      if (container) {
        const svgElement = container.querySelector('svg');
        if (svgElement) {
          while (svgElement.firstChild) {
            svgElement.removeChild(svgElement.firstChild);
          }
        }
      }
    };
  }, [nodes, links, selectedNode, isEditMode, isAddingLink, linkSourceNode, addNode, removeNode, startAddLink, completeAddLink, cancelAddLink, removeLink, addMultipleNodes, shiftPressed, batchSelectionMode, selectedNodes, currentTransform, isSimulationRunning]);

  // 修复语法错误后的行
  // 添加键盘事件监听
  useEffect(() => {
    // 确保事件处理器使用DOM事件类型而非React事件类型
    const domKeyDownHandler = (event: KeyboardEvent) => handleKeyDown(event);
    const domKeyUpHandler = (event: KeyboardEvent) => handleKeyUp(event);
    
    window.addEventListener('keydown', domKeyDownHandler);
    window.addEventListener('keyup', domKeyUpHandler);
    
    return () => {
      window.removeEventListener('keydown', domKeyDownHandler);
      window.removeEventListener('keyup', domKeyUpHandler);
    };
  }, [handleKeyDown, handleKeyUp]);

  // 添加防抖逻辑，避免工具栏反复出现消失
  const [toolbarTimeout, setToolbarTimeout] = useState<NodeJS.Timeout | null>(null);

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (toolbarTimeout) {
        clearTimeout(toolbarTimeout);
      }
    };
  }, [toolbarTimeout]);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // 处理鼠标移动事件，检测鼠标是否在工具栏区域
  const handleMouseMove = (e: React.MouseEvent) => {
    if (toolbarDisplayMode === 'dynamic') {
      const toolbarHeight = 300; // 增加工具栏高度阈值到300px，避免频繁切换
      const isInToolbarArea = e.clientY < toolbarHeight;
      
      // 清除之前的定时器
      if (toolbarTimeout) {
        clearTimeout(toolbarTimeout);
      }
      
      // 只有当状态变化时才更新，避免无限循环
      if (isInToolbarArea !== isMouseInToolbarArea) {
        setIsMouseInToolbarArea(isInToolbarArea);
      }
    }
  };
  
  // 监听鼠标离开事件，隐藏工具栏
  const handleMouseLeave = () => {
    if (toolbarDisplayMode === 'dynamic') {
      // 添加延迟，避免鼠标快速移动时工具栏闪烁
      const timeout = setTimeout(() => {
        setIsMouseInToolbarArea(false);
      }, 300);
      setToolbarTimeout(timeout);
    }
  };
  
  // 计算工具栏是否可见
  const shouldShowToolbar = toolbarDisplayMode === 'always' || isMouseInToolbarArea;
  
  return (
    <div 
      className="w-full h-screen flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 顶部工具栏 */}
      <div 
        className={`bg-white border-b border-gray-200 p-4 flex items-center justify-between transition-all duration-300 z-40 ${shouldShowToolbar ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}
        style={{ top: '0', position: 'sticky', overflowX: 'auto', whiteSpace: 'nowrap' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={resetView}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors mr-2 min-w-[40px] h-[40px] flex items-center justify-center"
            title="重置视图 (Space/R)"
          >
            <Home className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 whitespace-nowrap">Knowledge Graph</h2>
          {isEditMode && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium ml-2 whitespace-nowrap">Edit Mode</span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <span className="flex items-center gap-1 text-sm text-gray-700 whitespace-nowrap">
              <User className="w-4 h-4" />
              {user.email}
            </span>
          ) : (
            <Link 
              to="/auth" 
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition min-w-[40px] h-[40px] flex items-center justify-center whitespace-nowrap"
            >
              Sign In to Edit
            </Link>
          )}
          
          {user && (
            <div className="flex items-center gap-3">
          {/* 节点搜索功能 */}
          <div className="relative whitespace-nowrap">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4">🔍</div>
            <input
              type="text"
              placeholder="搜索节点..."
              value={nodeSearchQuery}
              onChange={(e) => setNodeSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              title="按节点标题或内容搜索"
            />
            {nodeSearchQuery && (
              <button
                onClick={() => {
                  setNodeSearchQuery('');
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 min-w-[24px] h-[24px] flex items-center justify-center"
                title="清除搜索"
              >
                <div className="w-4 h-4 text-center">✕</div>
              </button>
            )}
          </div>
          
          {/* 布局算法选择 */}
          <div className="flex items-center gap-2">
            <select
              value={layoutType}
              onChange={(e) => setLayoutType(e.target.value as 'force' | 'hierarchical' | 'circular' | 'grid')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="force">力导向布局</option>
              <option value="hierarchical">层次化布局</option>
              <option value="circular">圆形布局</option>
              <option value="grid">网格布局</option>
            </select>
            
            {layoutType === 'hierarchical' && (
              <select
                value={layoutDirection}
                onChange={(e) => setLayoutDirection(e.target.value as 'top-bottom' | 'left-right')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="top-bottom">上下方向</option>
                <option value="left-right">左右方向</option>
              </select>
            )}
            
            <button
              onClick={handleApplyLayout}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              title="应用所选布局"
            >
              <ArrowUpRight className="w-4 h-4" />
              应用布局
            </button>
          </div>
              
              {/* 图表列表按钮 */}
            <button
              onClick={() => {
                // 导航到图表列表页
                navigate('/graph');
              }}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="图表列表"
            >
              <List className="w-4 h-4" />
            </button>
            
            {/* 样式自定义按钮 */}
            <button
              onClick={() => setShowStylePanel(prev => !prev)}
              className={`p-2 transition-colors ${showStylePanel ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-600 hover:bg-gray-100'} rounded-md`}
              title="自定义节点和链接样式"
            >
              <Palette className="w-4 h-4" />
            </button>
              
              {/* 聚类功能控制 */}
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <button
                  onClick={toggleClustering}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition font-medium text-sm ${isClusteringEnabled ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}
                  title="启用/禁用节点聚类"
                >
                  聚类
                </button>
                {isClusteringEnabled && (
                  <>
                    <select
                      value={clusteringAlgorithm}
                      onChange={(e) => setClusteringAlgorithm(e.target.value as 'kmeans' | 'hierarchical' | 'community')}
                      className="px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      title="选择聚类算法"
                    >
                      <option value="kmeans">K-Means</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <label htmlFor="cluster-count" className="text-sm text-gray-600">聚类数:</label>
                      <input
                        id="cluster-count"
                        type="number"
                        min="2"
                        max="10"
                        value={clusterCount}
                        onChange={(e) => setClusterCount(Math.max(2, Math.min(10, parseInt(e.target.value) || 2)))}
                        className="w-16 px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        title="调整聚类数量"
                      />
                    </div>
                    <button
                      onClick={performClustering}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition font-medium text-sm"
                      title="重新执行聚类"
                    >
                      重新聚类
                    </button>
                  </>
                )}
              </div>
              
              {/* 导入导出按钮 */}
            <button
              onClick={() => setShowImportExportDialog(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="导入/导出知识图谱数据"
            >
              <Database className="w-4 h-4" />
            </button>
            
            {/* 设置按钮 */}
            <button
              onClick={() => setToolbarDisplayMode(prev => prev === 'always' ? 'dynamic' : 'always')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title={`工具栏显示方式: ${toolbarDisplayMode === 'always' ? '总是显示' : '动态显示'}`}
            >
              <Settings className="w-4 h-4" />
            </button>
              
              {/* 撤销按钮 */}
              <button
                onClick={() => {
                  if (isEditMode && recentActions.length > 0) {
                    const lastAction = recentActions[0];
                    if (lastAction && lastAction.type === 'addNode' && lastAction.nodeId) {
                      // 保存当前状态用于前进
                      const nodeToRestore = nodes.find(n => n.id === lastAction.nodeId);
                      const linksToRestore = links.filter(link => {
                        const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
                        const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
                        return sourceId === lastAction.nodeId || targetId === lastAction.nodeId;
                      });
                       
                      // 撤销添加节点
                      setNodes(prev => prev.filter(node => node.id !== lastAction.nodeId));
                      // 移除相关链接
                      setLinks(prev => prev.filter(link => {
                        const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
                        const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
                        return sourceId !== lastAction.nodeId && targetId !== lastAction.nodeId;
                      }));
                      // 更新操作历史：将撤销的操作移到futureActions
                      setRecentActions(prev => prev.slice(1));
                      if (nodeToRestore) {
                        setFutureActions(prev => [{ 
                          type: 'addNode',
                          nodeId: lastAction.nodeId,
                          timestamp: lastAction.timestamp,
                          data: { node: nodeToRestore, links: linksToRestore } 
                        }, ...prev]);
                      }
                      showNotification('已撤销添加节点', 'info');
                      // 重启模拟
                      if (simulationRef.current) {
                        simulationRef.current.alpha(0.3).restart();
                      }
                    }
                    
                    // 处理删除节点操作
                    else if (lastAction && lastAction.type === 'deleteNode' && lastAction.nodeId && lastAction.data) {
                      // 恢复删除的节点
                      const { node, links: relatedLinks } = lastAction.data;
                      if (node) {
                        setNodes(prev => [...prev, node]);
                      }
                      // 恢复相关链接
                      if (relatedLinks && relatedLinks.length > 0) {
                        setLinks(prev => [...prev, ...relatedLinks]);
                      }
                      // 更新操作历史
                      setRecentActions(prev => prev.slice(1));
                      setFutureActions(prev => [lastAction, ...prev]);
                      showNotification('已恢复删除的节点', 'info');
                      // 重启模拟
                      if (simulationRef.current) {
                        simulationRef.current.alpha(0.3).restart();
                      }
                    }
                    
                    // 处理添加链接操作
                    else if (lastAction && lastAction.type === 'addLink' && lastAction.linkId) {
                      // 保存当前状态用于前进
                      const linkToRestore = links.find(l => l.id === lastAction.linkId);
                       
                      // 撤销添加链接
                      setLinks(prev => prev.filter(link => link.id !== lastAction.linkId));
                      // 更新节点连接数
                      if (linkToRestore) {
                        const sourceId = typeof linkToRestore.source === 'object' ? String(linkToRestore.source.id) : String(linkToRestore.source);
                        const targetId = typeof linkToRestore.target === 'object' ? String(linkToRestore.target.id) : String(linkToRestore.target);
                        
                        setNodes(prev => prev.map(node => {
                          if (node.id === sourceId || node.id === targetId) {
                            return { ...node, connections: Math.max(0, node.connections - 1) };
                          }
                          return node;
                        }));
                      }
                      // 更新操作历史
                      setRecentActions(prev => prev.slice(1));
                      if (linkToRestore) {
                        setFutureActions(prev => [{ 
                          ...lastAction, 
                          data: linkToRestore 
                        }, ...prev]);
                      }
                      showNotification('已撤销添加链接', 'info');
                      // 重启模拟
                      if (simulationRef.current) {
                        simulationRef.current.alpha(0.3).restart();
                      }
                    }
                    
                    // 处理删除链接操作
                    else if (lastAction && lastAction.type === 'deleteLink' && lastAction.linkId && lastAction.data) {
                      // 恢复删除的链接
                      const linkToRestore = lastAction.data as EnhancedGraphLink;
                      if (linkToRestore) {
                        setLinks(prev => [...prev, linkToRestore]);
                        // 更新节点连接数
                        const sourceId = typeof linkToRestore.source === 'object' ? String(linkToRestore.source.id) : String(linkToRestore.source);
                        const targetId = typeof linkToRestore.target === 'object' ? String(linkToRestore.target.id) : String(linkToRestore.target);
                        
                        setNodes(prev => prev.map(node => {
                          if (node.id === sourceId || node.id === targetId) {
                            return { ...node, connections: node.connections + 1 };
                          }
                          return node;
                        }));
                      }
                      // 更新操作历史
                      setRecentActions(prev => prev.slice(1));
                      setFutureActions(prev => [lastAction, ...prev]);
                      showNotification('已恢复删除的链接', 'info');
                      // 重启模拟
                      if (simulationRef.current) {
                        simulationRef.current.alpha(0.3).restart();
                      }
                    }
                  }
                }}
                title="撤销操作 (Ctrl+Z)"
                disabled={!isEditMode || recentActions.length === 0}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition font-medium ${
                  !isEditMode || recentActions.length === 0
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
                撤销
              </button>
              
              {/* 前进按钮 */}
              <button
                onClick={() => {
                  if (isEditMode && futureActions.length > 0) {
                    const nextAction = futureActions[0];
                    if (nextAction && nextAction.type === 'addNode' && nextAction.nodeId && nextAction.data?.node) {
                      // 前进添加节点
                      const { data } = nextAction;
                      if (data && data.node) {
                        setNodes(prev => [...prev, data.node]);
                        // 恢复相关链接
                        if (data.links && data.links.length > 0) {
                          setLinks(prev => [...prev, ...data.links]);
                        }
                      }
                      // 更新操作历史：将前进的操作移回recentActions
                      setFutureActions(prev => prev.slice(1));
                      setRecentActions(prev => [nextAction, ...prev]);
                      showNotification('已前进添加节点', 'info');
                      // 重启模拟
                      if (simulationRef.current) {
                        simulationRef.current.alpha(0.3).restart();
                      }
                    }
                    
                    // 处理删除节点操作
                    else if (nextAction && nextAction.type === 'deleteNode' && nextAction.nodeId) {
                      // 保存当前状态用于撤销
                      const nodeToRestore = nodes.find(n => n.id === nextAction.nodeId);
                      const linksToRestore = links.filter(link => {
                        const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
                        const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
                        return sourceId === nextAction.nodeId || targetId === nextAction.nodeId;
                      });
                        
                      // 前进删除节点
                      setNodes(prev => prev.filter(node => node.id !== nextAction.nodeId));
                      // 移除相关链接
                      setLinks(prev => prev.filter(link => {
                        const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
                        const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
                        return sourceId !== nextAction.nodeId && targetId !== nextAction.nodeId;
                      }));
                      // 更新操作历史
                      setFutureActions(prev => prev.slice(1));
                      if (nodeToRestore) {
                        setRecentActions(prev => [{ 
                          type: 'deleteNode',
                          nodeId: nextAction.nodeId,
                          timestamp: nextAction.timestamp,
                          data: { node: nodeToRestore, links: linksToRestore } 
                        }, ...prev]);
                      }
                      showNotification('已前进删除节点', 'info');
                      // 重启模拟
                      if (simulationRef.current) {
                        simulationRef.current.alpha(0.3).restart();
                      }
                    }
                    
                    // 处理添加链接操作
                    else if (nextAction && nextAction.type === 'addLink' && nextAction.linkId && nextAction.data) {
                      // 前进添加链接
                      const linkToAdd = nextAction.data as EnhancedGraphLink;
                      if (linkToAdd) {
                        setLinks(prev => [...prev, linkToAdd]);
                        // 更新节点连接数
                        const sourceId = typeof linkToAdd.source === 'object' ? String(linkToAdd.source.id) : String(linkToAdd.source);
                        const targetId = typeof linkToAdd.target === 'object' ? String(linkToAdd.target.id) : String(linkToAdd.target);
                        
                        setNodes(prev => prev.map(node => {
                          if (node.id === sourceId || node.id === targetId) {
                            return { ...node, connections: node.connections + 1 };
                          }
                          return node;
                        }));
                      }
                      // 更新操作历史
                      setFutureActions(prev => prev.slice(1));
                      setRecentActions(prev => [nextAction, ...prev]);
                      showNotification('已前进添加链接', 'info');
                      // 重启模拟
                      if (simulationRef.current) {
                        simulationRef.current.alpha(0.3).restart();
                      }
                    }
                    
                    // 处理删除链接操作
                    else if (nextAction && nextAction.type === 'deleteLink' && nextAction.linkId) {
                      // 保存当前状态用于撤销
                      const linkToRestore = links.find(l => l.id === nextAction.linkId);
                      
                      // 前进删除链接
                      setLinks(prev => prev.filter(link => link.id !== nextAction.linkId));
                      // 更新节点连接数
                      if (linkToRestore) {
                        const sourceId = typeof linkToRestore.source === 'object' ? String(linkToRestore.source.id) : String(linkToRestore.source);
                        const targetId = typeof linkToRestore.target === 'object' ? String(linkToRestore.target.id) : String(linkToRestore.target);
                        
                        setNodes(prev => prev.map(node => {
                          if (node.id === sourceId || node.id === targetId) {
                            return { ...node, connections: Math.max(0, node.connections - 1) };
                          }
                          return node;
                        }));
                      }
                      // 更新操作历史
                      setFutureActions(prev => prev.slice(1));
                      if (linkToRestore) {
                        setRecentActions(prev => [{ 
                          type: 'deleteLink',
                          linkId: nextAction.linkId,
                          timestamp: nextAction.timestamp,
                          data: linkToRestore 
                        }, ...prev]);
                      }
                      showNotification('已前进删除链接', 'info');
                      // 重启模拟
                      if (simulationRef.current) {
                        simulationRef.current.alpha(0.3).restart();
                      }
                    }
                  }
                }}
                title="前进操作 (Ctrl+Y)"
                disabled={!isEditMode || futureActions.length === 0}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition font-medium ${
                  !isEditMode || futureActions.length === 0
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 7v6h-6" />
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
                </svg>
                前进
              </button>
              
              {/* 缩放控制区域 */}
              <div className="flex items-center gap-2">
                {/* 缩小按钮 */}
                <button
                  onClick={() => {
                    // 调整缩放敏感度为5%步进，统一缩放范围
                    const zoomStep = 0.05;
                    const minScale = 0.1;
                    const newScale = Math.max(minScale, currentTransform.k - zoomStep);
                    const newZoomLevel = Math.round(newScale * 100);
                    setCurrentTransform(d3.zoomIdentity.scale(newScale));
                    setZoomLevel(newZoomLevel);
                    
                    const svgElement = containerRef.current?.querySelector('svg') as SVGSVGElement;
                    if (svgElement) {
                      d3.select(svgElement).transition().duration(200).call(
                        d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity.scale(newScale)
                      );
                    }
                  }}
                  title="缩小 (Ctrl+-)"
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  -
                </button>
                
                {/* 缩放百分比显示 */}
                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-300 text-gray-700 font-medium min-w-[60px] text-center">
                  {zoomLevel}%
                </div>
                
                {/* 放大按钮 */}
                <button
                  onClick={() => {
                    // 调整缩放敏感度为5%步进，统一缩放范围
                    const zoomStep = 0.05;
                    const maxScale = 5;
                    const newScale = Math.min(maxScale, currentTransform.k + zoomStep);
                    const newZoomLevel = Math.round(newScale * 100);
                    setCurrentTransform(d3.zoomIdentity.scale(newScale));
                    setZoomLevel(newZoomLevel);
                    
                    const svgElement = containerRef.current?.querySelector('svg') as SVGSVGElement;
                    if (svgElement) {
                      d3.select(svgElement).transition().duration(200).call(
                        d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity.scale(newScale)
                      );
                    }
                  }}
                  title="放大 (Ctrl++)"
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  +
                </button>
                
                {/* 重置缩放按钮 */}
                <button
                  onClick={() => {
                    setCurrentTransform(d3.zoomIdentity);
                    setZoomLevel(100);
                    
                    const svgElement = containerRef.current?.querySelector('svg') as SVGSVGElement;
                    if (svgElement) {
                      d3.select(svgElement).transition().duration(200).call(
                        d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity
                      );
                    }
                    setNotification({ message: '缩放已重置为100%', type: 'info' });
                  }}
                  title="重置缩放 (100%)"
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  1:1
                </button>
              </div>
              
              {/* 回到原点按钮 */}
              <button
                onClick={resetView}
                title="重置视图 (Space)"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                <Home className="w-4 h-4" />
                Reset View
              </button>
              
              {/* 选择功能 */}
              {isEditMode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // 选择全部节点
                      setSelectedNodes(nodes);
                      showNotification('已选择全部节点', 'info');
                    }}
                    title="选择全部节点"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
                  >
                    全选
                  </button>
                  
                  <button
                    onClick={() => {
                      // 选择已连接节点
                      const connectedNodeIds = new Set<string>();
                      links.forEach(link => {
                        const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
                        const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
                        connectedNodeIds.add(sourceId);
                        connectedNodeIds.add(targetId);
                      });
                      const connectedNodes = nodes.filter(node => connectedNodeIds.has(node.id));
                      setSelectedNodes(connectedNodes);
                      showNotification(`已选择${connectedNodes.length}个已连接节点`, 'info');
                    }}
                    title="选择已连接节点"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
                  >
                    选择已连接
                  </button>
                  
                  <button
                    onClick={() => {
                      // 选择未连接节点
                      const connectedNodeIds = new Set<string>();
                      links.forEach(link => {
                        const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
                        const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
                        connectedNodeIds.add(sourceId);
                        connectedNodeIds.add(targetId);
                      });
                      const unconnectedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
                      setSelectedNodes(unconnectedNodes);
                      showNotification(`已选择${unconnectedNodes.length}个未连接节点`, 'info');
                    }}
                    title="选择未连接节点"
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
                  >
                    选择未连接
                  </button>
                  
                  {selectedNodes.length > 0 && (
                    <button
                      onClick={() => {
                        // 取消选择
                        setSelectedNodes([]);
                        setSelectedNode(null);
                        showNotification('已取消选择', 'info');
                      }}
                      title="取消选择"
                      className="px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition font-medium"
                    >
                      取消选择
                    </button>
                  )}
                </div>
              )}
              
              {/* 模板按钮 */}
              <button
                onClick={() => {
                  loadTemplates();
                  setShowTemplates(!showTemplates);
                  setShowGraphList(false);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                <List className="w-4 h-4" />
                Templates
                {showTemplates && <ChevronDown className="w-4 h-4" />}
              </button>
              
              <button
                onClick={toggleEditMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${isEditMode ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                <Edit className="w-4 h-4" />
                {isEditMode ? 'Exit Edit' : 'Edit Graph'}
              </button>
              
              {isEditMode && (
                <button
                  onClick={openSaveDialog}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Graph'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 用户图表列表 */}
      {showGraphList && (
        <div className="absolute top-20 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-[70vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">我的图表</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {userGraphs.length > 0 ? (
              userGraphs.map(graph => (
                <div key={graph['id']} className="p-3 hover:bg-gray-50 flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 truncate" title={graph['name']}>{graph['name']}</p>
                    <p className="text-xs text-gray-500">创建于 {graph['created_at'] ? new Date(graph['created_at']).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => loadGraph(graph['id'])}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="加载图表"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    {/* 定义Graph接口来避免any类型 */}
                    {(!(graph as { is_template?: boolean })['is_template'] || (graph as { is_template?: boolean })['is_template'] === false) && (
                      <button
                        onClick={() => handleDeleteGraph(graph['id'])}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="删除图表"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p>您还没有保存任何图表</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 模板列表 - 增强版 */}
      {showTemplates && (
        <div className="absolute top-20 right-4 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-[70vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">图表模板</h3>
            {/* 模板搜索 */}
            <input
              type="text"
              placeholder="搜索模板..."
              className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              onChange={(e) => setTemplateSearchQuery(e.target.value)}
            />
            {/* 模板分类筛选 */}
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {['全部', '项目管理', '学习路径', '知识库', '复杂网络', '简单模板'].map(category => (
                <button
                  key={category}
                  className={`px-2 py-0.5 rounded-full ${selectedTemplateCategory === category ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setSelectedTemplateCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map(template => (
                <div key={template.id} className="p-3 hover:bg-gray-50 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 truncate" title={template.name}>{template.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                          {template.category}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded">
                          {'标准'}复杂度
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                          {template.nodes.length}节点
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => createFromTemplate(template.id)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                      title="从模板创建"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {/* 模板预览 */}
                  <div className="w-full h-24 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden relative mt-2">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xs text-gray-500">模板预览</div>
                    </div>
                    {/* 简化的模板预览图 */}
                    <svg width="100%" height="100%" className="opacity-70">
                      {/* 简化显示几个代表节点 */}
                      {[0, 1, 2].slice(0, Math.min(3, template.nodes.length)).map((_, i) => (
                        <circle
                          key={i}
                          cx={30 + i * 40}
                          cy={25}
                          r={6}
                          fill="#4CAF50"
                        />
                      ))}
                      {template.links.length > 0 && (
                        <line
                          x1="36"
                          y1="25"
                          x2="64"
                          y2="25"
                          stroke="#2196F3"
                          strokeWidth="1"
                        />
                      )}
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    创建于 {'未知时间'}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p>未找到匹配的模板</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 保存图表对话框 */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">保存图表</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图表名称</label>
                <input
                  type="text"
                  value={graphName}
                  onChange={(e) => setGraphName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="输入图表名称"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isTemplate"
                  checked={isTemplate}
                  onChange={(e) => setIsTemplate(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isTemplate" className="ml-2 block text-sm text-gray-700">
                  保存为模板
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  onClick={saveGraph}
                  disabled={isSaving || !graphName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主图表区域 */}
      <div className="flex-1 relative bg-gray-50" ref={containerRef}>
        {/* 键盘快捷键帮助 */}
        <KeyboardShortcuts />
        
        {isEditMode && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-4 max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Edit Mode Help</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-600" />
                <span>双击添加新节点</span>
              </li>
              <li className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-600" />
                <span>Shift+点击批量添加节点</span>
              </li>
              <li className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-purple-600" />
                <span>创建后自动选中可编辑</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-blue-600" />
                <span>Drag to move nodes</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 inline-block text-red-600">↕</span>
                <span>Click node to start connection, click another to connect</span>
              </li>
            </ul>
          </div>
        )}
        
        {/* 中心添加节点按钮 - 当没有节点时显示 */}
        {nodes.length === 0 && isEditMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // 添加新节点到中心位置
                if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect();
                  const x = rect.width / 2;
                  const y = rect.height / 2;
                  addNode(x, y);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full shadow-xl transform hover:scale-105 transition-all duration-300 pointer-events-auto"
            >
              + 添加第一个知识节点
            </button>
          </div>
        )}
      </div>

      {/* 选中节点详情面板 */}
      {selectedNode && (
        <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 max-w-md">
          {isEditMode && selectedNode.is_custom ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Node Title</label>
                <input
                  type="text"
                  value={nodeTitle}
                  onChange={(e) => setNodeTitle(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter键保存，Shift+Enter换行（虽然是单行输入，但保留此逻辑）
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      saveNodeChanges();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Node Content</label>
                <textarea
                  value={nodeContent}
                  onChange={(e) => setNodeContent(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter键保存，Shift+Enter换行
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      saveNodeChanges();
                    }
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Enter content for this node..."
                />
              </div>
              <div className="flex justify-between">
                <button
                  onClick={saveNodeChanges}
                  className="inline-flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
                {selectedNode.is_custom && (
                  <button
                    onClick={() => removeNode(selectedNode.id)}
                    className="inline-flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Node
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">{selectedNode.title}</h3>
              <p className="text-sm text-gray-600">
                Connected to {selectedNode.connections} article{selectedNode.connections !== 1 ? 's' : ''}
              </p>
              {selectedNode.is_custom ? (
                <p className="text-xs text-gray-500">Custom node created by user</p>
              ) : selectedNode.slug ? (
                <Link
                  to={`/article/${selectedNode.slug}`}
                  className="inline-block bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  View Article
                </Link>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* 通知提示 */}
      {notification && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
          <p className="font-medium">{notification.message}</p>
        </div>
      )}

      {/* 样式自定义面板 - 调整位置避免与工具栏重叠 */}
      {showStylePanel && (
        <div className="fixed top-32 right-6 bg-white rounded-lg shadow-lg p-6 w-80 z-20">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Style Customization</h3>
            <button
              onClick={() => setShowStylePanel(false)}
              className="p-1 rounded-full hover:bg-gray-100 transition"
              title="Close Style Panel"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 节点样式 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Node Styles</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Node Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={nodeStyle.color}
                      onChange={(e) => setNodeStyle({ ...nodeStyle, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={nodeStyle.color}
                      onChange={(e) => setNodeStyle({ ...nodeStyle, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Node Size: {nodeStyle.size}</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={nodeStyle.size}
                    onChange={(e) => setNodeStyle({ ...nodeStyle, size: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Border Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={nodeStyle.borderColor}
                      onChange={(e) => setNodeStyle({ ...nodeStyle, borderColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={nodeStyle.borderColor}
                      onChange={(e) => setNodeStyle({ ...nodeStyle, borderColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Border Width: {nodeStyle.borderWidth}</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={nodeStyle.borderWidth}
                    onChange={(e) => setNodeStyle({ ...nodeStyle, borderWidth: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* 链接样式 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Link Styles</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Link Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={linkStyle.color}
                      onChange={(e) => setLinkStyle({ ...linkStyle, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={linkStyle.color}
                      onChange={(e) => setLinkStyle({ ...linkStyle, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Link Width: {linkStyle.width}</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={linkStyle.width}
                    onChange={(e) => setLinkStyle({ ...linkStyle, width: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Opacity: {Math.round(linkStyle.opacity * 100)}%</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={linkStyle.opacity}
                    onChange={(e) => setLinkStyle({ ...linkStyle, opacity: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Line Type</label>
                  <select
                    value={linkStyle.dasharray}
                    onChange={(e) => setLinkStyle({ ...linkStyle, dasharray: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Solid</option>
                    <option value="5,5">Dashed</option>
                    <option value="2,2">Dotted</option>
                    <option value="10,5,2,5">Dash-Dot</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 导入导出对话框 */}
      {showImportExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            {/* 标题栏 */}
            <div className="flex items-center justify-between bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {importExportMode === 'export' ? '导出知识图谱' : '导入知识图谱'}
              </h3>
              <button
                onClick={() => setShowImportExportDialog(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="px-6 py-5">
              {/* 模式切换 */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setImportExportMode('export')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${importExportMode === 'export' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  导出
                </button>
                <button
                  onClick={() => setImportExportMode('import')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${importExportMode === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  导入
                </button>
              </div>
              
              {/* 导出模式 */}
              {importExportMode === 'export' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">选择导出格式：</p>
                  
                  {/* JSON 导出 */}
                  <button
                  onClick={() => {
                      // 导出为JSON
                      const graph: Graph = {
                        id: 'temp-' + Date.now(),
                        user_id: auth.user?.id || 'anonymous',
                        name: '知识图谱导出',
                        nodes: nodes as unknown as GraphNode[],
                        links: links.map(link => ({
                          ...link,
                          source: typeof link.source === 'object' ? link.source.id : String(link.source),
                          target: typeof link.target === 'object' ? link.target.id : String(link.target)
                        })) as unknown as GraphLink[],
                        is_template: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      };
                      exportService.exportGraphAsJsonFile(graph);
                      setShowImportExportDialog(false);
                    }}
                  className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition"
                >
                    <div className="flex items-center gap-3">
                      <FileJson className="w-6 h-6 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">JSON 格式</h4>
                        <p className="text-xs text-gray-500">标准JSON格式，包含完整的节点和链接数据</p>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  {/* GraphML 导出 */}
                  <button
                    onClick={() => {
                      // 导出为GraphML
                      const graph: Graph = {
                        id: 'temp-' + Date.now(),
                        user_id: auth.user?.id || 'anonymous',
                        name: '知识图谱导出',
                        nodes: nodes as unknown as GraphNode[],
                        links: links.map(link => ({
                          ...link,
                          source: typeof link.source === 'object' ? link.source.id : String(link.source),
                          target: typeof link.target === 'object' ? link.target.id : String(link.target)
                        })) as unknown as GraphLink[],
                        is_template: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      };
                      exportService.exportGraphAsGraphmlFile(graph);
                      setShowImportExportDialog(false);
                    }}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition"
                  >
                    <div className="flex items-center gap-3">
                      <Database className="w-6 h-6 text-green-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">GraphML 格式</h4>
                        <p className="text-xs text-gray-500">图数据库标准格式，支持多种图可视化工具</p>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  {/* CSV 导出 */}
                  <button
                    onClick={() => {
                      // 导出为CSV
                      const graph: Graph = {
                        id: 'temp-' + Date.now(),
                        user_id: auth.user?.id || 'anonymous',
                        name: '知识图谱导出',
                        nodes: nodes as unknown as GraphNode[],
                        links: links.map(link => ({
                          ...link,
                          source: typeof link.source === 'object' ? link.source.id : String(link.source),
                          target: typeof link.target === 'object' ? link.target.id : String(link.target)
                        })) as unknown as GraphLink[],
                        is_template: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      };
                      exportService.exportGraphAsCsvFiles(graph);
                      setShowImportExportDialog(false);
                    }}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-orange-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">CSV 格式</h4>
                        <p className="text-xs text-gray-500">适合表格编辑，包含节点和链接两个文件</p>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              )}
              
              {/* 导入模式 */}
              {importExportMode === 'import' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">选择要导入的文件：</p>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
                    <input
                      type="file"
                      id="importFile"
                      accept=".json,.graphml"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setImportFile(e.target.files?.[0] || null);
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="importFile" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <Database className="w-10 h-10 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700">点击选择文件或拖拽文件到此处</p>
                        <p className="text-xs text-gray-500">支持 JSON 和 GraphML 格式</p>
                      </div>
                    </label>
                  </div>
                  
                  {importFile && (
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate">{importFile.name}</p>
                          <p className="text-xs text-gray-500">{Math.round(importFile.size / 1024)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setImportFile(null)}
                        className="text-gray-400 hover:text-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 操作按钮 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowImportExportDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition font-medium"
              >
                取消
              </button>
              {importExportMode === 'import' && importFile && (
                <button
                  onClick={async () => {
                    if (importFile) {
                      try {
                        const graphData = await exportService.importGraphFromFile(importFile);
                        // 更新图谱数据
                        setNodes(graphData.nodes as EnhancedNode[]);
                        setLinks(graphData.links as EnhancedGraphLink[]);
                        setShowImportExportDialog(false);
                        // 显示成功通知
                        showNotification('图谱导入成功', 'success');
                      } catch (error) {
                        console.error('导入失败:', error);
                        showNotification('导入失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  导入
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 底部提示 - 优化版 */}
      <div className="bg-white border-t border-gray-200 p-3 text-xs text-gray-600">
        {isEditMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <p>• <kbd className="px-1 py-0.5 bg-gray-200 rounded">双击</kbd>添加节点 • <kbd className="px-1 py-0.5 bg-gray-200 rounded">Shift+双击</kbd>批量添加节点 • <kbd className="px-1 py-0.5 bg-gray-200 rounded">N</kbd>键快速添加节点</p>
            <p>• <kbd className="px-1 py-0.5 bg-gray-200 rounded">拖拽</kbd>移动节点 • 点击节点后点击另一个节点建立连接</p>
            <p>• <kbd className="px-1 py-0.5 bg-gray-200 rounded">WASD</kbd>/<kbd className="px-1 py-0.5 bg-gray-200 rounded">箭头</kbd>移动视角 • <kbd className="px-1 py-0.5 bg-gray-200 rounded">+</kbd>/<kbd className="px-1 py-0.5 bg-gray-200 rounded">-</kbd>缩放视图 • <kbd className="px-1 py-0.5 bg-gray-200 rounded">空格</kbd>重置视图</p>
            <p>• <kbd className="px-1 py-0.5 bg-gray-200 rounded">Delete</kbd>删除节点 • <kbd className="px-1 py-0.5 bg-gray-200 rounded">ESC</kbd>取消操作</p>
          </div>
        ) : (
          <p>• 点击节点查看详情 • 拖拽平移视图 • 滚轮缩放 • WASD/箭头键移动视角 • +/-缩放视图 • 点击空白区域取消选择</p>
        )}
      </div>
    </div>
  );
}