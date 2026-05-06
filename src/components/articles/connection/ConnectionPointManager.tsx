import { useState, useEffect, useCallback, useRef, useReducer, useLayoutEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Link2 } from 'lucide-react';
import {
  ConnectionContext,
  type ExtendedConnectionContextValue,
  type ConnectionPointManagerProps
} from './types';
import { updateConnectionPointDecorations } from '../extensions/ConnectionPointDecoration';

interface SelectionState {
  from: number;
  to: number;
  text: string;
}

interface Position {
  left: number;
  top: number;
}

type PositionState = {
  toolbar: Position | null;
  connectingMessage: Position | null;
};

type PositionAction = {
  type: 'UPDATE_POSITIONS';
  payload: PositionState;
} | {
  type: 'CLEAR';
};

function positionReducer (state: PositionState, action: PositionAction): PositionState {
  switch (action.type) {
    case 'UPDATE_POSITIONS':
      return action.payload;
    case 'CLEAR':
      return { 'toolbar': null, 'connectingMessage': null };
    default:
      return state;
  }
}

const MARKER_CLASS = 'connection-point-marker';
const TOOLBAR_CLASS = 'connection-point-toolbar';
const TOOLBAR_WIDTH = 200;
const TOOLBAR_HEIGHT = 40;

function getTransformZoom (element: HTMLElement): number {
  let zoom = 1;
  let parent: HTMLElement | null = element.parentElement;
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
  return zoom;
}

function getElementContentPosition (element: HTMLElement, scrollContainer: HTMLElement): Position {
  let left = element.offsetLeft;
  let top = element.offsetTop;
  let current: HTMLElement | null = element.offsetParent as HTMLElement;

  while (current && current !== scrollContainer) {
    left += current.offsetLeft;
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement;
  }

  return { left, top };
}

