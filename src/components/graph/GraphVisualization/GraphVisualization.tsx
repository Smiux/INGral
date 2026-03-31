import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
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
  ConnectionMode,
  NodeChange,
  EdgeChange
} from '@xyflow/react';
import { Database, GitBranch } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import '@xyflow/react/dist/style.css';
import GraphToolbar from './GraphToolbar';
import FloatingConnectionLine from './FloatingConnectionLine';
import { useUndoRedo } from './utils/useUndoRedo';
import CustomNode, { CustomNodeData } from './CustomNode';
import FloatingEdge, { CustomEdgeData } from './FloatingEdge';
import GraphControlPanel from './GraphControlPanel';
import GraphManagementPanel from './GraphManagementPanel';
import { GraphImportExportPanel } from './GraphImportExportPanel';
import GraphGenerationPanel from './GraphGenerationPanel';
import GraphLayoutPanel from './GraphLayoutPanel';

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

const nodeTypes = {
  'custom': CustomNode
} as const as NodeTypes;

const edgeTypes = {
  'floating': FloatingEdge
} as const as EdgeTypes;

const SNAP_GRID: [number, number] = [16, 16];

type LeftPanelType = 'management' | 'importExport' | 'generation' | 'layout' | null;

const GraphVisualizationContent: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<CustomEdgeData>>([]);
  const reactFlowInstance = useReactFlow();
  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const lastSavedStateRef = useRef<string>('');
  const isDraggingRef = useRef(false);

  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanelType>(null);
  const [closingPanel, setClosingPanel] = useState<LeftPanelType>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [viewMode, setViewMode] = useState<'reactflow' | 'forcegraph2d' | 'forcegraph3d'>('reactflow');
  const [canvasDimensions, setCanvasDimensions] = useState({
    'width': window.innerWidth,
    'height': window.innerHeight - 64
  });

  const triggerSaveState = useCallback(() => {
    if (!isDraggingRef.current) {
      const stateKey = JSON.stringify({ 'nodes': nodes.map(n => ({ 'id': n.id, 'position': n.position })), 'edges': edges.map(e => ({ 'id': e.id, 'source': e.source, 'target': e.target })) });
      if (lastSavedStateRef.current !== stateKey) {
        lastSavedStateRef.current = stateKey;
        saveState(nodes, edges);
      }
    }
  }, [nodes, edges, saveState]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    const isDragging = changes.some((change: NodeChange) => change.type === 'position' && change.dragging);
    isDraggingRef.current = isDragging;
    if (!isDragging) {
      triggerSaveState();
    }
  }, [onNodesChange, triggerSaveState]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    if (!isDraggingRef.current) {
      triggerSaveState();
    }
  }, [onEdgesChange, triggerSaveState]);

  const nodeCount = useStore(
    (state) => state.nodes.length,
    (prev, next) => prev === next
  );
  const edgeCount = useStore(
    (state) => state.edges.length,
    (prev, next) => prev === next
  );
  const hasSelection = useStore(
    (state) => {
      const hasSelectedNode = state.nodes.some(node => node.selected);
      const hasSelectedEdge = state.edges.some(edge => edge.selected);
      return hasSelectedNode || hasSelectedEdge;
    },
    (prev, next) => prev === next
  );

  useEffect(() => {
    if (viewMode !== 'reactflow') {
      const updateDimensions = () => {
        if (canvasWrapperRef.current) {
          const rect = canvasWrapperRef.current.getBoundingClientRect();
          setCanvasDimensions(prev => {
            if (prev.width !== rect.width || prev.height !== rect.height) {
              return { 'width': rect.width, 'height': rect.height };
            }
            return prev;
          });
        }
      };
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
    return () => {};
  }, [viewMode]);

  const forceGraphData = useMemo(() => {
    if (viewMode === 'reactflow') {
      return null;
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

  const handleUndo = useCallback(() => {
    const { 'nodes': undoNodes, 'edges': undoEdges } = undo();
    if (undoNodes.length > 0 || undoEdges.length > 0) {
      setNodes(undoNodes);
      setEdges(undoEdges);
    }
  }, [undo, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const { 'nodes': redoNodes, 'edges': redoEdges } = redo();
    if (redoNodes.length > 0 || redoEdges.length > 0) {
      setNodes(redoNodes);
      setEdges(redoEdges);
    }
  }, [redo, setNodes, setEdges]);

  const handleLayout = useCallback((layoutedNodes: Node<CustomNodeData>[], layoutedEdges: Edge<CustomEdgeData>[]) => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    reactFlowInstance.fitView({ 'duration': 500 });
  }, [setNodes, setEdges, reactFlowInstance]);

  const onConnect = useCallback((params: Connection) => {
    const customEdge = {
      ...params,
      'type': 'floating',
      'data': {
        'type': 'related',
        'curveType': 'default',
        'style': {}
      },
      'markerEnd': {
        'type': 'arrowclosed',
        'color': '#3b82f6'
      }
    };
    setEdges((eds) => addEdge(customEdge, eds));
  }, [setEdges]);

  const handleImportComplete = useCallback((importedNodes: Node<CustomNodeData>[], importedEdges: Edge<CustomEdgeData>[]) => {
    setNodes(importedNodes);
    setEdges(importedEdges);
    setActiveLeftPanel(null);
    reactFlowInstance.fitView({ 'duration': 500 });
  }, [setNodes, setEdges, reactFlowInstance]);

  const createNewNode = useCallback(() => {
    const viewport = reactFlowInstance.getViewport();
    const centerX = -viewport.x / viewport.zoom;
    const centerY = -viewport.y / viewport.zoom;

    setNodes((currentNodes) => {
      const numberedNodeNumbers = currentNodes
        .map(node => {
          const nodeTitle = node.data?.title || '';
          const match = nodeTitle.match(/新节点(\d+)/);
          return match && match[1] ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      const maxNodeNumber = numberedNodeNumbers.length > 0 ? Math.max(...numberedNodeNumbers) : 0;
      const newNodeNumber = maxNodeNumber + 1;

      let x: number;
      let y: number;
      const nodeSize = 100;
      const minDistance = nodeSize * 1.5;

      if (currentNodes.length === 0) {
        x = centerX;
        y = centerY;
      } else {
        const angle = currentNodes.length * Math.PI * 0.618;
        const distance = minDistance * Math.sqrt(currentNodes.length + 1);

        const avgX = currentNodes.reduce((sum, node) => sum + node.position.x, 0) / currentNodes.length;
        const avgY = currentNodes.reduce((sum, node) => sum + node.position.y, 0) / currentNodes.length;

        x = avgX + Math.cos(angle) * distance;
        y = avgY + Math.sin(angle) * distance;
      }

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

      return [...currentNodes, newNode];
    });
  }, [reactFlowInstance, setNodes]);

  const handleGenerateGraph = useCallback((newNodes: Node<CustomNodeData>[], newEdges: Edge<CustomEdgeData>[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  }, [setNodes, setEdges]);

  const closeLeftPanel = useCallback((panel: LeftPanelType) => {
    if (activeLeftPanel === panel) {
      setActiveLeftPanel(null);
      setClosingPanel(panel);
      setTimeout(() => {
        setClosingPanel(null);
      }, 280);
    }
  }, [activeLeftPanel]);

  const toggleLeftPanel = useCallback((panel: Exclude<LeftPanelType, null>) => {
    if (activeLeftPanel === panel) {
      closeLeftPanel(panel);
    } else if (activeLeftPanel !== null) {
      setActiveLeftPanel(null);
      setClosingPanel(activeLeftPanel);
      setTimeout(() => {
        setActiveLeftPanel(panel);
        setClosingPanel(null);
      }, 280);
    } else {
      setActiveLeftPanel(panel);
    }
  }, [activeLeftPanel, closeLeftPanel]);

  const toggleManagementPanel = useCallback(() => {
    toggleLeftPanel('management');
  }, [toggleLeftPanel]);

  const toggleImportExportPanel = useCallback(() => {
    toggleLeftPanel('importExport');
  }, [toggleLeftPanel]);

  const toggleGenerationPanel = useCallback(() => {
    toggleLeftPanel('generation');
  }, [toggleLeftPanel]);

  const toggleLayoutPanel = useCallback(() => {
    toggleLeftPanel('layout');
  }, [toggleLeftPanel]);

  const toggleSnapToGrid = useCallback(() => {
    setSnapToGrid(prev => !prev);
  }, []);

  const defaultViewport = { 'x': 0, 'y': 0, 'zoom': 1 };
  const connectionLineStyle = { 'stroke': '#3b82f6', 'strokeWidth': 2, 'animation': 'none' };

  return (
    <div className="w-full h-screen flex flex-col">
      <style>{`
        .react-flow__nodesselection-rect,
        .react-flow__selection,
        .react-flow__node,
        .react-flow__node > div,
        .react-flow__edge,
        .react-flow__edge path,
        .react-flow__edge marker path {
          transition: none !important;
        }
        .selected-glow {
          position: absolute;
          pointer-events: none;
          border-radius: 50%;
          border: 2px solid #fbbf24;
          box-shadow: 0 0 10px #fbbf24;
          animation: selectedGlowAnimation 1.5s ease-in-out infinite;
          z-index: 1000;
        }
        @keyframes selectedGlowAnimation {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .react-flow__edge.selected .react-flow__edge-path,
        .react-flow__edge.selected marker path {
          filter: drop-shadow(0 0 6px #fbbf24) drop-shadow(0 0 12px #fbbf24);
        }
      `}</style>

      <div className="bg-white dark:bg-neutral-800 flex items-center justify-between gap-0 z-50">
        <div className="flex items-center gap-2 p-1">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity px-2">
            <span className="font-bold text-sm tracking-tight text-neutral-800 dark:text-neutral-200">IN Gral</span>
          </Link>
          <div className="flex items-center gap-2 px-2 py-1 bg-white/50 dark:bg-neutral-700/50 rounded-full text-xs font-medium text-neutral-700 dark:text-neutral-300">
            <span className="flex items-center gap-1">
              <Database size={12} />
              节点: {nodeCount}
            </span>
            <span className="h-3 w-px bg-neutral-400 dark:bg-neutral-500"></span>
            <span className="flex items-center gap-1">
              <GitBranch size={12} />
              连接: {edgeCount}
            </span>
          </div>
        </div>

        <GraphToolbar
          onAddNode={createNewNode}
          isManagementPanelOpen={activeLeftPanel === 'management'}
          onToggleManagementPanel={toggleManagementPanel}
          isImportExportPanelOpen={activeLeftPanel === 'importExport'}
          onToggleImportExportPanel={toggleImportExportPanel}
          isGenerationPanelOpen={activeLeftPanel === 'generation'}
          onToggleGenerationPanel={toggleGenerationPanel}
          isLayoutPanelOpen={activeLeftPanel === 'layout'}
          onToggleLayoutPanel={toggleLayoutPanel}
          snapToGrid={snapToGrid}
          onToggleSnapToGrid={toggleSnapToGrid}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      </div>

      <div ref={canvasWrapperRef} className="flex-1 w-full bg-neutral-50 dark:bg-neutral-900 relative">
        {viewMode === 'reactflow' && (
          <div ref={reactFlowWrapper} className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              panOnDrag
              zoomOnScroll
              zoomOnPinch
              panOnScroll={false}
              zoomOnDoubleClick
              minZoom={0.01}
              maxZoom={10}
              defaultViewport={defaultViewport}
              style={{ 'width': '100%', 'height': '100%' }}
              nodesConnectable
              connectionMode={ConnectionMode.Loose}
              proOptions={{ 'hideAttribution': true }}
              deleteKeyCode={['Delete', 'Backspace']}
              multiSelectionKeyCode={['Shift', 'Control']}
              selectionOnDrag
              connectionLineStyle={connectionLineStyle}
              connectionLineComponent={FloatingConnectionLine}
              snapToGrid={snapToGrid}
              snapGrid={SNAP_GRID}
              colorMode={'system'}
            >
              <Background
                variant={snapToGrid ? BackgroundVariant.Lines : BackgroundVariant.Dots}
                gap={snapToGrid ? SNAP_GRID[0] : 16}
                size={snapToGrid ? 1 : 1}
                color="#ccc"
              />
              <MiniMap
                nodeColor={() => '#3b82f6'}
                zoomable
                pannable
                style={{ 'backgroundColor': 'var(--minimap-bg, #fff)', 'border': '1px solid var(--minimap-border, #ccc)' }}
                maskColor="var(--minimap-mask, rgba(255, 255, 255, 0.6))"
                position="bottom-right"
              />
            </ReactFlow>
          </div>
        )}
        {viewMode === 'forcegraph2d' && forceGraphData && (
          <ForceGraph2D
            graphData={forceGraphData}
            nodeLabel={(node: ForceGraphNode) => node.name}
            nodeColor={(node: ForceGraphNode) => node.color}
            nodeRelSize={8}
            linkColor={(link: ForceGraphLink) => link.color}
            linkWidth={(link: ForceGraphLink) => link.width}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={4}
            linkDirectionalParticleColor="#6b7280"
            backgroundColor="transparent"
            width={canvasDimensions.width}
            height={canvasDimensions.height}
          />
        )}
        {viewMode === 'forcegraph3d' && forceGraphData && (
          <ForceGraph3D
            graphData={forceGraphData}
            nodeLabel={(node: ForceGraphNode) => node.name}
            nodeColor={(node: ForceGraphNode) => node.color}
            nodeRelSize={4}
            linkColor={(link: ForceGraphLink) => link.color}
            linkWidth={(link: ForceGraphLink) => link.width}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            backgroundColor="#f5f5f5"
            width={canvasDimensions.width}
            height={canvasDimensions.height}
          />
        )}
        {hasSelection && <GraphControlPanel panelPosition="right" />}
        {(activeLeftPanel === 'management' || closingPanel === 'management') && (
          <GraphManagementPanel
            onAddNode={createNewNode}
            onClose={() => closeLeftPanel('management')}
            isOpen={activeLeftPanel === 'management'}
          />
        )}
        {(activeLeftPanel === 'importExport' || closingPanel === 'importExport') && (
          <GraphImportExportPanel
            onImportComplete={handleImportComplete}
            onClose={() => closeLeftPanel('importExport')}
            isOpen={activeLeftPanel === 'importExport'}
          />
        )}
        {(activeLeftPanel === 'generation' || closingPanel === 'generation') && (
          <GraphGenerationPanel
            onGenerate={handleGenerateGraph}
            onClose={() => closeLeftPanel('generation')}
            isOpen={activeLeftPanel === 'generation'}
          />
        )}
        {(activeLeftPanel === 'layout' || closingPanel === 'layout') && (
          <GraphLayoutPanel
            onLayout={handleLayout}
            onClose={() => closeLeftPanel('layout')}
            isOpen={activeLeftPanel === 'layout'}
          />
        )}
      </div>
    </div>
  );
};

const GraphVisualization: React.FC = () => {
  return (
    <ReactFlowProvider>
      <GraphVisualizationContent />
    </ReactFlowProvider>
  );
};

export default GraphVisualization;
