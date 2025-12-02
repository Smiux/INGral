import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, BookOpen, Users, Brain, Plus, Database } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
// KeyboardShortcuts组件不存在，已移除
// import { KeyboardShortcuts } from './keyboard/KeyboardShortcuts';

export function Header() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-md">
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

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6" aria-label="主导航">
            <Link
              to="/graph"
              className="text-white/90 hover:text-white font-medium transition flex items-center gap-1.5"
              aria-label="知识图谱"
            >
              <Brain className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">Knowledge Graph</span>
            </Link>
            <Link
              to="/articles"
              className="text-white/90 hover:text-white font-medium transition flex items-center gap-1.5"
              aria-label="文章"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">Articles</span>
            </Link>
            <Link
              to="/discussions"
              className="text-white/90 hover:text-white font-medium transition flex items-center gap-1.5"
              aria-label="讨论"
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">Discussions</span>
            </Link>
            <Link
              to="/create"
              className="bg-white text-indigo-600 hover:bg-white/90 px-4 py-1.5 rounded-lg transition font-medium flex items-center gap-1"
              aria-label="创建新内容"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">Create</span>
            </Link>
          </nav>

            {/* Theme Toggle */}
            <ThemeToggle />

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white hover:text-white/80 p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-3 border-t border-white/20 pt-4 bg-indigo-700/95 backdrop-blur-sm">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg placeholder-white/70 text-white focus:ring-2 focus:ring-white/30 focus:border-white outline-none"
              />
            </form>
            <Link to="/graph" className="block text-white/90 hover:text-white font-medium py-1 px-2 rounded" aria-label="知识图谱">
              <Brain className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
              Knowledge Graph
            </Link>
            <Link to="/articles" className="block text-white/90 hover:text-white font-medium py-1 px-2 rounded" aria-label="文章">
              <BookOpen className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
              Articles
            </Link>
            <Link to="/database" className="block text-white/90 hover:text-white font-medium py-1 px-2 rounded" aria-label="数据库监控">
              <Database className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
              Database Monitor
            </Link>
            <Link to="/discussions" className="block text-white/90 hover:text-white font-medium py-1 px-2 rounded" aria-label="讨论">
              <Users className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
              Discussions
            </Link>
            <Link to="/create" className="block bg-white text-indigo-600 hover:bg-white/90 text-center py-2 rounded-lg font-medium" aria-label="创建新内容">
              <Plus className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
              Create New
            </Link>
            <div className="flex justify-center pt-2">
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
