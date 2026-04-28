import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type DefaultEdgeOptions,
  ConnectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { ArticleNodeData, ArticleEdgeData, ArticleNode, ArticleEdge } from '@/components/gallerys/gallery';
import { ArticleNode as ArticleNodeComponent } from './Node';
import { ArticleEdge as ArticleEdgeComponent } from './Edge';
import { ConnectionLine } from './ConnectionLine';
import { useUndoRedo } from '@/components/graph/GraphVisualization/utils/useUndoRedo';

const nodeTypes = {
  'articleNode': ArticleNodeComponent
} as const as NodeTypes;

const edgeTypes = {
  'articleEdge': ArticleEdgeComponent
} as const as EdgeTypes;

const defaultEdgeOptions: DefaultEdgeOptions = {
  'interactionWidth': 30
};

interface VisualizationContentProps {
  initialNodes?: ArticleNode[];
  initialEdges?: ArticleEdge[];
  onSave: (nodes: ArticleNode[], edges: ArticleEdge[]) => Promise<void>;
  onNodeClick?: (nodeId: string, data: ArticleNodeData) => void;
  onEdgeClick?: (edgeId: string, data: ArticleEdgeData) => void;
  readOnly?: boolean;
  onStateChange?: (state: {
    canUndo: boolean;
    canRedo: boolean;
    hasSelection: boolean;
    isSaving: boolean;
  }) => void;
  onActionsReady?: (actions: {
    undo: () => void;
    redo: () => void;
    delete: () => void;
    save: () => void;
    addNode: (node: ArticleNode) => void;
    updateNode: (nodeId: string, data: Partial<ArticleNodeData>) => void;
  }) => void;
}

