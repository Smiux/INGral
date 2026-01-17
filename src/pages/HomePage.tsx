/**
 * 首页组件
 * 展示网站的主要内容和最近文章
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { articleService, type Article } from '../services/articleService';

export function HomePage () {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  /**
   * 加载最近文章和统计数据
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await articleService.getAllArticles();
        setArticles(data.slice(0, 6));
      } catch {
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            MyWiki
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A community-based knowledge platform for creating, sharing, and visualizing mathematical concepts.
            Connect ideas, explore relationships, and build a collaborative knowledge graph.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold text-gray-900">最近文章</h2>
              <Link
                to="/articles"
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition"
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
                    className="group p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg hover:border-blue-300 transition"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {article.content.substring(0, 120)}...
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {article.updated_at ? new Date(article.updated_at).toLocaleDateString('en-US', {
                          'month': 'short',
                          'day': 'numeric'
                        }) : 'N/A'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-600 mb-4">No articles yet. Be the first to create one!</p>
                <Link
                  to="/create"
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Create Article
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
