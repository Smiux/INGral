import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, BookOpen, Network } from 'lucide-react';

export function Header () {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-neutral-50 border-b border-neutral-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-neutral-800">
            <span className="font-bold text-xl tracking-tight">MyWiki</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 mx-8">
            <div className="w-full max-w-md relative">
              <input
                type="text"
                placeholder="搜索知识..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg outline-none transition-all duration-200 bg-neutral-100 text-neutral-800 focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-primary-400 transition-colors duration-200"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-2">
              <Link
                to="/graphs"
                className="font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none text-neutral-600 hover:text-primary-500 hover:bg-primary-50 transition-all duration-200"
              >
                <Network className="w-4 h-4 text-primary-300" />
                <span className="text-sm">图</span>
              </Link>
              <Link
                to="/articles"
                className="font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none text-neutral-600 hover:text-secondary-500 hover:bg-secondary-50 transition-all duration-200"
              >
                <BookOpen className="w-4 h-4 text-secondary-300" />
                <span className="text-sm">文章</span>
              </Link>

            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
