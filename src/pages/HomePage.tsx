import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { getAllArticles, getCoverImageUrl, type Article } from '../services/articleService';

export function HomePage () {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getAllArticles();
        setArticles(data.slice(0, 9));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    const handleScroll = () => {
      if (!container) {
        return;
      }
      const scrollTop = container.scrollTop;
      const pageHeight = container.clientHeight;
      const newPage = Math.round(scrollTop / pageHeight);
      setCurrentPage(newPage);
    };

    container?.addEventListener('scroll', handleScroll, { 'passive': true });
    return () => {
      container?.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToPage = (pageIndex: number) => {
    sectionRefs.current[pageIndex]?.scrollIntoView({ 'behavior': 'smooth' });
  };

  const setSectionRef = (index: number) => (el: HTMLDivElement | null) => {
    sectionRefs.current[index] = el;
  };

  return (
    <div className="relative h-[calc(100vh-64px)] overflow-hidden">
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        <section
          ref={setSectionRef(0)}
          className="h-full flex flex-col items-center justify-center relative snap-start snap-always"
        >
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-800 dark:text-neutral-200 mb-6">
              IN Gral
            </h1>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
              记录一切
            </p>
          </div>
          <button
            onClick={() => scrollToPage(1)}
            className="absolute bottom-12 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            <ChevronDown className="w-8 h-8 animate-bounce" />
          </button>
        </section>

        <section
          ref={setSectionRef(1)}
          className="h-full py-12 snap-start snap-always flex flex-col"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8 flex-shrink-0">
              <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">最近文章</h2>
              <Link
                to="/articles"
                className="text-sky-600 dark:text-sky-400 hover:text-neutral-700 dark:hover:text-neutral-300 font-medium flex items-center gap-1 transition-all duration-200 transform hover:scale-105"
              >
                查看全部 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {isLoading && (
              <div className="flex justify-center py-12 flex-1 items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
              </div>
            )}

            {!isLoading && articles.length === 0 && (
              <div className="text-center py-12 rounded-lg flex-1 flex items-center justify-center">
                <p className="text-neutral-600 dark:text-neutral-400">暂无文章</p>
              </div>
            )}

            {!isLoading && articles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
                {articles.map((article) => {
                  const coverUrl = getCoverImageUrl(article.cover_image_path);
                  return (
                    <Link
                      key={article.id}
                      to={`/articles/${article.slug}`}
                      className="group bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-sky-200 dark:hover:border-sky-700 transition-all duration-300 transform hover:-translate-y-1 flex flex-col overflow-hidden"
                    >
                      <div className="aspect-video bg-neutral-100 dark:bg-neutral-700 relative overflow-hidden">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-4xl font-bold text-neutral-300 dark:text-neutral-600">
                              {article.title.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors mb-2 line-clamp-2">
                          {article.title}
                        </h3>
                        {article.summary && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-3 flex-1">
                            {article.summary}
                          </p>
                        )}
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-auto">
                          {article.created_at ? new Date(article.created_at).toLocaleDateString('zh-CN', {
                            'year': 'numeric',
                            'month': 'long',
                            'day': 'numeric'
                          }) : 'N/A'}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
        {[0, 1].map((index) => (
          <button
            key={index}
            onClick={() => scrollToPage(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentPage === index
                ? 'bg-sky-500 scale-125'
                : 'bg-neutral-300 hover:bg-neutral-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
