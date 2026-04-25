import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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

import type { GraphData, ArticleNodeData, ArticleEdgeData } from '@/components/gallerys/gallery';
import { ArticleNode } from './Node';
import { ArticleEdge } from './Edge';
import { ConnectionLine } from './ConnectionLine';
import { useUndoRedo } from '@/components/graph/GraphVisualization/utils/useUndoRedo';

const nodeTypes = {
  'articleNode': ArticleNode
} as const as NodeTypes;

const edgeTypes = {
  'articleEdge': ArticleEdge
} as const as EdgeTypes;

const defaultEdgeOptions: DefaultEdgeOptions = {
  'interactionWidth': 30
};

interface VisualizationContentProps {
  initialData?: GraphData;
  onSave: (data: GraphData) => Promise<void>;
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
    addNode: (node: GraphData['nodes'][0]) => void;
  }) => void;
}

const VisualizationContent = ({
  initialData,
  onSave,
  onNodeClick,
  onEdgeClick,
  readOnly = false,
  onStateChange,
  onActionsReady
}: VisualizationContentProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    (initialData?.nodes || []).map(n => ({
      ...n,
      'type': 'articleNode'
    })) as Node[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    (initialData?.edges || []).map(e => ({
      ...e,
      'type': 'articleEdge'
    })) as Edge[]
  );
  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo();
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const isInitializedRef = useRef(false);

  const hasSelection = useMemo(() => {
    return nodes.some(node => node.selected) || edges.some(edge => edge.selected);
  }, [nodes, edges]);

  useEffect(() => {
    onStateChange?.({ canUndo, canRedo, hasSelection, isSaving });
  }, [canUndo, canRedo, hasSelection, isSaving, onStateChange]);

  const handleAddNode = useCallback((node: GraphData['nodes'][0]) => {
    const newNode = {
      ...node,
      'type': 'articleNode'
    } as Node;
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  useEffect(() => {
    if (!isInitializedRef.current && initialData) {
      setNodes(initialData.nodes.map(n => ({
        ...n,
        'type': 'articleNode'
      })) as Node[]);
      setEdges(initialData.edges.map(e => ({
        ...e,
        'type': 'articleEdge'
      })) as Edge[]);
      lastSavedDataRef.current = JSON.stringify(initialData);
      isInitializedRef.current = true;
    }
  }, [initialData, setNodes, setEdges]);

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
      const graphData: GraphData = {
        'nodes': nodes.map(n => ({
          'id': n.id,
          'type': n.type ? n.type : undefined,
          'position': n.position,
          'data': n.data as ArticleNodeData,
          'selected': n.selected ? n.selected : undefined
        })),
        'edges': edges.map(e => ({
          'id': e.id,
          'source': e.source,
          'target': e.target,
          'type': e.type ? e.type : undefined,
          'data': e.data ? (e.data as ArticleEdgeData) : undefined,
          'selected': e.selected ? e.selected : undefined
        }))
      };
      await onSave(graphData);
      lastSavedDataRef.current = JSON.stringify(graphData);
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

  useEffect(() => {
    onActionsReady?.({
      'undo': handleUndo,
      'redo': handleRedo,
      'delete': handleDelete,
      'save': handleSave,
      'addNode': handleAddNode
    });
  }, [handleUndo, handleRedo, handleDelete, handleSave, handleAddNode, onActionsReady]);

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
