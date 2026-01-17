import React, { useCallback, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlowProvider,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStore,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  ConnectionMode
} from '@xyflow/react';
import { Brain, Database, Box } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import '@xyflow/react/dist/style.css';
import GraphToolbar from './GraphToolbar';

import FloatingConnectionLine from './FloatingConnectionLine';

// 添加全局样式
const CustomReactFlowStyles = () => (
  <style>{`
    /* 移除选择框的过渡效果 */
    .react-flow__nodesselection-rect,
    .react-flow__selection {
      transition: none !important;
    }
    
    /* 移除节点的过渡效果 */
    .react-flow__node {
      transition: none !important;
    }
    
    /* 移除节点边框的过渡效果 */
    .react-flow__node > div {
      transition: none !important;
    }
    
    /* 移除连接的过渡效果 */
    .react-flow__edge {
      transition: none !important;
    }
    
    /* 移除箭头路径的过渡效果 */
    .react-flow__edge path {
      transition: none !important;
    }
    
    /* 移除箭头标记的过渡效果 */
    .react-flow__edge marker path {
      transition: none !important;
    }
    
    /* 选中效果 - 黄色光圈 */
    .selected-glow {
      position: absolute;
      pointer-events: none;
      border-radius: 50%;
      border: 2px solid #fbbf24;
      box-shadow: 0 0 10px #fbbf24;
      animation: selectedGlowAnimation 1.5s ease-in-out infinite;
      z-index: 1000;
    }
    
    /* 选中效果动画 */
    @keyframes selectedGlowAnimation {
      0%, 100% {
        opacity: 0.8;
        transform: scale(1);
      }
      50% {
        opacity: 1;
        transform: scale(1.05);
      }
    }
    
    /* 选中的连接线高亮 - 优化外发光效果，减少性能消耗 */
    .react-flow__edge.selected .react-flow__edge-path {
      /* 减少阴影层数，使用更高效的发光效果 */
      filter: drop-shadow(0 0 6px #fbbf24) drop-shadow(0 0 12px #fbbf24);
      /* 保持原始颜色，只添加高效的外发光 */
    }
    
    /* 选中连接线的箭头高亮 - 优化外发光效果 */
    .react-flow__edge.selected marker path {
      /* 减少阴影层数，使用更高效的发光效果 */
      filter: drop-shadow(0 0 6px #fbbf24) drop-shadow(0 0 12px #fbbf24);
      /* 保持原始颜色，只添加高效的外发光 */
    }
    
    /* 流动动画关键帧 */
    @keyframes flowAnimation {
      0% {
        stroke-dashoffset: 0;
      }
      100% {
        stroke-dashoffset: -300;
      }
    }
    
    /* 闪烁动画关键帧 */
    @keyframes blinkAnimation {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0.3;
      }
      100% {
        opacity: 1;
      }
    }
    
    /* 波浪动画关键帧 - 使用transform和stroke-dasharray组合实现流畅效果 */
    @keyframes waveAnimation {
      0% {
        transform: scaleY(1) translate(0, 0);
        stroke-dasharray: 5, 10;
      }
      25% {
        transform: scaleY(1.1) translate(0, 2px);
        stroke-dasharray: 8, 12;
      }
      50% {
        transform: scaleY(1) translate(0, 0);
        stroke-dasharray: 5, 10;
      }
      75% {
        transform: scaleY(1.1) translate(0, -2px);
        stroke-dasharray: 8, 12;
      }
      100% {
        transform: scaleY(1) translate(0, 0);
        stroke-dasharray: 5, 10;
      }
    }
    
    /* 旋转动画关键帧 */
    @keyframes rotateAnimation {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
    
    /* 颜色变化动画关键帧 - 使用hue-rotate实现彩色循环，从蓝色开始但不明显回到蓝色 */
    @keyframes colorChangeAnimation {
      0% {
        filter: hue-rotate(0deg); /* 蓝色 */
      }
      100% {
        filter: hue-rotate(359deg); /* 接近但不精确回到蓝色，避免明显循环感 */
      }
    }
    
    /* 渐隐渐现动画关键帧 - 更平缓的透明度变化和更长的持续时间 */
    @keyframes fadeAnimation {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0.1;
      }
      100% {
        opacity: 1;
      }
    }
    
    /* 箭头动画关键帧 - 控制箭头沿路径移动 */
    @keyframes arrowAnimation {
      0% {
        offset-distance: 0%;
        opacity: 1;
      }
      100% {
        offset-distance: 100%;
        opacity: 1;
      }
    }
  `}</style>
);

