import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Loader } from './components/Loader';
import { useGlobalKeyboardShortcuts } from './components/keyboard/KeyboardShortcuts';
import './styles/accessibility.css';
import { screenReaderAnnouncer } from './utils/accessibility';

// 使用React.lazy实现路由级别的代码分割
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage').then(m => ({ default: m.ArticlesPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const ArticleViewer = lazy(() => import('./components/ArticleViewer').then(m => ({ default: m.ArticleViewer })));
const ArticleEditor = lazy(() => import('./components/ArticleEditor').then(m => ({ default: m.ArticleEditor })));
const GraphVisualization = lazy(() => import('./components/lazy/LazyGraphVisualization').then(m => ({ default: m.LazyGraphVisualization })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const DatabasePage = lazy(() => import('./pages/DatabasePage').then(m => ({ default: m.DatabasePage })));
const NotificationPage = lazy(() => import('./pages/NotificationPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));

function App() {
  // 初始化全局键盘快捷键
  try {
    // 注意：useGlobalKeyboardShortcuts本身就是一个自定义hook，需要在组件顶层调用
    useGlobalKeyboardShortcuts();
  } catch (error) {
    console.error('Failed to initialize keyboard shortcuts:', error);
  }
  
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
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1">
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
              <Route path="/search" element={<SearchPage />} />
              <Route path="/article/:slug" element={<ArticleViewer />} />
              <Route path="/create" element={<ArticleEditor />} />
              <Route path="/edit/:slug" element={<ArticleEditor />} />
              <Route path="/graph" element={<GraphVisualization />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/database" element={<DatabasePage />} />
              <Route path="/notifications" element={<NotificationPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* 404页面重定向到首页 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;