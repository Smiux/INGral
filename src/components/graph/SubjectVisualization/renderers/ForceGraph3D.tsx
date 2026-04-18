import { useRef, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { SubjectNode, SubjectLink } from '../types';
import type { BaseRendererProps } from './types';
import { type ForceGraphSettings, DEFAULT_FORCE_GRAPH_SETTINGS } from './settingsTypes';

interface ForceGraph3DRendererProps extends BaseRendererProps {
  graphData: {
    nodes: SubjectNode[];
    links: SubjectLink[];
  };
  settings?: ForceGraphSettings;
}

export default function ForceGraph3DRenderer ({
  graphData,
  dimensions,
  onNodeHover,
  onNodeClick,
  onNodeRightClick,
  backgroundColor = '#171717',
  settings = DEFAULT_FORCE_GRAPH_SETTINGS
}: ForceGraph3DRendererProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  const handleNodeClick = useCallback((node: SubjectNode) => {
    if (graphRef.current) {
      const distance = 120;
      const nodeX = node.x ?? 0;
      const nodeY = node.y ?? 0;
      const nodeZ = node.z ?? 0;
      const distRatio = 1 + distance / Math.hypot(nodeX, nodeY, nodeZ);
      const newPos = nodeX || nodeY || nodeZ
        ? { 'x': nodeX * distRatio, 'y': nodeY * distRatio, 'z': nodeZ * distRatio }
        : { 'x': 0, 'y': 0, 'z': distance };

      graphRef.current.cameraPosition(newPos, { 'x': nodeX, 'y': nodeY, 'z': nodeZ }, 2000);
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dagModeProp: any = settings.dagMode;

  return (
    <ForceGraph3D
      ref={graphRef}
      graphData={graphData}
      nodeLabel={() => ''}
      nodeColor={(node: SubjectNode) => node.color}
      nodeVal={(node: SubjectNode) => node.val}
      nodeRelSize={settings.nodeRelSize}
      nodeOpacity={settings.nodeOpacity}
      linkColor={(link: SubjectLink) => link.color}
      linkWidth={settings.linkWidth}
      linkOpacity={settings.linkOpacity}
      linkDirectionalArrowLength={4}
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
      enableNavigationControls={true}
      showNavInfo={false}
      dagMode={dagModeProp}
      dagLevelDistance={settings.dagLevelDistance}
      cooldownTime={settings.cooldownTime}
      d3AlphaDecay={settings.d3AlphaDecay}
      d3VelocityDecay={settings.d3VelocityDecay}
    />
  );
}
