import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './context/NotificationContext';
import { registerServiceWorker } from './utils/registerSW';
import { preloadKaTeXFONTS } from './utils/katexFontOptimizer';
import './index.css';

// 渲染应用
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </StrictMode>
);

// 注册Service Worker以支持离线功能
registerServiceWorker();

// 预加载KaTeX字体以提高渲染性能
preloadKaTeXFONTS();
