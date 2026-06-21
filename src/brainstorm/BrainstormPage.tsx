import { useMemo, useState } from 'react';
import { NavigatorTrigger } from '@/components/ui/navigator/Navigator';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const inlineMathExt = {
  'name': 'inlineMath',
  'level': 'inline' as const,
  'start' (src: string) {
    return src.indexOf('$');
  },
  'tokenizer' (src: string) {
    const match = src.match(/^\$([^$\n]+?)\$/);
    if (match) {
      return { 'type': 'inlineMath', 'raw': match[0], 'text': match[1]!.trim() };
    }
    return undefined;
  },
  'renderer' (token: { 'text': string }) {
    try {
      return katex.renderToString(token.text, { 'throwOnError': false, 'displayMode': false });
    } catch {
      return `<code class="katex-error">${token.text}</code>`;
    }
  }
};

const blockMathExt = {
  'name': 'blockMath',
  'level': 'block' as const,
  'start' (src: string) {
    return src.indexOf('$$');
  },
  'tokenizer' (src: string) {
    const match = src.match(/^\$\$([^$]+?)\$\$/);
    if (match) {
      return { 'type': 'blockMath', 'raw': match[0], 'text': match[1]!.trim() };
    }
    return undefined;
  },
  'renderer' (token: { 'text': string }) {
    try {
      return `<div class="katex-display">${katex.renderToString(token.text, { 'throwOnError': false, 'displayMode': true })}</div>`;
    } catch {
      return `<pre><code class="katex-error">${token.text}</code></pre>`;
    }
  }
};

marked.use({ 'extensions': [blockMathExt, inlineMathExt] });

const contentModules = import.meta.glob('./content/*.{html,md}', {
  'query': '?raw',
  'import': 'default',
  'eager': true
}) as Record<string, string>;

function renderMarkdown (md: string): string {
  return marked.parse(md, { 'async': false }) as string;
}

function formatTitle (path: string): string {
  return path
    .replace(/^.*[\\/]/, '')
    .replace(/\.\w+$/, '')
    .replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

export function BrainstormPage () {
  const sortedEntries = useMemo(() => {
    return Object.entries(contentModules).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, []);

  const [currentIndex, setCurrentIndex] = useState(sortedEntries.length - 1);

  const total = sortedEntries.length;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < total - 1;

  const htmlContent = useMemo(() => {
    if (total === 0) {
      return '<p>暂无内容</p>';
    }
    const [filePath, content] = sortedEntries[currentIndex]!;
    if (filePath.endsWith('.md')) {
      return renderMarkdown(content);
    }
    return content;
  }, [currentIndex, sortedEntries, total]);

  const currentTitle = sortedEntries[currentIndex]
    ? formatTitle(sortedEntries[currentIndex]![0])
    : '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="fixed top-4 left-4 z-30 print:hidden">
        <NavigatorTrigger />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {total > 0 && (
          <div className="text-center mb-6 text-sm text-slate-400 dark:text-slate-500">
            {currentTitle} — {currentIndex + 1} / {total}
          </div>
        )}

        <div className="relative">
          {hasPrev && (
            <button
              onClick={() => setCurrentIndex((i) => i - 1)}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-md border border-slate-200/60 dark:border-slate-700/60 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all print:hidden"
              aria-label="上一篇"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <article
            className="prose prose-slate dark:prose-invert max-w-none
              [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-slate-800 [&_h1]:dark:text-slate-200
              [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-slate-700 [&_h2]:dark:text-slate-300
              [&_p]:text-slate-600 [&_p]:dark:text-slate-400 [&_p]:leading-relaxed
              [&_ul]:text-slate-600 [&_ul]:dark:text-slate-400
              [&_li]:text-slate-600 [&_li]:dark:text-slate-400
              [&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto [&_.katex]:text-inherit"
            dangerouslySetInnerHTML={{ '__html': htmlContent }}
          />

          {hasNext && (
            <button
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-md border border-slate-200/60 dark:border-slate-700/60 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all print:hidden"
              aria-label="下一篇"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
