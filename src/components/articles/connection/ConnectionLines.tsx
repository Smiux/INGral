import { useEffect, useRef, useCallback, useState, useMemo, useContext } from 'react';
import {
  ConnectionContext,
  type ExtendedConnectionContextValue,
  type ConnectionPoint
} from './types';

interface PointPosition {
  x: number;
  y: number;
}

interface ArticleRect {
  x: number;
  y: number;
  width: number;
  height: number;
  articleId: string;
}

interface ArticleConnectionLinesProps {
  articleId: string;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  editorRef?: React.RefObject<{ getEditor: () => import('@tiptap/react').Editor | null } | null>;
  renderedArticleIds?: string[] | undefined;
  renderCrossArticle?: boolean;
}

const EXTERNAL_POINT_OFFSET = 500;

export function ArticleConnectionLines ({
  articleId,
  scrollContainerRef,
  editorRef,
  renderedArticleIds,
  renderCrossArticle = true
}: ArticleConnectionLinesProps) {
  const { state } = useContext(ConnectionContext) as ExtendedConnectionContextValue;
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const [contentHeight, setContentHeight] = useState(0);

  const articlePoints = useMemo(
    () => Array.from(state.points.values()).filter(p => p.articleId === articleId),
    [state.points, articleId]
  );

  const articlePointIds = useMemo(
    () => new Set(articlePoints.map(p => p.id)),
    [articlePoints]
  );

  const internalConnections = useMemo(
    () => Array.from(state.connections.values()).filter(
      c => articlePointIds.has(c.sourcePointId) && articlePointIds.has(c.targetPointId)
    ),
    [state.connections, articlePointIds]
  );

  const crossArticleConnections = useMemo(
    () => Array.from(state.connections.values()).filter(
      c => (articlePointIds.has(c.sourcePointId) && !articlePointIds.has(c.targetPointId)) ||
           (articlePointIds.has(c.targetPointId) && !articlePointIds.has(c.sourcePointId))
    ),
    [state.connections, articlePointIds]
  );

  const getElementOffset = useCallback((element: HTMLElement, container: HTMLElement): { x: number; y: number } => {
    let x = element.offsetLeft;
    let y = element.offsetTop;
    let current: HTMLElement | null = element.offsetParent as HTMLElement;

    while (current && current !== container) {
      x += current.offsetLeft;
      y += current.offsetTop;
      current = current.offsetParent as HTMLElement;
    }

    if (current === container) {
      return { x, y };
    }

    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    let zoom = 1;
    let parent: HTMLElement | null = container.parentElement;
    while (parent) {
      const transform = window.getComputedStyle(parent).transform;
      if (transform && transform !== 'none') {
        const match = transform.match(/matrix\(([^)]+)\)/);
        if (match && match[1]) {
          const values = match[1].split(',').map(v => parseFloat(v.trim()));
          const scaleX = values[0];
          if (scaleX !== undefined && !Number.isNaN(scaleX)) {
            zoom = scaleX;
            break;
          }
        }
      }
      parent = parent.parentElement;
    }

    return {
      'x': (elementRect.left - containerRect.left) / zoom + container.scrollLeft,
      'y': (elementRect.top - containerRect.top) / zoom + container.scrollTop
    };
  }, []);

  const updateLines = useCallback(() => {
    const svg = svgRef.current;
    const container = scrollContainerRef.current;
    if (!svg || !container) {
      return;
    }

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const allConnections = renderCrossArticle
      ? [...internalConnections, ...crossArticleConnections]
      : internalConnections;
    if (allConnections.length === 0) {
      return;
    }

    const contentElement = container.querySelector('article') as HTMLElement ||
      container.querySelector('main') as HTMLElement ||
      container;
    if (contentElement) {
      setContentHeight(contentElement.offsetHeight);
    }

    const pointPositions = new Map<string, PointPosition>();
    const pointColors = new Map<string, string>();

    for (const point of articlePoints) {
      const marker = contentElement.querySelector(`[data-connection-point-id="${point.id}"]`) as HTMLElement;
      if (marker) {
        const pos = getElementOffset(marker, contentElement);
        pointPositions.set(point.id, {
          'x': pos.x + marker.offsetWidth / 2,
          'y': pos.y + marker.offsetHeight / 2
        });
        pointColors.set(point.id, point.color);
      }
    }

    const renderedArticleIdsSet = renderedArticleIds ? new Set(renderedArticleIds) : null;
    const editor = editorRef?.current?.getEditor();

    const estimateVirtualY = (externalPoint: ConnectionPoint): number => {
      if (!editor) {
        return externalPoint.documentPos * (contentElement.scrollHeight / Math.max(1, 1000));
      }

      const docSize = editor.state.doc.content.size;
      const clampedPos = Math.max(1, Math.min(externalPoint.documentPos, docSize - 1));

      try {
        const coords = editor.view.coordsAtPos(clampedPos);
        const contentRect = contentElement.getBoundingClientRect();
        return coords.top - contentRect.top + contentElement.scrollTop;
      } catch {
        return externalPoint.documentPos * (contentElement.scrollHeight / Math.max(1, docSize));
      }
    };

    for (const conn of crossArticleConnections) {
      const isOutgoing = articlePointIds.has(conn.sourcePointId);
      const externalPointId = isOutgoing ? conn.targetPointId : conn.sourcePointId;
      const externalPoint = state.points.get(externalPointId);

      if (!pointPositions.has(externalPointId) && externalPoint) {
        const externalArticleRendered = renderedArticleIdsSet
          ? renderedArticleIdsSet.has(externalPoint.articleId)
          : false;

        if (externalArticleRendered) {
          const externalMarker = document.querySelector(
            `[data-connection-point-id="${externalPointId}"]`
          ) as HTMLElement;

          if (externalMarker) {
            const markerRect = externalMarker.getBoundingClientRect();
            const contentRect = contentElement.getBoundingClientRect();

            pointPositions.set(externalPointId, {
              'x': markerRect.left - contentRect.left + contentElement.scrollLeft + markerRect.width / 2,
              'y': markerRect.top - contentRect.top + contentElement.scrollTop + markerRect.height / 2
            });
            pointColors.set(externalPointId, externalPoint.color);
          }
        } else {
          const estimatedY = Math.max(20, Math.min(estimateVirtualY(externalPoint), contentElement.scrollHeight - 20));
          const externalX = isOutgoing
            ? contentElement.offsetWidth + EXTERNAL_POINT_OFFSET
            : -EXTERNAL_POINT_OFFSET;

          pointPositions.set(externalPointId, { 'x': externalX, 'y': estimatedY });
          pointColors.set(externalPointId, externalPoint.color);
        }
      }
    }

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);

    for (const connection of allConnections) {
      const sourcePos = pointPositions.get(connection.sourcePointId);
      const targetPos = pointPositions.get(connection.targetPointId);
      const sourceColor = pointColors.get(connection.sourcePointId) || '#6366f1';

      if (sourcePos && targetPos) {
        const markerId = `arrowhead-${connection.id}`;
        const arrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        arrowMarker.setAttribute('id', markerId);
        arrowMarker.setAttribute('markerWidth', '8');
        arrowMarker.setAttribute('markerHeight', '6');
        arrowMarker.setAttribute('refX', '7');
        arrowMarker.setAttribute('refY', '3');
        arrowMarker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 8 3, 0 6');
        polygon.setAttribute('fill', sourceColor);
        arrowMarker.appendChild(polygon);
        defs.appendChild(arrowMarker);

        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const curvature = Math.min(dist * 0.15, 40);
        const controlX = midX - dy * curvature / dist;
        const controlY = midY + dx * curvature / dist;

        const d = `M ${sourcePos.x} ${sourcePos.y} Q ${controlX} ${controlY} ${targetPos.x} ${targetPos.y}`;

        const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitArea.setAttribute('d', d);
        hitArea.setAttribute('fill', 'none');
        hitArea.setAttribute('stroke', 'transparent');
        hitArea.setAttribute('stroke-width', '12');
        hitArea.setAttribute('data-connection-id', connection.id);
        hitArea.setAttribute('pointer-events', 'stroke');
        hitArea.style.cursor = 'pointer';
        try {
          const pathLength = hitArea.getTotalLength();
          const gap = 40;
          if (pathLength > gap * 2) {
            const middle = pathLength - gap * 2;
            hitArea.setAttribute('stroke-dasharray', `0 ${gap} ${middle} ${gap}`);
          }
        } catch {
          // ignore
        }
        svg.appendChild(hitArea);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', sourceColor);
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('marker-end', `url(#${markerId})`);
        path.setAttribute('pointer-events', 'none');
        svg.appendChild(path);
      }
    }
  }, [internalConnections, crossArticleConnections, articlePoints, scrollContainerRef, articlePointIds, state.points, getElementOffset, editorRef, renderedArticleIds, renderCrossArticle]);

  const scheduleUpdate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateLines);
  }, [updateLines]);

  useEffect(() => {
    scheduleUpdate();
  }, [internalConnections, crossArticleConnections, articlePoints, scheduleUpdate]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return undefined;
    }

    container.addEventListener('scroll', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      container.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [scrollContainerRef, scheduleUpdate]);

  if (articlePoints.length === 0) {
    return null;
  }

  const allConnections = renderCrossArticle
    ? [...internalConnections, ...crossArticleConnections]
    : internalConnections;
  if (allConnections.length === 0) {
    return null;
  }

  return (
    <svg
      ref={svgRef}
      className="absolute top-0 left-0 z-10"
      style={{
        'width': '100%',
        'height': contentHeight > 0 ? `${contentHeight}px` : '100%',
        'overflow': 'visible'
      }}
      pointerEvents="none"
    />
  );
}

