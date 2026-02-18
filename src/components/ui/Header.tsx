import { Link } from 'react-router-dom';
import { BookOpen, Network } from 'lucide-react';

export function Header () {
  return (
    <header className="sticky top-0 z-50 bg-neutral-50 border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-neutral-800">
            <span className="font-bold text-xl tracking-tight">IN Gral</span>
          </Link>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => window.open('/graphs/create', '_blank', 'noopener noreferrer')}
                className="font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none text-neutral-600 hover:text-primary-500 hover:bg-primary-50 transition-all duration-200"
              >
                <Network className="w-4 h-4 text-primary-300" />
                <span className="text-sm">图</span>
              </button>
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
