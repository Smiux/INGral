import { useEffect, useState, useRef } from 'react';
import { generateTableOfContents } from '../../utils/markdown';
import { UITableOfContentsProps } from '../../types';

/**
 * TableOfContents component for displaying a dynamic table of contents
 * based on Markdown headings
 */
export function TableOfContents ({ content, className = '', title = 'Table of Contents' }: UITableOfContentsProps) {
  const [tocHtml, setTocHtml] = useState<string>('');
  const [activeId, setActiveId] = useState<string>('');
  const tocRef = useRef<HTMLDivElement>(null);

  // Generate TOC when content changes
  useEffect(() => {
    const html = generateTableOfContents(content);
    setTocHtml(html);
  }, [content]);

  // Set up Intersection Observer to highlight active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        // Trigger when heading is near top of viewport
        'rootMargin': '-100px 0px -80% 0px',
        'threshold': 0.1
      }
    );

    // Observe all heading elements with IDs
    const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
    headings.forEach((heading) => {
      observer.observe(heading);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={tocRef}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}
    >
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h2>
      <div
        className="prose dark:prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ '__html': tocHtml }}
        aria-label="Table of contents"
      />
      {activeId && (
        <style>{`
          .prose a[href="#${activeId}"] {
            font-weight: 600;
            color: #3b82f6;
          }
          .dark .prose a[href="#${activeId}"] {
            color: #60a5fa;
          }
        `}</style>
      )}
    </div>
  );
}
