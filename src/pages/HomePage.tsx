import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { articleService, type Article } from '../services/articleService';

export function HomePage () {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await articleService.getAllArticles();
        setArticles(data.slice(0, 6));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-800 mb-6">
            MyWiki
          </h1>
          <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
            一个基于社区的知识平台，用于创建、分享和可视化数学概念。
          </p>
        </div>

        {!isLoading && (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold text-neutral-800">最近文章</h2>
              <Link
                to="/articles"
                className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-all duration-200 transform hover:scale-105"
              >
                查看全部 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {articles.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/articles/${article.slug}`}
                    className="group p-6 bg-white rounded-lg border border-neutral-200 hover:border-primary-200 transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <h3 className="text-lg font-semibold text-neutral-800 group-hover:text-primary-600 transition-colors mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-neutral-600 text-sm mb-4 line-clamp-3">
                      {article.content.substring(0, 120)}...
                    </p>
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>
                        {article.updated_at ? new Date(article.updated_at).toLocaleDateString('zh-CN', {
                          'month': 'short',
                          'day': 'numeric'
                        }) : 'N/A'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
                <p className="text-neutral-600 mb-4">暂无文章。快来创建第一篇吧！</p>
                <Link
                  to="/create"
                  className="inline-block bg-primary-50 text-primary-700 border border-primary-200 px-6 py-2 rounded-lg hover:bg-primary-100 hover:border-primary-300 transition-all duration-200 transform hover:scale-105"
                >
                  创建文章
                </Link>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400"></div>
          </div>
        )}
      </div>
    </div>
  );
}
