import type { SubjectNode, GraphData } from '../types';

export type RendererType = 'force-graph-3d' | 'force-graph-2d' | 'cosmos-gl' | 'deck-gl';

export interface RendererConfig {
  type: RendererType;
  label: string;
  description: string;
}

export interface BaseRendererProps {
  graphData: GraphData;
  dimensions: { width: number; height: number };
  onNodeHover: (node: SubjectNode | null) => void;
  onNodeClick: (node: SubjectNode, event: MouseEvent) => void;
  onNodeRightClick: (node: SubjectNode, event: MouseEvent) => void;
  backgroundColor?: string;
}

export const RENDERER_CONFIGS: RendererConfig[] = [
  {
    'type': 'cosmos-gl',
    'label': 'Cosmos GL',
    'description': 'Cosmos.gl图可视化'
  },
  {
    'type': 'force-graph-3d',
    'label': 'Force Graph 3D',
    'description': '3D力导向图'
  },
  {
    'type': 'force-graph-2d',
    'label': 'Force Graph 2D',
    'description': '2D力导向图'
  },
  {
    'type': 'deck-gl',
    'label': 'Deck.gl',
    'description': 'Deck.gl图可视化'
  }
];
