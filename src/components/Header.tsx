import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, BookOpen, LogOut, LogIn, Users, Share2, Brain, Plus, User, Database } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './notifications/NotificationBell';
import { KeyboardShortcuts } from './keyboard/KeyboardShortcuts';

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

          <nav className="hidden md:flex items-center gap-6" aria-label="主导航">
            <Link
              to="/graph"
              className="text-white/90 hover:text-white font-medium transition flex items-center gap-1.5"
              aria-label="知识图谱"
            >
              <Brain className="w-4 h-4" aria-hidden="true" />
              Knowledge Graph
            </Link>
            <Link
              to="/articles"
              className="text-white/90 hover:text-white font-medium transition flex items-center gap-1.5"
              aria-label="文章"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              Articles
            </Link>
            <Link
              to="/community"
              className="text-white/90 hover:text-white font-medium transition flex items-center gap-1.5"
              aria-label="社区"
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              Community
            </Link>
            {user ? (
              <>
                <Link
                  to="/create"
                  className="bg-white text-indigo-600 hover:bg-white/90 px-4 py-1.5 rounded-lg transition font-medium flex items-center gap-1"
                  aria-label="创建新内容"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Create
                </Link>
                
                {/* 通知、快捷键帮助和用户菜单 */}
                <div className="flex items-center gap-2">
                  <NotificationBell 
                    userId={user.id} 
                    className="flex items-center justify-center p-2 rounded-full text-white hover:bg-white/10 transition-colors"
                  />
                  <KeyboardShortcuts />
                  <div className="relative">
                    <button 
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 text-white hover:bg-white/10 px-2 py-1 rounded-lg transition"
                      aria-expanded={userMenuOpen}
                      aria-haspopup="true"
                      aria-label="用户菜单"
                    >
                      <User className="w-5 h-5" aria-hidden="true" />
                      <span className="hidden sm:inline">My Profile</span>
                    </button>
                  
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-lg py-2 z-10">
                        <Link 
                          to={`/profile/${user?.id}`} 
                          className="block px-4 py-2 hover:bg-gray-100 transition"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="inline-block w-4 h-4 mr-2" />
                          Profile
                        </Link>
                        <Link 
                          to="/contributions" 
                          className="block px-4 py-2 hover:bg-gray-100 transition"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Share2 className="inline-block w-4 h-4 mr-2" />
                          My Contributions
                        </Link>
                        <button 
                          onClick={() => { 
                            signOut();
                            setUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 transition"
                        >
                          <LogOut className="inline-block w-4 h-4 mr-2" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <KeyboardShortcuts />
                <Link
                  to="/auth"
                  className="bg-white text-indigo-600 hover:bg-white/90 px-4 py-1.5 rounded-lg transition font-medium flex items-center gap-1"
                  aria-label="登录"
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  Sign In
                </Link>
              </div>
            )}
          </nav>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white hover:text-white/80 p-2"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
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
            <Link to="/community" className="block text-white/90 hover:text-white font-medium py-1 px-2 rounded" aria-label="社区">
              <Users className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
              Community
            </Link>
            {user ? (
              <>
                <Link to="/create" className="block bg-white text-indigo-600 hover:bg-white/90 text-center py-2 rounded-lg font-medium" aria-label="创建新内容">
                  <Plus className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
                  Create New
                </Link>
                <Link to={`/profile/${user?.id}`} className="block text-white/90 hover:text-white font-medium py-1 px-2 rounded" aria-label="我的个人资料">
                  <User className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
                  My Profile
                </Link>
                <button
                  onClick={signOut}
                  className="w-full text-left text-red-300 hover:text-red-100 font-medium py-1 px-2 rounded"
                  aria-label="退出登录"
                >
                  <LogOut className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="block bg-white text-indigo-600 hover:bg-white/90 text-center py-2 rounded-lg font-medium"
                aria-label="登录"
              >
                <LogIn className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
