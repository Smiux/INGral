import { useMemo, useCallback, useState, useRef } from 'react';
import DeckGL, { type DeckGLRef } from '@deck.gl/react';
import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import { OrthographicView, type PickingInfo, type OrthographicViewState } from '@deck.gl/core';
import type { SubjectNode, SubjectLink } from '../types';
import type { BaseRendererProps } from './types';
import { type DeckGLSettings, DEFAULT_DECK_GL_SETTINGS } from './settingsTypes';
import { calculateRadialPositions } from './layoutUtils';

interface DeckGLRendererProps extends BaseRendererProps {
  graphData: {
    nodes: SubjectNode[];
    links: SubjectLink[];
  };
  settings?: DeckGLSettings;
}

interface NodeData {
  position: [number, number];
  color: [number, number, number, number];
  size: number;
  node: SubjectNode;
}

interface LinkData {
  source: [number, number];
  target: [number, number];
  color: [number, number, number, number];
}

const SPACE_SIZE = 8192;

const hslToRgba = (hsl: string): [number, number, number, number] => {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    return [96, 165, 250, 255];
  }
  const h = parseInt(match[1], 10) / 360;
  const s = parseInt(match[2], 10) / 100;
  const l = parseInt(match[3], 10) / 100;

  let r = 0;
  let g = 0;
  let b = 0;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, tVal: number) => {
      let t = tVal;
      if (t < 0) {
        t += 1;
      }
      if (t > 1) {
        t -= 1;
      }
      if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
      }
      if (t < 1 / 2) {
        return q;
      }
      if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
      }
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255];
};

export default function DeckGLRenderer ({
  graphData,
  dimensions,
  onNodeClick,
  onNodeRightClick,
  onNodeHover,
  backgroundColor = '#171717',
  settings = DEFAULT_DECK_GL_SETTINGS
}: DeckGLRendererProps) {
  const deckRef = useRef<DeckGLRef | null>(null);
  const [viewState, setViewState] = useState<OrthographicViewState>({
    'target': [SPACE_SIZE / 2, SPACE_SIZE / 2],
    'zoom': -1,
    'minZoom': -5,
    'maxZoom': 5
  });

  const layoutConfig = useMemo(() => ({
    'baseRadius': settings.baseRadius,
    'radiusStep': settings.radiusStep
  }), [settings.baseRadius, settings.radiusStep]);

  const radialPositions = useMemo(
    () => calculateRadialPositions(graphData.nodes, graphData.links, SPACE_SIZE, layoutConfig),
    [graphData, layoutConfig]
  );

  const nodeData = useMemo((): NodeData[] => {
    return graphData.nodes.map((node) => {
      const pos = radialPositions.get(node.id);
      const x = pos?.x ?? SPACE_SIZE / 2;
      const y = pos?.y ?? SPACE_SIZE / 2;
      return {
        'position': [x, y] as [number, number],
        'color': hslToRgba(node.color),
        'size': settings.nodeSize,
        node
      };
    });
  }, [graphData.nodes, radialPositions, settings.nodeSize]);

  const linkData = useMemo((): LinkData[] => {
    const nodeMap = new Map<string, [number, number]>();
    nodeData.forEach((nd) => {
      nodeMap.set(nd.node.id, nd.position);
    });

    return graphData.links.map((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as SubjectNode).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as SubjectNode).id;
      return {
        'source': nodeMap.get(sourceId) ?? [SPACE_SIZE / 2, SPACE_SIZE / 2],
        'target': nodeMap.get(targetId) ?? [SPACE_SIZE / 2, SPACE_SIZE / 2],
        'color': hslToRgba(link.color)
      };
    });
  }, [graphData.links, nodeData]);

  const handleNodeClick = useCallback((info: PickingInfo) => {
    const nodeInfo = info.object as NodeData | undefined;
    if (nodeInfo) {
      const mockEvent = new MouseEvent('click');
      onNodeClick(nodeInfo.node, mockEvent);
    }
  }, [onNodeClick]);

  const handleNodeHover = useCallback((info: PickingInfo) => {
    const nodeInfo = info.object as NodeData | undefined;
    if (nodeInfo) {
      onNodeHover(nodeInfo.node);
    } else {
      onNodeHover(null);
    }
  }, [onNodeHover]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (deckRef.current) {
      const pickInfo = deckRef.current.pickObject({
        'x': event.nativeEvent.offsetX,
        'y': event.nativeEvent.offsetY,
        'layerIds': ['nodes-layer']
      });
      if (pickInfo) {
        const nodeInfo = pickInfo.object as NodeData | undefined;
        if (nodeInfo) {
          onNodeRightClick(nodeInfo.node, event.nativeEvent as MouseEvent);
        }
      }
    }
  }, [onNodeRightClick]);

  const layers = useMemo(() => [
    new LineLayer<LinkData>({
      'id': 'links-layer',
      'data': linkData,
      'getSourcePosition': (d: LinkData) => d.source,
      'getTargetPosition': (d: LinkData) => d.target,
      'getColor': (d: LinkData) => d.color,
      'getWidth': settings.linkWidth,
      'widthMinPixels': 1,
      'widthMaxPixels': 10,
      'opacity': settings.linkOpacity,
      'pickable': false
    }),
    new ScatterplotLayer<NodeData>({
      'id': 'nodes-layer',
      'data': nodeData,
      'getPosition': (d: NodeData) => d.position,
      'getRadius': (d: NodeData) => d.size,
      'getFillColor': (d: NodeData) => {
        const alpha = Math.round(settings.nodeOpacity * 255);
        return [d.color[0], d.color[1], d.color[2], alpha] as [number, number, number, number];
      },
      'radiusMinPixels': 2,
      'radiusMaxPixels': 50,
      'radiusScale': 1,
      'pickable': true,
      'stroked': true,
      'getLineColor': [255, 255, 255, 150],
      'getLineWidth': settings.nodeStrokeWidth,
      'lineWidthMinPixels': 1,
      'lineWidthMaxPixels': 3,
      'onClick': handleNodeClick,
      'onHover': handleNodeHover,
      'updateTriggers': {
        'getFillColor': [nodeData, settings.nodeOpacity],
        'getRadius': [nodeData, settings.nodeSize]
      }
    })
  ], [linkData, nodeData, handleNodeClick, handleNodeHover, settings]);

  const views = useMemo(() => new OrthographicView({
    'controller': {
      'scrollZoom': true,
      'dragPan': true,
      'dragRotate': false,
      'doubleClickZoom': true,
      'inertia': true
    }
  }), []);

  const handleViewStateChange = useCallback((params: { viewState: OrthographicViewState }) => {
    setViewState(params.viewState);
  }, []);

  return (
    <div
      onContextMenu={handleContextMenu}
      style={{ 'width': dimensions.width, 'height': dimensions.height }}
    >
      <DeckGL
        ref={deckRef}
        width={dimensions.width}
        height={dimensions.height}
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        views={views}
        layers={layers}
        getCursor={() => 'grab'}
        style={{ backgroundColor }}
      />
    </div>
  );
}