const VisualizationContent = ({
  initialNodes,
  initialEdges,
  onSave,
  onNodeClick,
  onEdgeClick,
  readOnly = false,
  onStateChange,
  onActionsReady
}: VisualizationContentProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    (initialNodes || []).map(n => ({
      ...n,
      'type': 'articleNode'
    })) as Node[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    (initialEdges || []).map(e => ({
      ...e,
      'type': 'articleEdge',
      'markerEnd': e.markerEnd || {
        'type': 'arrowclosed',
        'color': '#4ECDC4'
      }
    })) as Edge[]
  );
  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo();
  const [isSaving, setIsSaving] = useState(false);
  const isInitializedRef = useRef(false);

  const hasSelection = useState(() => {
    return nodes.some(node => node.selected) || edges.some(edge => edge.selected);
  })[0];

  useEffect(() => {
    onStateChange?.({ canUndo, canRedo, hasSelection, isSaving });
  }, [canUndo, canRedo, hasSelection, isSaving, onStateChange]);

  const handleAddNode = useCallback((node: ArticleNode) => {
    const newNode = {
      ...node,
      'type': 'articleNode'
    } as Node;
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      if (initialNodes && initialNodes.length > 0) {
        setNodes(initialNodes.map(n => ({
          ...n,
          'type': 'articleNode'
        })) as Node[]);
      }
      if (initialEdges && initialEdges.length > 0) {
        setEdges(initialEdges.map(e => ({
          ...e,
          'type': 'articleEdge',
          'markerEnd': e.markerEnd || {
            'type': 'arrowclosed',
            'color': '#4ECDC4'
          }
        })) as Edge[]);
      }
      isInitializedRef.current = true;
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    if (!readOnly && nodes.length > 0 || edges.length > 0) {
      saveState(nodes, edges);
    }
  }, [nodes, edges, saveState, readOnly]);

  const handleNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    if (readOnly) {
      return;
    }
    onNodesChange(changes);
  }, [onNodesChange, readOnly]);

  const handleEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    if (readOnly) {
      return;
    }
    onEdgesChange(changes);
  }, [onEdgesChange, readOnly]);

  const onConnect = useCallback((connection: Connection) => {
    if (readOnly) {
      return;
    }
    const { source, target } = connection;

    if (!source || !target) {
      return;
    }

    const newEdge = {
      ...connection,
      'id': `edge-${Date.now()}`,
      'type': 'articleEdge',
      'data': {
        'relationshipType': '默认',
        'type': 'articleEdge'
      },
      'markerEnd': {
        'type': 'arrowclosed',
        'color': '#4ECDC4'
      }
    } as Edge;
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges, readOnly]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (onNodeClick) {
      onNodeClick(node.id, node.data as ArticleNodeData);
    }
  }, [onNodeClick]);

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    if (onEdgeClick) {
      onEdgeClick(edge.id, edge.data as ArticleEdgeData);
    }
  }, [onEdgeClick]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const savedNodes: ArticleNode[] = nodes.map(n => ({
        'id': n.id,
        'type': n.type,
        'position': n.position,
        'data': n.data as ArticleNodeData,
        ...(n.selected !== undefined && { 'selected': n.selected })
      })) as ArticleNode[];

      const savedEdges: ArticleEdge[] = edges.map(e => ({
        'id': e.id,
        'source': e.source,
        'target': e.target,
        'type': e.type,
        'data': e.data as ArticleEdgeData,
        'markerEnd': e.markerEnd,
        ...(e.sourceHandle !== undefined && { 'sourceHandle': e.sourceHandle }),
        ...(e.targetHandle !== undefined && { 'targetHandle': e.targetHandle }),
        ...(e.selected !== undefined && { 'selected': e.selected })
      })) as ArticleEdge[];

      await onSave(savedNodes, savedEdges);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, onSave]);

  const handleUndo = useCallback(() => {
    const state = undo();
    if (state.nodes.length > 0 || state.edges.length > 0) {
      setNodes(state.nodes.map(n => ({ ...n, 'type': 'articleNode' })));
      setEdges(state.edges.map(e => ({ ...e, 'type': 'articleEdge' })));
    }
  }, [undo, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const state = redo();
    if (state.nodes.length > 0 || state.edges.length > 0) {
      setNodes(state.nodes.map(n => ({ ...n, 'type': 'articleNode' })));
      setEdges(state.edges.map(e => ({ ...e, 'type': 'articleEdge' })));
    }
  }, [redo, setNodes, setEdges]);

  const handleDelete = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) => eds.filter((edge) => !edge.selected));
  }, [setNodes, setEdges]);

  const handleUpdateNode = useCallback((nodeId: string, data: Partial<ArticleNodeData>) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          'data': {
            ...node.data,
            ...data
          } as ArticleNodeData
        };
      }
      return node;
    }));
  }, [setNodes]);

  useEffect(() => {
    onActionsReady?.({
      'undo': handleUndo,
      'redo': handleRedo,
      'delete': handleDelete,
      'save': handleSave,
      'addNode': handleAddNode,
      'updateNode': handleUpdateNode
    });
  }, [handleUndo, handleRedo, handleDelete, handleSave, handleAddNode, handleUpdateNode, onActionsReady]);

  useEffect(() => {
    if (readOnly) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault();
        handleRedo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo, handleSave, readOnly]);

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineComponent={ConnectionLine}
        fitView
        deleteKeyCode={null}
        minZoom={0.1}
        maxZoom={10}
        colorMode="system"
        connectionMode={ConnectionMode.Loose}
        connectOnClick={true}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={{ 'hideAttribution': true }}
      >
        <MiniMap
          nodeColor={(node) => {
            return node.selected ? '#0ea5e9' : '#4ECDC4';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="!bg-white dark:!bg-neutral-800 !border-neutral-200 dark:!border-neutral-700"
        />
      </ReactFlow>
    </div>
  );
};

export const Visualization = (props: VisualizationContentProps) => {
  return (
    <ReactFlowProvider>
      <VisualizationContent {...props} />
    </ReactFlowProvider>
  );
};

export default Visualization;
