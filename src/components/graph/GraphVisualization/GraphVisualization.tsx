import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
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
import '@xyflow/react/dist/style.css';
import GraphToolbar from './GraphToolbar';

// 添加全局样式来优化React Flow的选择过渡效果
const CustomReactFlowStyles = () => (
  <style>{`
    /* 优化选择框的过渡效果 - 调整为合适的时长 */
    .react-flow__nodesselection-rect,
    .react-flow__selection {
      transition: opacity 0.2s ease, transform 0.2s ease !important;
    }
    
    /* 为节点添加颜色渐变过渡 - 调整为合适的时长 */
    .react-flow__node {
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, --node-stroke-color 0.2s ease !important;
    }
    
    /* 确保节点的边框颜色变化能平滑过渡 */
    .react-flow__node > div {
      transition: border-color 0.2s ease !important;
    }
    
    /* 为连接添加平滑的渐变过渡 - 调整为合适的时长 */
    .react-flow__edge {
      transition: stroke 0.2s ease, stroke-width 0.2s ease, --arrow-fill-color 0.2s ease, --arrow-stroke-color 0.2s ease !important;
    }
    
    /* 确保箭头路径支持过渡效果 - 调整为合适的时长 */
    .react-flow__edge path {
      transition: stroke 0.2s ease, stroke-width 0.2s ease !important;
    }
    
    /* 确保箭头标记支持过渡效果 - 调整为合适的时长 */
    .react-flow__edge marker path {
      transition: fill 0.2s ease, stroke 0.2s ease !important;
    }
  `}</style>
);



// 导入自定义节点和连接组件
import CustomNode, { CustomNodeData } from './CustomNode';
import CustomEdge, { CustomEdgeData } from './CustomEdge';
import GraphControlPanel from './GraphControlPanel';
import GraphManagementPanel from './GraphManagementPanel';
import { GraphAnalysisPanel } from './GraphAnalysisPanel';
import { GraphImportExportPanel } from './GraphImportExportPanel';
import GraphGenerationPanel from './GraphGenerationPanel';
import GraphLayoutPanel from './GraphLayoutPanel';

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
      'handles': {
        'lockedHandles': {},
        'handleLabels': {}
      },
      'style': {},
      'metadata': {
        'createdAt': Date.now(),
        'updatedAt': Date.now(),
        'version': 1,
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
      'handles': {
        'lockedHandles': {},
        'handleLabels': {}
      },
      'style': {},
      'metadata': {
        'createdAt': Date.now(),
        'updatedAt': Date.now(),
        'version': 1,
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
      'handles': {
        'lockedHandles': {},
        'handleLabels': {}
      },
      'style': {},
      'metadata': {
        'createdAt': Date.now(),
        'updatedAt': Date.now(),
        'version': 1,
        'content': ''
      }
    }
  }
];

// 初始化连接数据
const initialEdges: Edge<CustomEdgeData>[] = [
  {
    'id': 'e1-2',
    'type': 'custom',
    'source': '1',
    'target': '2',
    'label': '连接 1-2',
    'data': {
      'type': 'related',
      'curveType': 'default',
      'weight': 1,
      'style': {},
      'animation': {
        'dynamicEffect': 'none',
        'isAnimating': false
      }
    }
  },
  {
    'id': 'e1-3',
    'type': 'custom',
    'source': '1',
    'target': '3',
    'label': '连接 1-3',
    'data': {
      'type': 'related',
      'curveType': 'default',
      'weight': 1,
      'style': {},
      'animation': {
        'dynamicEffect': 'none',
        'isAnimating': false
      }
    }
  }
];

