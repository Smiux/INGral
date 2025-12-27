import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Network, FileQuestion } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Article, Graph } from '../../types';
import { graphService } from '../../services/graphService';

interface RelatedContentProps {
  article: Article;
}

export function RelatedContent ({ article }: RelatedContentProps) {
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [relatedArticlesLoading, setRelatedArticlesLoading] = useState(false);
  const [relatedGraphs, setRelatedGraphs] = useState<Graph[]>([]);
  const [relatedGraphsLoading, setRelatedGraphsLoading] = useState(false);

  /**
   * 加载相关文章
   * @async
   */
  useEffect(() => {
    if (!article) {
      return;
    }

    const loadRelated = async () => {
      setRelatedArticlesLoading(true);
      try {
        // 添加supabase空检查
        if (!supabase) {
          console.warn('Supabase client is not available');
          return;
        }

        // 使用更安全的参数绑定方式查询相关文章链接
        const { 'data': links, 'error': linksError } = await supabase
          .from('article_links')
          .select('target_id, source_id')
          .or(`source_id.eq.${article.id},target_id.eq.${article.id}`)
          .limit(5);

        if (linksError) {
          console.error('Error fetching related articles:', linksError);
          return;
        }

        if (links && links.length > 0) {
          const relatedIds = links.map(link =>
            link.source_id === article.id ? link.target_id : link.source_id
          );

          // 去重并移除当前文章ID
          const uniqueRelatedIds = [...new Set(relatedIds)].filter(id => id !== article.id);

          if (uniqueRelatedIds.length === 0) {
            setRelatedArticles([]);
            return;
          }

          // 查询相关文章详情
          const { 'data': articles, 'error': articlesError } = await supabase
            .from('articles')
            .select('*')
            .in('id', uniqueRelatedIds);

          if (articlesError) {
            console.error('Error fetching related article details:', articlesError);
            return;
          }

          setRelatedArticles(articles || []);
        }
      } catch (err) {
        console.error('Exception in loadRelated:', err);
      } finally {
        setRelatedArticlesLoading(false);
      }
    };

    loadRelated();
  }, [article]);

  /**
   * 加载相关图谱
   * @async
   */
  useEffect(() => {
    if (!article) {
      return;
    }

    const loadRelatedGraphs = async () => {
      setRelatedGraphsLoading(true);
      try {
        // 获取与文章关联的节点
        const nodes = await graphService.getNodesByArticleId(article.id);

        if (nodes.length > 0) {
          // 获取这些节点所在的图谱
          const nodeIds = nodes.map(node => node.id);

          // 查询图谱节点关联
          const { 'data': graphNodes, 'error': graphNodesError } = await supabase
            .from('graph_nodes')
            .select('graph_id')
            .in('id', nodeIds);

          if (!graphNodesError && graphNodes && graphNodes.length > 0) {
            const graphIds = [...new Set(graphNodes.map(gn => gn.graph_id))];

            // 获取图谱详情
            const graphs = await Promise.all(
              graphIds.map(graphId => graphService.getGraphById(graphId))
            );

            setRelatedGraphs(graphs.filter(graph => graph !== null));
          }
        }
      } catch (err) {
        console.error('Exception in loadRelatedGraphs:', err);
      } finally {
        setRelatedGraphsLoading(false);
      }
    };

    loadRelatedGraphs();
  }, [article]);

  return (
    <>
      {/* Related Articles Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-6">Related Articles</h2>
        {(function () {
          if (relatedArticlesLoading) {
            return (
              <div className="flex justify-center items-center py-8 text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-2"></div>
                Loading related articles...
              </div>
            );
          }
          if (relatedArticles.length > 0) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    to={`/articles/${related.slug}`}
                    className="p-5 border border-neutral-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-lg transition-all duration-300 group block bg-white dark:bg-gray-800 overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition flex-1 pr-4 line-clamp-2">
                        {related.title}
                      </h3>
                      <ExternalLink className="w-4 h-4 text-neutral-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-gray-400 mt-2 line-clamp-3">
                      {related.content.substring(0, 120)}...
                    </p>
                    <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-xs text-neutral-500 dark:text-gray-500">
                        {new Date(related.updated_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                        {related.view_count || 0} views
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            );
          }
          return (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FileQuestion size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-1">No related articles found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                This article doesn't have any related content yet.
              </p>
            </div>
          );
        }())}
      </div>

      {/* Related Graphs Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-6 flex items-center gap-2">
          <Network className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          Related Knowledge Graphs
        </h2>
        {(function () {
          if (relatedGraphsLoading) {
            return (
              <div className="flex justify-center items-center py-12 text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-2"></div>
                Loading related graphs...
              </div>
            );
          }
          if (relatedGraphs.length > 0) {
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {relatedGraphs.map((graph) => (
                  <div key={graph.id} className="border border-neutral-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 hover:shadow-lg overflow-hidden">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 line-clamp-1">{graph.title}</h3>
                        <Link
                          to={`/graphs/${graph.id}`}
                          className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition transform hover:translate-x-1"
                        >
                      View Full Graph
                          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                        </Link>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {graph.nodes.length} nodes · {graph.links.length} connections
                      </p>
                    </div>
                    <div className="h-64 border-t border-neutral-100 dark:border-gray-700 flex items-center justify-center bg-neutral-50 dark:bg-gray-800/50">
                      <div className="text-center">
                        <Network className="mx-auto h-12 w-12 text-neutral-400 dark:text-gray-500 mb-2" />
                        <p className="text-sm text-neutral-500 dark:text-gray-400">
                          <Link to={`/graph/${graph.id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                            查看知识图谱
                          </Link>
                        </p>
                      </div>
                    </div>
                    <div className="p-5 border-t border-neutral-100 dark:border-gray-700 bg-neutral-50 dark:bg-gray-800/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-gray-500">
                      Updated {new Date(graph.updated_at).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-primary-600 dark:text-primary-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                      Explore connections
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          }
          return (
            <div className="p-8 bg-neutral-50 dark:bg-gray-800/50 rounded-xl border border-neutral-200 dark:border-gray-700 text-center">
              <Network className="w-12 h-12 text-neutral-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2">No related graphs found</h3>
              <p className="text-neutral-500 dark:text-gray-500 text-sm">
                This article doesn't have any related knowledge graphs yet.
              </p>
            </div>
          );
        }())}
      </div>
    </>
  );
}
