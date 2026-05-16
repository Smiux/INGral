import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, AlertCircle, Trash2, Eye, CalendarDays, GitBranch, FileText } from 'lucide-react';
import { getAllGallerys, deleteGallery } from '@/services/galleryService';
import { ConfirmDialog } from '@/components/ui/generic/ConfirmDialog';
import type { GalleryListItem } from '@/components/gallerys/gallery';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    'year': 'numeric',
    'month': 'long',
    'day': 'numeric'
  });
};

export function GallerysPage () {
  const [gallerys, setGallerys] = useState<GalleryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GalleryListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadGallerys = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllGallerys();
      setGallerys(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallerys();
  }, [loadGallerys]);

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteGallery(deleteTarget.id);
      setGallerys((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredGallerys = gallerys.filter((gallery) =>
    gallery.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    if (filteredGallerys.length > 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGallerys.map((gallery) => (
            <Link
              key={gallery.id}
              to={`/gallerys/${gallery.id}`}
              className="block bg-slate-100/80 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded hover:border-sky-300 dark:hover:border-sky-600 transition-all duration-300 group overflow-hidden transform hover:-translate-y-1"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                    {gallery.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget(gallery);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/30 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4" />
                    <span>{gallery.nodeCount} 个节点</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>{gallery.edgeCount} 条连接</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>{gallery.wordCount.toLocaleString()} 字</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-3">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>更新于 {formatDate(gallery.updatedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      );
    }

    if (searchQuery) {
      return (
        <div className="text-center py-16">
          <AlertCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-2">
            未找到匹配的地图
          </h3>
          <p className="text-slate-400 dark:text-slate-500">
            尝试使用其他关键词搜索
          </p>
        </div>
      );
    }

    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-xl font-medium text-slate-600 dark:text-slate-300 mb-2">
          暂无地图
        </h3>
        <Link
          to="/gallerys/create"
          className="inline-flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 px-6 py-2 rounded hover:bg-sky-100/80 hover:border-sky-300 hover:text-sky-600 dark:hover:bg-sky-900/30 dark:hover:border-sky-700 dark:hover:text-sky-400 transition-all duration-200 font-medium text-slate-500 dark:text-slate-400"
        >
          <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400" />
          <span>创建地图</span>
        </Link>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mb-4" />
        <p className="text-slate-500 dark:text-slate-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-300 mb-2">
              地图
            </h1>
          </div>

          <Link
            to="/gallerys/create"
            className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 px-6 py-2 rounded hover:bg-sky-100/80 hover:border-sky-300 hover:text-sky-600 dark:hover:bg-sky-900/30 dark:hover:border-sky-700 dark:hover:text-sky-400 transition-all duration-200 font-medium text-slate-500 dark:text-slate-400"
          >
            <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400" />
            <span>创建地图</span>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="搜索地图..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-200/50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded focus:outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>
      </div>

      {renderContent()}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="删除地图"
        message={`确定要删除地图"${deleteTarget?.title}"吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
