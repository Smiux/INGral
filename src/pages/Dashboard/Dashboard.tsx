import React, { useState, useCallback, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ReactFlowProvider, Node, Edge, useNodesState, useEdgesState } from '@xyflow/react';
import type { CustomNodeData } from '@/components/graph/GraphVisualization/CustomNode';
import type { CustomEdgeData } from '@/components/graph/GraphVisualization/FloatingEdge';
import GraphGenerationPanel from '@/components/graph/GraphVisualization/GraphGenerationPanel';
import GraphAnalysisPanel from '@/components/graph/GraphVisualization/GraphAnalysisPanel';
import GraphManagementPanel from '@/components/graph/GraphVisualization/GraphManagementPanel';
import GraphLayoutPanel from '@/components/graph/GraphVisualization/GraphLayoutPanel';
import DraggablePanel from '@/components/dashboard/DraggablePanel';

// 定义仪表盘组件类型
type DashboardComponent = {
  id: string;
  type: 'graph' | 'generation' | 'analysis' | 'management' | 'layout' | 'control';
  title: string;
  size: { width: number; height: number };
  position: { x: number; y: number };
};

// 定义仪表盘内容组件，包含React Flow上下文
const DashboardContent: React.FC = () => {
  // 获取窗口尺寸用于响应式布局
  const [windowSize, setWindowSize] = useState({
    'width': window.innerWidth,
    'height': window.innerHeight
  });

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        'width': window.innerWidth,
        'height': window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 计算面板尺寸和位置，实现平均分配
  const calculatePanelLayout = useCallback((): DashboardComponent[] => {
    const padding = 20;
    const gap = 15;
    const availableWidth = windowSize.width - padding * 2;
    // 减去logo区域高度
    const availableHeight = windowSize.height - padding * 2 - 60;

    // 2x2网格布局
    const cols = 2;
    const rows = 2;
    const panelWidth = (availableWidth - gap * (cols - 1)) / cols;
    const panelHeight = (availableHeight - gap * (rows - 1)) / rows;

    return [
      {
        'id': 'generation-1',
        'type': 'generation',
        'title': '图生成',
        'size': { 'width': panelWidth, 'height': panelHeight },
        'position': { 'x': padding, 'y': padding + 60 }
      },
      {
        'id': 'analysis-1',
        'type': 'analysis',
        'title': '图分析',
        'size': { 'width': panelWidth, 'height': panelHeight },
        'position': { 'x': padding + panelWidth + gap, 'y': padding + 60 }
      },
      {
        'id': 'management-1',
        'type': 'management',
        'title': '图管理',
        'size': { 'width': panelWidth, 'height': panelHeight },
        'position': { 'x': padding, 'y': padding + 60 + panelHeight + gap }
      },
      {
        'id': 'layout-1',
        'type': 'layout',
        'title': '布局管理',
        'size': { 'width': panelWidth, 'height': panelHeight },
        'position': { 'x': padding + panelWidth + gap, 'y': padding + 60 + panelHeight + gap }
      }
    ];
  }, [windowSize]);

  // 初始化仪表盘组件列表
  const [components, setComponents] = useState<DashboardComponent[]>(() => calculatePanelLayout());

  // 当窗口大小变化时重新计算布局
  useEffect(() => {
    const newLayout = calculatePanelLayout();
    setComponents(newLayout);
  }, [calculatePanelLayout]);

  // 初始化传感器，用于检测拖拽操作
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // 处理面板位置变化
  const handlePanelPositionChange = useCallback((componentId: string, position: { x: number; y: number }) => {
    setComponents((prev) =>
      prev.map((component) =>
        component.id === componentId ? { ...component, position } : component
      )
    );
  }, []);

  // 处理面板大小变化
  const handlePanelSizeChange = useCallback((componentId: string, size: { width: number; height: number }) => {
    setComponents((prev) =>
      prev.map((component) =>
        component.id === componentId ? { ...component, size } : component
      )
    );
  }, []);

  // React Flow 状态管理
  const [nodes, setNodes] = useNodesState<Node<CustomNodeData>>([]);
  const [edges, setEdges] = useEdgesState<Edge<CustomEdgeData>>([]);

  // 处理图谱生成
  const handleGenerate = useCallback((newNodes: Node<CustomNodeData>[], newEdges: Edge<CustomEdgeData>[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  }, [setNodes, setEdges]);

  // 处理添加节点
  const handleAddNode = useCallback(() => {
    // 这里可以实现添加节点的逻辑
    console.log('Add node clicked');
  }, []);

  // 处理布局更新
  const handleLayout = useCallback((layoutedNodes: Node<CustomNodeData>[], layoutedEdges: Edge<CustomEdgeData>[]) => {
    setNodes(layoutedNodes);
    if (layoutedEdges.length > 0) {
      setEdges(layoutedEdges);
    }
  }, [setNodes, setEdges]);

  // 渲染仪表盘组件内容
  const renderComponentContent = (component: DashboardComponent) => {
    switch (component.type) {
      case 'generation':
        return <GraphGenerationPanel onGenerate={handleGenerate} />;
      case 'analysis':
        return <GraphAnalysisPanel />;
      case 'management':
        return <GraphManagementPanel onAddNode={handleAddNode} />;
      case 'layout':
        return <GraphLayoutPanel nodes={nodes} edges={edges} onLayout={handleLayout} />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* 网站Logo */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <div className="text-white">
            <div className="text-sm font-semibold">知识图谱</div>
            <div className="text-xs text-blue-300">Knowledge Graph</div>
          </div>
        </div>
      </div>

      {/* 仪表盘工作区 */}
      <div className="dashboard-workspace relative min-h-screen" style={{ 'background': 'transparent' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
        >
          {components.map((component) => (
            <DraggablePanel
              key={component.id}
              id={component.id}
              title={component.title}
              className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-2xl"
              style={{
                'width': component.size.width,
                'height': component.size.height,
                'left': component.position.x,
                'top': component.position.y
              }}
              onPositionChange={(position) => handlePanelPositionChange(component.id, position)}
              onSizeChange={(size) => handlePanelSizeChange(component.id, size)}
            >
              {renderComponentContent(component)}
            </DraggablePanel>
          ))}
        </DndContext>
      </div>
    </div>
  );
};

// 主仪表盘组件，提供React Flow上下文
const Dashboard: React.FC = () => {
  return (
    <ReactFlowProvider>
      <DashboardContent />
    </ReactFlowProvider>
  );
};

export default Dashboard;
