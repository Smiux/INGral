import { useEffect, useRef, useState } from 'react';
import { graphService } from '../../services/graphService';
import { GraphCanvas } from './GraphVisualization/GraphCanvas';
import type { EnhancedNode, EnhancedGraphLink, LayoutType, LayoutDirection } from './GraphVisualization/types';
import { PRESET_THEMES, type GraphTheme } from './GraphVisualization/ThemeTypes';
import type { GraphNode, GraphLink } from '../../types';

interface GraphEmbedProps {
  graphId: string;
  width?: number | string;
  height?: number | string;
  interactive?: boolean;
  layoutType?: LayoutType;
  theme?: string;
}

export const GraphEmbed: React.FC<GraphEmbedProps> = ({
  graphId,
  width = 800,
  height = 600,
  interactive = true,
  layoutType = 'force'
}) => {
  const [nodes, setNodes] = useState<EnhancedNode[]>([]);
  const [links, setLinks] = useState<EnhancedGraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<EnhancedNode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<EnhancedNode[]>([]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [layoutDirection] = useState<LayoutDirection>('top-bottom');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        const graph = await graphService.getGraphById(graphId);
        if (!graph) {
          setError('Graph not found');
          return;
        }

        // Convert graph nodes to EnhancedNode format
        const enhancedNodes: EnhancedNode[] = graph.nodes.map((node: GraphNode) => ({
          id: node.id,
          title: node.title,
          connections: node.connections,
          type: node.type || 'concept',
          content: node.content || '',
          x: node.x || 0,
          y: node.y || 0
        }));

        // Convert graph links to EnhancedGraphLink format
        const enhancedLinks: EnhancedGraphLink[] = graph.links.map((link: GraphLink, index: number) => ({
          id: `link-${index}`, // Generate a unique ID for the link
          source: link.source,
          target: link.target,
          type: link.type || 'related',
          label: link.label || '',
          weight: link.weight || 1.0
        }));

        setNodes(enhancedNodes);
        setLinks(enhancedLinks);
        setIsSimulationRunning(layoutType === 'force');
      } catch (err) {
        console.error('Error loading embedded graph:', err);
        setError('Failed to load graph');
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [graphId, layoutType]);

  const handleNodeClick = (node: EnhancedNode) => {
    if (interactive) {
      setSelectedNode(node);
      setSelectedNodes([node]);
    }
  };

  const handleNodeDragStart = () => {
    if (interactive) {
      setIsSimulationRunning(false);
    }
  };

  const handleNodeDragEnd = () => {
    if (interactive) {
      setIsSimulationRunning(true);
    }
  };

  const handleLinkClick = () => {
    if (interactive) {
      // Link click handling can be added here
    }
  };

  const handleCanvasClick = () => {
    if (interactive) {
      setSelectedNode(null);
      setSelectedNodes([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full" style={{ height }}>
        <div className="text-gray-500">Loading graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full" style={{ height }}>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="border rounded-lg overflow-hidden bg-white shadow-sm"
      style={{ width, height }}
    >
      <GraphCanvas
        nodes={nodes}
        links={links}
        isSimulationRunning={isSimulationRunning}
        layoutType={layoutType}
        layoutDirection={layoutDirection}
        selectedNode={selectedNode}
        selectedNodes={selectedNodes}
        onNodeClick={handleNodeClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragEnd={handleNodeDragEnd}
        onLinkClick={handleLinkClick}
        onCanvasClick={handleCanvasClick}
        onCanvasDrop={() => {}}
        onBoxSelectStart={() => {}}
        onBoxSelectUpdate={() => {}}
        onBoxSelectEnd={() => {}}
        isBoxSelecting={false}
        boxSelection={{ x1: 0, y1: 0, x2: 0, y2: 0 }}
        theme={PRESET_THEMES[0] as GraphTheme}
      />
    </div>
  );
};

// 3D Graph Embed Component
export const GraphEmbed3D: React.FC<GraphEmbedProps> = ({
  graphId,
  width = 800,
  height = 600
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        const graph = await graphService.getGraphById(graphId);
        if (!graph) {
          setError('Graph not found');
          return;
        }

        // 3D graph rendering will be implemented here
        // For now, we'll show a placeholder
        setLoading(false);
      } catch (err) {
        console.error('Error loading 3D embedded graph:', err);
        setError('Failed to load 3D graph');
        setLoading(false);
      }
    };

    loadGraph();
  }, [graphId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full" style={{ height }}>
        <div className="text-gray-500">Loading 3D graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full" style={{ height }}>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="border rounded-lg overflow-hidden bg-white shadow-sm"
      style={{ width, height }}
    >
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">3D Graph Visualization Coming Soon</div>
      </div>
    </div>
  );
};

// Graph Embed Wrapper Component
export const GraphEmbedWrapper: React.FC<GraphEmbedProps & { type?: '2d' | '3d' }> = ({
  type = '2d',
  ...props
}) => {
  return type === '3d' ? (
    <GraphEmbed3D {...props} />
  ) : (
    <GraphEmbed {...props} />
  );
};
