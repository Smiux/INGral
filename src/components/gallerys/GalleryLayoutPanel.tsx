import { useState, useCallback } from 'react';
import { X, LayoutGrid, GitBranch, Circle, RefreshCw } from 'lucide-react';
import ELK from 'elkjs';
import type { ArticleNode, ArticleEdge } from './gallery';

type LayoutAlgorithm = 'layered' | 'mrtree' | 'radial';

interface LayoutParams {
  nodeSpacing: number;
  edgeEdgeSpacing: number;
  edgeNodeSpacing: number;
  rankSpacing: number;
}

interface GalleryLayoutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLayout: (nodes: ArticleNode[], edges: ArticleEdge[]) => void;
  nodes: ArticleNode[];
  edges: ArticleEdge[];
}

const ALGORITHM_CONFIG = {
  'layered': {
    'id': 'org.eclipse.elk.layered',
    'label': '层次布局',
    'icon': LayoutGrid,
    'description': '按层级排列节点，适合有向图'
  },
  'mrtree': {
    'id': 'org.eclipse.elk.mrtree',
    'label': '树布局',
    'icon': GitBranch,
    'description': '按树形结构排列节点'
  },
  'radial': {
    'id': 'org.eclipse.elk.radial',
    'label': '辐射布局',
    'icon': Circle,
    'description': '以中心向外辐射排列节点'
  }
} as const;

const DEFAULT_PARAMS: LayoutParams = {
  'nodeSpacing': 80,
  'edgeEdgeSpacing': 20,
  'edgeNodeSpacing': 20,
  'rankSpacing': 120
};

const elk = new ELK();

export const GalleryLayoutPanel = ({
  isOpen,
  onClose,
  onLayout,
  nodes,
  edges
}: GalleryLayoutPanelProps) => {
  const [algorithm, setAlgorithm] = useState<LayoutAlgorithm>('layered');
  const [params, setParams] = useState<LayoutParams>(DEFAULT_PARAMS);
  const [isLayouting, setIsLayouting] = useState(false);

  const updateParam = useCallback((key: keyof LayoutParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  const executeLayout = useCallback(async () => {
    if (nodes.length === 0) {
      return;
    }

    setIsLayouting(true);

    try {
      const baseOptions: Record<string, string> = {
        'elk.algorithm': ALGORITHM_CONFIG[algorithm].id,
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        'elk.spacing.nodeNode': params.nodeSpacing.toString(),
        'elk.spacing.edgeEdge': params.edgeEdgeSpacing.toString(),
        'elk.spacing.edgeNode': params.edgeNodeSpacing.toString()
      };

      const algorithmOptions: Record<string, string> = algorithm === 'layered'
        ? {
          'elk.direction': 'DOWN',
          'elk.layered.spacing.nodeNodeBetweenLayers': params.rankSpacing.toString()
        }
        : {
          'elk.direction': 'DOWN'
        };

      const elkGraph = {
        'id': 'root',
        'layoutOptions': { ...baseOptions, ...algorithmOptions },
        'children': nodes.map(node => ({
          'id': node.id,
          'width': 200,
          'height': 100
        })),
        'edges': edges.map(edge => ({
          'id': edge.id,
          'sources': [edge.source],
          'targets': [edge.target]
        }))
      };

      const layoutedGraph = await elk.layout(elkGraph);

      const layoutedNodesMap = new Map<string, { x: number; y: number }>();
      layoutedGraph.children?.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          layoutedNodesMap.set(node.id, { 'x': node.x, 'y': node.y });
        }
      });

      const updatedNodes = nodes.map(node => {
        const pos = layoutedNodesMap.get(node.id);
        return pos ? { ...node, 'position': { 'x': pos.x, 'y': pos.y } } : node;
      });

      onLayout(updatedNodes, edges);
    } finally {
      setIsLayouting(false);
    }
  }, [nodes, edges, algorithm, params, onLayout]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-neutral-800 shadow-xl z-50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            布局设置
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              布局算法
            </h3>
            <div className="space-y-2">
              {(Object.keys(ALGORITHM_CONFIG) as LayoutAlgorithm[]).map(key => {
                const config = ALGORITHM_CONFIG[key];
                const Icon = config.icon;
                const isSelected = algorithm === key;

                return (
                  <button
                    key={key}
                    onClick={() => setAlgorithm(key)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg border transition-colors
                      ${isSelected
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30'
                    : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'}
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-sky-500' : 'text-neutral-400'}`} />
                    <div className="text-left">
                      <div className={`text-sm font-medium ${isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                        {config.label}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {config.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              布局参数
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                  节点间距
                </label>
                <input
                  type="number"
                  min={20}
                  max={200}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-800 dark:text-neutral-200"
                  value={params.nodeSpacing}
                  onChange={e => updateParam('nodeSpacing', parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                  连接间间距
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-800 dark:text-neutral-200"
                  value={params.edgeEdgeSpacing}
                  onChange={e => updateParam('edgeEdgeSpacing', parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                  节点连接间间距
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-800 dark:text-neutral-200"
                  value={params.edgeNodeSpacing}
                  onChange={e => updateParam('edgeNodeSpacing', parseInt(e.target.value, 10) || 0)}
                />
              </div>

              {algorithm === 'layered' && (
                <div>
                  <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                    层级间距
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={300}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-800 dark:text-neutral-200"
                    value={params.rankSpacing}
                    onChange={e => updateParam('rankSpacing', parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={executeLayout}
            disabled={isLayouting || nodes.length === 0}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${isLayouting || nodes.length === 0
      ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
      : 'bg-sky-500 text-white hover:bg-sky-600'}
            `}
          >
            <RefreshCw className={`w-4 h-4 ${isLayouting ? 'animate-spin' : ''}`} />
            {isLayouting ? '布局中...' : '应用布局'}
          </button>
        </div>
      </div>
    </>
  );
};

export default GalleryLayoutPanel;
