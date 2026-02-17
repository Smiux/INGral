import React, { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Header } from './components/ui/Header';
import { HomePage } from './pages/HomePage';
import { ArticlesPage } from './pages/ArticlesPage';
import { ArticleViewer } from './components/articles/ArticleViewer';
import { ArticleEditor } from './components/articles/ArticleEditor';
import GraphVisualization from './components/graph/GraphVisualization/GraphVisualization';


interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor (props: ErrorBoundaryProps) {
    super(props);
    this.state = { 'hasError': false };
  }

  static getDerivedStateFromError (error: Error) {
    return { 'hasError': true, error };
  }

  override render () {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 bg-gray-50">
          <h2 className="text-2xl font-bold text-red-600 mb-4">加载失败</h2>
          <p className="text-gray-700 mb-6">很抱歉，页面加载时出现了错误。</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent () {
  const location = useLocation();
  const { pathname } = location;

  const isEditPage = pathname.startsWith('/articles/create') ||
                         pathname.startsWith('/articles/') && pathname.endsWith('/edit') ||
                         pathname.startsWith('/graphs/create') ||
                         (/^\/graphs\/[a-zA-Z0-9-]+$/).test(pathname);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {!isEditPage && <Header />}

      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${isEditPage ? '' : 'p-4 sm:p-6 lg:p-8'}`}
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/:slug" element={<ArticleViewer />} />
            <Route path="/articles/create" element={<ArticleEditor />} />
            <Route path="/articles/:slug/edit" element={<ArticleEditor />} />
            <Route path="/graphs/create" element={<GraphVisualization />} />
            <Route path="/graphs/:graphId" element={<GraphVisualization />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

function App () {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
