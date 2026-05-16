import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { NavigatorTrigger } from '@/components/ui/navigator/Navigator';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStore,
  type Node as NodeType,
  type Edge as EdgeType,
  type NodeTypes,
  type EdgeTypes,
  NodeChange,
  EdgeChange
} from '@xyflow/react';
import { Database, GitBranch } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import '@xyflow/react/dist/style.css';
import Toolbar from './Toolbar';
import { useUndoRedo } from './utils/useUndoRedo';
import { useRightClickConnect } from './utils/useRightClickConnect';
import Node, { CustomNodeData } from './Node';
import Edge, { CustomEdgeData } from './Edge';
import ControlPanel from './panels/ControlPanel';
import ManagementPanel from './panels/ManagementPanel';
import { ImportExportPanel } from './panels/ImportExportPanel';
import GenerationPanel from './panels/GenerationPanel';
import LayoutPanel from './panels/LayoutPanel';
import AnalysisPanel from './panels/AnalysisPanel';

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

type LeftPanelType = 'management' | 'importExport' | 'generation' | 'layout' | 'analysis' | null;

const nodeTypes = {
  'custom': Node
} as const as NodeTypes;

const edgeTypes = {
  'floating': Edge
} as const as EdgeTypes;

const VisualizationContent: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeType<CustomNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeType<CustomEdgeData>>([]);
  const reactFlowInstance = useReactFlow();
  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const lastSavedStateRef = useRef<string>('');
  const isDraggingRef = useRef(false);

  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanelType>(null);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [viewMode, setViewMode] = useState<'reactflow' | 'forcegraph2d' | 'forcegraph3d'>('reactflow');
  const [canvasDimensions, setCanvasDimensions] = useState({
    'width': window.innerWidth,
    'height': window.innerHeight - 64
  });

  const nodeLookup = useStore((state) => state.nodeLookup);
  const transform = useStore((state) => state.transform);

  const { handleCanvasMouseDown, renderConnectionLine } = useRightClickConnect({
    reactFlowInstance,
    edges,
    'setEdges': setEdges as React.Dispatch<React.SetStateAction<EdgeType[]>>,
    nodeLookup,
    transform,
    'lineColor': '#3b82f6',
    'createEdge': (sourceId, targetId) => ({
      'id': `edge-${sourceId}-${targetId}-${Date.now()}`,
      'source': sourceId,
      'target': targetId,
      'sourceHandle': 'source',
      'targetHandle': 'target',
      'type': 'floating',
      'data': {
        'type': 'related',
        'curveType': 'default',
        'style': {}
      },
      'markerEnd': {
        'type': 'arrowclosed' as const,
        'color': '#3b82f6'
      }
    })
  });

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

  const selectedNodeIds = useMemo(() => {
    if (!showOnlySelected) {
      return null;
    }
    const selected = nodes.filter(n => n.selected).map(n => n.id);
    return selected.length > 0 ? new Set(selected) : null;
  }, [showOnlySelected, nodes]);

  const displayedNodes = useMemo(() => {
    if (!selectedNodeIds) {
      return nodes;
    }
    return nodes.filter(n => selectedNodeIds.has(n.id));
  }, [nodes, selectedNodeIds]);

  const displayedEdges = useMemo(() => {
    if (!selectedNodeIds) {
      return edges;
    }
    return edges.filter(e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target));
  }, [edges, selectedNodeIds]);

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
      'nodes': displayedNodes.map(node => ({
        'id': node.id,
        'name': node.data.title || '未命名节点',
        'val': 5,
        'color': node.data.style?.stroke || '#3b82f6'
      })),
      'links': displayedEdges.map(edge => ({
        'source': edge.source,
        'target': edge.target,
        'color': edge.data?.style?.stroke || '#3b82f6',
        'width': edge.data?.style?.strokeWidth || 2
      }))
    };
  }, [viewMode, displayedNodes, displayedEdges]);

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

  const handleLayout = useCallback((layoutedNodes: NodeType<CustomNodeData>[], layoutedEdges: EdgeType<CustomEdgeData>[]) => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    reactFlowInstance.fitView({ 'duration': 500 });
  }, [setNodes, setEdges, reactFlowInstance]);

  const handleImportComplete = useCallback((importedNodes: NodeType<CustomNodeData>[], importedEdges: EdgeType<CustomEdgeData>[]) => {
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

      const newNode: NodeType<CustomNodeData> = {
        'id': `node-${Date.now()}`,
        'type': 'custom',
        'position': { x, y },
        'data': {
          'title': `新节点${newNodeNumber}`,
          'category': '默认',
          'style': {},
          'metadata': {
            'content': ''
          }
        }
      };

      return [...currentNodes, newNode];
    });
  }, [reactFlowInstance, setNodes]);

  const handleGenerateGraph = useCallback((newNodes: NodeType<CustomNodeData>[], newEdges: EdgeType<CustomEdgeData>[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  }, [setNodes, setEdges]);

  const closeLeftPanel = useCallback((panel: LeftPanelType) => {
    if (activeLeftPanel === panel) {
      setActiveLeftPanel(null);
    }
  }, [activeLeftPanel]);

  const toggleLeftPanel = useCallback((panel: Exclude<LeftPanelType, null>) => {
    setActiveLeftPanel((prev) => (prev === panel ? null : panel));
  }, []);

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

  const toggleAnalysisPanel = useCallback(() => {
    toggleLeftPanel('analysis');
  }, [toggleLeftPanel]);

  const toggleSnapToGrid = useCallback(() => {
    setSnapToGrid(prev => !prev);
  }, []);

  const toggleShowOnlySelected = useCallback(() => {
    setShowOnlySelected(prev => !prev);
  }, []);

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

      <div className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-between gap-0 z-50">
        <div className="flex items-center gap-2 p-1">
          <NavigatorTrigger className="text-sm" />
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Database size={12} />
              节点: {nodeCount}
            </span>
            <span className="h-3 w-px bg-slate-200 dark:bg-slate-700"></span>
            <span className="flex items-center gap-1">
              <GitBranch size={12} />
              连接: {edgeCount}
            </span>
          </div>
        </div>

        <Toolbar
          onAddNode={createNewNode}
          isManagementPanelOpen={activeLeftPanel === 'management'}
          onToggleManagementPanel={toggleManagementPanel}
          isImportExportPanelOpen={activeLeftPanel === 'importExport'}
          onToggleImportExportPanel={toggleImportExportPanel}
          isGenerationPanelOpen={activeLeftPanel === 'generation'}
          onToggleGenerationPanel={toggleGenerationPanel}
          isLayoutPanelOpen={activeLeftPanel === 'layout'}
          onToggleLayoutPanel={toggleLayoutPanel}
          isAnalysisPanelOpen={activeLeftPanel === 'analysis'}
          onToggleAnalysisPanel={toggleAnalysisPanel}
          snapToGrid={snapToGrid}
          onToggleSnapToGrid={toggleSnapToGrid}
          showOnlySelected={showOnlySelected}
          onToggleShowOnlySelected={toggleShowOnlySelected}
          hasSelection={hasSelection}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      </div>

      <div ref={canvasWrapperRef} className="flex-1 w-full bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
        {viewMode === 'reactflow' && (
          <div
            ref={reactFlowWrapper}
            className="w-full h-full"
            onMouseDown={handleCanvasMouseDown}
            onContextMenu={(e) => e.preventDefault()}
          >
            <ReactFlow
              nodes={displayedNodes}
              edges={displayedEdges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              panOnDrag
              zoomOnScroll
              zoomOnPinch
              zoomOnDoubleClick
              minZoom={0.01}
              maxZoom={10}
              style={{ 'width': '100%', 'height': '100%' }}
              proOptions={{ 'hideAttribution': true }}
              snapToGrid={snapToGrid}
              snapGrid={[16, 16]}
            >
              <Background
                variant={snapToGrid ? BackgroundVariant.Lines : BackgroundVariant.Dots}
                gap={16}
                size={1}
                color="var(--color-slate-300)"
                bgColor="var(--background-color, var(--color-slate-50))"
              />
              <MiniMap
                nodeColor={() => '#3b82f6'}
                zoomable
                pannable
                style={{ 'backgroundColor': 'var(--minimap-bg, var(--color-slate-50))', 'border': '1px solid var(--minimap-border, var(--color-slate-200))' }}
                maskColor="var(--minimap-mask, var(--color-slate-100))"
                position="bottom-right"
              />
            </ReactFlow>
            {renderConnectionLine()}
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
            width={canvasDimensions.width}
            height={canvasDimensions.height}
          />
        )}
        <AnimatePresence>
          {hasSelection && (
            <ControlPanel panelPosition="right" />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {activeLeftPanel === 'management' && (
            <ManagementPanel
              key="management"
              onAddNode={createNewNode}
              onClose={() => closeLeftPanel('management')}
            />
          )}
          {activeLeftPanel === 'importExport' && (
            <ImportExportPanel
              key="importExport"
              onImportComplete={handleImportComplete}
              onClose={() => closeLeftPanel('importExport')}
            />
          )}
          {activeLeftPanel === 'generation' && (
            <GenerationPanel
              key="generation"
              onGenerate={handleGenerateGraph}
              onClose={() => closeLeftPanel('generation')}
            />
          )}
          {activeLeftPanel === 'layout' && (
            <LayoutPanel
              key="layout"
              onLayout={handleLayout}
              onClose={() => closeLeftPanel('layout')}
            />
          )}
          {activeLeftPanel === 'analysis' && (
            <AnalysisPanel
              key="analysis"
              onClose={() => closeLeftPanel('analysis')}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Visualization: React.FC = () => {
  return (
    <ReactFlowProvider>
      <VisualizationContent />
    </ReactFlowProvider>
  );
};

export default Visualization;
