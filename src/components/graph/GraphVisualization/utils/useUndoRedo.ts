import { useCallback, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';

interface GraphState {
  'nodes': Node[];
  'edges': Edge[];
}

interface UseUndoRedoReturn {
  'undo': () => GraphState;
  'redo': () => GraphState;
  'canUndo': boolean;
  'canRedo': boolean;
  'saveState': (nodes: Node[], edges: Edge[]) => void;
  'clearHistory': () => void;
}

const MAX_HISTORY_SIZE = 50;
const DEBOUNCE_DELAY = 300;

export const useUndoRedo = (): UseUndoRedoReturn => {
  const historyRef = useRef<GraphState[]>([]);
  const futureRef = useRef<GraphState[]>([]);
  const currentStateRef = useRef<GraphState | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const saveState = useCallback((nodes: Node[], edges: Edge[]) => {
    const newState: GraphState = {
      'nodes': JSON.parse(JSON.stringify(nodes)),
      'edges': JSON.parse(JSON.stringify(edges))
    };

    if (!currentStateRef.current) {
      currentStateRef.current = newState;
      return;
    }

    const isSameState =
      JSON.stringify(currentStateRef.current.nodes) === JSON.stringify(newState.nodes) &&
      JSON.stringify(currentStateRef.current.edges) === JSON.stringify(newState.edges);

    if (!isSameState) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        historyRef.current.push(currentStateRef.current!);
        if (historyRef.current.length > MAX_HISTORY_SIZE) {
          historyRef.current.shift();
        }
        futureRef.current = [];
        currentStateRef.current = newState;
        updateUndoRedoState();
      }, DEBOUNCE_DELAY);
    }
  }, [updateUndoRedoState]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) {
      return { 'nodes': [], 'edges': [] };
    }

    const previousState = historyRef.current.pop()!;
    if (currentStateRef.current) {
      futureRef.current.push(currentStateRef.current);
    }
    currentStateRef.current = previousState;

    updateUndoRedoState();

    return {
      'nodes': JSON.parse(JSON.stringify(previousState.nodes)),
      'edges': JSON.parse(JSON.stringify(previousState.edges))
    };
  }, [updateUndoRedoState]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) {
      return { 'nodes': [], 'edges': [] };
    }

    const nextState = futureRef.current.pop()!;
    if (currentStateRef.current) {
      historyRef.current.push(currentStateRef.current);
    }
    currentStateRef.current = nextState;

    updateUndoRedoState();

    return {
      'nodes': JSON.parse(JSON.stringify(nextState.nodes)),
      'edges': JSON.parse(JSON.stringify(nextState.edges))
    };
  }, [updateUndoRedoState]);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    futureRef.current = [];
    currentStateRef.current = null;
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    saveState,
    clearHistory
  };
};
