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
          // React 核心框架
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          
          // Tiptap 编辑器核心
          if (id.includes('node_modules/@tiptap/')) {
            return 'tiptap';
          }
          
          // ProseMirror（Tiptap 底层）
          if (id.includes('node_modules/@tiptap/pm/') || 
              id.includes('node_modules/prosemirror-')) {
            return 'prosemirror';
          }
          
          // 代码高亮
          if (id.includes('node_modules/highlight.js/') || 
              id.includes('node_modules/lowlight/')) {
            return 'highlight';
          }
          
          // KaTeX 数学公式渲染
          if (id.includes('node_modules/katex/')) {
            return 'katex';
          }
          
          // MathLive 数学编辑器
          if (id.includes('node_modules/mathlive/')) {
            return 'mathlive';
          }
          
          // React Flow 图可视化
          if (id.includes('node_modules/@xyflow/')) {
            return 'xyflow';
          }
          
          // ELK 图布局 - 单独分割，这个库本身就很大
          if (id.includes('node_modules/elkjs/') || 
              id.includes('node_modules/elk-wasm/')) {
            return 'elk';
          }
          
          // 力导向图和 D3 - 放在一起避免循环依赖
          if (id.includes('node_modules/react-force-graph-') || 
              id.includes('node_modules/force-graph/') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/@react-spring/') ||
              id.includes('node_modules/three/') ||
              id.includes('node_modules/three-')) {
            return 'force-graph';
          }
          
          // Lucide 图标
          if (id.includes('node_modules/lucide-react/')) {
            return 'lucide';
          }
          
          // Zustand 状态管理
          if (id.includes('node_modules/zustand/')) {
            return 'zustand';
          }
          
          // Supabase
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase';
          }
          
          // 其他工具库
          if (id.includes('node_modules/lodash/') || 
              id.includes('node_modules/lodash-es/')) {
            return 'lodash';
          }
          
          // 业务代码分割 - 文章编辑器
          if (id.includes('src/components/articles/') || 
              id.includes('src/services/articleService')) {
            return 'article-editor';
          }
          
          // 业务代码分割 - 图可视化
          if (id.includes('src/components/graph/')) {
            return 'graph-visualization';
          }
          
          // 其他 node_modules - 不再单独分组，让 Rollup 自动处理
          // 这样可以避免循环依赖问题
        }
      }
    },
    chunkSizeWarningLimit: 1500,
    minify: 'terser',
    sourcemap: false
  },
  server: {
    port: 5173,
    open: true
  }
});
