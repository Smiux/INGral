import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, AlertCircle } from 'lucide-react';
import { getAllGallerys, deleteGallery } from '@/services/galleryService';
import { GalleryCard } from '@/components/gallerys';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { GalleryListItem } from '@/components/gallerys/gallery';

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
    gallery.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gallery.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    if (filteredGallerys.length > 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGallerys.map((gallery) => (
            <GalleryCard
              key={gallery.id}
              gallery={gallery}
              onDelete={(id) => {
                const target = gallerys.find((g) => g.id === id);
                if (target) {
                  setDeleteTarget(target);
                }
              }}
            />
          ))}
        </div>
      );
    }

    if (searchQuery) {
      return (
        <div className="text-center py-16">
          <AlertCircle className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            未找到匹配的文章集
          </h3>
          <p className="text-neutral-500 dark:text-neutral-500">
            尝试使用其他关键词搜索
          </p>
        </div>
      );
    }

    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-600" />
        </div>
        <h3 className="text-xl font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          暂无文章集
        </h3>
        <Link
          to="/gallerys/create"
          className="inline-flex items-center gap-2 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 px-6 py-2 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-200 transform hover:scale-105 font-medium"
        >
          <Plus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>创建文章集</span>
        </Link>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mb-4" />
        <p className="text-neutral-600 dark:text-neutral-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">
              文章集
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              在这个没有灯塔的时代，当自己的测绘员
            </p>
          </div>

          <Link
            to="/gallerys/create"
            className="flex items-center gap-2 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 px-6 py-2 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-200 transform hover:scale-105 font-medium"
          >
            <Plus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>创建文章集</span>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="搜索文章集..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-800 dark:text-neutral-200"
          />
        </div>
      </div>

      {renderContent()}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="删除文章集"
        message={`确定要删除文章集"${deleteTarget?.title}"吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
