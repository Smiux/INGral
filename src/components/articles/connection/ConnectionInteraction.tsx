import { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, ArrowRight, ArrowLeft, X } from 'lucide-react';
import {
  ConnectionContext,
  type ExtendedConnectionContextValue,
  type Connection,
  type ConnectionPoint
} from './types';

interface ConnectionInteractionProps {
  'interactive'?: boolean;
  'currentArticleId'?: string;
  'onJumpToArticle'?: ((articleId: string, pointId: string, direction: 'source' | 'target', connectionId?: string) => void) | undefined;
  'onJumpToPoint'?: ((pointId: string) => void) | undefined;
}

interface MenuPosition {
  'left': number;
  'top': number;
}

function getClickPositionOnPath (path: SVGPathElement, clickX: number, clickY: number): MenuPosition {
  try {
    const length = path.getTotalLength();
    const svgEl = path.closest('svg');
    if (!svgEl) {
      return { 'left': clickX, 'top': clickY };
    }
    const svgRect = svgEl.getBoundingClientRect();

    let closestDist = Infinity;
    let closestPoint = { 'x': 0, 'y': 0 };
    const steps = 20;
    for (let i = 0; i <= steps; i += 1) {
      const pt = path.getPointAtLength((length * i) / steps);
      const screenX = svgRect.left + pt.x;
      const screenY = svgRect.top + pt.y;
      const dist = Math.sqrt((screenX - clickX) ** 2 + (screenY - clickY) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        closestPoint = { 'x': screenX, 'y': screenY };
      }
    }
    return { 'left': closestPoint.x, 'top': closestPoint.y };
  } catch {
    return { 'left': clickX, 'top': clickY };
  }
}

