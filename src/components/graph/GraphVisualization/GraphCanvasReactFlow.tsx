/**
 * React Flow 图谱画布组件
 * 负责图谱的核心渲染和交互功能，替代D3实现
 */
import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
  NodeMouseHandler,
  EdgeMouseHandler,
  Connection,
  MiniMap,
  type ReactFlowProps,
  type ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { EnhancedNode, EnhancedGraphLink, GraphCanvasProps } from './types';
import { useGraph } from './useGraph';
import { default as DefaultNode } from './nodes/DefaultNode';
import { default as DefaultEdge } from './edges/DefaultEdge';

// 定义自定义节点类型
const nodeTypes: NodeTypes = {
  default: DefaultNode
};

// 定义自定义边类型
const edgeTypes: EdgeTypes = {
  default: DefaultEdge
};

/**
 * React Flow 图谱画布组件
 */
export const GraphCanvasReactFlow: React.FC<Partial<GraphCanvasProps>> = (props) => {
  // ReactFlow实例ref，用于访问ReactFlow API
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  
  // 优先使用props，否则使用useGraph Hook获取状态和操作
  const isUsingProps = props.nodes && props.links;
  const { state, actions } = useGraph();
  
  // 从state中解构需要的状态
  const {
    nodes: contextNodes,
    links: contextLinks,
    selectedNode: contextSelectedNode,
    selectedNodes: contextSelectedNodes,
    currentTheme: contextTheme
  } = state;
  
  // 合并props和context状态
  const nodes = isUsingProps ? props.nodes! : contextNodes;
  const links = isUsingProps ? props.links! : contextLinks;
  const selectedNode = isUsingProps ? props.selectedNode : contextSelectedNode;
  const selectedNodes = isUsingProps ? props.selectedNodes : contextSelectedNodes;
  const theme = isUsingProps ? props.theme! : contextTheme;
  
  // 合并props和context操作
  const handleNodeClick = isUsingProps ? props.onNodeClick! : actions.handleNodeClick;
  const handleNodeDragStart = isUsingProps ? props.onNodeDragStart! : actions.handleNodeDragStart;
  const handleNodeDragEnd = isUsingProps ? props.onNodeDragEnd! : actions.handleNodeDragEnd;
  const handleLinkClick = isUsingProps ? props.onLinkClick! : actions.handleLinkClick;
  const handleCanvasClick = isUsingProps ? props.onCanvasClick! : actions.handleCanvasClick;
  
  // 将EnhancedNode转换为React Flow Node
  const convertToReactFlowNodes = useCallback((enhancedNodes: EnhancedNode[]): Array<import('reactflow').Node> => {
    return enhancedNodes.map(node => ({
      id: node.id,
      type: 'default',
      position: { x: node.x || 0, y: node.y || 0 },
      data: {
        ...node,
        title: node.title,
        connections: node.connections,
        content: node.content,
        type: node.type,
        shape: node.shape
      },
      className: 'graph-node',
      selected: (selectedNode?.id === node.id) || !!selectedNodes?.some((n: EnhancedNode) => n.id === node.id),
      draggable: true,
      selectable: true,
      connectable: true
    }));
  }, [selectedNode, selectedNodes]);
  
  // 将EnhancedGraphLink转换为React Flow Edge
  const convertToReactFlowEdges = useCallback((enhancedLinks: EnhancedGraphLink[]): Array<import('reactflow').Edge> => {
    return enhancedLinks.map(link => {
      const source = typeof link.source === 'string' ? link.source : (link.source as EnhancedNode).id;
      const target = typeof link.target === 'string' ? link.target : (link.target as EnhancedNode).id;
      
      return {
        id: link.id,
        source: source as string,
        target: target as string,
        type: 'default',
        animated: false,
        label: link.label || link.type,
        className: 'graph-edge',
        selected: false,
        deletable: true
      };
    });
  }, []);
  
  // 初始化React Flow节点和边
  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState(convertToReactFlowNodes(nodes));
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState(convertToReactFlowEdges(links));
  
  // 当nodes或links变化时，更新React Flow节点和边
  React.useEffect(() => {
    setReactFlowNodes(convertToReactFlowNodes(nodes));
  }, [nodes, convertToReactFlowNodes, setReactFlowNodes]);
  
  React.useEffect(() => {
    setReactFlowEdges(convertToReactFlowEdges(links));
  }, [links, convertToReactFlowEdges, setReactFlowEdges]);
  
  // 处理节点点击
  const onNodeClick: NodeMouseHandler = useCallback((_: React.MouseEvent, node) => {
    const enhancedNode = nodes.find(n => n.id === node.id);
    if (enhancedNode) {
      handleNodeClick(enhancedNode, _ as React.MouseEvent);
    }
  }, [nodes, handleNodeClick]);
  
  // 处理边点击
  const onEdgeClick: EdgeMouseHandler = useCallback((_: React.MouseEvent, edge) => {
    const enhancedLink = links.find(l => l.id === edge.id);
    if (enhancedLink) {
      handleLinkClick(enhancedLink);
    }
  }, [links, handleLinkClick]);
  
  // 处理边创建
  const onConnect: ReactFlowProps['onConnect'] = useCallback((connection: Connection) => {
    const newEdge = addEdge(
      {
        ...connection,
        type: 'default',
        id: `link-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        label: '关联关系',
        animated: false
      },
      reactFlowEdges
    );
    setReactFlowEdges(newEdge);
    
    // 创建EnhancedGraphLink并添加到状态
    const newEdgeId = newEdge[newEdge.length - 1]?.id;
    if (newEdgeId && connection.source && connection.target) {
      const enhancedLink: EnhancedGraphLink = {
        id: newEdgeId,
        source: connection.source as string,
        target: connection.target as string,
        type: 'relation'
      };
      actions.addLink(enhancedLink);
    }
  }, [reactFlowEdges, setReactFlowEdges, actions]);
  
  // 处理画布点击
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    handleCanvasClick(event);
  }, [handleCanvasClick]);
  
  // 处理ReactFlow初始化
  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    // 初始适应视图
    if (nodes.length > 0) {
      instance.fitView({
        padding: 100,
        duration: 500
      });
    }
  }, [nodes]);
  
  // 自动适应视图的效果
  const fitView = useCallback(() => {
    if (reactFlowInstance.current && nodes.length > 0) {
      reactFlowInstance.current.fitView({
        padding: 100,
        duration: 500
      });
    }
  }, [nodes]);
  
  // 当nodes或links变化时，自动适应视图
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView();
      }, 100);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [nodes, links, fitView]);
  
  // 处理节点拖拽开始
  const onNodeDragStart = useCallback((_: React.MouseEvent, node: import('reactflow').Node) => {
    const enhancedNode = nodes.find(n => n.id === node.id);
    if (enhancedNode) {
      handleNodeDragStart(enhancedNode);
    }
  }, [nodes, handleNodeDragStart]);
  
  // 处理节点拖拽
  const onNodeDrag = useCallback((_: React.MouseEvent, node: import('reactflow').Node) => {
    const enhancedNode = nodes.find(n => n.id === node.id);
    if (enhancedNode) {
      // 更新节点位置
      const updatedNode = {
        ...enhancedNode,
        x: node.position.x,
        y: node.position.y
      };
      actions.updateNode(updatedNode);
      handleNodeDragEnd(updatedNode);
    }
  }, [nodes, handleNodeDragEnd, actions]);
  
  // 主题配置 - ReactFlow v11 不再支持theme属性，使用CSS变量或自定义样式
  
  return (
    <div className="w-full h-full relative" style={{ backgroundColor: theme.backgroundColor }} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onInit={onInit}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="top-right"
        // 启用虚拟滚动，提高大量节点时的性能
        nodesDraggable={true}
        nodesConnectable={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnDrag={true}
        panOnScroll={false}
        // 缩放限制
        minZoom={0.1}
        maxZoom={4}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        {/* 添加迷你地图 */}
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            // 根据节点类型设置不同颜色
            const enhancedNode = nodes.find(n => n.id === node.id);
            if (enhancedNode?.type === 'concept') return '#8b5cf6';
            if (enhancedNode?.type === 'article') return '#3b82f6';
            if (enhancedNode?.type === 'resource') return '#10b981';
            if (enhancedNode?.type === 'aggregate') return '#f59e0b';
            return '#6b7280';
          }}
          zoomable
          pannable
          className="minimap"
        />
      </ReactFlow>
    </div>
  );
};

// 默认导出
export default GraphCanvasReactFlow;
