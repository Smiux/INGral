import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { getAllArticles, type Article } from '../services/articleService';

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
    getAllArticles()
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
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
              className="block p-6 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-300 group"
            >
              <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors mb-2">
                {article.title}
              </h2>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 block mt-2">
                创建于{formatDate(article.created_at)}
              </span>
            </Link>
          ))}
        </div>
      );
    }

    return (
      <div className="text-center py-12 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          {searchQuery ? '没有匹配的文章。' : '暂无文章。'}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-8 transition-all duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-4 md:mb-0">所有文章</h1>
        <Link
          to="/articles/create"
          className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 px-6 py-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 hover:border-green-200 dark:hover:border-green-700 transition-all duration-200 transform hover:scale-105 font-medium"
        >
          <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
          创建文章
        </Link>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="搜索文章..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600 focus:border-sky-200 dark:focus:border-sky-600 outline-none transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
        />
      </div>

      {renderContent()}
    </div>
  );
}
