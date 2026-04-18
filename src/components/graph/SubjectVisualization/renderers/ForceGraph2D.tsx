import { useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { SubjectNode, SubjectLink } from '../types';
import type { BaseRendererProps } from './types';
import { type ForceGraphSettings, DEFAULT_FORCE_GRAPH_SETTINGS } from './settingsTypes';

interface ForceGraph2DRendererProps extends BaseRendererProps {
  graphData: {
    nodes: SubjectNode[];
    links: SubjectLink[];
  };
  settings?: ForceGraphSettings;
}

export default function ForceGraph2DRenderer ({
  graphData,
  dimensions,
  onNodeHover,
  onNodeClick,
  onNodeRightClick,
  backgroundColor = '#171717',
  settings = DEFAULT_FORCE_GRAPH_SETTINGS
}: ForceGraph2DRendererProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  const handleNodeClick = useCallback((node: SubjectNode) => {
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(4, 2000);
    }
  }, []);

  const paintNode = useCallback((node: SubjectNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = Math.max(2, node.val * 0.5 / Math.sqrt(globalScale));
    const fontSize = Math.max(3, 10 / globalScale);

    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();

    if (globalScale >= 2) {
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      const label = node.title.length > 20 ? node.title.substring(0, 20) + '...' : node.title;
      ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + size + fontSize);
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dagModeProp: any = settings.dagMode;

  return (
    <ForceGraph2D
      ref={graphRef}
      graphData={graphData}
      nodeLabel={() => ''}
      nodeColor={(node: SubjectNode) => node.color}
      nodeVal={(node: SubjectNode) => node.val}
      nodeRelSize={settings.nodeRelSize}
      nodeCanvasObject={paintNode}
      linkColor={(link: SubjectLink) => link.color}
      linkWidth={settings.linkWidth}
      linkDirectionalArrowLength={3}
      linkDirectionalArrowRelPos={0.8}
      linkDirectionalArrowColor={(link: SubjectLink) => link.color}
      backgroundColor={backgroundColor}
      width={dimensions.width}
      height={dimensions.height}
      onNodeHover={onNodeHover}
      onNodeClick={(node) => {
        const mockEvent = new MouseEvent('click', { 'ctrlKey': true });
        onNodeClick(node as SubjectNode, mockEvent);
        handleNodeClick(node as SubjectNode);
      }}
      onNodeRightClick={(node, event) => {
        onNodeRightClick(node as SubjectNode, event);
      }}
      enableNodeDrag={true}
      enablePanInteraction={true}
      enableZoomInteraction={true}
      dagMode={dagModeProp}
      dagLevelDistance={settings.dagLevelDistance}
      cooldownTime={settings.cooldownTime}
      d3AlphaDecay={settings.d3AlphaDecay}
      d3VelocityDecay={settings.d3VelocityDecay}
      minZoom={0.1}
      maxZoom={10}
    />
  );
}
