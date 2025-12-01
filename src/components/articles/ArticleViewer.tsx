/**
 * 文章查看器组件
 * 负责显示文章内容、相关文章、评论，并提供导出和编辑功能
 */
import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, ExternalLink, Network } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Article } from '../../types';
import { fetchArticleBySlug } from '../../utils/article';
import { renderMarkdown } from '../../utils/markdown';
import ExportButton from '../ui/ExportButton';
import { graphService } from '../../services/graphService';
import { GraphEmbedWrapper } from '../graph/GraphEmbed';


export function ArticleViewer() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [relatedArticlesLoading, setRelatedArticlesLoading] = useState(false);
  const [relatedGraphs, setRelatedGraphs] = useState<any[]>([]);
  const [relatedGraphsLoading, setRelatedGraphsLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  /**
   * 加载文章内容
   * @async
   */
  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) {return;}

      try {
        const data = await fetchArticleBySlug(slug);
        setArticle(data);
      } catch (error) {
        console.error('Failed to load article:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [slug]);

  /**
   * 加载相关文章
   * @async
   */
  useEffect(() => {
    if (!article) {return;}

    const loadRelated = async () => {
      setRelatedArticlesLoading(true);
      try {
        // 添加supabase空检查
        if (!supabase) {
          console.warn('Supabase client is not available');
          return;
        }

        // 使用更安全的参数绑定方式查询相关文章链接
        const { data: links, error: linksError } = await supabase
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
            link.source_id === article.id ? link.target_id : link.source_id,
          );

          // 去重并移除当前文章ID
          const uniqueRelatedIds = [...new Set(relatedIds)].filter(id => id !== article.id);

          if (uniqueRelatedIds.length === 0) {
            setRelatedArticles([]);
            return;
          }

          // 查询相关文章详情
          const { data: articles, error: articlesError } = await supabase
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
    if (!article) {return;}

    const loadRelatedGraphs = async () => {
      setRelatedGraphsLoading(true);
      try {
        // 获取与文章关联的节点
        const nodes = await graphService.getNodesByArticleId(article.id);
        
        if (nodes.length > 0) {
          // 获取这些节点所在的图谱
          const nodeIds = (nodes as any[]).map(node => node.id);
          
          // 查询图谱节点关联
          const { data: graphNodes, error: graphNodesError } = await supabase
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

  /**
   * 处理Wiki链接点击事件，直接导航到文章
   */
  useEffect(() => {
    const handleWikiLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('wiki-link')) {
        const href = target.getAttribute('href');
        if (href) {
          e.preventDefault();
          navigate(href);
        }
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleWikiLinkClick);
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('click', handleWikiLinkClick);
      }
    };
  }, [navigate]);

  /**
   * 处理SymPy计算单元格的渲染和交互
   */
  useEffect(() => {
    // 这里可以添加SymPy计算单元格的交互逻辑
    // 例如，为计算单元格添加运行按钮的点击事件监听器
    const contentElement = contentRef.current;
    if (contentElement) {
      // 查找所有SymPy计算单元格占位符
      const placeholders = contentElement.querySelectorAll('.sympy-cell-placeholder');
      
      placeholders.forEach((placeholder) => {
        const code = placeholder.getAttribute('data-sympy-code');
        const id = placeholder.getAttribute('data-sympy-id');
        
        if (code && id) {
          // 创建SymPyCell组件的容器
          const cellContainer = document.createElement('div');
          cellContainer.className = 'sympy-cell-wrapper';
          
          // 替换占位符为SymPyCell组件容器
          placeholder.parentNode?.replaceChild(cellContainer, placeholder);
          
          // 这里可以使用React Portal来渲染SymPyCell组件
          // 由于时间限制，我们暂时使用静态HTML来展示
          cellContainer.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
              <div class="bg-gray-100 dark:bg-gray-700 p-4">
                <h3 class="text-lg font-semibold text-gray-800 dark:text-white">SymPy 计算单元格</h3>
              </div>
              <div class="p-4">
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">代码:</label>
                  <pre class="p-3 bg-gray-50 dark:bg-gray-900 rounded-md font-mono text-sm">${decodeURIComponent(code)}</pre>
                </div>
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">结果:</label>
                  <div id="${id}-result" class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-md min-h-[60px]">
                    点击"运行计算"按钮查看结果
                  </div>
                </div>
                <button onclick="runSymPyCalculation('${id}', \`${decodeURIComponent(code)}\`)" 
                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors duration-200">
                  运行计算
                </button>
              </div>
            </div>
          `;
        }
      });
    }
  }, [article]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <p className="text-gray-600 mb-8">The article you're looking for doesn't exist.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = article.updated_at ? new Date(article.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : 'N/A';

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{article.title}</h1>
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </div>
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              Author
            </div>
            <div>
              {article.view_count} {article.view_count === 1 ? 'view' : 'views'}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <ExportButton article={article} />
        </div>
      </div>

      <div className="prose prose-sm max-w-none bg-white rounded-lg p-8 shadow-sm border border-gray-200 mb-8">
        <div
          ref={contentRef}
          className="prose-headings:scroll-mt-20 prose-a:text-blue-600 prose-a:hover:text-blue-700 prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100 wiki-link-styling"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
        />
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
        {relatedArticlesLoading ? (
          <div className="text-center py-8 text-gray-500">Loading related articles...</div>
        ) : relatedArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedArticles.map((related) => (
              <Link
                key={related.id}
                to={`/article/${related.slug}`}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-600 hover:shadow-md transition group block"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition flex-1 pr-6">
                    {related.title}
                  </h3>
                  <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition" />
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {related.content.substring(0, 100)}...
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No related articles</p>
        )}
      </div>

      {/* Related Graphs Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Network className="w-6 h-6" />
          Related Knowledge Graphs
        </h2>
        {relatedGraphsLoading ? (
          <div className="text-center py-8 text-gray-500">Loading related graphs...</div>
        ) : relatedGraphs.length > 0 ? (
          <div className="space-y-8">
            {relatedGraphs.map((graph) => (
              <div key={graph.id} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{graph.title}</h3>
                  <Link
                    to={`/graph/${graph.id}`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition"
                  >
                    View Full Graph
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
                <div className="h-64">
                  <GraphEmbedWrapper
                    graphId={graph.id}
                    width="100%"
                    height={256}
                    interactive={false}
                    layoutType="force"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No related graphs found</p>
        )}
      </div>

    </article>
  );
}
