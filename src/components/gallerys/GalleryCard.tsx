import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Eye, CalendarDays, GitBranch } from 'lucide-react';
import type { GalleryListItem } from '@/components/gallerys/gallery';

interface GalleryCardProps {
  gallery: GalleryListItem;
  onDelete: (id: string) => void;
}

export const GalleryCard: React.FC<GalleryCardProps> = ({ gallery, onDelete }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      'year': 'numeric',
      'month': 'long',
      'day': 'numeric'
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(gallery.id);
  };

  return (
    <Link
      to={`/gallerys/${gallery.id}`}
      className="block bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-300 group overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1">
            {gallery.title}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-1.5 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {gallery.description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-4">
            {gallery.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-4 h-4" />
            <span>{gallery.nodeCount} 个节点</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            <span>{gallery.edgeCount} 条连接</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 mt-3">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>更新于 {formatDate(gallery.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
};

export default GalleryCard;
