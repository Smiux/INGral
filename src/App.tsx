import React, { ReactNode, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Header } from './components/ui/Header';
import { HomePage } from './pages/HomePage';
import { ArticlesPage } from './pages/ArticlesPage';
import { GallerysPage } from './pages/GallerysPage';
import { GallerysEditPage } from './pages/GallerysEditPage';
import SubjectVisualization from './components/graph/SubjectVisualization';
import { ArticleViewer, ArticleEditor } from './components/articles';
import GraphVisualization from './components/graph/GraphVisualization';
import { CollaborationProvider, useCollaboration, Features } from './components/collaboration';
import { getArticleBySlug } from './services/articleService';
import { getGalleryById } from './services/galleryService';

interface MetaTags {
  title: string;
  description: string;
  image?: string;
  type?: string;
}

const DEFAULT_META: MetaTags = {
  'title': 'IN Gral',
  'description': 'IN Gral - 记录一切',
  'type': 'website'
};

function updateMetaTags (meta: MetaTags): void {
  const fullTitle = meta.title === 'IN Gral' ? meta.title : `${meta.title} - IN Gral`;

  document.title = fullTitle;

  const setMetaTag = (selector: string, content: string, attr: 'content' | 'property' | 'name' = 'content'): void => {
    const element = document.querySelector(selector) as HTMLMetaElement | null;
    if (element) {
      element.setAttribute(attr, content);
    }
  };

  setMetaTag('meta[name="description"]', meta.description);
  setMetaTag('meta[property="og:title"]', fullTitle);
  setMetaTag('meta[property="og:description"]', meta.description);
  setMetaTag('meta[name="twitter:title"]', fullTitle);
  setMetaTag('meta[name="twitter:description"]', meta.description);

  if (meta.type) {
    setMetaTag('meta[property="og:type"]', meta.type);
  }

  if (meta.image) {
    setMetaTag('meta[property="og:image"]', meta.image);
    setMetaTag('meta[name="twitter:image"]', meta.image);
  } else {
    const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
    const twitterImage = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement | null;
    ogImage?.remove();
    twitterImage?.remove();
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  'hasError': boolean;
  'error'?: Error;
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 bg-neutral-50 dark:bg-neutral-800">
          <h2 className="text-2xl font-bold text-red-600 mb-4">加载失败</h2>
          <p className="text-neutral-700 dark:text-neutral-300 mb-6">很抱歉，页面加载时出现了错误。</p>
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

function useMetaTags (): void {
  const location = useLocation();
  const params = useParams<{ slug?: string; galleryId?: string; graphId?: string; subject?: string }>();

  const updateMetaForRoute = useCallback(async () => {
    const path = location.pathname;

    if (path === '/') {
      updateMetaTags(DEFAULT_META);
      return;
    }

    if (path === '/articles') {
      updateMetaTags({
        'title': '文章列表',
        'description': '浏览所有文章，发现精彩内容',
        'type': 'website'
      });
      return;
    }

    if (path === '/gallerys') {
      updateMetaTags({
        'title': '文章集列表',
        'description': '浏览所有文章合集，探索主题内容',
        'type': 'website'
      });
      return;
    }

    const articleMatch = path.match(/^\/articles\/([^/]+)$/);
    if (articleMatch && params.slug) {
      const article = await getArticleBySlug(params.slug);
      if (article) {
        const metaTags: MetaTags = {
          'title': article.title,
          'description': article.summary || `阅读文章：${article.title}`,
          'type': 'article'
        };
        if (article.cover_image) {
          metaTags.image = article.cover_image;
        }
        updateMetaTags(metaTags);
      } else {
        updateMetaTags({
          'title': '文章未找到',
          'description': '您访问的文章不存在',
          'type': 'website'
        });
      }
      return;
    }

    if (path.startsWith('/articles/')) {
      updateMetaTags({
        'title': path.includes('/edit') ? '编辑文章' : '创建文章',
        'description': '文章编辑器',
        'type': 'website'
      });
      return;
    }

    const galleryMatch = path.match(/^\/gallerys\/([^/]+)$/);
    if (galleryMatch && params.galleryId && params.galleryId !== 'create') {
      const gallery = await getGalleryById(params.galleryId);
      if (gallery) {
        updateMetaTags({
          'title': gallery.title,
          'description': gallery.description || `浏览合集：${gallery.title}`,
          'type': 'website'
        });
      } else {
        updateMetaTags({
          'title': '文章集未找到',
          'description': '您访问的文章集不存在',
          'type': 'website'
        });
      }
      return;
    }

    if (path.startsWith('/gallerys/')) {
      updateMetaTags({
        'title': '创建文章集',
        'description': '创建新的文章集',
        'type': 'website'
      });
      return;
    }

    if (path.startsWith('/graphs/subject-visualization')) {
      const subject = params.subject || '';
      updateMetaTags({
        'title': subject ? `分类可视化 - ${subject}` : '分类可视化',
        'description': '探索分类，发现分类关联',
        'type': 'website'
      });
      return;
    }

    if (path.startsWith('/graphs/')) {
      updateMetaTags({
        'title': path.includes('/create') ? '创建图' : '图',
        'description': '图可视化工具',
        'type': 'website'
      });
      return;
    }

    updateMetaTags(DEFAULT_META);
  }, [location.pathname, params.slug, params.galleryId, params.subject]);

  useEffect(() => {
    updateMetaForRoute();
  }, [updateMetaForRoute]);
}

function AppContent () {
  const location = useLocation();
  const { pathname } = location;
  const collaboration = useCollaboration();

  useMetaTags();

  const showHeader = pathname === '/' ||
    pathname === '/articles' ||
    pathname === '/gallerys';

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {showHeader && <Header />}

      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${!showHeader ? '' : 'p-4 sm:p-6 lg:p-8'}`}
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/:slug" element={<ArticleViewer />} />
            <Route
              path="/articles/create"
              element={
                <ArticleEditor />
              }
            />
            <Route
              path="/articles/:slug/edit"
              element={
                <ArticleEditor />
              }
            />
            <Route path="/gallerys" element={<GallerysPage />} />
            <Route path="/gallerys/create" element={<GallerysEditPage />} />
            <Route path="/gallerys/:galleryId" element={<GallerysEditPage />} />
            <Route path="/graphs/create" element={<GraphVisualization />} />
            <Route path="/graphs/subject-visualization" element={<SubjectVisualization />} />
            <Route path="/graphs/subject-visualization/:subject" element={<SubjectVisualization />} />
            <Route path="/graphs/:graphId" element={<GraphVisualization />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {collaboration.isConnected && <Features className="print:hidden" />}
    </div>
  );
}

function App () {
  return (
    <BrowserRouter>
      <CollaborationProvider>
        <AppContent />
      </CollaborationProvider>
    </BrowserRouter>
  );
}

export default App;
