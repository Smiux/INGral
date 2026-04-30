import React, { ReactNode, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AliveScope, KeepAlive } from 'react-activation';
import { NavigatorProvider, NavigatorTrigger, NavigatorSidebar, NavigatorCacheManager, useNavigator } from './components/ui';
import { HomePage } from './pages/HomePage';
import { ArticlesPage } from './pages/ArticlesPage';
import { GallerysPage } from './pages/GallerysPage';
import { GallerysEditPage } from './pages/GallerysEditPage';
import { GalleryExplorePage } from './pages/GalleryExplorePage';
import SubjectVisualization from './components/graph/SubjectVisualization';
import { ArticleViewer, ArticleEditor } from './components/articles';
import GraphVisualization from './components/graph/GraphVisualization';
import { CollaborationProvider, useCollaboration, CollaborationPanel, Features } from './components/collaboration';
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
  }
}

interface CachedRouteProps {
  'cacheKey': string;
  'children': ReactNode;
}

function CachedRoute ({ cacheKey, children }: CachedRouteProps) {
  const { markTabAsLoaded, tabs } = useNavigator();

  useEffect(() => {
    const tab = tabs.find(t => t.path === cacheKey);
    if (tab) {
      markTabAsLoaded(tab.id);
    }
  }, [cacheKey, markTabAsLoaded, tabs]);

  return (
    <KeepAlive id={cacheKey} autoFreeze={false}>
      <>{children}</>
    </KeepAlive>
  );
}

function CachedArticleViewer () {
  const { slug } = useParams<{ 'slug': string }>();
  const cacheKey = `/articles/${slug ?? ''}`;
  return (
    <CachedRoute cacheKey={cacheKey}>
      <ArticleViewer />
    </CachedRoute>
  );
}

function CachedArticleEditor () {
  const { slug } = useParams<{ 'slug': string }>();
  const cacheKey = `/articles/${slug ?? ''}/edit`;
  return (
    <CachedRoute cacheKey={cacheKey}>
      <ArticleEditor />
    </CachedRoute>
  );
}

function CachedGallerysEditPage () {
  const { galleryId } = useParams<{ 'galleryId': string }>();
  const cacheKey = `/gallerys/${galleryId ?? ''}`;
  return (
    <CachedRoute cacheKey={cacheKey}>
      <GallerysEditPage />
    </CachedRoute>
  );
}

function CachedGalleryExplorePage () {
  const { galleryId } = useParams<{ 'galleryId': string }>();
  const cacheKey = `/gallerys/${galleryId ?? ''}/explore`;
  return (
    <CachedRoute cacheKey={cacheKey}>
      <GalleryExplorePage />
    </CachedRoute>
  );
}

function CachedSubjectVisualization () {
  const { subject } = useParams<{ 'subject': string }>();
  const cacheKey = `/graphs/subject-visualization/${subject ?? ''}`;
  return (
    <CachedRoute cacheKey={cacheKey}>
      <SubjectVisualization />
    </CachedRoute>
  );
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
        'title': '地图列表',
        'description': '浏览所有文章合集，探索主题内容',
        'type': 'website'
      });
      return;
    }

    if (path === '/articles/create') {
      updateMetaTags({
        'title': '创建文章',
        'description': '文章编辑器',
        'type': 'website'
      });
      return;
    }

    const articleEditMatch = path.match(/^\/articles\/([^/]+)\/edit$/);
    if (articleEditMatch) {
      updateMetaTags({
        'title': '编辑文章',
        'description': '文章编辑器',
        'type': 'website'
      });
      return;
    }

    const articleMatch = path.match(/^\/articles\/([^/]+)$/);
    if (articleMatch && articleMatch[1]) {
      const slug = articleMatch[1];
      const article = await getArticleBySlug(slug);
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

    if (path === '/gallerys/create') {
      updateMetaTags({
        'title': '创建地图',
        'description': '创建新的地图',
        'type': 'website'
      });
      return;
    }

    const galleryMatch = path.match(/^\/gallerys\/([^/]+)$/);
    if (galleryMatch && galleryMatch[1]) {
      const galleryId = galleryMatch[1];
      const gallery = await getGalleryById(galleryId);
      if (gallery) {
        updateMetaTags({
          'title': gallery.title,
          'description': `浏览合集：${gallery.title}`,
          'type': 'website'
        });
      } else {
        updateMetaTags({
          'title': '地图未找到',
          'description': '您访问的地图不存在',
          'type': 'website'
        });
      }
      return;
    }

    if (path.startsWith('/graphs/subject-visualization')) {
      const subjectMatch = path.match(/^\/graphs\/subject-visualization\/(.+)$/);
      const subject = subjectMatch ? subjectMatch[1] : '';
      updateMetaTags({
        'title': subject ? `分类可视化 - ${subject}` : '分类可视化',
        'description': '探索分类体系，发现分类关联',
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
  }, [location.pathname]);

  useEffect(() => {
    updateMetaForRoute();
  }, [updateMetaForRoute]);
}

function AppContent () {
  const location = useLocation();
  const { pathname } = location;
  const collaboration = useCollaboration();
  const { isPanelOpen, setPanelOpen } = collaboration;

  useMetaTags();

  const showNavigatorTrigger = pathname === '/' ||
    pathname === '/articles' ||
    (pathname.startsWith('/articles/') && pathname !== '/articles/create' && !pathname.endsWith('/edit')) ||
    pathname === '/gallerys';

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {showNavigatorTrigger && (
        <div className="fixed top-4 left-4 z-30 print:hidden">
          <NavigatorTrigger />
        </div>
      )}

      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<CachedRoute cacheKey="/"><HomePage /></CachedRoute>} />
            <Route path="/articles" element={<CachedRoute cacheKey="/articles"><ArticlesPage /></CachedRoute>} />
            <Route path="/articles/:slug" element={<CachedArticleViewer />} />
            <Route path="/articles/create" element={<CachedRoute cacheKey="/articles/create"><ArticleEditor /></CachedRoute>} />
            <Route path="/articles/:slug/edit" element={<CachedArticleEditor />} />
            <Route path="/gallerys" element={<CachedRoute cacheKey="/gallerys"><GallerysPage /></CachedRoute>} />
            <Route path="/gallerys/create" element={<CachedRoute cacheKey="/gallerys/create"><GallerysEditPage /></CachedRoute>} />
            <Route path="/gallerys/:galleryId" element={<CachedGallerysEditPage />} />
            <Route path="/gallerys/:galleryId/explore" element={<CachedGalleryExplorePage />} />
            <Route path="/graphs/create" element={<CachedRoute cacheKey="/graphs/create"><GraphVisualization /></CachedRoute>} />
            <Route path="/graphs/subject-visualization" element={<CachedRoute cacheKey="/graphs/subject-visualization"><SubjectVisualization /></CachedRoute>} />
            <Route path="/graphs/subject-visualization/:subject" element={<CachedSubjectVisualization />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <CollaborationPanel isOpen={isPanelOpen} onClose={() => setPanelOpen(false)} />

      {collaboration.isConnected && <Features className="print:hidden" />}
    </div>
  );
}

function App () {
  return (
    <BrowserRouter>
      <NavigatorProvider>
        <CollaborationProvider>
          <AliveScope>
            <NavigatorCacheManager />
            <NavigatorSidebar />
            <AppContent />
          </AliveScope>
        </CollaborationProvider>
      </NavigatorProvider>
    </BrowserRouter>
  );
}

export default App;
