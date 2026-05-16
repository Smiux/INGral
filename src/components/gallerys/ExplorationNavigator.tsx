import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Network, Compass } from 'lucide-react';
import type { ArticleNode, ArticleEdge, ArticleNodeData } from '@/components/gallerys/gallery';

interface NavigationItem {
  id: string;
  title: string;
  relationship?: string | undefined;
  isEmbedded: boolean;
}

interface ExplorationNavigatorProps {
  collapsed: boolean;
  onSwitchToGraph?: () => void;
  onDockTitlePointerEnter: () => void;
  onDockRegionPointerLeave: () => void;
  nodes: ArticleNode[];
  edges: ArticleEdge[];
  currentNode: ArticleNode;
  galleryId: string;
}

const dockBodyTransition = {
  'duration': 0.28,
  'ease': [0.33, 1, 0.68, 1] as [number, number, number, number]
};

function ExplorationDockTitleBar ({
  modeSwitch,
  onTitlePointerEnter
}: {
  modeSwitch?: ReactNode;
  onTitlePointerEnter: () => void;
}) {
  return (
    <div
      className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-4 py-2"
      onPointerEnter={onTitlePointerEnter}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Compass className="h-5 w-5 shrink-0 text-sky-500" />
        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
          探索模式
        </span>
      </div>
      {modeSwitch}
    </div>
  );
}

export const ExplorationNavigator = ({
  collapsed,
  onSwitchToGraph,
  onDockTitlePointerEnter,
  onDockRegionPointerLeave,
  nodes,
  edges,
  currentNode,
  galleryId
}: ExplorationNavigatorProps) => {
  const currentTitle = (currentNode.data as ArticleNodeData).articleTitle || '未命名';

  const { incoming, outgoing } = useMemo(() => {
    const incomingEdges = edges.filter((e: ArticleEdge) => e.target === currentNode.id);
    const outgoingEdges = edges.filter((e: ArticleEdge) => e.source === currentNode.id);

    const buildNavigationItem = (node: ArticleNode, edge: ArticleEdge): NavigationItem => {
      const data = node.data as ArticleNodeData;
      return {
        'id': data.isEmbedded ? (data.embeddedArticleId || data.articleSlug) : data.articleSlug,
        'title': data.articleTitle || '',
        'relationship': edge.data?.relationshipType ?? undefined,
        'isEmbedded': data.isEmbedded || false
      };
    };

    const incomingItems: NavigationItem[] = incomingEdges
      .map((edge: ArticleEdge) => {
        const sourceNode = nodes.find((n: ArticleNode) => n.id === edge.source);
        return sourceNode ? buildNavigationItem(sourceNode, edge) : null;
      })
      .filter((item): item is NavigationItem => item !== null);

    const outgoingItems: NavigationItem[] = outgoingEdges
      .map((edge: ArticleEdge) => {
        const targetNode = nodes.find((n: ArticleNode) => n.id === edge.target);
        return targetNode ? buildNavigationItem(targetNode, edge) : null;
      })
      .filter((item): item is NavigationItem => item !== null);

    return { 'incoming': incomingItems, 'outgoing': outgoingItems };
  }, [nodes, edges, currentNode]);

  if (incoming.length === 0 && outgoing.length === 0) {
    return null;
  }

  const modeSwitch = onSwitchToGraph ? (
    <button
      type="button"
      onClick={onSwitchToGraph}
      title="切换到关联图"
      className="rounded border border-slate-200/70 bg-slate-100/50 p-1.5 text-slate-600 transition-colors hover:bg-slate-200/60 dark:border-slate-600/60 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-700/50"
    >
      <Network className="h-4 w-4" />
    </button>
  ) : undefined;

  const buildExploreUrl = (item: NavigationItem): string => {
    if (item.isEmbedded) {
      return `/gallerys/${galleryId}/explore?embedded=${item.id}`;
    }
    return `/gallerys/${galleryId}/explore?article=${item.id}`;
  };

  return (
    <div
      className="w-full shrink-0 border-b border-slate-200/60 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900"
      onPointerLeave={onDockRegionPointerLeave}
    >
      <ExplorationDockTitleBar
        modeSwitch={modeSwitch}
        onTitlePointerEnter={onDockTitlePointerEnter}
      />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="exploration-dock-body"
            initial={{ 'height': 0, 'opacity': 0 }}
            animate={{ 'height': 'auto', 'opacity': 1 }}
            exit={{ 'height': 0, 'opacity': 0 }}
            transition={dockBodyTransition}
            style={{ 'overflow': 'hidden' }}
          >
            <div className="max-w-7xl mx-auto px-4 pb-3 pt-1">
              <div className="flex w-full items-start gap-4">
                <div className="min-w-0 flex-1">
                  {incoming.length > 0 && (
                    <div className="space-y-1">
                      <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                        前序文章
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {incoming.map((item) => (
                          <Link
                            key={item.id}
                            to={buildExploreUrl(item)}
                            className="flex items-center gap-1.5 rounded bg-slate-100/40 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-200/50 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-700/60"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            {item.relationship && (
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                {item.relationship}:
                              </span>
                            )}
                            <span className="max-w-[150px] truncate" title={item.title}>{item.title}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
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
                  {outgoing.length > 0 && (
                    <div className="space-y-1 text-right">
                      <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                        后续文章
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {outgoing.map((item) => (
                          <Link
                            key={item.id}
                            to={buildExploreUrl(item)}
                            className="flex items-center gap-1.5 rounded bg-sky-50 px-3 py-1.5 text-sm text-sky-700 transition-colors hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-900/30"
                          >
                            <span className="max-w-[150px] truncate">{item.title}</span>
                            {item.relationship && (
                              <span className="text-xs text-sky-400 dark:text-sky-500">
                                :{item.relationship}
                              </span>
                            )}
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
