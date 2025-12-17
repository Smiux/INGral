import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, BookOpen, Users, Brain } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
// KeyboardShortcuts组件不存在，已移除
// import { KeyboardShortcuts } from './keyboard/KeyboardShortcuts';

export function Header() {
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
    <header className="sticky top-0 z-50 bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Brain className="w-6 h-6 text-yellow-300" />
            <span className="font-bold text-xl tracking-tight">MyMathWiki</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 mx-8">
            <div className="w-full max-w-md relative">
              <input
                type="text"
                placeholder="Search knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg placeholder-white/70 text-white focus:ring-2 focus:ring-white/30 focus:border-white outline-none transition backdrop-blur-sm"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/80 hover:text-white"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-4" role="group" aria-label="导航和操作按钮组">
            <nav className="hidden md:flex items-center gap-4" aria-label="主导航" role="menubar">
            <Link
              to="/graph"
              className="text-white/90 hover:text-white font-medium transition flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/30"
              aria-label="知识图谱"
              role="menuitem"
              tabIndex={0}
            >
              <Brain className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">Knowledge Graph</span>
            </Link>
            <Link
              to="/articles"
              className="text-white/90 hover:text-white font-medium transition flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/30"
              aria-label="文章"
              role="menuitem"
              tabIndex={0}
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">Articles</span>
            </Link>
            <Link
              to="/discussions"
              className="text-white/90 hover:text-white font-medium transition flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/30"
              aria-label="讨论"
              role="menuitem"
              tabIndex={0}
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">Discussions</span>
            </Link>
          </nav>

            {/* Theme Toggle */}
            <div className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/30 p-1 rounded-full">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
