import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Network } from 'lucide-react';
import { useIsMobile } from '@/hooks';

export function Header () {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-neutral-800 dark:text-neutral-200">
            <span className="font-bold text-xl tracking-tight">IN Gral</span>
          </Link>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2">
              {!isMobile && (
                <button
                  onClick={() => navigate('/graphs/create')}
                  className="font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none text-neutral-600 dark:text-neutral-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all duration-200"
                >
                  <Network className="w-4 h-4 text-sky-300" />
                  <span className="text-sm">图</span>
                </button>
              )}
              <Link
                to="/articles"
                className="font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none text-neutral-600 dark:text-neutral-300 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
              >
                <BookOpen className="w-4 h-4 text-green-300" />
                <span className="text-sm">文章</span>
              </Link>

            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
