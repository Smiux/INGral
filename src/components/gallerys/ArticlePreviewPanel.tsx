import { useEffect, useState } from 'react';
import { X, ExternalLink, Play, Edit } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getArticleBySlug, type ArticleWithContent } from '@/services/articleService';
import { TiptapEditor } from '@/components/articles/core/TipTap';
import type { ArticleNodeData, EmbeddedArticle } from '@/components/gallerys/gallery';

interface ArticlePreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  articleData: ArticleNodeData | null;
  galleryId: string;
  showExplore?: boolean;
  onEdit?: (() => void) | undefined;
  embeddedArticles?: EmbeddedArticle[];
}

const LoadingContent = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
  </div>
);

const ErrorContent = () => (
  <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
    文章加载失败
  </div>
);

const ArticleContent = ({ content }: { content: string }) => (
  <div className="p-6">
    <TiptapEditor
      content={content}
      editable={false}
    />
  </div>
);

export const ArticlePreviewPanel = ({
  isOpen,
  onClose,
  articleData,
  galleryId,
  showExplore = true,
  onEdit,
  embeddedArticles = []
}: ArticlePreviewPanelProps) => {
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleWithContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadArticle = async () => {
      if (!isOpen || !articleData) {
        setArticle(null);
        return;
      }

      if (articleData.isEmbedded && articleData.embeddedArticleId) {
        const embeddedArticle = embeddedArticles.find(a => a.id === articleData.embeddedArticleId);
        if (embeddedArticle) {
          setArticle({
            'id': embeddedArticle.id,
            'title': embeddedArticle.title,
            'slug': embeddedArticle.id,
            'content': embeddedArticle.content,
            'summary': embeddedArticle.summary || null,
            'cover_image': embeddedArticle.coverImage || null,
            'tags': embeddedArticle.tags || null,
            'created_at': embeddedArticle.createdAt,
            'updated_at': embeddedArticle.updatedAt
          });
        }
        return;
      }

      if (!articleData.articleSlug) {
        setArticle(null);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getArticleBySlug(articleData.articleSlug);
        setArticle(data);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [isOpen, articleData, embeddedArticles]);

  const handleExplore = () => {
    if (!articleData) {
      return;
    }

    if (articleData.isEmbedded && articleData.embeddedArticleId) {
      navigate(`/gallerys/${galleryId}/explore?embedded=${articleData.embeddedArticleId}`);
    } else if (articleData.articleSlug) {
      navigate(`/gallerys/${galleryId}/explore?article=${articleData.articleSlug}`);
    }
  };

  if (!isOpen || !articleData) {
    return null;
  }

  const renderContent = () => {
    if (isLoading) {
      return <LoadingContent />;
    }

    if (article) {
      return <ArticleContent content={article.content} />;
    }

    return <ErrorContent />;
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/20 z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-slate-50/90 dark:bg-slate-900/90 z-50 overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/60 dark:border-slate-700/60 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 truncate flex-1 mr-4" title={articleData.articleTitle}>
            {articleData.articleTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100/40 dark:hover:bg-slate-700/60 rounded flex-shrink-0"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>

        <div className="sticky bottom-0 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/60 dark:border-slate-700/60 p-4">
          <div className="flex items-center gap-3">
            {articleData.isEmbedded && onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100/40 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/60 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>编辑</span>
              </button>
            )}

            {showExplore && (
              <button
                onClick={handleExplore}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>开始探索</span>
              </button>
            )}

            {!articleData.isEmbedded && (
              <Link
                to={`/articles/${articleData.articleSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 px-4 py-2 bg-slate-100/40 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/60 transition-colors ${showExplore ? 'flex-1' : 'w-full'}`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>在新页面中查看</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ArticlePreviewPanel;
