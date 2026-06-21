import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { NeighborNode, NeighborEdge } from './Viewer';

interface NavigationItem {
  id: string;
  title: string;
  relationship?: string | undefined;
}

interface ExplorationNavigatorProps {
  nodes: NeighborNode[];
  edges: NeighborEdge[];
  currentNode: NeighborNode;
  onNavigate: (targetId: string, relationship?: string) => void;
  onAddConnection?: (direction: 'incoming' | 'outgoing') => void;
}

export const ExplorationNavigator = ({
  nodes,
  edges,
  currentNode,
  onNavigate,
  onAddConnection
}: ExplorationNavigatorProps) => {
  const currentTitle = currentNode.articleTitle || '未命名';

  const { incoming, outgoing } = useMemo(() => {
    const incomingEdges = edges.filter(e => e.targetId === currentNode.id);
    const outgoingEdges = edges.filter(e => e.sourceId === currentNode.id);

    const buildNavigationItem = (node: NeighborNode, edge: NeighborEdge): NavigationItem => {
      return {
        'id': node.id,
        'title': node.articleTitle || '',
        'relationship': edge.relationship
      };
    };

    const incomingItems: NavigationItem[] = incomingEdges
      .map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.sourceId);
        return sourceNode ? buildNavigationItem(sourceNode, edge) : null;
      })
      .filter((item): item is NavigationItem => item !== null);

    const outgoingItems: NavigationItem[] = outgoingEdges
      .map(edge => {
        const targetNode = nodes.find(n => n.id === edge.targetId);
        return targetNode ? buildNavigationItem(targetNode, edge) : null;
      })
      .filter((item): item is NavigationItem => item !== null);

    return { 'incoming': incomingItems, 'outgoing': outgoingItems };
  }, [nodes, edges, currentNode]);

  return (
    <div className="border-b border-slate-200/60 dark:border-slate-700/60">
      <div className="max-w-7xl mx-auto px-4 pb-3 pt-1">
        <div className="flex w-full items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="space-y-1">
              <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                指向此文章
              </div>
              <div className="flex flex-wrap gap-2">
                {incoming.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id, item.relationship)}
                    className="flex items-center gap-1.5 rounded bg-slate-100/40 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-200/50 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-700/60"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {item.relationship && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {item.relationship}:
                      </span>
                    )}
                    <span className="max-w-[150px] truncate" title={item.title}>{item.title}</span>
                  </button>
                ))}
                {onAddConnection && (
                  <button
                    type="button"
                    onClick={() => onAddConnection('incoming')}
                    className="flex items-center gap-1 rounded border border-dashed border-slate-300/60 dark:border-slate-600/60 px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100/40 dark:hover:bg-slate-800/40 hover:text-slate-500 dark:hover:text-slate-400"
                    title="添加关联"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-shrink-0 flex-col items-center gap-1 px-2 pt-0.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">当前</span>
            <span
              className="max-w-[180px] truncate rounded bg-sky-100/60 px-2.5 py-1 text-sm font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
              title={currentTitle}
            >
              {currentTitle}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 justify-end">
            <div className="space-y-1 text-right">
              <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                此文章指向
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {outgoing.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id, item.relationship)}
                    className="flex items-center gap-1.5 rounded bg-sky-50 px-3 py-1.5 text-sm text-sky-700 transition-colors hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-900/30"
                  >
                    <span className="max-w-[150px] truncate">{item.title}</span>
                    {item.relationship && (
                      <span className="text-xs text-sky-400 dark:text-sky-500">
                        :{item.relationship}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}
                {onAddConnection && (
                  <button
                    type="button"
                    onClick={() => onAddConnection('outgoing')}
                    className="flex items-center gap-1 rounded border border-dashed border-sky-300/60 dark:border-sky-700/60 px-2 py-1.5 text-xs text-sky-400 dark:text-sky-500 transition-colors hover:bg-sky-50/50 dark:hover:bg-sky-900/20 hover:text-sky-500 dark:hover:text-sky-400"
                    title="添加关联"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
