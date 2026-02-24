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
              <span className="text-sm text-neutral-500">
                {article.author_name}
              </span>
              <span className="text-sm text-neutral-500 block mt-2">
                创建于{formatDate(article.created_at)}
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
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-primary-600 hover:text-neutral-700 mb-8 transition-all duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-neutral-800 mb-4 md:mb-0">所有文章</h1>
        <Link
          to="/articles/create"
          className="flex items-center gap-2 bg-secondary-50 text-secondary-600 border border-secondary-200 px-6 py-2 rounded-lg hover:bg-secondary-100 hover:border-secondary-200 transition-all duration-200 transform hover:scale-105 font-medium"
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
