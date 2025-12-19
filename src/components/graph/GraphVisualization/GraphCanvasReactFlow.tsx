/**
 * React Flow 图谱画布组件
 * 负责图谱的核心渲染和交互功能，替代D3实现
 */
import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
  NodeMouseHandler,
  EdgeMouseHandler,
  Connection,
  MiniMap,
  useNodesState,
  useEdgesState,
  type ReactFlowProps,
  type ReactFlowInstance
} from 'reactflow';

// 导入 ReactFlow NodeChange 类型
type ReactFlowNodeChange = import('reactflow').NodeChange;
import 'reactflow/dist/style.css';
import type { EnhancedNode, EnhancedGraphConnection, GraphCanvasProps } from './types';
import { useGraph } from './useGraph';
import { default as DefaultNode } from './nodes/DefaultNode';
import { default as DefaultEdge } from './edges/DefaultEdge';

// 定义自定义节点类型
const nodeTypes: NodeTypes = {
  'default': DefaultNode
};

// 定义自定义边类型
const edgeTypes: EdgeTypes = {
  'default': DefaultEdge
};

// 隐藏React Flow水印的CSS
const hideAttributionStyle = `
  .react-flow__attribution {
    display: none !important;
  }
`;

/**
 * React Flow 图谱画布组件
 */
