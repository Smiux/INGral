import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './context/NotificationContext';
import { registerServiceWorker } from './utils/registerSW';
import { preloadKaTeXFONTS } from './utils/katexFontOptimizer';
import { performDatabaseHealthCheck } from './services/databaseInitService';
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

// 延迟执行数据库健康检查，避免影响应用启动
setTimeout(() => {
  performDatabaseHealthCheck().then(result => {
    if (result.status === 'warning' || result.status === 'error') {
      console.warn('数据库状态:', result.message);
    }
  });
}, 2000);