// 图谱可视化主组件
const GraphVisualizationContent: React.FC = () => {
  // 使用React Flow内置hooks管理节点和连接状态
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 使用内置hook获取React Flow实例
  const reactFlowInstance = useReactFlow();

  // React Flow容器引用
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // 使用useStore选择器获取节点和边的数量，减少不必要的重渲染
  const nodeCount = useStore(state => state.nodes.length);
  const edgeCount = useStore(state => state.edges.length);

  // 检查是否有选中的节点或边
  const hasSelection = useStore(state =>
    state.nodes.some(node => node.selected) || state.edges.some(edge => edge.selected)
  );


  // 图谱管理面板显示状态，初始设置为关闭
  const [isManagementPanelOpen, setIsManagementPanelOpen] = useState(false);
  // 图谱分析面板显示状态，初始设置为关闭
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(false);
  // 导入导出面板显示状态，初始设置为关闭
  const [isImportExportPanelOpen, setIsImportExportPanelOpen] = useState(false);
  // 图生成面板显示状态，初始设置为关闭
  const [isGenerationPanelOpen, setIsGenerationPanelOpen] = useState(false);
  // 布局面板显示状态，初始设置为关闭
  const [isLayoutPanelOpen, setIsLayoutPanelOpen] = useState(false);

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
      const customEdge = {
        ...params,
        'type': 'custom',
        'data': {
          'type': 'related',
          'curveType': 'default',
          'weight': 1,
          'style': {},
          'animation': {
            'dynamicEffect': 'none',
            'isAnimating': false
          }
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

  // 创建新节点 - 优化：使用更高效的算法计算新节点编号和位置
  const createNewNode = useCallback(() => {
    // 获取视图中心位置 - 只在创建节点时获取
    const viewport = reactFlowInstance.getViewport();
    const centerX = -viewport.x / viewport.zoom;
    const centerY = -viewport.y / viewport.zoom;

    // 使用函数式更新，避免依赖nodes数组
    setNodes((currentNodes) => {
      // 计算新节点的编号 - 优化：使用map和Math.max结合的方式，减少循环中的条件判断
      const numberedNodeNumbers = currentNodes
        .map(node => {
          const nodeTitle = node.data?.title || '';
          const match = nodeTitle.match(/新节点(\d+)/);
          return match && match[1] ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      const maxNodeNumber = numberedNodeNumbers.length > 0 ? Math.max(...numberedNodeNumbers) : 0;
      const newNodeNumber = maxNodeNumber + 1;

      // 计算新节点位置 - 优化：使用更高效的算法，避免嵌套循环
      let x: number;
      let y: number;
      const nodeSize = 100;
      const minDistance = nodeSize * 1.5;

      // 如果没有节点，直接放在中心位置
      if (currentNodes.length === 0) {
        x = centerX;
        y = centerY;
      } else {
        // 快速定位：使用极坐标布局，避免嵌套循环
        // 基于当前节点数量计算角度，确保新节点与现有节点有一定距离
        // 使用黄金角分布，避免节点重叠
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
          'handles': {
            'lockedHandles': {},
            'handleLabels': {}
          },
          'style': {},
          'metadata': {
            'createdAt': Date.now(),
            'updatedAt': Date.now(),
            'version': 1,
            'content': ''
          }
        }
      };

      // 返回新节点数组
      return [...currentNodes, newNode];
    });
  }, [reactFlowInstance, setNodes]);

  // 自定义节点和连接类型映射 - 使用useMemo缓存，避免每次渲染重新创建
  const nodeTypes = useMemo(() => ({
    'custom': CustomNode
  }), []) as unknown as NodeTypes;

  const edgeTypes = useMemo(() => ({
    'custom': CustomEdge
  }), []) as unknown as EdgeTypes;



  // 图生成回调函数 - 实现渐进式生成
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
          <div className="flex items-center gap-2 hover:opacity-80 transition-opacity mr-3 px-2 flex-shrink-0">
            <Brain className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-sm tracking-tight text-gray-800">MyMathWiki</span>
          </div>

          {/* 图谱统计信息 - 使用useStore选择器获取数据，减少重渲染 */}
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
        />
      </div>

      {/* React Flow容器 - 添加背景色以便更好地看到背景点 */}
      <div ref={reactFlowWrapper} className="flex-1 w-full bg-gray-50 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          // 启用缩放和拖动功能
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnScroll={false}
          zoomOnDoubleClick={true}
          // 设置缩放范围
          minZoom={0.1}
          maxZoom={4}
          // 设置默认视图
          defaultViewport={{ 'x': 0, 'y': 0, 'zoom': 1 }}
          // 高度和宽度由容器决定
          style={{ 'width': '100%', 'height': '100%' }}
          // 开启自由连接模式
          nodesConnectable={true}
          // 设置连接模式为loose，允许自由创建连接
          connectionMode={ConnectionMode.Loose}
          // 使用proOptions隐藏水印
          proOptions={{ 'hideAttribution': true }}
          // 简化删除键配置
          deleteKeyCode={['Delete', 'Backspace']}
          // 启用节点和边的优化渲染
          nodesDraggable={true}
          nodesFocusable={true}
          edgesFocusable={true}
          multiSelectionKeyCode={['Shift', 'Control']}
          selectionOnDrag={true}
          // 防止在交互时滚动页面
          preventScrolling={true}
          // 禁用网格对齐，提高性能
          snapToGrid={false}
          // 启用节点重排优化
          elevateNodesOnSelect={true}
          // 禁用连接动画
          connectionLineStyle={{ 'stroke': '#3b82f6', 'strokeWidth': 2, 'animation': 'none' }}
        >
          {/* 定义箭头标记 - 使用CSS变量控制颜色，支持过渡效果 */}
          <svg>
            <defs>
              <marker
                id="arrowhead"
                markerWidth="7.2"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path
                  d="M 0,1.6 Q 0,0 1.6,0 L 6.4,3.2 Q 7.2,4 6.4,4.8 L 1.6,8 Q 0,8 0,6.4 Z"
                  fill="var(--xy-edge-stroke, #3b82f6)"
                  stroke="var(--xy-edge-stroke, #3b82f6)"
                />
              </marker>
              <marker
                id="arrowhead-selected"
                markerWidth="7.2"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path
                  d="M 0,1.6 Q 0,0 1.6,0 L 6.4,3.2 Q 7.2,4 6.4,4.8 L 1.6,8 Q 0,8 0,6.4 Z"
                  fill="var(--xy-edge-stroke, #ef4444)"
                  stroke="var(--xy-edge-stroke, #ef4444)"
                />
              </marker>
            </defs>
          </svg>

          {/* 背景 - 使用点状背景 */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            color="#ccc"
          />
          {/* 视图控制 - 默认位置在右下角 */}
          <Controls
            position="bottom-right"
          />
          {/* 小地图 - 默认位置在右下角，调整样式使其更清晰 */}
          <MiniMap
            nodeColor={() => '#3b82f6'}
            zoomable
            pannable
            style={{ 'backgroundColor': '#fff', 'border': '1px solid #ccc' }}
            maskColor="rgba(255, 255, 255, 0.6)"
            position="bottom-right"
          />
        </ReactFlow>

        {/* 图谱控制面板 - 只在有选中节点或边时渲染 */}
        {hasSelection && (
          <GraphControlPanel
            panelPosition="right"
          />
        )}

        {/* 图谱分析面板 - 条件渲染，使用较大尺寸 */}
        {isAnalysisPanelOpen && (
          <div className="w-128 bg-white shadow-lg flex flex-col overflow-hidden h-full border-r border-gray-200 absolute left-0 top-0 z-20">
            <div className="bg-white p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">图谱分析</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
              <GraphAnalysisPanel />
            </div>
          </div>
        )}

        {/* 图谱管理综合面板 - 条件渲染 */}
        {isManagementPanelOpen && (
          <div className="w-72 bg-white shadow-lg flex flex-col overflow-hidden h-full border-r border-gray-200 absolute left-0 top-0 z-10">
            <div className="bg-white p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">图谱管理</h2>
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
          <div className="w-80 bg-white shadow-lg flex flex-col overflow-hidden h-full border-r border-gray-200 absolute left-0 top-0 z-30">
            <GraphImportExportPanel
              nodes={nodes}
              edges={edges}
              onImportComplete={handleImportComplete}
            />
          </div>
        )}

        {/* 图生成面板 - 条件渲染，使用较大尺寸 */}
        {isGenerationPanelOpen && (
          <GraphGenerationPanel
            onGenerate={handleGenerateGraph}
          />
        )}

        {/* 布局面板 - 条件渲染 */}
        {isLayoutPanelOpen && (
          <div className="w-128 bg-white shadow-lg flex flex-col overflow-hidden h-full border-r border-gray-200 absolute left-0 top-0 z-20">
            <GraphLayoutPanel
              nodes={nodes}
              edges={edges}
              onLayout={handleLayout}
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
