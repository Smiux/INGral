import { useState, useCallback, useRef, useEffect, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight } from 'lucide-react';
import {
  ConnectionContext,
  type ExtendedConnectionContextValue,
  type PathStep
} from './types';

interface JumpPathBarProps {
  path: PathStep[];
  currentArticleId: string;
  onJumpToArticle: (articleId: string, pointId: string, direction: 'source' | 'target') => void;
  onJumpToPoint: (pointId: string) => void;
  onClear: () => void;
}

export function JumpPathBar ({ path, currentArticleId, onJumpToArticle, onJumpToPoint, onClear }: JumpPathBarProps) {
  const ctx = useContext(ConnectionContext) as ExtendedConnectionContextValue | null;
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);
  const [hoveredConnectionIndex, setHoveredConnectionIndex] = useState<number | null>(null);
  const [stepRect, setStepRect] = useState<DOMRect | null>(null);
  const [connRect, setConnRect] = useState<DOMRect | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [path.length]);

  const enrichedPath = useMemo(() => {
    if (!ctx) {
      return path;
    }

    return path.map((step, index) => {
      let pointColor = step.pointColor;
      let selectedText = step.selectedText;
      let connectionId: string | undefined = step.connectionId;
      let connectionLabel: string | undefined = step.connectionLabel;

      if (step.pointId) {
        const point = ctx.state.points.get(step.pointId);
        if (point) {
          if (!pointColor || pointColor === '#6366f1') {
            pointColor = point.color;
          }
          if (!selectedText) {
            selectedText = point.selectedText;
          }
        }
      }

      if (index > 0 && !connectionId) {
        const prevStep = path[index - 1];
        if (prevStep) {
          for (const conn of ctx.state.connections.values()) {
            const isMatch = (conn.sourcePointId === prevStep.pointId && conn.targetPointId === step.pointId) ||
              (conn.targetPointId === prevStep.pointId && conn.sourcePointId === step.pointId);
            if (isMatch) {
              connectionId = conn.id;
              connectionLabel = conn.label;
              break;
            }
          }
        }
      }

      if (connectionId && !connectionLabel) {
        const conn = ctx.state.connections.get(connectionId);
        if (conn) {
          connectionLabel = conn.label;
        }
      }

      if (pointColor === step.pointColor && selectedText === step.selectedText &&
          connectionId === step.connectionId && connectionLabel === step.connectionLabel) {
        return step;
      }

      const enriched: PathStep = {
        'articleId': step.articleId,
        'articleTitle': step.articleTitle,
        'pointId': step.pointId,
        pointColor,
        selectedText
      };
      if (connectionId !== undefined) {
        enriched.connectionId = connectionId;
      }
      if (connectionLabel !== undefined) {
        enriched.connectionLabel = connectionLabel;
      }
      return enriched;
    });
  }, [path, ctx]);

  const handleClick = useCallback((step: PathStep, index: number) => {
    if (step.articleId === currentArticleId) {
      onJumpToPoint(step.pointId);
      return;
    }

    let direction: 'source' | 'target' = 'target';

    if (step.connectionId && ctx) {
      const conn = ctx.state.connections.get(step.connectionId);
      if (conn) {
        direction = conn.targetPointId === step.pointId ? 'target' : 'source';
      }
    } else if (index > 0) {
      const prevStep = enrichedPath[index - 1];
      if (prevStep && prevStep.articleId !== currentArticleId) {
        direction = 'source';
      }
    }

    onJumpToArticle(step.articleId, step.pointId, direction);
  }, [currentArticleId, onJumpToArticle, onJumpToPoint, enrichedPath, ctx]);

  const handleStepEnter = useCallback((index: number, e: React.MouseEvent) => {
    setHoveredStepIndex(index);
    setStepRect((e.currentTarget as HTMLElement).getBoundingClientRect());
  }, []);

  const handleStepLeave = useCallback(() => {
    setHoveredStepIndex(null);
    setStepRect(null);
  }, []);

  const handleConnEnter = useCallback((index: number, e: React.MouseEvent) => {
    setHoveredConnectionIndex(index);
    setConnRect((e.currentTarget as HTMLElement).getBoundingClientRect());
  }, []);

  const handleConnLeave = useCallback(() => {
    setHoveredConnectionIndex(null);
    setConnRect(null);
  }, []);

  if (enrichedPath.length < 2) {
    return null;
  }

  const hoveredStep = hoveredStepIndex !== null ? enrichedPath[hoveredStepIndex] : null;
  const hoveredConnStep = hoveredConnectionIndex !== null ? enrichedPath[hoveredConnectionIndex] : null;

  const stepTooltip = hoveredStep && stepRect && (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        'left': stepRect.left + stepRect.width / 2,
        'bottom': window.innerHeight - stepRect.top + 8,
        'transform': 'translateX(-50%)'
      }}
    >
      <div className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-w-[280px] text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words">
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ 'background': hoveredStep.pointColor }}
          />
          <span className="font-medium text-neutral-800 dark:text-neutral-200">{hoveredStep.articleTitle}</span>
        </div>
        {hoveredStep.selectedText && <div>{hoveredStep.selectedText}</div>}
      </div>
    </div>
  );

  const connTooltip = hoveredConnStep && connRect && (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        'left': connRect.left + connRect.width / 2,
        'bottom': window.innerHeight - connRect.top + 8,
        'transform': 'translateX(-50%)'
      }}
    >
      <div className="px-2 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-md text-xs text-neutral-600 dark:text-neutral-400 max-w-[160px] truncate">
        {hoveredConnStep.connectionLabel || '连接'}
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 print:hidden">
      <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm border-t border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
              <span>跳转路径</span>
            </div>

            <div
              ref={scrollContainerRef}
              className="flex-1 flex items-center overflow-x-auto gap-0 scrollbar-none"
              style={{ 'scrollbarWidth': 'none' }}
            >
              {enrichedPath.map((step, index) => {
                const isCurrent = step.articleId === currentArticleId;
                const hasConnection = index > 0 && step.connectionId;

                return (
                  <div key={`${step.articleId}-${step.pointId}-${index}`} className="flex items-center flex-shrink-0">
                    {hasConnection && (
                      <div
                        className="flex items-center mx-1"
                        onMouseEnter={(e) => handleConnEnter(index, e)}
                        onMouseLeave={handleConnLeave}
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                      </div>
                    )}
                    {!hasConnection && index > 0 && (
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 mx-1" />
                    )}

                    <button
                      onClick={() => handleClick(step, index)}
                      onMouseEnter={(e) => handleStepEnter(index, e)}
                      onMouseLeave={handleStepLeave}
                      className={`
                        flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                        transition-all duration-150 max-w-[180px]
                        ${isCurrent
                    ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 ring-1 ring-neutral-300 dark:ring-neutral-600'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                  }
                      `}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ 'background': step.pointColor }}
                      />
                      <span className="truncate">{step.articleTitle}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onClear}
              className="flex-shrink-0 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="清除路径"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {createPortal(stepTooltip, document.body)}
      {createPortal(connTooltip, document.body)}
    </div>
  );
}
