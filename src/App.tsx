import React, { Suspense, lazy, useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Loader } from './components/ui/Loader';
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

// 使用React.lazy实现路由级别的代码分割，并优化导入路径
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ 'default': m.HomePage })));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage').then(m => ({ 'default': m.ArticlesPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ 'default': m.SearchPage })));
const ArticleViewer = lazy(() => import('./components/articles/ArticleViewer').then(m => ({ 'default': m.ArticleViewer })));
const ArticleEditor = lazy(() => import('./components/articles/ArticleEditor').then(m => ({ 'default': m.ArticleEditor })));
const GraphVisualization = lazy(() => import('./components/graph/GraphVisualization').then(m => ({ 'default': m.GraphVisualization })));
const GraphListPage = lazy(() => import('./pages/GraphListPage').then(m => ({ 'default': m.GraphListPage })));
const DiscussionPage = lazy(() => import('./pages/DiscussionPage').then(m => ({ 'default': m.DiscussionPage })));
const TopicDetailPage = lazy(() => import('./pages/TopicDetailPage').then(m => ({ 'default': m.TopicDetailPage })));
const CreateTopicPage = lazy(() => import('./pages/CreateTopicPage').then(m => ({ 'default': m.CreateTopicPage })));

function App () {
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

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
          <Header />

          {/* 主内容区域 - 移除侧边栏后，主内容区域占满整个宽度 */}
          <main
            className="flex-1 transition-all duration-300 ease-in-out p-4 sm:p-6 lg:p-8"
          >
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader size="large" text="加载中..." />
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/articles" element={<ArticlesPage />} />
                  <Route path="/articles/:slug" element={<ArticleViewer />} />
                  <Route path="/articles/create" element={<ArticleEditor />} />
                  <Route path="/articles/:slug/edit" element={<ArticleEditor />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/graphs" element={<GraphListPage />} />
                  <Route path="/graphs/create" element={<GraphVisualization />} />
                  <Route path="/graphs/:graphId" element={<GraphVisualization />} />
                  {/* 讨论区路由 */}
                  <Route path="/discussions" element={<DiscussionPage />} />
                  <Route path="/discussions/:categorySlug" element={<DiscussionPage />} />
                  <Route path="/discussions/:topicId" element={<TopicDetailPage />} />
                  <Route path="/discussions/create" element={<CreateTopicPage />} />
                  {/* 404页面重定向到首页 */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
