import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Compass } from 'lucide-react';
import { getGalleryById } from '@/services/galleryService';

interface NavigationItem {
  slug: string;
  title: string;
  relationship?: string | undefined;
}

interface ExplorationNavigatorProps {
  onClose?: () => void;
}

export const ExplorationNavigator = ({ onClose }: ExplorationNavigatorProps) => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const galleryId = searchParams.get('galleryId');
  const explorationMode = searchParams.get('explorationMode') === 'true';

  const [incoming, setIncoming] = useState<NavigationItem[]>([]);
  const [outgoing, setOutgoing] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNavigation = async () => {
      if (!slug || !galleryId || !explorationMode) {
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

        const { nodes, edges } = gallery.graphData;

        const currentNode = nodes.find((n) => n.data.articleSlug === slug);
        if (!currentNode) {
          setIsLoading(false);
          return;
        }

        const incomingEdges = edges.filter((e) => e.target === currentNode.id);
        const outgoingEdges = edges.filter((e) => e.source === currentNode.id);

        const incomingItems: NavigationItem[] = incomingEdges.map((edge) => {
          const sourceNode = nodes.find((n) => n.id === edge.source);
          return {
            'slug': sourceNode?.data.articleSlug || '',
            'title': sourceNode?.data.articleTitle || '',
            'relationship': edge.data?.relationshipType ?? undefined
          };
        });

        const outgoingItems: NavigationItem[] = outgoingEdges.map((edge) => {
          const targetNode = nodes.find((n) => n.id === edge.target);
          return {
            'slug': targetNode?.data.articleSlug || '',
            'title': targetNode?.data.articleTitle || '',
            'relationship': edge.data?.relationshipType ?? undefined
          };
        });

        setIncoming(incomingItems);
        setOutgoing(outgoingItems);
      } finally {
        setIsLoading(false);
      }
    };

    loadNavigation();
  }, [slug, galleryId, explorationMode]);

  if (!explorationMode || !galleryId) {
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
                      key={item.slug}
                      to={`/articles/${item.slug}?galleryId=${galleryId}&explorationMode=true`}
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
                      key={item.slug}
                      to={`/articles/${item.slug}?galleryId=${galleryId}&explorationMode=true`}
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
