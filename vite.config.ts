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
        manualChunks: (id) => {
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/scheduler/')) {
            return 'react-core';
          }
          
          if (id.includes('node_modules/react-router-dom/')) {
            return 'react-router';
          }
          
          if (id.includes('node_modules/elkjs/') || 
              id.includes('node_modules/elk-wasm/')) {
            return 'elk';
          }
          
          if (id.includes('node_modules/react-force-graph-') || 
              id.includes('node_modules/force-graph/') ||
              id.includes('node_modules/three/') ||
              id.includes('node_modules/three-')) {
            return 'force-graph';
          }
          
          if (id.includes('node_modules/d3-')) {
            return 'd3';
          }
          
          if (id.includes('node_modules/@react-spring/')) {
            return 'react-spring';
          }
          
          if (id.includes('node_modules/@tiptap/')) {
            return 'tiptap';
          }
          
          if (id.includes('node_modules/prosemirror-')) {
            return 'prosemirror';
          }
          
          if (id.includes('node_modules/@xyflow/')) {
            return 'xyflow';
          }
          
          if (id.includes('node_modules/highlight.js/') || 
              id.includes('node_modules/lowlight/')) {
            return 'highlight';
          }
          
          if (id.includes('node_modules/katex/')) {
            return 'katex';
          }
          
          if (id.includes('node_modules/mathlive/')) {
            return 'mathlive';
          }
          
          if (id.includes('node_modules/lucide-react/')) {
            return 'lucide';
          }
          
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase';
          }
          
          if (id.includes('src/components/articles/') || 
              id.includes('src/services/articleService')) {
            return 'article-editor';
          }
          
          if (id.includes('src/components/graph/')) {
            return 'graph-visualization';
          }

          return undefined;
        }
      }
    },
    chunkSizeWarningLimit: 1500,
    minify: 'terser',
    sourcemap: false
  },
  server: {
    port: 5173,
    open: true,
    allowedHosts: true
  }
});
