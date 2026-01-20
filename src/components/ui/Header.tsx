import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, BookOpen, Users, Brain } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

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
    <header className="sticky top-0 z-50 text-white" style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--shadow-sm)', borderBottom: '1px solid var(--border-color)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>
            <Brain className="w-6 h-6" style={{ color: 'var(--primary-color)' }} />
            <span className="font-bold text-xl tracking-tight">MyWiki</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 mx-8">
            <div className="w-full max-w-md relative">
              <input
                type="text"
                placeholder="搜索知识..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-4" role="group" aria-label="导航和操作按钮组">
            <nav className="hidden md:flex items-center gap-4" aria-label="主导航" role="menubar">
              <Link
                to="/graphs"
                className="font-medium transition flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="知识图"
                role="menuitem"
                tabIndex={0}
              >
                <Brain className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">Knowledge Graph</span>
              </Link>
              <Link
                to="/articles"
                className="font-medium transition flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="文章"
                role="menuitem"
                tabIndex={0}
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">Articles</span>
              </Link>
              <Link
                to="/discussions"
                className="font-medium transition flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="讨论"
                role="menuitem"
                tabIndex={0}
              >
                <Users className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">Discussions</span>
              </Link>
            </nav>

            {/* Theme Toggle */}
            <div className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-1 rounded-full">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
