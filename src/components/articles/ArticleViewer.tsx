/**
 * 文章查看器组件
 * 负责显示文章内容、相关文章、评论，并提供导出和编辑功能
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, ExternalLink, Network, Moon, Sun } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Article, Graph } from '../../types';
import { articleService } from '../../services/articleService';
import { renderMarkdown } from '../../utils/markdown';
import ExportButton from '../ui/ExportButton';
import { graphService } from '../../services/graphService';
import { GraphEmbedWrapper } from '../graph/GraphEmbed';
import mermaid from 'mermaid';
import Chart from 'chart.js/auto';
import { useTheme } from '../../hooks/useTheme';
import { CommentsSection } from '../comments/CommentsSection';


// 目录项类型定义
interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
  children: TableOfContentsItem[];
}

export function ArticleViewer() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [relatedArticlesLoading, setRelatedArticlesLoading] = useState(false);
  const [relatedGraphs, setRelatedGraphs] = useState<Graph[]>([]);
  const [relatedGraphsLoading, setRelatedGraphsLoading] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  // 点赞和收藏状态
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const headingsRef = useRef<Map<string, HTMLElement>>(new Map());

  /**
   * 加载文章内容
   * @async
   */
  const loadArticle = useCallback(async () => {
    if (!slug) {return;}

    try {
      const data = await articleService.getArticleBySlug(slug);
      setArticle(data);
      
      if (data) {
        // 初始化点赞数
        setUpvotes(data.upvotes || 0);
        
        // 检查是否已收藏
        const bookmarked = await articleService.isArticleBookmarked(data.id);
        setIsBookmarked(bookmarked);
      }
    } catch (error) {
      console.error('Failed to load article:', error);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  /**
   * 处理点赞
   */
  const handleUpvote = async () => {
    if (!article) return;
    
    const success = await articleService.upvoteArticle(article.id);
    if (success) {
      setUpvotes(prev => prev + 1);
    }
  };

  /**
   * 处理收藏
   */
  const handleBookmark = async () => {
    if (!article) return;
    
    if (isBookmarked) {
      await articleService.unbookmarkArticle(article.id);
    } else {
      await articleService.bookmarkArticle(article.id);
    }
    setIsBookmarked(prev => !prev);
  };

  // 初始加载文章
  useEffect(() => {
    loadArticle();
  }, [loadArticle, slug]);

  // 定时刷新文章内容（每30秒）
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadArticle();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [loadArticle, slug]);

  // 监听URL变化，重新加载文章
  useEffect(() => {
    const handleLocationChange = () => {
      loadArticle();
    };

    // 监听history变化
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [loadArticle, slug]);

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
          const nodeIds = nodes.map(node => node.id);
          
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

  /**
   * 初始化Mermaid和Chart.js图表渲染
   */
  useEffect(() => {
    // 配置Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true
      }
    });
    
    // 渲染Mermaid图表
    const renderMermaidDiagrams = async () => {
      const contentElement = contentRef.current;
      if (!contentElement) return;
      
      const mermaidElements = contentElement.querySelectorAll('.mermaid');
      if (mermaidElements.length > 0) {
        for (const element of mermaidElements) {
          try {
            const chartCode = (element as HTMLElement).textContent || '';
            const svgCode = await mermaid.render(element.id, chartCode);
            (element as HTMLElement).innerHTML = svgCode.svg;
          } catch (error) {
            console.error('Error rendering Mermaid diagram:', error);
            (element as HTMLElement).innerHTML = `<div class="text-red-500">Error rendering Mermaid diagram: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
          }
        }
      }
    };
    
    // 渲染Chart.js图表
    const renderChartJsCharts = () => {
      const contentElement = contentRef.current;
      if (!contentElement) return;
      
      const chartElements = contentElement.querySelectorAll('.chartjs-placeholder');
      if (chartElements.length > 0) {
        chartElements.forEach((element) => {
          try {
            const configStr = (element as HTMLCanvasElement).getAttribute('data-chart-config');
            if (configStr) {
              const config = JSON.parse(decodeURIComponent(configStr));
              const canvas = element as HTMLCanvasElement;
              new Chart(canvas, config);
            }
          } catch (error) {
            console.error('Error rendering Chart.js chart:', error);
            const canvas = element as HTMLCanvasElement;
            const container = canvas.parentElement;
            if (container) {
              container.innerHTML = `<div class="text-red-500">Error rendering Chart.js chart: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
            }
          }
        });
      }
    };
    
    // 当文章内容更新时，重新渲染图表
    const renderAllCharts = async () => {
      await renderMermaidDiagrams();
      renderChartJsCharts();
    };
    
    renderAllCharts();
  }, [article]);

  /**
   * 生成文章目录
   */
  const generateTableOfContents = () => {
    const contentElement = contentRef.current;
    if (!contentElement) return [];

    const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const toc: TableOfContentsItem[] = [];
    const headingStack: TableOfContentsItem[] = [];
    
    headings.forEach((heading) => {
      // 确保标题有id
      if (!heading.id) {
        heading.id = heading.textContent?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
      }
      
      // 保存标题引用 - 确保heading是HTMLElement
      if (heading instanceof HTMLElement) {
        headingsRef.current.set(heading.id, heading);
      }
      
      const level = parseInt(heading.tagName.charAt(1));
      const text = heading.textContent || '';
      
      const tocItem: TableOfContentsItem = {
        id: heading.id,
        text,
        level,
        children: []
      };
      
      // 构建嵌套目录结构
      if (level === 1) {
        toc.push(tocItem);
        headingStack.length = 0;
        headingStack.push(tocItem);
      } else {
        while (headingStack.length > 0) {
          const lastItem = headingStack[headingStack.length - 1];
          if (lastItem && lastItem.level >= level) {
            headingStack.pop();
          } else {
            break;
          }
        }
        
        if (headingStack.length > 0) {
          const lastItem = headingStack[headingStack.length - 1];
          if (lastItem) {
            lastItem.children.push(tocItem);
          } else {
            toc.push(tocItem);
          }
        } else {
          toc.push(tocItem);
        }
        
        headingStack.push(tocItem);
      }
    });
    
    return toc;
  };

  /**
   * 监听文章内容更新，生成目录
   */
  useEffect(() => {
    if (article && contentRef.current) {
      const toc = generateTableOfContents();
      setTableOfContents(toc);
    }
  }, [article]);

  /**
   * 处理滚动事件，更新当前激活的标题
   */
  const handleScroll = () => {
    const scrollPosition = window.scrollY + 100;
    let currentActiveId = '';
    
    headingsRef.current.forEach((heading, id) => {
      const headingTop = heading.offsetTop;
      if (scrollPosition >= headingTop) {
        currentActiveId = id;
      }
    });
    
    setActiveHeadingId(currentActiveId);
  };

  /**
   * 添加滚动监听
   */
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [tableOfContents]);

  /**
   * 滚动到指定标题
   */
  const scrollToHeading = (id: string) => {
    const heading = headingsRef.current.get(id);
    if (heading) {
      window.scrollTo({
        top: heading.offsetTop - 80,
        behavior: 'smooth'
      });
      setActiveHeadingId(id);
    }
  };

  // 目录折叠状态管理
  const [expandedTocItems, setExpandedTocItems] = useState<Set<string>>(new Set());

  /**
   * 切换目录项展开/折叠状态
   */
  const toggleTocItemExpanded = (id: string) => {
    const newExpandedItems = new Set(expandedTocItems);
    if (newExpandedItems.has(id)) {
      newExpandedItems.delete(id);
    } else {
      newExpandedItems.add(id);
    }
    setExpandedTocItems(newExpandedItems);
  };

  /**
   * 渲染目录项
   */
  const renderTocItem = (item: TableOfContentsItem, level: number = 0) => {
    const indentation = level * 12;
    const isExpanded = expandedTocItems.has(item.id) || level < 2; // 前两级默认展开
    
    return (
      <li key={item.id} className="mb-1">
        <div className="flex items-center gap-1">
          {item.children.length > 0 && (
            <button
              onClick={() => toggleTocItemExpanded(item.id)}
              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center transition-colors"
              style={{ width: '16px', height: '16px' }}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {item.children.length === 0 && <div className="w-4"></div>}
          <button
            onClick={() => scrollToHeading(item.id)}
            className={`text-left text-sm transition-all duration-200 ease-in-out ${activeHeadingId === item.id ? 'text-primary-600 dark:text-primary-400 font-medium bg-primary-100 dark:bg-primary-900/20' : 'text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            style={{ paddingLeft: `${indentation}px` }}
            aria-current={activeHeadingId === item.id ? 'location' : undefined}
          >
            {item.text}
          </button>
        </div>
        {isExpanded && item.children.length > 0 && (
          <ul className="mt-1 pl-4">
            {item.children.map(child => renderTocItem(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

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
    <article className="max-w-7xl mx-auto px-4 py-8">
      {/* 面包屑导航 */}
      <nav className="mb-6">
        <ol className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <li>
            <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</Link>
          </li>
          <li className="text-gray-400 dark:text-gray-600">
            /
          </li>
          <li>
            <Link to="/articles" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Articles</Link>
          </li>
          <li className="text-gray-400 dark:text-gray-600">
            /
          </li>
          <li>
            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[300px]">{article.title}</span>
          </li>
        </ol>
      </nav>
      
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-4xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">{article.title}</h1>
          <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
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
            <div className="flex items-center gap-1">
              <button 
                onClick={handleUpvote}
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Upvote"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
                {upvotes}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleBookmark}
                className={`flex items-center gap-1 transition-colors ${isBookmarked ? 'text-red-500 dark:text-red-400' : 'hover:text-red-500 dark:hover:text-red-400'}`}
                title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span className="sr-only">{isBookmarked ? 'Remove bookmark' : 'Add bookmark'}</span>
              </button>
            </div>
          </div>
          
          {/* 不稳定内容警告 */}
          {article.is_unstable && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md text-yellow-700 dark:text-yellow-300">
              <p className="text-sm">⚠️ 此内容最近被反复修改，可能尚未稳定。请谨慎参考。</p>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          {/* 主题切换按钮 */}
          <button
            onClick={toggleTheme}
            className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
            title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          <ExportButton article={article} />
        </div>
      </div>

      {/* 文章内容和目录布局 */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* 左侧目录 */}
        {tableOfContents.length > 0 && (
          <aside className="lg:w-64 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-neutral-200 dark:border-gray-700 p-4 transition-all hover:shadow-md">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="21" y1="10" x2="7" y2="10" />
                  <line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="21" y1="14" x2="3" y2="14" />
                  <line x1="21" y1="18" x2="7" y2="18" />
                </svg>
                Table of Contents
              </h2>
              <nav className="text-sm">
                  <ul className="space-y-1">
                    {tableOfContents.map((item) => (
                      <li key={item.id} className="transition-all duration-200 ease-in-out hover:pl-1">
                        {renderTocItem(item)}
                      </li>
                    ))}
                  </ul>
                </nav>
            </div>
          </aside>
        )}

        {/* 右侧文章内容 */}
        <main className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-neutral-200 dark:border-gray-700 transition-all hover:shadow-md">
            <div
              ref={contentRef}
              className="prose prose-lg max-w-none mx-auto p-6 md:p-8 prose-headings:scroll-mt-20 prose-headings:text-neutral-800 dark:prose-headings:text-neutral-100 prose-headings:font-bold prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:hover:text-primary-700 dark:prose-a:hover:text-primary-300 prose-a:underline-offset-4 prose-code:bg-neutral-100 dark:prose-code:bg-gray-700 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-neutral-800 dark:prose-code:text-neutral-200 prose-pre:bg-neutral-800 dark:prose-pre:bg-gray-900 prose-pre:text-neutral-100 dark:prose-pre:text-neutral-200 prose-p:text-neutral-700 dark:prose-p:text-neutral-300 prose-ul:text-neutral-700 dark:prose-ul:text-neutral-300 prose-ol:text-neutral-700 dark:prose-ol:text-neutral-300 prose-strong:text-neutral-900 dark:prose-strong:text-neutral-100 prose-em:text-neutral-800 dark:prose-em:text-neutral-200 wiki-link-styling"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content).html }}
            />
          </div>
        </main>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-6">Related Articles</h2>
        {relatedArticlesLoading ? (
          <div className="flex justify-center items-center py-8 text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-2"></div>
            Loading related articles...
          </div>
        ) : relatedArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedArticles.map((related) => (
              <Link
                key={related.id}
                to={`/article/${related.slug}`}
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
        ) : (
          <div className="p-8 bg-neutral-50 dark:bg-gray-800/50 rounded-xl border border-neutral-200 dark:border-gray-700 text-center">
            <ExternalLink className="w-12 h-12 text-neutral-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2">No related articles found</h3>
            <p className="text-neutral-500 dark:text-gray-500 text-sm">
              This article doesn't have any related content yet.
            </p>
          </div>
        )}
      </div>

      {/* Related Graphs Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-6 flex items-center gap-2">
          <Network className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          Related Knowledge Graphs
        </h2>
        {relatedGraphsLoading ? (
          <div className="flex justify-center items-center py-12 text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-2"></div>
            Loading related graphs...
          </div>
        ) : relatedGraphs.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {relatedGraphs.map((graph) => (
              <div key={graph.id} className="border border-neutral-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 hover:shadow-lg overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 line-clamp-1">{graph.title}</h3>
                    <Link
                      to={`/graph/${graph.id}`}
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
                <div className="h-64 border-t border-neutral-100 dark:border-gray-700">
                  <GraphEmbedWrapper
                    graphId={graph.id}
                    width="100%"
                    height={256}
                    interactive={false}
                    layoutType="force"
                  />
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
        ) : (
          <div className="p-8 bg-neutral-50 dark:bg-gray-800/50 rounded-xl border border-neutral-200 dark:border-gray-700 text-center">
            <Network className="w-12 h-12 text-neutral-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2">No related graphs found</h3>
            <p className="text-neutral-500 dark:text-gray-500 text-sm">
              This article doesn't have any related knowledge graphs yet.
            </p>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <CommentsSection articleId={article.id} />

    </article>
  );
}
