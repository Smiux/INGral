import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Article } from '@/types';
import { searchArticles } from '@/utils/article';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const performSearch = async () => {
      if (query.trim()) {
        const data = await searchArticles(query);
        setResults(data);
      }
      setIsLoading(false);
    };

    performSearch();
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mb-8 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Results</h1>
      <p className="text-gray-600 mb-8">
        {query && <>Results for "{query}"</>}
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          {results.map((article) => (
            <Link
              key={article.id}
              to={`/article/${article.slug}`}
              className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition group"
            >
              <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition mb-2">
                {article.title}
              </h2>
              <p className="text-gray-600 mb-4 line-clamp-2">
                {article.content.substring(0, 150)}...
              </p>
              <div className="flex gap-4 text-sm text-gray-500">
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
          <p className="text-gray-600">
            {query ? 'No articles found. Try a different search.' : 'Enter a search query.'}
          </p>
        </div>
      )}
    </div>
  );
}
