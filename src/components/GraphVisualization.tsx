import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { Plus, Edit, Save, Trash2, ChevronDown, User, List, ArrowUpRight, Upload, Home } from 'lucide-react';
import { saveGraphData, fetchGraphById, deleteGraph, getUserGraphs } from '../utils/article';
import { GraphLink } from '../types';
import { useAuth } from '../hooks/useAuth';

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
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);

  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeContent, setNodeContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [graphName, setGraphName] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showGraphList, setShowGraphList] = useState(false);
   
  const [userGraphs, setUserGraphs] = useState<{id: string, name: string, nodes: number, edges: number, created_at: string}[]>([]);
   
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
  
  // 操作历史记录，用于支持撤销功能
  interface RecentAction {
    type: 'addNode' | 'deleteNode' | 'addLink' | 'deleteLink';
    nodeId?: string;
    linkId?: string;
    timestamp: number;
  }
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  // 定义复制节点的接口
  interface CopiedNodeInfo {
    node: EnhancedNode;
    timestamp: number;
  }

  // 添加复制节点相关状态
   
  const [copiedNode, setCopiedNode] = useState<CopiedNodeInfo | null>(null);
  const [copiedNodes, setCopiedNodes] = useState<EnhancedNode[]>([]);

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

  // 加载用户图表


  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 定义图表数据接口
        interface GraphData {
          nodes: Array<{ id: string; title: string; connections?: number }>;
          links: Array<{ source: string; target: string; type?: string }>;
        }
        
        // 直接使用空数据，后续会从用户交互或真实数据库获取数据
        const data: GraphData = { nodes: [], links: [] };
        
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
      // 定义模板数据接口
      interface RawTemplateData {
        id: string;
        name: string;
        nodes: Array<{ id: string; title: string; connections?: number }>;
        links: Array<{ source: string; target: string; type?: string }>;
      }
      
      // 暂时使用空数组代替模板数据
      const templatesData: RawTemplateData[] = [];
      const formattedTemplates = templatesData.map((template: RawTemplateData) => ({
        id: template['id'],
        name: template['name'],
        category: 'default', // 添加category属性以符合TemplateItem接口
        description: `节点: ${template['nodes'].length}, 连接: ${template['links'].length}`,
        nodes: template['nodes'].map((n) => ({
          id: n['id'],
          title: n['title'],
          connections: n['connections'] || 0,
          created_by: 'system' // 添加必需的created_by字段
        })),
        links: template['links'].map((l) => ({
          id: `template-link-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          source: l['source'],
          target: l['target'],
          type: l['type'] || 'default'
        }))
      }));
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
    
    setNodes(prev => [...prev, newNode]);
    
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
      setNodeTitle(newNode['title']);
      setNodeContent('');
      
      // 改进用户提示，更清晰的指导
      showNotification('节点已创建，按Enter编辑标题，Shift+Enter编辑内容', 'info');
    } else {
      // 批量模式下添加到选中列表
      setSelectedNodes(prev => [...prev, newNode]);
    }
    
    // 优化模拟重启逻辑，避免重复调用
    if (simulationRef.current) {
      try {
        // 获取当前的节点和链接
        const currentNodes = [...nodes, newNode];
        const currentLinks = Array.isArray(links) ? links : [];
        
        // 一次性更新模拟
        simulationRef.current
          .nodes(currentNodes)
          .force('link', d3.forceLink(currentLinks)
            .id((d: d3.SimulationNodeDatum) => (d as EnhancedNode).id)
            .distance(150))
          .alpha(0.5) // 稍微提高alpha值，使新节点更好地融入布局
          .restart();
          
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
      } catch (simulationError) {
        console.error('Error updating simulation with new node:', simulationError);
      }
    }
  }, [user?.['id'], nodes, links]);

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
  }, [selectedNodes, setNodes, setLinks, setSelectedNode, setSelectedNodes]); // 添加所有必要的依赖项

  const removeNode = useCallback((nodeOrId: string | number | EnhancedNode) => {
    const nodeId = typeof nodeOrId === 'object' ? (nodeOrId as EnhancedNode).id : nodeOrId;
    
    // 删除节点
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    
    // 删除与该节点相关的连接
    setLinks(prev => prev.filter(link => {
      const sourceId = typeof link?.source === 'object' ? String((link.source as EnhancedNode).id || '') : String(link?.source || '');
      const targetId = typeof link?.target === 'object' ? String((link.target as EnhancedNode).id || '') : String(link?.target || '');
      return String(sourceId) !== String(nodeId) && String(targetId) !== String(nodeId);
    }));
    
    // 如果删除的是当前选中的节点，重置选择状态
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(null);
      setSelectedNodes([]);
    }
  }, [selectedNode, setNodes, setLinks, setSelectedNode, setSelectedNodes]);

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

  // 开始添加连接
  const startAddLink = useCallback((node: EnhancedNode) => {
    // 确保在编辑模式下才能添加连接
    if (!isEditMode) return;
    
    setLinkSourceNode(node);
    setIsAddingLink(true);
    
    // 提供视觉反馈：高亮源节点
    if (containerRef.current) {
      const nodeElement = containerRef.current.querySelector(`g[data-node-id="${node?.id || ''}"]`);
      if (nodeElement) {
        // 可以在这里添加临时高亮效果
      }
    }
  }, [isEditMode]);

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
      
      // 重置模拟以包含新连接
    if (simulationRef.current) {
      simulationRef.current
        .force('link', d3.forceLink([...links, newLink]).id((d: d3.SimulationNodeDatum) => (d as EnhancedNode).id).distance(150))
        .alpha(0.3)
        .restart();
    }
    }

    // 重置状态
    setIsAddingLink(false);
    setLinkSourceNode(null);
  }, [linkSourceNode, links]);

  // 取消添加连接
  const cancelAddLink = useCallback(() => {
    setIsAddingLink(false);
    setLinkSourceNode(null);
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

    setLinks(prev => prev.filter(link => link.id !== linkId));
  }, [links]);

  // 保存节点属性
  const saveNodeChanges = useCallback(() => {
    if (!selectedNode) return;
    
    setNodes(prev => prev.map(node => {
      if (node['id'] === selectedNode['id']) {
        return {
          ...node,
          title: nodeTitle,
          content: nodeContent
        };
      }
      return node;
    }));
  }, [selectedNode, nodeTitle, nodeContent]);

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
        nodes: nodes,
        links: formattedLinks,
        isTemplate: false
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

  // 重置视图到初始状态（回到原点）
  const resetView = useCallback(() => {
    if (simulationRef.current && containerRef.current) {
      const svgElement = containerRef.current.querySelector('svg') as SVGSVGElement;
      const mainGroup = d3.select(svgElement).select('g');
      
      if (svgElement && mainGroup) {
        // 创建一个新的缩放标识，设置为初始状态
        const initialTransform = d3.zoomIdentity;
        setCurrentTransform(initialTransform);
        
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
  }, [simulationRef, containerRef, setCurrentTransform, setNotification]);

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
    
    // Delete键删除选中的节点
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      if (isEditMode && selectedNodes.length > 0) {
        deleteSelectedNodes();
      } else if (isEditMode && selectedNode) {
        removeNode(selectedNode['id']);
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
        if (lastAction && lastAction.type === 'addNode' && lastAction?.nodeId) {
          // 撤销添加节点
          setNodes(prev => prev.filter(node => node.id !== lastAction.nodeId));
          // 移除相关链接
          setLinks(prev => prev.filter(link => {
            const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
            const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
              return sourceId !== lastAction.nodeId && targetId !== lastAction.nodeId;
          }));
          // 更新操作历史
          setRecentActions(prev => prev.slice(1));
          showNotification('已撤销添加节点', 'info');
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
      case 'd':
      case 'D':
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
          if (svgElement && currentTransform.k < 3) { // 确保未达到最大缩放
            // 计算新的缩放比例，确保不超过最大值
            const newScale = Math.min(currentTransform.k * 1.1, 3);
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
          if (svgElement && currentTransform.k > 0.5) { // 确保未达到最小缩放
            // 计算新的缩放比例，确保不低于最小值
            const newScale = Math.max(currentTransform.k * 0.9, 0.5);
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
  }, [isEditMode, currentTransform, addNode, batchSelectionMode, selectedNodes, selectedNode, deleteSelectedNodes, removeNode, isAddingLink, cancelAddLink, copySelectedNodes, pasteNodes, connectSelectedNodes, setShiftPressed, setNotification, setCopiedNode, simulationRef, containerRef, recentActions, resetView, showNotification]); // 添加缺少的依赖项

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
        .scaleExtent([0.5, 3]) // 限制缩放范围在0.5倍到3倍之间
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

    // 创建或更新模拟
    let simulation = simulationRef.current;
    if (!simulation || isSimulationRunning) {
      simulation = d3.forceSimulation<EnhancedNode, EnhancedGraphLink>(nodes)
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

      simulationRef.current = simulation;
    } else {
      // 更新现有模拟的节点和链接
      simulation
        .nodes(nodes)
        .force('link', d3.forceLink(links).id((d: d3.SimulationNodeDatum) => (d as EnhancedNode).id).distance(150))
        .force('center', d3.forceCenter(width / 2, height / 2));
    }

    // 创建链接 - 使用优化的join模式
    const link = linkGroup.selectAll('line')
      .data(links, (d) => (d as EnhancedGraphLink).id) // 使用id作为键
      .join(
        enter => enter.append('line')
          .attr('stroke', '#999')
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', d => Math.sqrt(d.type.length))
          .attr('cursor', isEditMode ? 'pointer' : 'default'),
        update => update,
        exit => exit.remove()
      );

    // 根据是否编辑模式动态添加/移除删除按钮
    if (isEditMode) {
      linkGroup.selectAll('.link-delete')
        .data(links, (d) => (d as EnhancedGraphLink).id)
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

    // 创建节点 - 使用优化的join模式和键函数
    const node = nodeGroup.selectAll('g')
      .data(nodes, (d) => (d as EnhancedNode).id)
      .join(
        enter => {
          const g = enter.append('g')
            .attr('cursor', isEditMode ? 'pointer' : 'default')
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
            .attr('r', 10)
            .attr('fill', '#6366f1')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
            
          g.append('text')
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', '#333')
            .attr('font-size', '10px')
            .style('pointer-events', 'none')
            .text(d => d.title.length > 20 ? `${d.title.substring(0, 20)}...` : d.title);
            
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
        .attr('fill', d => {
          // 检查是否在批量选中的节点中
          const isBatchSelected = selectedNodes.some(node => node.id === d.id);
          if (d.id === selectedNode?.id) return '#ef4444';
          if (isBatchSelected) return '#f97316'; // 橙色表示批量选中
          if (isAddingLink && d.id === linkSourceNode?.id) return '#10b981';
          return d.is_custom ? '#8b5cf6' : '#6366f1';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', d => {
          // 批量选中的节点有更宽的边框
          const isBatchSelected = selectedNodes.some(node => node.id === d.id);
          return isBatchSelected ? 3 : 2;
        });
      
      node.select('text')
        .text(d => d.title.length > 20 ? `${d.title.substring(0, 20)}...` : d.title);
      
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
      .scaleExtent([0.5, 3]) // 更合理的缩放限制，防止过度放大缩小
      .translateExtent([[-1000, -1000], [2000, 2000]]) // 设置合理的平移范围
      .filter((event: MouseEvent) => {
        // 阻止在编辑文本框等情况下的缩放
        const target = event.target as HTMLElement;
        return !target.closest('input, textarea');
      })
      .on('zoom', (event) => {
        // 应用变换前验证是否在有效范围内
        if (event.transform.k >= 0.5 && event.transform.k <= 3) {
          mainGroup.attr('transform', event.transform);
          setCurrentTransform(event.transform);
        }
      });
      
    svg.call(zoomBehavior);
    
    // 将zoomBehavior存储在闭包中供后续使用
    
    // 辅助函数：获取节点位置
    const getNodePosition = (nodeOrId: EnhancedNode | string | number): {x: number, y: number} => {
      if (typeof nodeOrId === 'object') {
        return {x: nodeOrId.x || 0, y: nodeOrId.y || 0};
      } else {
        const node = nodes.find(n => n.id === String(nodeOrId));
        return {x: node?.x || 0, y: node?.y || 0};
      }
    };

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
          
          lastTickUpdate.current = Date.now();
        }
      } catch (error) {
        // 捕获任何异常，防止整个图表停止工作
        console.warn('Error in simulation tick handler:', error);
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
  }, [handleKeyDown, handleKeyUp, showNotification]); // 添加缺少的依赖项

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">Knowledge Graph</h2>
          {isEditMode && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">Edit Mode</span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <span className="flex items-center gap-1 text-sm text-gray-700">
              <User className="w-4 h-4" />
              {user.email}
            </span>
          ) : (
            <Link 
              to="/auth" 
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Sign In to Edit
            </Link>
          )}
          
          {user && (
            <div className="flex items-center gap-3">
              {/* 图表列表按钮 */}
              <button
                onClick={() => {
                  loadUserGraphs();
                  setShowGraphList(!showGraphList);
                  setShowTemplates(false);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                <List className="w-4 h-4" />
                My Graphs
                {showGraphList && <ChevronDown className="w-4 h-4" />}
              </button>
              
              {/* 撤销按钮 */}
              <button
                onClick={() => {
                  if (isEditMode && recentActions.length > 0) {
                    const lastAction = recentActions[0];
                    if (lastAction && lastAction.type === 'addNode' && lastAction.nodeId) {
                      // 撤销添加节点
                      setNodes(prev => prev.filter(node => node.id !== lastAction.nodeId));
                      // 移除相关链接
                      setLinks(prev => prev.filter(link => {
                        const sourceId = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
                        const targetId = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
                        return sourceId !== lastAction.nodeId && targetId !== lastAction.nodeId;
                      }));
                      // 更新操作历史
                      setRecentActions(prev => prev.slice(1));
                      showNotification('已撤销添加节点', 'info');
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
              
              {/* 回到原点按钮 */}
              <button
                onClick={resetView}
                title="重置视图 (Space)"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                <Home className="w-4 h-4" />
                Reset View
              </button>
              
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
                    <p className="text-xs text-gray-500">创建于 {new Date(graph['created_at']).toLocaleDateString()}</p>
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
        {/* 重置视图按钮 - 始终可见 */}
        <button 
          className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2 text-blue-600 hover:bg-blue-50 transition-colors"
          onClick={resetView}
          title="重置视图（空格键或R键）"
        >
          回到原点
        </button>
        
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Node Content</label>
                <textarea
                  value={nodeContent}
                  onChange={(e) => setNodeContent(e.target.value)}
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