// 导入自定义节点和连接组件
import CustomNode, { CustomNodeData } from './CustomNode';
import FloatingEdge, { CustomEdgeData } from './FloatingEdge';
import GraphControlPanel from './GraphControlPanel';
import GraphManagementPanel from './GraphManagementPanel';
import { GraphAnalysisPanel } from './GraphAnalysisPanel';
import { GraphImportExportPanel } from './GraphImportExportPanel';
import GraphGenerationPanel from './GraphGenerationPanel';
import GraphLayoutPanel from './GraphLayoutPanel';

// 定义force-graph的数据类型接口
interface ForceGraphNode {
  id: string;
  name: string;
  val: number;
  color: string;
}

interface ForceGraphLink {
  source: string;
  target: string;
  color: string;
  width: number;
}

// 自定义节点和连接类型映射 - 定义在组件外部，避免每次渲染创建新对象
const nodeTypes = {
  'custom': CustomNode
} as const as NodeTypes;

const edgeTypes = {
  'floating': FloatingEdge
} as const as EdgeTypes;

// 初始化节点数据
const initialNodes: Node<CustomNodeData>[] = [
  {
    'id': '1',
    'type': 'custom',
    'position': { 'x': 0, 'y': 0 },
    'data': {
      'title': '新节点1',
      'category': '默认',
      'handleCount': 4,
      'style': {},
      'metadata': {
        'content': ''
      }
    }
  },
  {
    'id': '2',
    'type': 'custom',
    'position': { 'x': 200, 'y': 50 },
    'data': {
      'title': '新节点2',
      'category': '默认',
      'handleCount': 4,
      'style': {},
      'metadata': {
        'content': ''
      }
    }
  },
  {
    'id': '3',
    'type': 'custom',
    'position': { 'x': 0, 'y': 200 },
    'data': {
      'title': '新节点3',
      'category': '默认',
      'handleCount': 4,
      'style': {},
      'metadata': {
        'content': ''
      }
    }
  }
];

// 初始化连接数据
const initialEdges: Edge<CustomEdgeData>[] = [
  {
    'id': 'e1-2',
    'type': 'floating',
    'source': '1',
    'target': '2',
    'label': '连接 1-2',
    'data': {
      'type': 'related',
      'curveType': 'default',
      'weight': 1,
      'style': {},
      'animation': {
        'dynamicEffect': 'flow',
        'isAnimating': false
      }
    },
    'markerEnd': {
      'type': 'arrowclosed',
      'color': '#3b82f6'
    }
  },
  {
    'id': 'e1-3',
    'type': 'floating',
    'source': '1',
    'target': '3',
    'label': '连接 1-3',
    'data': {
      'type': 'related',
      'curveType': 'default',
      'weight': 1,
      'style': {},
      'animation': {
        'dynamicEffect': 'flow',
        'isAnimating': false
      }
    },
    'markerEnd': {
      'type': 'arrowclosed',
      'color': '#3b82f6'
    }
  }
];

// 背景配置 - 定义在组件外部，避免每次渲染创建新对象
const backgroundConfig = {
  'color': '#ccc',
  'size': 1
};

// 小地图样式 - 定义在组件外部，避免每次渲染创建新对象
const miniMapStyle = {
  'backgroundColor': '#fff',
  'border': '1px solid #ccc'
};

// 小地图节点颜色函数 - 定义在组件外部，避免每次渲染创建新函数
const nodeColorFn = () => '#3b82f6';

