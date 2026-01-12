/**
 * 首页组件
 * 展示网站的主要内容和最近文章
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Network, ExternalLink } from 'lucide-react';
import type { Article } from '../types';
import { fetchAllArticles } from '../utils/article';

export function HomePage () {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    'articleCount': 0,
    'graphCount': 0,
    'submissionCount': 0
  });

  /**
   * 加载统计数据
   */
  const loadStats = async () => {
    try {
      // 这里我们需要实现获取统计数据的逻辑
      // 暂时使用模拟数据，后续可以替换为真实的API调用
      const articleData = await fetchAllArticles();
      const articleCount = articleData.length;
      // 假设图表数量是文章数量的一半
      const graphCount = Math.floor(articleCount / 2);
      // 提交量是文章和图表数量的总和
      const submissionCount = articleCount + graphCount;

      setStats({
        articleCount,
        graphCount,
        submissionCount
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  /**
   * 加载最近文章和统计数据
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchAllArticles();
        setArticles(data.slice(0, 6));
        await loadStats();
      } catch (error) {
        console.error('Failed to load data:', error);
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

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/graphs"
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
              <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Collaboration</h3>
              <p className="text-gray-600">
                Share your knowledge and learn from others in a decentralized, community-based platform.
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition">
              <ExternalLink className="w-8 h-8 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">上下文引用</h3>
              <p className="text-gray-600">
                在不离开当前文章的情况下，通过抽屉或卡片UI查看引用的内容。
              </p>
            </div>
          </div>

          {/* 统计数据卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm">
              <h3 className="text-sm font-medium text-blue-700 mb-1">文章总数</h3>
              <p className="text-4xl font-bold text-blue-900">{stats.articleCount}</p>
              <p className="text-xs text-blue-600 mt-2">知识库文章</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 shadow-sm">
              <h3 className="text-sm font-medium text-green-700 mb-1">图谱总数</h3>
              <p className="text-4xl font-bold text-green-900">{stats.graphCount}</p>
              <p className="text-xs text-green-600 mt-2">可视化知识图谱</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 shadow-sm">
              <h3 className="text-sm font-medium text-purple-700 mb-1">提交总数</h3>
              <p className="text-4xl font-bold text-purple-900">{stats.submissionCount}</p>
              <p className="text-xs text-purple-600 mt-2">社区贡献</p>
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
                      <span>{article.view_count} views</span>
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
