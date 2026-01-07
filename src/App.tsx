import React, { useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { useGlobalKeyboardShortcuts } from './components/keyboard/keyboardUtils';
import './styles/accessibility.css';
import { screenReaderAnnouncer } from './utils/accessibility';
import { ThemeProvider } from './context';

// 定义错误边界组件
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
    // 更新状态，下次渲染时显示降级UI
    return { 'hasError': true, error };
  }

  override render () {
    if (this.state.hasError) {
      // 你可以自定义降级UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 bg-gray-50 dark:bg-gray-900">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">加载失败</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">很抱歉，页面加载时出现了错误。</p>
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

// 直接导入所有组件
import { HomePage } from './pages/HomePage';
import { ArticlesPage } from './pages/ArticlesPage';
import { SearchPage } from './pages/SearchPage';
import { ArticleViewer } from './components/articles/ArticleViewer';
import { NewArticleEditor } from './components/articles/NewArticleEditor';
import GraphVisualization from './components/graph/GraphVisualization/GraphVisualization';
import { GraphListPage } from './pages/GraphListPage';
import { DiscussionPage } from './pages/DiscussionPage';
import { TopicDetailPage } from './pages/TopicDetailPage';
import { CreateTopicPage } from './pages/CreateTopicPage';

// 应用主内容组件 - 使用 useLocation 需要在 BrowserRouter 内部
function AppContent () {
  const location = useLocation();

  // 初始化全局键盘快捷键
  useGlobalKeyboardShortcuts();

  // 初始化屏幕阅读器通知管理器
  useEffect(() => {
    try {
      if (typeof screenReaderAnnouncer?.initialize === 'function') {
        screenReaderAnnouncer.initialize();

        // 应用启动时的屏幕阅读器通知
        if (typeof screenReaderAnnouncer?.announce === 'function') {
          screenReaderAnnouncer.announce('欢迎使用知识图谱应用。按Alt+K查看键盘快捷键。', true);
        }
      }
    } catch (error) {
      console.error('Failed to initialize screen reader announcer:', error);
    }
  }, []);

  // 判断是否为编辑页面路由
  const isEditPage = () => {
    const { pathname } = location;
    return pathname.startsWith('/articles/create') ||
           pathname.startsWith('/articles/') && pathname.endsWith('/edit') ||
           pathname.startsWith('/graphs/create') ||
           (/^\/graphs\/[a-zA-Z0-9-]+$/).test(pathname);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 只在非编辑页面显示Header */}
      {!isEditPage() && <Header />}

      {/* 主内容区域 */}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${isEditPage() ? '' : 'p-4 sm:p-6 lg:p-8'}`}
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/:slug" element={<ArticleViewer />} />
            <Route path="/articles/create" element={<NewArticleEditor />} />
            <Route path="/articles/:slug/edit" element={<NewArticleEditor />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/graphs" element={<GraphListPage />} />
            <Route path="/graphs/create" element={<GraphVisualization />} />
            <Route path="/graphs/:graphId" element={<GraphVisualization />} />
            {/* 讨论区路由 */}
            <Route path="/discussions" element={<DiscussionPage />} />
            <Route path="/discussions/:categorySlug" element={<DiscussionPage />} />
            <Route path="/discussions/:categorySlug/:topicId" element={<TopicDetailPage topicId={parseInt(useParams().topicId as string, 10)} />} />
            <Route path="/discussions/create" element={<CreateTopicPage />} />
            {/* 404页面重定向到首页 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

function App () {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
