import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    // 启用代码分割
    rollupOptions: {
      output: {
        // 手动代码分割配置
        manualChunks: {
          // 将第三方库拆分为独立的chunk
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          // 将markdown和katex相关的库拆分为独立的chunk
          'markdown-katex': ['katex', 'markdown-it'],
          // 将文章编辑功能相关代码拆分为独立的chunk
          'article-editor': ['@/components/articles/ArticleEditor', '@/services/articleService'],
          // 将图谱可视化功能相关代码拆分为独立的chunk
          'graph-visualization': ['@/components/graph/GraphVisualization', '@/services/graphService']
        }
      }
    },
    // 增加chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    // 启用压缩
    minify: 'terser',
    // 生成sourcemap
    sourcemap: false
  },
  // 开发服务器配置
  server: {
    port: 5173,
    open: true
  }
});
