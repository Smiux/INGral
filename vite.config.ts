import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import htmlPlugin from 'vite-plugin-html-config';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    htmlPlugin({
      title: 'IN Gral',
      metas: [
        { name: 'description', content: 'IN Gral - 记录一切' },
        { property: 'og:title', content: 'IN Gral' },
        { property: 'og:description', content: 'IN Gral - 记录一切' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'IN Gral' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'IN Gral' },
        { name: 'twitter:description', content: 'IN Gral - 记录一切' },
      ]
    })
  ],
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
          
          if (id.includes('node_modules/@tiptap/') || 
              id.includes('node_modules/prosemirror-')) {
            return 'tiptap';
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
    allowedHosts: true,
    fs: {
      allow: ['..']
    }
  }
});
