import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { articleService, type Article } from '../services/articleService';

function formatDate (dateStr: string | null | undefined): string {
  if (!dateStr) {
    return 'N/A';
  }
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    'month': 'short',
    'day': 'numeric'
  };
  if (date.getFullYear() !== new Date().getFullYear()) {
    options.year = 'numeric';
  }
  return date.toLocaleDateString('zh-CN', options);
}

export function ArticlesPage () {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    articleService.getAllArticles(true)
      .then(setArticles)
      .finally(() => setIsLoading(false));
  }, []);

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      );
    }

    if (filteredArticles.length > 0) {
      return (
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <Link
              key={article.id}
              to={`/articles/${article.slug}`}
              className="block p-6 bg-white border border-neutral-200 rounded-lg hover:border-primary-200 transition-all duration-300 group"
            >
              <h2 className="text-xl font-semibold text-neutral-800 group-hover:text-primary-600 transition-colors mb-2">
                {article.title}
              </h2>
              <p className="text-neutral-600 mb-4 line-clamp-2">
                {article.content.substring(0, 150)}...
              </p>
              <span className="text-sm text-neutral-500">
                更新于{formatDate(article.updated_at)}
              </span>
            </Link>
          ))}
        </div>
      );
    }

    return (
      <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
        <p className="text-gray-600 mb-4">
          {searchQuery ? '没有匹配的文章。' : '暂无文章。'}
        </p>
        {!searchQuery && (
          <Link
            to="/articles/create"
            className="inline-block bg-blue-50 text-blue-700 border border-blue-200 px-6 py-2 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 transform hover:scale-105"
          >
            创建文章
          </Link>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 mb-8 transition-all duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-neutral-800 mb-4 md:mb-0">所有文章</h1>
        <Link
          to="/articles/create"
          className="flex items-center gap-2 bg-secondary-50 text-secondary-700 border border-secondary-200 px-6 py-2 rounded-lg hover:bg-secondary-100 hover:border-secondary-300 transition-all duration-200 transform hover:scale-105 font-medium"
        >
          <Plus className="w-4 h-4 text-secondary-600" />
          创建文章
        </Link>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="搜索文章..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-200 outline-none transition-all duration-200"
        />
      </div>

      {renderContent()}
    </div>
  );
}