export function ConnectionInteraction ({
  interactive = true,
  currentArticleId,
  onJumpToArticle,
  onJumpToPoint
}: ConnectionInteractionProps) {
  const { state, updateConnectionLabel } = useContext(ConnectionContext) as ExtendedConnectionContextValue;
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<MenuPosition | null>(null);
  const [menuConnection, setMenuConnection] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [jumpMenuConnection, setJumpMenuConnection] = useState<string | null>(null);
  const [jumpMenuPosition, setJumpMenuPosition] = useState<MenuPosition | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const clickPosRef = useRef<{ 'x': number; 'y': number }>({ 'x': 0, 'y': 0 });

  const allConnections = Array.from(state.connections.values());

  useEffect(() => {
    if (editingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
    }
  }, [editingLabel]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as Element;
      const path = target.closest('path[data-connection-id]');
      if (path) {
        const connId = path.getAttribute('data-connection-id');
        if (connId) {
          setHoveredConnection(connId);
          setHoverPosition({ 'left': e.clientX, 'top': e.clientY });
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as Element;
      const path = target.closest('path[data-connection-id]');
      if (path) {
        const relatedTarget = e.relatedTarget as Element;
        if (!relatedTarget || !relatedTarget.closest('path[data-connection-id]')) {
          setHoveredConnection(null);
          setHoverPosition(null);
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const path = target.closest('path[data-connection-id]');
      if (path) {
        const connId = path.getAttribute('data-connection-id');
        if (connId) {
          e.preventDefault();
          e.stopPropagation();
          clickPosRef.current = { 'x': e.clientX, 'y': e.clientY };
          const pos = getClickPositionOnPath(path as SVGPathElement, e.clientX, e.clientY);
          setJumpMenuConnection(connId);
          setJumpMenuPosition({ 'left': pos.left, 'top': pos.top - 10 });
          setMenuConnection(null);
          setHoveredConnection(null);
          setHoverPosition(null);
        }
      } else if (!target.closest('[data-connection-menu]') && !target.closest('[data-jump-menu]')) {
        setJumpMenuConnection(null);
        setMenuConnection(null);
        setEditingLabel(null);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as Element;
      const path = target.closest('path[data-connection-id]');
      if (path) {
        const connId = path.getAttribute('data-connection-id');
        if (connId && interactive) {
          e.preventDefault();
          e.stopPropagation();
          clickPosRef.current = { 'x': e.clientX, 'y': e.clientY };
          const pos = getClickPositionOnPath(path as SVGPathElement, e.clientX, e.clientY);
          setMenuConnection(connId);
          setMenuPosition({ 'left': pos.left, 'top': pos.top - 10 });
          setJumpMenuConnection(null);
          setHoveredConnection(null);
          setHoverPosition(null);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [interactive]);

  const handleEditLabel = useCallback((connId: string) => {
    const conn = state.connections.get(connId);
    if (conn) {
      setEditingLabel(connId);
      setLabelInput(conn.label);
      setMenuConnection(null);
    }
  }, [state.connections]);

  const handleSaveLabel = useCallback(() => {
    if (editingLabel) {
      updateConnectionLabel(editingLabel, labelInput);
      setEditingLabel(null);
      setLabelInput('');
    }
  }, [editingLabel, labelInput, updateConnectionLabel]);

  const handleCancelEdit = useCallback(() => {
    setEditingLabel(null);
    setLabelInput('');
  }, []);

  const handleJump = useCallback((connId: string, direction: 'source' | 'target') => {
    const conn = state.connections.get(connId);
    if (!conn) {
      return;
    }

    const pointId = direction === 'source' ? conn.sourcePointId : conn.targetPointId;
    const point = state.points.get(pointId);
    if (!point) {
      return;
    }

    if (onJumpToArticle) {
      onJumpToArticle(point.articleId, pointId, direction, connId);
    } else if (onJumpToPoint) {
      onJumpToPoint(pointId);
    }

    setJumpMenuConnection(null);
  }, [state.connections, state.points, onJumpToArticle, onJumpToPoint]);

  const getConnectionInfo = (connId: string): { conn: Connection; sourcePoint: ConnectionPoint | undefined; targetPoint: ConnectionPoint | undefined } | null => {
    const conn = state.connections.get(connId);
    if (!conn) {
      return null;
    }
    return {
      conn,
      'sourcePoint': state.points.get(conn.sourcePointId),
      'targetPoint': state.points.get(conn.targetPointId)
    };
  };

  const hoveredConn = hoveredConnection ? getConnectionInfo(hoveredConnection) : null;
  const menuConn = menuConnection ? getConnectionInfo(menuConnection) : null;
  const jumpConn = jumpMenuConnection ? getConnectionInfo(jumpMenuConnection) : null;

  const labelTooltip = hoveredConn && hoverPosition && hoveredConn.conn.label && !jumpMenuConnection && !menuConnection && !editingLabel && (
    <div
      className="fixed z-50 px-2 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 rounded shadow-md pointer-events-none max-w-[200px] truncate"
      style={{ 'left': hoverPosition.left, 'top': hoverPosition.top - 30, 'transform': 'translateX(-50%)' }}
    >
      {hoveredConn.conn.label}
    </div>
  );

  const editMenu = menuConn && menuPosition && (
    <div
      data-connection-menu
      className="fixed z-50 flex items-center gap-1 px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-md"
      style={{ 'left': menuPosition.left, 'top': menuPosition.top, 'transform': 'translate(-50%, -100%)' }}
    >
      <button
        onClick={() => handleEditLabel(menuConnection!)}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-xs"
      >
        <Pencil className="w-3 h-3" />
        编辑标签
      </button>
      <button
        onClick={() => setMenuConnection(null)}
        className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const editLabelInput = editingLabel && (
    <div
      className="fixed z-50 inset-0 flex items-center justify-center bg-black/20"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancelEdit();
        }
      }}
    >
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg p-4 w-80" data-connection-menu>
        <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3">编辑连接标签</h3>
        <input
          ref={labelInputRef}
          type="text"
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSaveLabel();
            } else if (e.key === 'Escape') {
              handleCancelEdit();
            }
          }}
          className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="输入标签..."
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={handleCancelEdit}
            className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSaveLabel}
            className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );

  const isInternalConnection = (conn: Connection): boolean => {
    const sourcePoint = state.points.get(conn.sourcePointId);
    const targetPoint = state.points.get(conn.targetPointId);
    return sourcePoint !== undefined && targetPoint !== undefined && sourcePoint.articleId === targetPoint.articleId;
  };

  const isOutgoing = (conn: Connection): boolean => {
    if (!currentArticleId) {
      return false;
    }
    const sourcePoint = state.points.get(conn.sourcePointId);
    return sourcePoint !== undefined && sourcePoint.articleId === currentArticleId;
  };

  const isIncoming = (conn: Connection): boolean => {
    if (!currentArticleId) {
      return false;
    }
    const targetPoint = state.points.get(conn.targetPointId);
    return targetPoint !== undefined && targetPoint.articleId === currentArticleId;
  };

  const getJumpButtons = (conn: Connection, sourcePoint: ConnectionPoint | undefined, targetPoint: ConnectionPoint | undefined) => {
    const internal = isInternalConnection(conn);
    const outgoing = isOutgoing(conn);
    const incoming = isIncoming(conn);

    const buttons: Array<{ direction: 'source' | 'target'; label: string; className: string; icon: typeof ArrowRight }> = [];

    if (internal) {
      buttons.push({ 'direction': 'target', 'label': '跳转到目标', 'className': 'bg-indigo-500 hover:bg-indigo-600', 'icon': ArrowRight });
      buttons.push({ 'direction': 'source', 'label': '跳转到源头', 'className': 'bg-violet-500 hover:bg-violet-600', 'icon': ArrowLeft });
    } else if (outgoing && targetPoint) {
      buttons.push({ 'direction': 'target', 'label': '跳转到目标', 'className': 'bg-indigo-500 hover:bg-indigo-600', 'icon': ArrowRight });
    } else if (incoming && sourcePoint) {
      buttons.push({ 'direction': 'source', 'label': '跳转到源头', 'className': 'bg-violet-500 hover:bg-violet-600', 'icon': ArrowLeft });
    } else {
      if (targetPoint) {
        buttons.push({ 'direction': 'target', 'label': '跳转到目标', 'className': 'bg-indigo-500 hover:bg-indigo-600', 'icon': ArrowRight });
      }
      if (sourcePoint) {
        buttons.push({ 'direction': 'source', 'label': '跳转到源头', 'className': 'bg-violet-500 hover:bg-violet-600', 'icon': ArrowLeft });
      }
    }

    return buttons;
  };

  const jumpMenu = jumpConn && jumpMenuPosition && (
    <div
      data-jump-menu
      className="fixed z-50 flex items-center gap-1 px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-md"
      style={{ 'left': jumpMenuPosition.left, 'top': jumpMenuPosition.top, 'transform': 'translate(-50%, -100%)' }}
    >
      {getJumpButtons(jumpConn.conn, jumpConn.sourcePoint, jumpConn.targetPoint).map(btn => (
        <button
          key={btn.direction}
          onClick={() => handleJump(jumpMenuConnection!, btn.direction)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-white rounded-lg transition-colors text-xs ${btn.className}`}
        >
          <btn.icon className="w-3 h-3" />
          {btn.label}
        </button>
      ))}
      <button
        onClick={() => setJumpMenuConnection(null)}
        className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  if (allConnections.length === 0) {
    return null;
  }

  return createPortal(
    <>
      {labelTooltip}
      {editMenu}
      {editLabelInput}
      {jumpMenu}
    </>,
    document.body
  );
}
