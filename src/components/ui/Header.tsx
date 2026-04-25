import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Network, Calculator, Layers } from 'lucide-react';
import { CollaborationControls } from '../collaboration';

export function Header () {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-neutral-800 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-neutral-800 dark:text-neutral-200">
            <span className="font-bold text-xl tracking-tight">IN Gral</span>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-2">
              <button
                onClick={() => navigate('/graphs/create')}
                className="font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none text-neutral-600 dark:text-neutral-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all duration-200"
              >
                <Network className="w-4 h-4 text-sky-300" />
                <span className="text-sm">图</span>
              </button>
              <Link
                to="/graphs/subject-visualization"
                className="font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none text-neutral-600 dark:text-neutral-300 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
              >
                <Calculator className="w-4 h-4 text-purple-300" />
                <span className="text-sm">分类</span>
              </Link>
              <Link
                to="/gallerys"
                className="font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none text-neutral-600 dark:text-neutral-300 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200"
              >
                <Layers className="w-4 h-4 text-orange-300" />
                <span className="text-sm">文章集</span>
              </Link>
              <Link
                to="/articles"
                className="font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none text-neutral-600 dark:text-neutral-300 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
              >
                <BookOpen className="w-4 h-4 text-green-300" />
                <span className="text-sm">文章</span>
              </Link>

            </nav>

            <CollaborationControls />
          </div>
        </div>
      </div>
    </header>
  );
}
