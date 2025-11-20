import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Network, Users, ExternalLink } from 'lucide-react';
import { Article } from '@/types';
import { fetchAllArticles } from '@/utils/article';

export function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadArticles = async () => {
      const data = await fetchAllArticles();
      setArticles(data.slice(0, 6));
      setIsLoading(false);
    };

    loadArticles();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            MyMathWiki
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A community-based knowledge platform for creating, sharing, and visualizing mathematical concepts. 
            Connect ideas, explore relationships, and build a collaborative knowledge graph.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/graph"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold text-lg group"
            >
              <Network className="w-5 h-5" />
              Explore Graph
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </Link>
            <Link
              to="/articles"
              className="inline-flex items-center justify-center gap-2 border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition font-semibold text-lg"
            >
              <BookOpen className="w-5 h-5" />
              Browse Articles
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition">
              <Network className="w-8 h-8 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Visual Knowledge Graph</h3>
              <p className="text-gray-600">
                Create custom visualization graphs where nodes represent knowledge and can be freely connected.
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Collaboration</h3>
              <p className="text-gray-600">
                Share your knowledge and learn from others in a decentralized, community-based platform.
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition">
              <ExternalLink className="w-8 h-8 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Contextual References</h3>
              <p className="text-gray-600">
                View referenced content in place with drawer or tile UI without leaving your current article.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Recent Articles</h2>
              <Link
                to="/articles"
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {articles.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/article/${article.slug}`}
                    className="group p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg hover:border-blue-300 transition"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {article.content.substring(0, 120)}...
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{article.view_count} views</span>
                      <span>
                        {new Date(article.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
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