// React Flow视图组件
const ReactFlowView: React.FC<{
  nodes: Node<CustomNodeData>[];
  edges: Edge<CustomEdgeData>[];
  onNodesChange: ReturnType<typeof useNodesState>[2];
  onEdgesChange: ReturnType<typeof useEdgesState>[2];
  onConnect: (params: Connection) => void;
  snapToGrid: boolean;
  snapGrid: [number, number];
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
}> = React.memo(({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  snapToGrid,
  snapGrid,
  reactFlowWrapper
}) => {
  // 缓存静态配置对象，避免每次渲染创建新对象
  const defaultViewport = React.useMemo(() => ({
    'x': 0,
    'y': 0,
    'zoom': 1
  }), []);

  // 缓存connectionLineStyle，避免每次渲染创建新对象
  const connectionLineStyle = React.useMemo(() => ({
    'stroke': '#3b82f6',
    'strokeWidth': 2,
    'animation': 'none'
  }), []);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        zoomOnDoubleClick={true}
        minZoom={0.01}
        maxZoom={10}
        defaultViewport={defaultViewport}
        style={{ 'width': '100%', 'height': '100%' }}
        nodesConnectable={true}
        connectionMode={ConnectionMode.Loose}
        proOptions={{ 'hideAttribution': true }}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Shift', 'Control']}
        selectionOnDrag={true}
        connectionLineStyle={connectionLineStyle}
        connectionLineComponent={FloatingConnectionLine}
        snapToGrid={snapToGrid}
        snapGrid={snapGrid}
      >
        {/* 背景 - 根据网格对齐状态切换样式 */}
        <Background
          variant={snapToGrid ? BackgroundVariant.Lines : BackgroundVariant.Dots}
          gap={snapToGrid ? snapGrid[0] : 16}
          size={snapToGrid ? 1 : backgroundConfig.size}
          color={backgroundConfig.color}
        />
        {/* 小地图 - 默认位置在右下角，调整样式使其更清晰 */}
        <MiniMap
          nodeColor={nodeColorFn}
          zoomable
          pannable
          style={miniMapStyle}
          maskColor="rgba(255, 255, 255, 0.6)"
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
});

// Force Graph 2D视图组件
const ForceGraph2DView: React.FC<{
  graphData: { nodes: ForceGraphNode[]; links: ForceGraphLink[] };
  width: number;
  height: number;
}> = React.memo(({
  graphData,
  width,
  height
}) => {
  return (
    <div className="w-full h-full">
      <ForceGraph2D
        graphData={graphData}
        nodeLabel={(node: ForceGraphNode) => node.name}
        nodeColor={(node: ForceGraphNode) => node.color}
        nodeRelSize={8}
        linkColor={(link: ForceGraphLink) => link.color}
        linkWidth={(link: ForceGraphLink) => link.width}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        backgroundColor="#f5f5f5"
        width={width}
        height={height}
      />
    </div>
  );
});

// Force Graph 3D视图组件
const ForceGraph3DView: React.FC<{
  graphData: { nodes: ForceGraphNode[]; links: ForceGraphLink[] };
  width: number;
  height: number;
}> = React.memo(({
  graphData,
  width,
  height
}) => {
  return (
    <div className="w-full h-full">
      <ForceGraph3D
        graphData={graphData}
        nodeLabel={(node: ForceGraphNode) => node.name}
        nodeColor={(node: ForceGraphNode) => node.color}
        nodeRelSize={4}
        linkColor={(link: ForceGraphLink) => link.color}
        linkWidth={(link: ForceGraphLink) => link.width}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        backgroundColor="#f5f5f5"
        width={width}
        height={height}
      />
    </div>
  );
});

