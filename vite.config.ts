import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'katex': ['katex'],
          'article-editor': ['@/components/articles/ArticleEditor', '@/services/articleService'],
          'graph-visualization': ['@/components/graph/GraphVisualization']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    sourcemap: false
  },
  server: {
    port: 5173,
    open: true
  }
});