export function ConnectionPointManager ({
  articleId,
  editorRef,
  interactive = true
}: ConnectionPointManagerProps) {
  const {
    state,
    addPoint,
    removePoint,
    selectPoint,
    setConnecting,
    addConnection,
    getPointsByArticle
  } = useContext(ConnectionContext) as ExtendedConnectionContextValue;

  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [addButtonPosition, setAddButtonPosition] = useState<Position | null>(null);
  const [positions, dispatchPositions] = useReducer(positionReducer, { 'toolbar': null, 'connectingMessage': null });
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<Position | null>(null);
  const [editorDom, setEditorDom] = useState<HTMLElement | null>(null);
  const selectionRef = useRef<SelectionState | null>(null);

  const articlePoints = getPointsByArticle(articleId);

  useLayoutEffect(() => {
    if (editorDom) {
      return;
    }
    const editor = editorRef.current?.getEditor();
    if (editor) {
      try {
        const dom = editor.view.dom;
        if (dom) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setEditorDom(dom as HTMLElement);
        }
      } catch {
        // Editor view not available yet
      }
    }
  }, [editorRef, editorDom]);

  useEffect(() => {
    const editor = editorRef.current?.getEditor();
    if (!editor) {
      return;
    }
    updateConnectionPointDecorations(editor, articlePoints);
  }, [articlePoints, editorRef]);

  const calculatePositions = useCallback(() => {
    const editor = editorRef.current?.getEditor();
    if (!editor) {
      return { 'toolbar': null, 'connectingMessage': null };
    }

    let editorElement: HTMLElement;
    try {
      editorElement = editor.view.dom as HTMLElement;
    } catch {
      return { 'toolbar': null, 'connectingMessage': null };
    }

    let toolbar: Position | null = null;
    let connectingMessage: Position | null = null;

    if (state.selectedPointId) {
      const marker = editorElement.querySelector(
        `[data-connection-point-id="${state.selectedPointId}"]`
      ) as HTMLElement;

      if (marker) {
        const pos = getElementContentPosition(marker, editorElement);
        const containerWidth = editorElement.clientWidth;

        let left = pos.left + marker.offsetWidth / 2;
        const top = pos.top - TOOLBAR_HEIGHT - 8;

        if (left - TOOLBAR_WIDTH / 2 < 10) {
          left = TOOLBAR_WIDTH / 2 + 10;
        } else if (left + TOOLBAR_WIDTH / 2 > containerWidth - 10) {
          left = containerWidth - TOOLBAR_WIDTH / 2 - 10;
        }

        toolbar = { left, top };

        if (state.isConnecting) {
          const MESSAGE_WIDTH = 200;
          const MESSAGE_HEIGHT = 40;

          let msgLeft = pos.left + marker.offsetWidth / 2;
          const msgTop = pos.top - MESSAGE_HEIGHT - 8;

          if (msgLeft - MESSAGE_WIDTH / 2 < 10) {
            msgLeft = MESSAGE_WIDTH / 2 + 10;
          } else if (msgLeft + MESSAGE_WIDTH / 2 > containerWidth - 10) {
            msgLeft = containerWidth - MESSAGE_WIDTH / 2 - 10;
          }

          connectingMessage = { 'left': msgLeft, 'top': msgTop };
        }
      }
    }

    return { toolbar, connectingMessage };
  }, [state.selectedPointId, state.isConnecting, editorRef]);

  useLayoutEffect(() => {
    const newPositions = calculatePositions();
    dispatchPositions({ 'type': 'UPDATE_POSITIONS', 'payload': newPositions });
  }, [calculatePositions]);

  const calculateAddButtonPositionFromDOM = useCallback((): Position | null => {
    const editor = editorRef.current?.getEditor();
    if (!editor) {
      return null;
    }

    try {
      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) {
        return null;
      }

      const range = domSelection.getRangeAt(0);
      if (range.collapsed) {
        return null;
      }

      const editorElement = editor.view.dom as HTMLElement;
      const editorRect = editorElement.getBoundingClientRect();
      const zoom = getTransformZoom(editorElement);

      const startRect = range.getBoundingClientRect();
      if (!startRect || startRect.width === 0) {
        return null;
      }

      const relativeLeft = (startRect.left - editorRect.left + startRect.width / 2) / zoom;
      const relativeTop = (startRect.top - editorRect.top) / zoom;

      if (relativeLeft < 0 || relativeTop < 0) {
        return null;
      }

      return {
        'left': relativeLeft,
        'top': relativeTop - 36
      };
    } catch {
      return null;
    }
  }, [editorRef]);

  useEffect(() => {
    const editor = editorRef.current?.getEditor();
    if (!editor) {
      return undefined;
    }

    let rafId = 0;

    const updateSelection = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const { from, to, empty } = editor.state.selection;
        if (empty || from === to) {
          setSelection(null);
          setAddButtonPosition(null);
          selectionRef.current = null;
          return;
        }

        const text = editor.state.doc.textBetween(from, to);
        if (!text.trim()) {
          setSelection(null);
          setAddButtonPosition(null);
          selectionRef.current = null;
          return;
        }

        const newSelection = { from, to, text };
        selectionRef.current = newSelection;
        setSelection(newSelection);

        requestAnimationFrame(() => {
          const pos = calculateAddButtonPositionFromDOM();
          setAddButtonPosition(pos);
        });
      });
    };

    editor.on('selectionUpdate', updateSelection);

    const handleMouseUp = () => {
      setTimeout(updateSelection, 10);
    };

    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      cancelAnimationFrame(rafId);
      editor.off('selectionUpdate', updateSelection);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editorRef, calculateAddButtonPositionFromDOM]);

  useEffect(() => {
    const newPositions = calculatePositions();
    dispatchPositions({ 'type': 'UPDATE_POSITIONS', 'payload': newPositions });
  }, [state.selectedPointId, state.isConnecting, calculatePositions]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const marker = target.closest(`.${MARKER_CLASS}`);
      const toolbar = target.closest(`.${TOOLBAR_CLASS}`);

      if (marker) {
        const pointId = marker.getAttribute('data-connection-point-id');
        if (!pointId) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (state.isConnecting && state.selectedPointId && state.selectedPointId !== pointId) {
          addConnection(state.selectedPointId, pointId);
        } else {
          selectPoint(pointId);
        }
      } else if (!toolbar && (state.selectedPointId || state.isConnecting)) {
        selectPoint(null);
        setConnecting(false);
      }
    };

    const handleContextmenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const marker = target.closest(`.${MARKER_CLASS}`);
      if (!marker) {
        return;
      }

      const pointId = marker.getAttribute('data-connection-point-id');
      if (!pointId) {
        return;
      }

      e.preventDefault();
      removePoint(pointId);
    };

    const handleDblclick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const marker = target.closest(`.${MARKER_CLASS}`);
      if (!marker) {
        return;
      }

      const pointId = marker.getAttribute('data-connection-point-id');
      if (!pointId) {
        return;
      }

      e.preventDefault();
      selectPoint(pointId);
      setConnecting(true);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const marker = target.closest(`.${MARKER_CLASS}`);
      if (marker) {
        const pointId = marker.getAttribute('data-connection-point-id');
        if (pointId) {
          const rect = marker.getBoundingClientRect();
          setHoveredPointId(pointId);
          setTooltipPosition({
            'left': rect.left + rect.width / 2,
            'top': rect.top - 8
          });
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const marker = target.closest(`.${MARKER_CLASS}`);
      if (marker) {
        setHoveredPointId(null);
        setTooltipPosition(null);
      }
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('contextmenu', handleContextmenu, true);
    document.addEventListener('dblclick', handleDblclick, true);
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('contextmenu', handleContextmenu, true);
      document.removeEventListener('dblclick', handleDblclick, true);
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
    };
  }, [state.isConnecting, state.selectedPointId, selectPoint, addConnection, removePoint, setConnecting]);

  const handleAddPoint = useCallback(() => {
    const currentSelection = selectionRef.current;
    if (!currentSelection) {
      return;
    }
    addPoint(articleId, currentSelection.from, currentSelection.to, currentSelection.text);
    setSelection(null);
    setAddButtonPosition(null);
    selectionRef.current = null;
  }, [addPoint, articleId]);

  const handleCancelConnecting = useCallback(() => {
    setConnecting(false);
    selectPoint(null);
  }, [setConnecting, selectPoint]);

  if (!editorDom) {
    return null;
  }

  if (!interactive) {
    return null;
  }

  const hoveredPoint = hoveredPointId ? articlePoints.find(p => p.id === hoveredPointId) : null;

  const addButton = selection && addButtonPosition && (
    <button
      onClick={handleAddPoint}
      className="absolute z-50 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white text-xs font-medium rounded-full shadow-md hover:bg-indigo-600 hover:shadow-lg active:scale-95 transition-all cursor-pointer"
      style={{
        'left': `${addButtonPosition.left}px`,
        'top': `${addButtonPosition.top}px`,
        'transform': 'translateX(-50%)'
      }}
    >
      <Plus className="w-3.5 h-3.5" />
      添加连接点
    </button>
  );

  const connectingMessageEl = state.isConnecting && positions.connectingMessage && (
    <div
      className="absolute z-50 flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-md"
      style={{
        'left': `${positions.connectingMessage.left}px`,
        'top': `${positions.connectingMessage.top}px`,
        'transform': 'translateX(-50%)'
      }}
    >
      <span>选择要连接的连接点</span>
      <button
        onClick={handleCancelConnecting}
        className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition-colors"
      >
        取消
      </button>
    </div>
  );

  const toolbarEl = state.selectedPointId && !state.isConnecting && positions.toolbar && (
    <div
      className={`absolute z-50 flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm rounded-xl shadow-md ${TOOLBAR_CLASS}`}
      style={{
        'left': `${positions.toolbar.left}px`,
        'top': `${positions.toolbar.top}px`,
        'transform': 'translateX(-50%)'
      }}
    >
      <button
        onClick={() => setConnecting(true)}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
      >
        <Link2 className="w-3.5 h-3.5" />
        连接
      </button>
      <button
        onClick={() => {
          removePoint(state.selectedPointId!);
          selectPoint(null);
        }}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
        删除
      </button>
    </div>
  );

  const tooltipEl = hoveredPoint && tooltipPosition && (
    <div
      className="fixed z-[60] max-w-[300px] px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 rounded-lg shadow-lg whitespace-pre-wrap break-words"
      style={{
        'left': tooltipPosition.left,
        'top': tooltipPosition.top,
        'transform': 'translate(-50%, -100%)'
      }}
    >
      {hoveredPoint.selectedText}
    </div>
  );

  return createPortal(
    <>
      {addButton}
      {connectingMessageEl}
      {toolbarEl}
      {tooltipEl}
    </>,
    editorDom
  );
}