// 图可视化主组件
const GraphVisualizationContent: React.FC = () => {
  // 使用React Flow内置hooks管理节点和连接状态
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 使用内置hook获取React Flow实例
  const reactFlowInstance = useReactFlow();

  // React Flow容器引用
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  // 2D和3D画布容器引用
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  // 画布尺寸状态
  const [canvasDimensions, setCanvasDimensions] = useState({
    'width': window.innerWidth,
    'height': window.innerHeight - 64
  });

  // 图管理面板显示状态，初始设置为关闭
  const [isManagementPanelOpen, setIsManagementPanelOpen] = useState(false);
  // 图分析面板显示状态，初始设置为关闭
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(false);
  // 导入导出面板显示状态，初始设置为关闭
  const [isImportExportPanelOpen, setIsImportExportPanelOpen] = useState(false);
  // 图生成面板显示状态，初始设置为关闭
  const [isGenerationPanelOpen, setIsGenerationPanelOpen] = useState(false);
  // 布局面板显示状态，初始设置为关闭
  const [isLayoutPanelOpen, setIsLayoutPanelOpen] = useState(false);
  // 网格对齐状态
  const [snapToGrid, setSnapToGrid] = useState(false);
  // 网格大小
  const snapGrid: [number, number] = [16, 16];
  // 视图模式状态：'reactflow' 或 'forcegraph2d' 或 'forcegraph3d'
  const [viewMode, setViewMode] = useState<'reactflow' | 'forcegraph2d' | 'forcegraph3d'>('reactflow');

  // 使用useStore选择器获取节点和边的数量，减少不必要的重渲染
  const nodeCount = useStore(
    (state) => state.nodes.length,
    (prev, next) => prev === next
  );

  const edgeCount = useStore(
    (state) => state.edges.length,
    (prev, next) => prev === next
  );

  // 检查是否有选中的节点或边
  const hasSelection = useStore(
    (state) => state.nodes.some(node => node.selected) || state.edges.some(edge => edge.selected),
    (prev, next) => prev === next
  );

  // 计算画布尺寸的函数 - 只有在非reactflow模式下才需要计算
  const calculateCanvasDimensions = useCallback(() => {
    if (canvasWrapperRef.current && viewMode !== 'reactflow') {
      const rect = canvasWrapperRef.current.getBoundingClientRect();
      setCanvasDimensions(prev => {
        // 只有当尺寸真正改变时才更新，避免不必要的重渲染
        if (prev.width !== rect.width || prev.height !== rect.height) {
          return {
            'width': rect.width,
            'height': rect.height
          };
        }
        return prev;
      });
    }
  }, [viewMode]);

  // 添加窗口大小变化监听器 - 只有在非reactflow模式下才需要监听
  React.useEffect(() => {
    if (viewMode !== 'reactflow') {
      calculateCanvasDimensions();
      const handleResize = () => {
        calculateCanvasDimensions();
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    return undefined;
  }, [calculateCanvasDimensions, viewMode]);

  // 优化forceGraphData计算：在reactflow模式下不计算，在forcegraph模式下根据nodes和edges变化计算
  // 使用ref缓存reactflow模式下的空结果，避免每次渲染创建新对象
  const emptyForceGraphData = React.useRef({ 'nodes': [], 'links': [] });
  const forceGraphData = useMemo(() => {
    if (viewMode === 'reactflow') {
      return emptyForceGraphData.current;
    }

    return {
      'nodes': nodes.map(node => ({
        'id': node.id,
        'name': node.data.title || '未命名节点',
        'val': 5,
        'color': node.data.style?.stroke || '#3b82f6'
      })),
      'links': edges.map(edge => ({
        'source': edge.source,
        'target': edge.target,
        'color': edge.data?.style?.stroke || '#3b82f6',
        'width': edge.data?.style?.strokeWidth || 2
      }))
    };
  }, [viewMode, nodes, edges]);

  // 使用useCallback缓存面板切换函数，避免每次渲染重新创建
  const toggleManagementPanel = useCallback(() => {
    setIsManagementPanelOpen(prev => !prev);
  }, []);

  const toggleAnalysisPanel = useCallback(() => {
    setIsAnalysisPanelOpen(prev => !prev);
  }, []);

  const toggleImportExportPanel = useCallback(() => {
    setIsImportExportPanelOpen(prev => !prev);
  }, []);

  const toggleGenerationPanel = useCallback(() => {
    setIsGenerationPanelOpen(prev => !prev);
  }, []);

  const toggleLayoutPanel = useCallback(() => {
    setIsLayoutPanelOpen(prev => !prev);
  }, []);

  // 使用useCallback缓存网格对齐切换函数，避免每次渲染重新创建
  const toggleSnapToGrid = useCallback(() => {
    setSnapToGrid(prev => !prev);
  }, []);

  // 处理布局应用
  const handleLayout = useCallback((layoutedNodes: Node<CustomNodeData>[], layoutedEdges: Edge<CustomEdgeData>[]) => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    // 缩放到适合视图
    reactFlowInstance.fitView({ 'duration': 500 });
  }, [setNodes, setEdges, reactFlowInstance]);

  // 处理节点连接
  const onConnect = useCallback(
    (params: Connection) => {
      // 默认使用浮动连接
      const customEdge = {
        ...params,
        'type': 'floating',
        'data': {
          'type': 'related',
          'curveType': 'default',
          'weight': 1,
          'style': {},
          'animation': {
            'dynamicEffect': 'flow',
            'isAnimating': false
          }
        },
        'markerEnd': {
          'type': 'arrowclosed',
          'color': '#3b82f6'
        }
      };
      setEdges((eds) => addEdge(customEdge, eds));
    },
    [setEdges]
  );

  // 处理导入完成
  const handleImportComplete = useCallback((importedNodes: Node<CustomNodeData>[], importedEdges: Edge<CustomEdgeData>[]) => {
    setNodes(importedNodes);
    setEdges(importedEdges);
    // 关闭导入导出面板
    setIsImportExportPanelOpen(false);
    // 缩放到适合视图
    reactFlowInstance.fitView({ 'duration': 500 });
  }, [setNodes, setEdges, reactFlowInstance]);

  // 创建新节点
  const createNewNode = useCallback(() => {
    // 获取视图中心位置 - 只在创建节点时获取
    const viewport = reactFlowInstance.getViewport();
    const centerX = -viewport.x / viewport.zoom;
    const centerY = -viewport.y / viewport.zoom;

    setNodes((currentNodes) => {
      // 计算新节点的编号
      const numberedNodeNumbers = currentNodes
        .map(node => {
          const nodeTitle = node.data?.title || '';
          const match = nodeTitle.match(/新节点(\d+)/);
          return match && match[1] ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      const maxNodeNumber = numberedNodeNumbers.length > 0 ? Math.max(...numberedNodeNumbers) : 0;
      const newNodeNumber = maxNodeNumber + 1;

      // 计算新节点位置
      let x: number;
      let y: number;
      const nodeSize = 100;
      const minDistance = nodeSize * 1.5;

      // 如果没有节点，直接放在中心位置
      if (currentNodes.length === 0) {
        x = centerX;
        y = centerY;
      } else {
        const angle = currentNodes.length * Math.PI * 0.618;
        // 基于节点数量动态调整距离
        const distance = minDistance * Math.sqrt(currentNodes.length + 1);

        // 计算所有节点的平均位置
        const avgX = currentNodes.reduce((sum, node) => sum + node.position.x, 0) / currentNodes.length;
        const avgY = currentNodes.reduce((sum, node) => sum + node.position.y, 0) / currentNodes.length;

        // 计算新节点位置
        x = avgX + Math.cos(angle) * distance;
        y = avgY + Math.sin(angle) * distance;
      }

      // 创建新节点 - 使用custom类型
      const newNode: Node<CustomNodeData> = {
        'id': `node-${Date.now()}`,
        'type': 'custom',
        'position': { x, y },
        'data': {
          'title': `新节点${newNodeNumber}`,
          'category': '默认',
          'handleCount': 4,
          'style': {},
          'metadata': {
            'content': ''
          }
        }
      };

      // 返回新节点数组
      return [...currentNodes, newNode];
    });
  }, [reactFlowInstance, setNodes]);

  // 处理生成完成
  const handleGenerateGraph = useCallback((newNodes: Node<CustomNodeData>[], newEdges: Edge<CustomEdgeData>[]) => {
    if (newNodes.length === 0 && newEdges.length === 0) {
      // 清空现有图
      setNodes([]);
      setEdges([]);
    } else if (newNodes.length > 0) {
      // 追加节点
      setNodes((currentNodes) => [...currentNodes, ...newNodes]);
    } else if (newEdges.length > 0) {
      // 追加边
      setEdges((currentEdges) => [...currentEdges, ...newEdges]);
    }
  }, [setNodes, setEdges]);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* 应用自定义样式来移除选择过渡动画 */}
      <CustomReactFlowStyles />

      {/* 顶部工具栏区域 */}
      <div className="bg-white border-b border-gray-200 shadow-md p-0 flex items-center justify-between gap-0 transition-all duration-300 ease-in-out z-50">
        {/* Logo、标题和统计信息 */}
        <div className="flex items-center gap-0 p-1">
          {/* Logo和标题 */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity mr-3 px-2 flex-shrink-0 cursor-pointer">
            <Brain className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-sm tracking-tight text-gray-800">MyWiki</span>
          </Link>

          {/* 图统计信息 */}
          <div className="flex items-center gap-2 px-2 py-1 bg-white/50 rounded-full text-xs font-medium text-gray-700 backdrop-blur-sm flex-shrink-0">
            <span className="flex items-center gap-1">
              <Database size={12} />
            节点: {nodeCount}
            </span>
            <span className="h-3 w-px bg-gray-400"></span>
            <span className="flex items-center gap-1">
              <Box size={12} />
            连接: {edgeCount}
            </span>
          </div>
        </div>

        {/* 工具栏按钮组 */}
        <GraphToolbar
          onAddNode={createNewNode}
          isManagementPanelOpen={isManagementPanelOpen}
          onToggleManagementPanel={toggleManagementPanel}
          isAnalysisPanelOpen={isAnalysisPanelOpen}
          onToggleAnalysisPanel={toggleAnalysisPanel}
          isImportExportPanelOpen={isImportExportPanelOpen}
          onToggleImportExportPanel={toggleImportExportPanel}
          isGenerationPanelOpen={isGenerationPanelOpen}
          onToggleGenerationPanel={toggleGenerationPanel}
          isLayoutPanelOpen={isLayoutPanelOpen}
          onToggleLayoutPanel={toggleLayoutPanel}
          snapToGrid={snapToGrid}
          onToggleSnapToGrid={toggleSnapToGrid}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
        />
      </div>

      {/* 根据视图模式渲染不同的图组件 */}
      <div ref={canvasWrapperRef} className="flex-1 w-full bg-gray-50 relative">
        {/* 根据视图模式渲染不同的图组件 */}
        {viewMode === 'reactflow' && (
          <ReactFlowView
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            snapToGrid={snapToGrid}
            snapGrid={snapGrid}
            reactFlowWrapper={reactFlowWrapper}
          />
        )}
        {viewMode === 'forcegraph2d' && (
          <ForceGraph2DView
            graphData={forceGraphData}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
          />
        )}
        {viewMode === 'forcegraph3d' && (
          <ForceGraph3DView
            graphData={forceGraphData}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
          />
        )}

        {/* 图控制面板 - 只在有选中节点或边时渲染，且仅在React Flow模式下 */}
        {hasSelection && viewMode === 'reactflow' && (
          <GraphControlPanel
            panelPosition="right"
          />
        )}

        {/* 图分析面板 - 条件渲染，使用较大尺寸 */}
        {isAnalysisPanelOpen && (
          <div className="w-[40rem] min-w-[40rem] max-w-[40rem] bg-white shadow-lg flex flex-col overflow-hidden h-full border-r border-gray-200 absolute left-0 top-0 z-20">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 truncate">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  图分析
                </h2>
                <p className="text-sm text-gray-600 mt-1 truncate">
                  分析图的中心性指标和路径信息
                </p>
              </div>
              <button
                onClick={() => setIsAnalysisPanelOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors flex-shrink-0"
                title="关闭"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 bg-gray-50 min-w-0">
              <GraphAnalysisPanel />
            </div>
          </div>
        )}

        {/* 图管理综合面板 - 条件渲染 */}
        {isManagementPanelOpen && (
          <div className="w-[40rem] min-w-[40rem] max-w-[40rem] bg-white shadow-lg flex flex-col overflow-hidden h-full border-r border-gray-200 absolute left-0 top-0 z-10">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  图管理
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  管理节点、连接和查看统计信息
                </p>
              </div>
              <button
                onClick={() => setIsManagementPanelOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                title="关闭面板"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <GraphManagementPanel
                onAddNode={createNewNode}
              />
            </div>
          </div>
        )}

        {/* 导入导出面板 - 条件渲染 */}
        {isImportExportPanelOpen && (
          <div className="w-[40rem] min-w-[40rem] max-w-[40rem] bg-white shadow-lg flex flex-col overflow-hidden h-full border-r border-gray-200 absolute left-0 top-0 z-30">
            <GraphImportExportPanel
              onImportComplete={handleImportComplete}
              onClose={() => setIsImportExportPanelOpen(false)}
            />
          </div>
        )}

        {/* 图生成面板 - 条件渲染，使用较大尺寸 */}
        {isGenerationPanelOpen && (
          <GraphGenerationPanel
            onGenerate={handleGenerateGraph}
            onClose={() => setIsGenerationPanelOpen(false)}
          />
        )}

        {/* 布局面板 - 条件渲染，且仅在React Flow模式下 */}
        {isLayoutPanelOpen && viewMode === 'reactflow' && (
          <div className="w-[40rem] min-w-[40rem] max-w-[40rem] bg-white shadow-lg flex flex-col overflow-hidden h-full border-r border-gray-200 absolute left-0 top-0 z-20">
            <GraphLayoutPanel
              onLayout={handleLayout}
              onClose={() => setIsLayoutPanelOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// 新的GraphVisualization组件，使用ReactFlowProvider包装
const GraphVisualization: React.FC = () => {
  return (
    <ReactFlowProvider>
      <GraphVisualizationContent />
    </ReactFlowProvider>
  );
};

export default GraphVisualization;