interface CrossArticleConnectionLinesProps {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  zoomRef: React.MutableRefObject<number>;
}

export function CrossArticleConnectionLines ({
  viewportRef,
  canvasRef,
  panRef,
  zoomRef
}: CrossArticleConnectionLinesProps) {
  const { state } = useContext(ConnectionContext) as ExtendedConnectionContextValue;
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const [svgSize, setSvgSize] = useState({ 'width': 0, 'height': 0 });
  const [transform, setTransform] = useState({ 'x': 0, 'y': 0, 'zoom': 1 });

  const crossArticleConnections = Array.from(state.connections.values()).filter(conn => {
    const sourcePoint = state.points.get(conn.sourcePointId);
    const targetPoint = state.points.get(conn.targetPointId);
    return sourcePoint && targetPoint && sourcePoint.articleId !== targetPoint.articleId;
  });

  const getArticleRects = useCallback((canvas: HTMLElement): ArticleRect[] => {
    const articleElements = canvas.querySelectorAll('[data-article-id]') as NodeListOf<HTMLElement>;
    const rects: ArticleRect[] = [];

    articleElements.forEach(el => {
      const articleStyle = window.getComputedStyle(el);
      const articleLeft = parseFloat(articleStyle.left) || 0;
      const articleTop = parseFloat(articleStyle.top) || 0;

      const scrollContainer = el.querySelector('[data-article-scroll="true"]') as HTMLElement;
      const scrollHeight = scrollContainer ? scrollContainer.scrollHeight : 900;
      const headerHeight = 41;

      rects.push({
        'x': articleLeft,
        'y': articleTop,
        'width': el.offsetWidth,
        'height': headerHeight + scrollHeight,
        'articleId': el.dataset.articleId || ''
      });
    });

    return rects;
  }, []);

  const getPointCanvasPosition = useCallback((pointId: string, canvas: HTMLElement): PointPosition | null => {
    const marker = canvas.querySelector(`[data-connection-point-id="${pointId}"]`) as HTMLElement;
    if (!marker) {
      return null;
    }

    const markerRect = marker.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const zoom = zoomRef.current;

    const x = (markerRect.left + markerRect.width / 2 - canvasRect.left) / zoom;
    const y = (markerRect.top + markerRect.height / 2 - canvasRect.top) / zoom;

    return { x, y };
  }, [zoomRef]);

  const updateLines = useCallback(() => {
    const svg = svgRef.current;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!svg || !viewport || !canvas) {
      return;
    }

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    if (crossArticleConnections.length === 0) {
      return;
    }

    const zoom = zoomRef.current;
    const pan = panRef.current;

    const articleRects = getArticleRects(canvas);
    const pointPositions = new Map<string, PointPosition>();
    const pointColors = new Map<string, string>();

    const processedPointIds = new Set<string>();

    for (const conn of crossArticleConnections) {
      for (const pointId of [conn.sourcePointId, conn.targetPointId]) {
        if (!processedPointIds.has(pointId)) {
          processedPointIds.add(pointId);
          const pos = getPointCanvasPosition(pointId, canvas);
          if (pos) {
            pointPositions.set(pointId, pos);
          }
          const point = state.points.get(pointId);
          if (point) {
            pointColors.set(pointId, point.color);
          }
        }
      }
    }

    const viewportRect = viewport.getBoundingClientRect();

    setSvgSize({
      'width': viewportRect.width,
      'height': viewportRect.height
    });

    setTransform({
      'x': pan.x,
      'y': pan.y,
      zoom
    });

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    const clipPathId = 'article-clip-cross';
    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clipPath.setAttribute('id', clipPathId);

    for (const rect of articleRects) {
      const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      clipRect.setAttribute('x', `${rect.x}`);
      clipRect.setAttribute('y', `${rect.y}`);
      clipRect.setAttribute('width', `${rect.width}`);
      clipRect.setAttribute('height', `${rect.height}`);
      clipPath.appendChild(clipRect);
    }
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linesGroup.setAttribute('clip-path', `url(#${clipPathId})`);

    for (const connection of crossArticleConnections) {
      const sourcePos = pointPositions.get(connection.sourcePointId);
      const targetPos = pointPositions.get(connection.targetPointId);
      const sourceColor = pointColors.get(connection.sourcePointId) || '#6366f1';

      if (sourcePos && targetPos) {
        const markerId = `arrowhead-cross-${connection.id}`;
        const arrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        arrowMarker.setAttribute('id', markerId);
        arrowMarker.setAttribute('markerWidth', '8');
        arrowMarker.setAttribute('markerHeight', '6');
        arrowMarker.setAttribute('refX', '7');
        arrowMarker.setAttribute('refY', '3');
        arrowMarker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 8 3, 0 6');
        polygon.setAttribute('fill', sourceColor);
        arrowMarker.appendChild(polygon);
        defs.appendChild(arrowMarker);

        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const curvature = Math.min(dist * 0.15, 40);
        const controlX = midX - dy * curvature / dist;
        const controlY = midY + dx * curvature / dist;

        const d = `M ${sourcePos.x} ${sourcePos.y} Q ${controlX} ${controlY} ${targetPos.x} ${targetPos.y}`;

        const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitArea.setAttribute('d', d);
        hitArea.setAttribute('fill', 'none');
        hitArea.setAttribute('stroke', 'transparent');
        hitArea.setAttribute('stroke-width', '12');
        hitArea.setAttribute('data-connection-id', connection.id);
        hitArea.setAttribute('pointer-events', 'stroke');
        hitArea.style.cursor = 'pointer';
        try {
          const pathLength = hitArea.getTotalLength();
          const gap = 40;
          if (pathLength > gap * 2) {
            const middle = pathLength - gap * 2;
            hitArea.setAttribute('stroke-dasharray', `0 ${gap} ${middle} ${gap}`);
          }
        } catch {
          // ignore
        }
        linesGroup.appendChild(hitArea);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', sourceColor);
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('marker-end', `url(#${markerId})`);
        path.setAttribute('pointer-events', 'none');
        linesGroup.appendChild(path);
      }
    }

    svg.appendChild(linesGroup);
  }, [crossArticleConnections, viewportRef, canvasRef, getPointCanvasPosition, panRef, zoomRef, getArticleRects, state.points]);

  const scheduleUpdate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateLines);
  }, [updateLines]);

  useEffect(() => {
    scheduleUpdate();
  }, [crossArticleConnections, scheduleUpdate]);

  useEffect(() => {
    const handleScroll = () => {
      scheduleUpdate();
    };

    window.addEventListener('scroll', handleScroll, true);
    const intervalId = setInterval(scheduleUpdate, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      clearInterval(intervalId);
      cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleUpdate]);

  if (crossArticleConnections.length === 0) {
    return null;
  }

  return (
    <svg
      ref={svgRef}
      className="absolute z-10"
      style={{
        'left': `${transform.x}px`,
        'top': `${transform.y}px`,
        'width': `${svgSize.width / transform.zoom}px`,
        'height': `${svgSize.height / transform.zoom}px`,
        'transform': `scale(${transform.zoom})`,
        'transformOrigin': '0 0',
        'overflow': 'visible'
      }}
      pointerEvents="none"
    />
  );
}
