import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { X, GripVertical, CalendarDays, Tag, Maximize2 } from 'lucide-react';
import { TiptapEditor, type TiptapEditorRef } from './core/TipTap';
import type { ArticleWithContent } from '../../services/articleService';
import { ArticleConnectionLines, CrossArticleConnectionLines, ConnectionPointManager, ConnectionInteraction } from './connection';

interface ArticlePosition {
  articleId: string;
  x: number;
  y: number;
}

interface MultiViewerProps {
  articles: ArticleWithContent[];
  onRemoveArticle: (articleId: string) => void;
  onSelectArticle: (articleId: string) => void;
  onJumpToArticle?: (articleId: string, pointId: string, direction: 'source' | 'target', connectionId?: string) => void;
}

const ARTICLE_WIDTH = 1280;
const ARTICLE_VIEW_HEIGHT = 900;
const GAP = 48;
const ZOOM_MIN = 0.15;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

function formatDate (dateStr: string | null | undefined): string {
  if (!dateStr) {
    return '未知';
  }
  return new Date(dateStr).toLocaleString('zh-CN', {
    'year': 'numeric',
    'month': 'long',
    'day': 'numeric',
    'hour': '2-digit',
    'minute': '2-digit',
    'second': '2-digit'
  });
}

function checkOverlap (
  x: number,
  y: number,
  existingPositions: Array<{ x: number; y: number }>
): boolean {
  const padding = GAP;
  for (const pos of existingPositions) {
    const overlapX = Math.abs(x - pos.x) < ARTICLE_WIDTH + padding;
    const overlapY = Math.abs(y - pos.y) < ARTICLE_VIEW_HEIGHT + padding;
    if (overlapX && overlapY) {
      return true;
    }
  }
  return false;
}

function generateNonOverlappingPosition (
  existingPositions: Array<{ x: number; y: number }>,
  seed: number,
  totalArticles: number
): { x: number; y: number } {
  if (existingPositions.length === 0) {
    return { 'x': 0, 'y': 0 };
  }

  const count = existingPositions.length + 1;
  const cols = Math.max(2, Math.ceil(Math.sqrt(totalArticles * (ARTICLE_WIDTH / ARTICLE_VIEW_HEIGHT))));
  const rowHeight = ARTICLE_VIEW_HEIGHT + GAP * 2;
  const colWidth = ARTICLE_WIDTH + GAP * 2;

  const baseCol = (count - 1) % cols;
  const baseRow = Math.floor((count - 1) / cols);
  const baseX = baseCol * colWidth - (cols * colWidth) / 2 + ARTICLE_WIDTH / 2;
  const baseY = baseRow * rowHeight - ((Math.ceil(totalArticles / cols) * rowHeight) / 2) + ARTICLE_VIEW_HEIGHT / 2;

  const maxOffset = Math.min(GAP * 1.5, 60);
  const offsetX = ((seed * 17 + count * 31) % 100) / 100 * maxOffset - maxOffset / 2;
  const offsetY = ((seed * 23 + count * 47) % 100) / 100 * maxOffset - maxOffset / 2;

  const candidates: Array<{ x: number; y: number }> = [
    { 'x': baseX + offsetX, 'y': baseY + offsetY },
    { 'x': baseX - offsetX, 'y': baseY + offsetY },
    { 'x': baseX + offsetX, 'y': baseY - offsetY },
    { 'x': baseX - offsetX, 'y': baseY - offsetY }
  ];

  for (const candidate of candidates) {
    if (!checkOverlap(candidate.x, candidate.y, existingPositions)) {
      return candidate;
    }
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const spiralRadius = Math.min(count * (GAP * 1.5), ARTICLE_WIDTH * 0.8);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const angle = seed * goldenAngle + attempt * 0.5;
    const distance = spiralRadius * (0.5 + attempt * 0.15);
    const x = baseX + Math.cos(angle) * distance;
    const y = baseY + Math.sin(angle) * distance;

    if (!checkOverlap(x, y, existingPositions)) {
      return { x, y };
    }
  }

  return { 'x': baseX + offsetX, 'y': baseY + offsetY };
}

