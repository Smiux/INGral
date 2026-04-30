import { useMemo } from 'react';
import { X, Settings, Circle, GitBranch, FileText, Link2 } from 'lucide-react';
import type { ArticleNode, ArticleEdge } from '@/components/gallerys/gallery';

interface GalleryInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (title: string) => void;
  nodes: ArticleNode[];
  edges: ArticleEdge[];
}

export const GalleryInfoPanel = ({
  isOpen,
  onClose,
  title,
  onTitleChange,
  nodes,
  edges
}: GalleryInfoPanelProps) => {
  const stats = useMemo(() => {
    const embeddedCount = nodes.filter(n => n.data.isEmbedded).length;
    const existingCount = nodes.length - embeddedCount;

    const relationshipDistribution: Record<string, number> = {};
    edges.forEach(edge => {
      const type = edge.data?.relationshipType || '默认';
      relationshipDistribution[type] = (relationshipDistribution[type] || 0) + 1;
    });

    return {
      'nodeCount': nodes.length,
      'edgeCount': edges.length,
      embeddedCount,
      existingCount,
      relationshipDistribution
    };
  }, [nodes, edges]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      <div className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-neutral-800 shadow-xl z-50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-neutral-500" />
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              地图信息
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="输入地图标题"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400"
            />
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              统计信息
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Circle className="w-4 h-4 text-sky-500" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">节点数量</span>
                </div>
                <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
                  {stats.nodeCount}
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">连接数量</span>
                </div>
                <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
                  {stats.edgeCount}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              节点类型分布
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-500" />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">已有文章</span>
                </div>
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {stats.existingCount}
                </span>
              </div>

              <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">嵌入文章</span>
                </div>
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {stats.embeddedCount}
                </span>
              </div>
            </div>
          </div>

          {Object.keys(stats.relationshipDistribution).length > 0 && (
            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                连接标签分布
              </h3>

              <div className="space-y-2">
                {Object.entries(stats.relationshipDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">{type}</span>
                      </div>
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GalleryInfoPanel;
