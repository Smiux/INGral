import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ArticleViewer } from '@/components/ArticleViewer';
import { ArticleEditor } from '@/components/ArticleEditor';
import { GraphVisualization } from '@/components/GraphVisualization';
import { HomePage } from '@/pages/HomePage';
import { ArticlesPage } from '@/pages/ArticlesPage';
import { SearchPage } from '@/pages/SearchPage';
import { AuthPage } from '@/pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { DatabasePage } from './pages/DatabasePage';
import { Header } from '@/components/Header';

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1">
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