const ArticlePagePreview = memo(function ArticlePagePreview ({
  article,
  onRemove,
  onView,
  onDragHandleMouseDown
}: {
  article: ArticleWithContent;
  onRemove: () => void;
  onView: () => void;
  onDragHandleMouseDown: (e: React.MouseEvent) => void;
}) {
  const editorRef = useRef<TiptapEditorRef | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      className="group relative bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-default"
    >
      <div
        className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onDragHandleMouseDown}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripVertical className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">{article.title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onView}
            className="p-1 text-sky-500 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded transition-colors"
            title="查看文章"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="移除文章"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-y-auto relative"
        data-article-scroll="true"
        style={{ 'height': `${ARTICLE_VIEW_HEIGHT}px` }}
      >
        <article className="relative max-w-7xl mx-auto px-8 py-8">
          <ArticleConnectionLines
            articleId={article.id}
            scrollContainerRef={scrollContainerRef}
            renderCrossArticle={false}
          />
          {article.cover_image && (
            <div className="mb-6 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700">
              <img
                src={article.cover_image}
                alt={article.title}
                className="w-full h-auto object-cover max-h-[70vh]"
              />
            </div>
          )}

          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-800 dark:text-neutral-100 min-w-0">{article.title}</h1>
            <div className="flex flex-wrap gap-6 text-sm text-neutral-600 dark:text-neutral-400 mt-4">
              <div className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                创建于 {formatDate(article.created_at)}
              </div>
              <div className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                更新于 {formatDate(article.updated_at)}
              </div>
            </div>

            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map((tag, index) => (
                  <span
                    key={index}
                    title={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{tag}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {article.summary && (
            <blockquote className="mb-6 pl-4 border-l-4 border-sky-400 bg-sky-50 dark:bg-sky-900/20 py-3 pr-4 rounded-r-lg">
              <p className="text-neutral-700 dark:text-neutral-300 italic m-0">
                {article.summary}
              </p>
            </blockquote>
          )}

          <div className="flex-1 min-w-0">
            {article.content && (
              <TiptapEditor
                key={article.id}
                editorRef={editorRef}
                editable={false}
                content={article.content}
              />
            )}
          </div>
        </article>

        <ConnectionPointManager
          articleId={article.id}
          editorRef={editorRef}
        />
      </div>
    </div>
  );
});

function MultiViewerInner ({
  articles,
  onRemoveArticle,
  onSelectArticle,
  onJumpToArticle
}: MultiViewerProps) {
  const [zoomDisplay, setZoomDisplay] = useState(60);
  const [zoomAtBounds, setZoomAtBounds] = useState<{ atMin: boolean; atMax: boolean }>({ 'atMin': false, 'atMax': false });
  const [assignedPositions, setAssignedPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [dragState, setDragState] = useState<{
    type: 'article' | 'canvas';
    articleId?: string;
    startMouseX: number;
    startMouseY: number;
    startPosX: number;
    startPosY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const panRef = useRef({ 'x': 0, 'y': 0 });
  const zoomRef = useRef(0.6);
  const rafRef = useRef<number>(0);

  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash;
    }
    return Math.abs(hash);
  };

  const applyTransform = useCallback(() => {
    if (canvasRef.current) {
      const pan = panRef.current;
      const zoom = zoomRef.current;
      canvasRef.current.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
    }
  }, []);

  const scheduleTransform = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      applyTransform();
    });
  }, [applyTransform]);

  const updateZoomDisplay = useCallback(() => {
    const z = zoomRef.current;
    setZoomDisplay(Math.round(z * 100));
    setZoomAtBounds({ 'atMin': z <= ZOOM_MIN, 'atMax': z >= ZOOM_MAX });
  }, []);

  const articlePositions: ArticlePosition[] = useMemo(() => {
    const result: ArticlePosition[] = [];
    const usedPositions: Array<{ x: number; y: number }> = [];
    const newPositions = new Map(assignedPositions);

    for (const article of articles) {
      const existing = assignedPositions.get(article.id);
      if (existing) {
        usedPositions.push(existing);
        result.push({ 'articleId': article.id, 'x': existing.x, 'y': existing.y });
      } else {
        const newPos = generateNonOverlappingPosition(usedPositions, hashString(article.id), articles.length);
        newPositions.set(article.id, newPos);
        usedPositions.push(newPos);
        result.push({ 'articleId': article.id, 'x': newPos.x, 'y': newPos.y });
      }
    }

    if (newPositions.size !== assignedPositions.size || articles.some(a => !assignedPositions.has(a.id))) {
      setTimeout(() => {
        setAssignedPositions(newPositions);
      }, 0);
    }

    return result;
  }, [articles, assignedPositions]);

  useEffect(() => {
    if (articles.length === 0 || hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const pos of articlePositions) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + ARTICLE_WIDTH);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + ARTICLE_VIEW_HEIGHT);
    }

    if (minX === Infinity) {
      return;
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const fitZoom = Math.min(
      (rect.width - 80) / contentWidth,
      (rect.height - 80) / contentHeight,
      1.0
    );
    const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, fitZoom));
    zoomRef.current = clampedZoom;
    panRef.current = {
      'x': (rect.width - contentWidth * clampedZoom) / 2 - minX * clampedZoom,
      'y': (rect.height - contentHeight * clampedZoom) / 2 - minY * clampedZoom + 40
    };
    applyTransform();
    updateZoomDisplay();
  }, [articles.length, articlePositions, applyTransform, updateZoomDisplay]);

  const handleWheel = useCallback((e: WheelEvent) => {
    const target = e.target as HTMLElement;
    const articleScroll = target.closest('[data-article-scroll="true"]');
    if (articleScroll) {
      return;
    }

    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldZoom = zoomRef.current;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, oldZoom + delta));
    const scale = newZoom / oldZoom;

    panRef.current = {
      'x': mouseX - (mouseX - panRef.current.x) * scale,
      'y': mouseY - (mouseY - panRef.current.y) * scale
    };
    zoomRef.current = newZoom;
    scheduleTransform();
    updateZoomDisplay();
  }, [scheduleTransform, updateZoomDisplay]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    viewport.addEventListener('wheel', handleWheel, { 'passive': false });
    return () => {
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== viewportRef.current && !(e.target as HTMLElement).dataset.canvas) {
      return;
    }
    e.preventDefault();
    setDragState({
      'type': 'canvas',
      'startMouseX': e.clientX,
      'startMouseY': e.clientY,
      'startPosX': 0,
      'startPosY': 0,
      'startPanX': panRef.current.x,
      'startPanY': panRef.current.y
    });
  }, []);

  const handleArticleDragStart = useCallback((articleId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = articlePositions.find(p => p.articleId === articleId);
    if (!pos) {
      return;
    }
    setDragState({
      'type': 'article',
      articleId,
      'startMouseX': e.clientX,
      'startMouseY': e.clientY,
      'startPosX': pos.x,
      'startPosY': pos.y,
      'startPanX': panRef.current.x,
      'startPanY': panRef.current.y
    });
  }, [articlePositions]);

  const draggingArticlePosRef = useRef<{ 'x': number; 'y': number }>({ 'x': 0, 'y': 0 });

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startMouseX;
      const dy = e.clientY - dragState.startMouseY;

      if (dragState.type === 'canvas') {
        panRef.current = {
          'x': dragState.startPanX + dx,
          'y': dragState.startPanY + dy
        };
        scheduleTransform();
      } else if (dragState.type === 'article' && dragState.articleId) {
        const zoom = zoomRef.current;
        const canvasDx = dx / zoom;
        const canvasDy = dy / zoom;
        const newX = dragState.startPosX + canvasDx;
        const newY = dragState.startPosY + canvasDy;
        draggingArticlePosRef.current = { 'x': newX, 'y': newY };

        const el = canvasRef.current?.querySelector(`[data-article-id="${dragState.articleId}"]`) as HTMLElement | null;
        if (el) {
          el.style.left = `${newX}px`;
          el.style.top = `${newY}px`;
        }
      }
    };

    const handleMouseUp = () => {
      if (dragState?.type === 'article' && dragState.articleId) {
        const pos = draggingArticlePosRef.current;
        setAssignedPositions(prev => {
          const next = new Map(prev);
          next.set(dragState.articleId!, { 'x': pos.x, 'y': pos.y });
          return next;
        });
      }
      setDragState(null);
      updateZoomDisplay();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, scheduleTransform, updateZoomDisplay]);

  const handleFitView = useCallback(() => {
    if (!viewportRef.current || articlePositions.length === 0) {
      return;
    }
    const rect = viewportRef.current.getBoundingClientRect();
    const minX = Math.min(...articlePositions.map(p => p.x));
    const minY = Math.min(...articlePositions.map(p => p.y));
    const maxX = Math.max(...articlePositions.map(p => p.x + ARTICLE_WIDTH));
    const maxY = Math.max(...articlePositions.map(p => p.y + ARTICLE_VIEW_HEIGHT));
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const fitZoom = Math.min(
      (rect.width - 80) / contentWidth,
      (rect.height - 80) / contentHeight,
      1.0
    );
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, fitZoom));
    zoomRef.current = newZoom;
    panRef.current = {
      'x': (rect.width - contentWidth * newZoom) / 2 - minX * newZoom,
      'y': (rect.height - contentHeight * newZoom) / 2 - minY * newZoom
    };
    applyTransform();
    updateZoomDisplay();
  }, [articlePositions, applyTransform, updateZoomDisplay]);

  const handleZoomIn = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const oldZoom = zoomRef.current;
    const newZoom = Math.min(ZOOM_MAX, oldZoom + ZOOM_STEP);
    const scale = newZoom / oldZoom;
    panRef.current = {
      'x': centerX - (centerX - panRef.current.x) * scale,
      'y': centerY - (centerY - panRef.current.y) * scale
    };
    zoomRef.current = newZoom;
    applyTransform();
    updateZoomDisplay();
  }, [applyTransform, updateZoomDisplay]);

  const handleZoomOut = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const oldZoom = zoomRef.current;
    const newZoom = Math.max(ZOOM_MIN, oldZoom - ZOOM_STEP);
    const scale = newZoom / oldZoom;
    panRef.current = {
      'x': centerX - (centerX - panRef.current.x) * scale,
      'y': centerY - (centerY - panRef.current.y) * scale
    };
    zoomRef.current = newZoom;
    applyTransform();
    updateZoomDisplay();
  }, [applyTransform, updateZoomDisplay]);

  const isDragging = dragState !== null;
  const cursorClass = isDragging ? 'cursor-grabbing' : 'cursor-grab';

  const positionMap = useMemo(() => {
    const map = new Map<string, ArticlePosition>();
    for (const p of articlePositions) {
      map.set(p.articleId, p);
    }
    return map;
  }, [articlePositions]);

  if (articles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-neutral-500 dark:text-neutral-400">
        <p>暂无文章，请添加文章</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
      <div
        ref={viewportRef}
        className={`w-full h-full ${cursorClass}`}
        onMouseDown={handleCanvasMouseDown}
        data-canvas="true"
      >
        <div
          ref={canvasRef}
          style={{
            'transformOrigin': '0 0',
            'willChange': 'transform'
          }}
          data-canvas="true"
        >
          {articles.map(article => {
            const pos = positionMap.get(article.id);
            if (!pos) {
              return null;
            }
            return (
              <div
                key={article.id}
                data-article-id={article.id}
                className="absolute"
                style={{
                  'left': `${pos.x}px`,
                  'top': `${pos.y}px`,
                  'width': `${ARTICLE_WIDTH}px`
                }}
              >
                <ArticlePagePreview
                  article={article}
                  onRemove={() => onRemoveArticle(article.id)}
                  onView={() => onSelectArticle(article.id)}
                  onDragHandleMouseDown={(e) => handleArticleDragStart(article.id, e)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <ConnectionInteraction
        onJumpToArticle={onJumpToArticle}
      />

      <CrossArticleConnectionLines
        viewportRef={viewportRef}
        canvasRef={canvasRef}
        panRef={panRef}
        zoomRef={zoomRef}
      />

      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-1">
        <button
          onClick={handleZoomOut}
          disabled={zoomAtBounds.atMin}
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button
          onClick={handleFitView}
          className="px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100 rounded transition-colors min-w-[3.5rem] text-center"
        >
          {zoomDisplay}%
        </button>
        <button
          onClick={handleZoomIn}
          disabled={zoomAtBounds.atMax}
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function MultiViewer (props: MultiViewerProps) {
  return <MultiViewerInner {...props} />;
}
