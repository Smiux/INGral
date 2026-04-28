import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Compass } from 'lucide-react';
import { getGalleryById } from '@/services/galleryService';
import type { ArticleNode, ArticleEdge, ArticleNodeData } from '@/components/gallerys/gallery';

interface NavigationItem {
  id: string;
  title: string;
  relationship?: string | undefined;
  isEmbedded: boolean;
}

interface ExplorationNavigatorProps {
  onClose?: () => void;
}

export const ExplorationNavigator = ({ onClose }: ExplorationNavigatorProps) => {
  const { galleryId } = useParams<{ galleryId: string }>();
  const [searchParams] = useSearchParams();

  const articleSlug = searchParams.get('article');
  const embeddedArticleId = searchParams.get('embedded');

  const [incoming, setIncoming] = useState<NavigationItem[]>([]);
  const [outgoing, setOutgoing] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNavigation = async () => {
      if (!galleryId || (!articleSlug && !embeddedArticleId)) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const gallery = await getGalleryById(galleryId);
        if (!gallery) {
          setIsLoading(false);
          return;
        }

        const { nodes, edges } = gallery;

        const currentNode = nodes.find((n: ArticleNode) => {
          if (embeddedArticleId) {
            return n.data.embeddedArticleId === embeddedArticleId;
          }
          return n.data.articleSlug === articleSlug && !n.data.isEmbedded;
        });

        if (!currentNode) {
          setIsLoading(false);
          return;
        }

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

        setIncoming(incomingItems);
        setOutgoing(outgoingItems);
      } finally {
        setIsLoading(false);
      }
    };

    loadNavigation();
  }, [galleryId, articleSlug, embeddedArticleId]);

  if (!galleryId || (!articleSlug && !embeddedArticleId)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 p-4 z-40">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500" />
        </div>
      </div>
    );
  }

  if (incoming.length === 0 && outgoing.length === 0) {
    return null;
  }

  const buildExploreUrl = (item: NavigationItem): string => {
    if (item.isEmbedded) {
      return `/gallerys/${galleryId}/explore?embedded=${item.id}`;
    }
    return `/gallerys/${galleryId}/explore?article=${item.id}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {incoming.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  前序文章
                </div>
                <div className="flex flex-wrap gap-2">
                  {incoming.map((item) => (
                    <Link
                      key={item.id}
                      to={buildExploreUrl(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {item.relationship && (
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">
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

          <div className="flex items-center gap-2 px-4">
            <Compass className="w-5 h-5 text-sky-500" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              探索模式
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>

          <div className="flex-1">
            {outgoing.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 text-right">
                  后续文章
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {outgoing.map((item) => (
                    <Link
                      key={item.id}
                      to={buildExploreUrl(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors text-sm"
                    >
                      <span className="max-w-[150px] truncate">{item.title}</span>
                      {item.relationship && (
                        <span className="text-xs text-sky-400 dark:text-sky-500">
                          :{item.relationship}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorationNavigator;
