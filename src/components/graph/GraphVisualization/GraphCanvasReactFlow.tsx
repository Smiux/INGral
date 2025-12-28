import React, { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  NodeMouseHandler,
  EdgeMouseHandler,
  Connection,
  MiniMap,
  useNodesState,
  useEdgesState,
  type ReactFlowProps,
  type ReactFlowInstance,
  type NodeChange,
  ConnectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphNode, GraphConnection, CustomNode, CustomEdge } from './GraphTypes';
import { useGraphContext } from './GraphContext';
import { default as DefaultNode } from './nodes/DefaultNode';
import { default as DefaultEdge } from './edges/DefaultEdge';

const nodeTypes = {
  'default': DefaultNode
};

const edgeTypes = {
  'default': DefaultEdge
};

const hideAttributionStyle = `
  .react-flow__attribution {
    display: none !important;
  }
  
  /* 修复连接线被节点覆盖的问题：调整React Flow容器的z-index层级 */
  .react-flow__nodes {
    z-index: 1 !important;
  }
  
  .react-flow__edges {
    z-index: 10 !important;
  }
  
  .react-flow__node {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
    z-index: 1 !important;
  }
  
  .react-flow__edge {
    z-index: 10 !important;
  }
  
  .react-flow__edge-path {
    z-index: 10 !important;
  }
  
  .react-flow__edge-text {
    z-index: 11 !important;
  }
  
  .selectable {
    border: none !important;
    outline: none !important;
  }
`;

export const GraphCanvasReactFlow: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance<CustomNode, CustomEdge> | null>(null);
  const { state, actions } = useGraphContext();

  const convertToReactFlowNodes = useCallback((graphNodes: GraphNode[]): CustomNode[] => {
    return graphNodes.map(node => ({
      'id': node.id,
      'type': 'default',
      'position': { 'x': node.layout.x || 0, 'y': node.layout.y || 0 },
      'data': {
        node
      },
      'className': 'graph-node selectable',
      'draggable': true,
      'selectable': true,
      'connectable': true
    }));
  }, []);

  const convertToReactFlowEdges = useCallback((graphConnections: GraphConnection[]): CustomEdge[] => {
    return graphConnections.map(connection => ({
      'id': connection.id,
      'source': String(connection.source),
      'target': String(connection.target),
      'sourceHandle': connection.sourceHandle || null,
      'targetHandle': connection.targetHandle || null,
      'type': 'default',
      'animated': false,
      'label': connection.label || connection.type,
      'className': 'graph-edge',
      'selected': false,
      'deletable': true,
      'data': {
        connection
      }
    }));
  }, []);

  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState(
    convertToReactFlowNodes(state.nodes)
  );

  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState(
    convertToReactFlowEdges(state.connections)
  );

  const dragDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setReactFlowNodes(convertToReactFlowNodes(state.nodes));
  }, [state.nodes, convertToReactFlowNodes, setReactFlowNodes]);

  useEffect(() => {
    setReactFlowEdges(convertToReactFlowEdges(state.connections));
  }, [state.connections, convertToReactFlowEdges, setReactFlowEdges]);

  const handleNodesChange = useCallback((changes: NodeChange<CustomNode>[]) => {
    onNodesChange(changes);

    changes.forEach(change => {
      if (change.type === 'position' && 'position' in change && 'id' in change) {
        const { id, position } = change;
        const graphNode = state.nodes.find(n => n.id === id);
        if (graphNode) {
          if (dragDebounceRef.current) {
            clearTimeout(dragDebounceRef.current);
          }

          dragDebounceRef.current = setTimeout(() => {
            const updatedNode = {
              ...graphNode,
              'layout': {
                ...graphNode.layout,
                'x': position.x,
                'y': position.y
              }
            };
            actions.updateNode(updatedNode);
          }, 100);
        }
      }
    });
  }, [state.nodes, actions, onNodesChange]);

  const onNodeClick: NodeMouseHandler = useCallback((_event: React.MouseEvent, node) => {
    const graphNode = state.nodes.find(n => n.id === node.id);
    if (graphNode) {
      actions.selectNode(graphNode);
    }
  }, [state.nodes, actions]);

  const onEdgeClick: EdgeMouseHandler = useCallback((_event: React.MouseEvent, edge) => {
    const graphConnection = state.connections.find(c => c.id === edge.id);
    if (graphConnection) {
      actions.selectConnection(graphConnection);
    }
  }, [state.connections, actions]);

  const onConnect: ReactFlowProps['onConnect'] = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      const newEdgeId = `connection-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const graphConnection: GraphConnection = {
        'id': newEdgeId,
        'source': connection.source,
        'target': connection.target,
        'sourceHandle': connection.sourceHandle || null,
        'targetHandle': connection.targetHandle || null,
        'type': 'related',
        'weight': 1.0,
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
          'tension': 0.4,
          'locked': false
        },
        'animation': {
          'isAnimating': false
        }
      };
      actions.addConnection(graphConnection);
    }
  }, [actions]);

  const onPaneClick = useCallback((_event: React.MouseEvent) => {
    actions.clearSelection();
  }, [actions]);

  const onInit = useCallback((instance: ReactFlowInstance<CustomNode, CustomEdge>) => {
    reactFlowInstance.current = instance;
    actions.setReactFlowInstance(instance);

    if (state.nodes.length > 1) {
      instance.fitView({
        'padding': 100,
        'duration': 500
      });
    } else if (state.nodes.length === 1) {
      instance.setViewport(
        { 'x': 0, 'y': 0, 'zoom': 0.5 },
        { 'duration': 500 }
      );
    }
  }, [state.nodes, actions]);

  const prevNodesLengthRef = useRef(state.nodes.length);

  useEffect(() => {
    if (reactFlowInstance.current && reactFlowNodes.length > 0) {
      const prevLength = prevNodesLengthRef.current;
      const currentLength = reactFlowNodes.length;

      if (prevLength === 0 && currentLength === 1) {
        reactFlowInstance.current.fitView({
          'padding': 150,
          'duration': 500,
          'minZoom': 0.2,
          'maxZoom': 1.5
        });
      }
    }

    prevNodesLengthRef.current = reactFlowNodes.length;
  }, [reactFlowNodes.length]);

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: CustomNode) => {
    const graphNode = state.nodes.find(n => n.id === node.id);
    if (graphNode) {
      actions.selectNode(graphNode);
    }
  }, [state.nodes, actions]);

  const onNodeDrag = useCallback(() => {
  }, []);

  return (
    <div className="w-full h-full flex flex-col" ref={reactFlowWrapper}>
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
          fitView={false}
          preventScrolling={true}
          minZoom={0.05}
          maxZoom={5}
          nodesDraggable={true}
          nodesConnectable={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnDrag={true}
          panOnScroll={false}
          connectionMode={ConnectionMode.Loose}
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(node) => {
              const graphNode = state.nodes.find(n => n.id === node.id);
              if (graphNode?.type === 'concept') {
                return '#8b5cf6';
              }
              if (graphNode?.type === 'article') {
                return '#3b82f6';
              }
              if (graphNode?.type === 'resource') {
                return '#10b981';
              }
              if (graphNode?.type === 'aggregate') {
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

export default GraphCanvasReactFlow;
