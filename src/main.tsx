import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { preloadKaTeXFONTS } from './utils/katexFontOptimizer';
import './index.css';

// 渲染应用
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);



// 预加载KaTeX字体以提高渲染性能
preloadKaTeXFONTS();