export const GraphCanvasReactFlow: React.FC<Partial<GraphCanvasProps>> = (props) => {
  // ReactFlow实例ref，用于访问ReactFlow API
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // 优先使用props，否则使用useGraph Hook获取状态和操作
  const isUsingProps = props.nodes && props.connections;
  const { state, actions } = useGraph();

  // 从state中解构需要的状态
  const {
    'nodes': contextNodes,
    'connections': contextConnections,
    'currentTheme': contextTheme
  } = state;

  // 合并props和context状态
  const nodes = isUsingProps ? props.nodes! : contextNodes;
  const connections = isUsingProps ? props.connections! : contextConnections;
  const theme = isUsingProps ? props.theme! : contextTheme;

  // 合并props和context操作
  const handleNodeClick = isUsingProps ? props.onNodeClick! : actions.handleNodeClick;
  const handleNodeDragStart = isUsingProps ? props.onNodeDragStart! : actions.handleNodeDragStart;
  const handleConnectionClick = isUsingProps ? props.onConnectionClick! : actions.handleConnectionClick;
  const handleCanvasClick = isUsingProps ? props.onCanvasClick! : actions.handleCanvasClick;

  // 将EnhancedNode转换为React Flow Node
  const convertToReactFlowNodes = useCallback((enhancedNodes: EnhancedNode[]): Array<import('reactflow').Node> => {
    return enhancedNodes.map(node => ({
      'id': node.id,
      'type': 'default',
      'position': { 'x': node.x || 0, 'y': node.y || 0 },
      'data': {
        ...node,
        'title': node.title,
        'connections': node.connections,
        'content': node.content,
        'type': node.type,
        'shape': node.shape
      },
      'className': 'graph-node',
      // 移除手动设置的selected属性，让ReactFlow自己管理选中状态
      'draggable': true,
      'selectable': true,
      'connectable': true
    }));
  }, []);

  // 将EnhancedGraphConnection转换为React Flow Edge
  const convertToReactFlowEdges = useCallback((enhancedConnections: EnhancedGraphConnection[]): Array<import('reactflow').Edge> => {
    return enhancedConnections.map(connection => {
      const source = typeof connection.source === 'string' ? connection.source : (connection.source as EnhancedNode).id;
      const target = typeof connection.target === 'string' ? connection.target : (connection.target as EnhancedNode).id;

      return ({
        'id': connection.id,
        'source': source as string,
        'target': target as string,
        'type': 'default',
        'animated': false,
        'label': connection.label || connection.type,
        'className': 'graph-edge',
        'selected': false,
        'deletable': true
      });
    });
  }, []);

  // 使用ReactFlow的内置状态管理
  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState(
    convertToReactFlowNodes(nodes)
  );

  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState(
    convertToReactFlowEdges(connections)
  );

  // 使用ref存储防抖计时器，用于优化节点拖动性能
  const dragDebounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // 监听外部节点变化，更新ReactFlow内部状态
  React.useEffect(() => {
    // 当节点数组变化时（包括位置、属性等），更新内部状态
    setReactFlowNodes(convertToReactFlowNodes(nodes));
  }, [nodes, convertToReactFlowNodes, setReactFlowNodes]);

  // 监听外部连接变化，更新ReactFlow内部状态
  React.useEffect(() => {
    // 当连接数组变化时，更新内部状态
    setReactFlowEdges(convertToReactFlowEdges(connections));
  }, [connections, convertToReactFlowEdges, setReactFlowEdges]);

  // 处理节点变化事件
  const handleNodesChange = useCallback((changes: ReactFlowNodeChange[]) => {
    onNodesChange(changes);

    // 处理节点位置变化，使用防抖优化性能
    changes.forEach(change => {
      if (change.type === 'position' && 'position' in change && 'id' in change) {
        const { id, position } = change;
        const enhancedNode = nodes.find(n => n.id === id);
        if (enhancedNode) {
          // 清除之前的防抖计时器
          if (dragDebounceRef.current) {
            clearTimeout(dragDebounceRef.current);
          }

          // 设置新的防抖计时器，延迟100ms更新全局状态
          dragDebounceRef.current = setTimeout(() => {
            const updatedNode = {
              ...enhancedNode,
              'x': position.x,
              'y': position.y
            };
            actions.updateNode(updatedNode);
          }, 100);
        }
      } else {
        // 处理其他类型的节点变化（如选择、折叠等）
        // 这里可以根据需要添加相应的处理逻辑
      }
    });
  }, [nodes, actions, onNodesChange]);

  // 处理节点点击
  const onNodeClick: NodeMouseHandler = useCallback((event: React.MouseEvent, node) => {
    const enhancedNode = nodes.find(n => n.id === node.id);
    if (enhancedNode) {
      handleNodeClick(enhancedNode, event);
    }
  }, [nodes, handleNodeClick]);



  // 处理连接点击
  const onEdgeClick: EdgeMouseHandler = useCallback((_: React.MouseEvent, edge) => {
    const enhancedConnection = connections.find(l => l.id === edge.id);
    if (enhancedConnection) {
      handleConnectionClick(enhancedConnection);
    }
  }, [connections, handleConnectionClick]);

  // 处理连接创建
  const onConnect: ReactFlowProps['onConnect'] = useCallback((connection: Connection) => {
    // 创建EnhancedGraphConnection并添加到状态
    if (connection.source && connection.target) {
      const newEdgeId = `connection-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const enhancedConnection: EnhancedGraphConnection = {
        'id': newEdgeId,
        'source': connection.source as string,
        'target': connection.target as string,
        'type': 'relation'
      };
      actions.addConnection(enhancedConnection);

      // 更新源节点和目标节点的连接计数
      const updatedNodes = nodes.map(node => {
        if (node.id === connection.source || node.id === connection.target) {
          return {
            ...node,
            'connections': node.connections + 1
          };
        }
        return node;
      });
      actions.setNodes(updatedNodes);
    }
  }, [actions, nodes]);

  // 处理画布点击
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    handleCanvasClick(event);
  }, [handleCanvasClick]);

  // 处理ReactFlow初始化
  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    // 更新状态管理中的ReactFlow实例
    actions.setReactFlowInstance(instance);
    // 初始适应视图 - 只在有多个节点时使用fitView
    if (nodes.length > 1) {
      instance.fitView({
        'padding': 100,
        'duration': 500
      });
    } else if (nodes.length === 1) {
      // 只有一个节点时，使用合适的缩放级别
      instance.setViewport(
        { 'x': 0, 'y': 0, 'zoom': 0.5 },
        { 'duration': 500 }
      );
    }
  }, [nodes, actions]);

  // 定义一个ref来追踪前一次的节点数量
  const prevNodesLengthRef = React.useRef(nodes.length);

  // 监听ReactFlow节点数量变化，优化视图聚焦
  React.useEffect(() => {
    if (reactFlowInstance.current && reactFlowNodes.length > 0) {
      // 只有在特定条件下才调整视图：
      // 1. 从0个节点增加到1个节点
      // 2. 从1个节点增加到2个节点
      // 3. 节点数量减少到1个节点
      const prevLength = prevNodesLengthRef.current;
      const currentLength = reactFlowNodes.length;

      if (prevLength === 0 && currentLength === 1 ||
          prevLength === 1 && currentLength === 2 ||
          currentLength === 1) {
        // 无论节点数量多少，都使用fitView来适应节点位置
        // 这样可以确保节点始终显示在视图中心
        reactFlowInstance.current.fitView({
          // 增加内边距，让节点在视图中居中更美观
          'padding': 150,
          'duration': 500,
          // 设置最小缩放级别
          'minZoom': 0.2,
          // 设置最大缩放级别
          'maxZoom': 1.5
        });
      }
    }

    // 更新前一次节点数量
    prevNodesLengthRef.current = reactFlowNodes.length;
  }, [reactFlowNodes.length]);

  // 处理节点拖拽开始
  const onNodeDragStart = useCallback((_: React.MouseEvent, node: import('reactflow').Node) => {
    const enhancedNode = nodes.find(n => n.id === node.id);
    if (enhancedNode) {
      // 拖动节点前，先更新选中状态
      handleNodeClick(enhancedNode, _);
      handleNodeDragStart(enhancedNode);
    }
  }, [nodes, handleNodeDragStart, handleNodeClick]);

  // 处理节点拖拽
  const onNodeDrag = useCallback(() => {
    // 拖拽过程中不需要立即更新状态，只在拖拽结束时更新
  }, []);

  // 处理节点拖拽结束 - 注意：ReactFlow v11 中没有 onNodeDragEnd 属性，使用 onNodesChange 处理位置变化

  // 主题配置 - ReactFlow v11 不再支持theme属性，使用CSS变量或自定义样式

  return (
    <div className="w-full h-full flex flex-col" style={{ 'backgroundColor': theme.backgroundColor, 'minHeight': '600px' }} ref={reactFlowWrapper}>
      {/* 添加CSS来隐藏React Flow水印 */}
      <style dangerouslySetInnerHTML={{ '__html': hideAttributionStyle }} />
      <div className="flex-1">
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={handleNodesChange}
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
          attributionPosition="top-right"
          // 启用无限画布模式
          fitView={false}
          // 启用滚动缩放，防止页面滚动
          preventScrolling={true}
          // 调整缩放限制，允许更大的缩放范围
          minZoom={0.05}
          maxZoom={5}
          // 交互配置
          nodesDraggable={true}
          nodesConnectable={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnDrag={true}
          panOnScroll={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          {/* 添加迷你地图 */}
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(node) => {
            // 根据节点类型设置不同颜色
              const enhancedNode = nodes.find(n => n.id === node.id);
              if (enhancedNode?.type === 'concept') {
                return '#8b5cf6';
              }
              if (enhancedNode?.type === 'article') {
                return '#3b82f6';
              }
              if (enhancedNode?.type === 'resource') {
                return '#10b981';
              }
              if (enhancedNode?.type === 'aggregate') {
                return '#f59e0b';
              }
              return '#6b7280';
            }}
            zoomable
            pannable
            className="minimap"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

// 默认导出
export default GraphCanvasReactFlow;
