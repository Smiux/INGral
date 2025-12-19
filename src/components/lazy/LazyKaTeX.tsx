import { useState, useEffect, useRef } from 'react';
import { katexCache } from '../../utils/katexCache';
import type { KatexOptions } from 'katex';

interface LazyKaTeXProps {
  formula: string;
  options?: KatexOptions;
  className?: string;
}

/**
 * LazyKaTeX component for incremental rendering of KaTeX formulas
 * Only renders formulas when they come into view using Intersection Observer
 */
export const LazyKaTeX: React.FC<LazyKaTeXProps> = ({ formula, options = {}, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [html, setHtml] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Render formula when it becomes visible
  useEffect(() => {
    if (isVisible) {
      const renderedHtml = katexCache.render(formula, options);
      setHtml(renderedHtml);
    }
  }, [isVisible, formula, options]);

  // Set up Intersection Observer to detect when formula comes into view
  useEffect(() => {
    if (!containerRef.current) {
      return () => {};
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // Pre-render formulas when they're 100px from viewport
        'rootMargin': '100px',
        // Trigger when 10% of element is visible
        'threshold': 0.1
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Fallback while formula is not visible or rendering
  const fallbackContent = (
    <div className="inline-block min-w-[50px] min-h-[20px] bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
  );

  return (
    <div
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ '__html': html }}
      aria-label={`Math formula: ${formula}`}
      data-formula={formula}
    >
      {!isVisible && fallbackContent}
    </div>
  );
};
