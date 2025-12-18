import { useCallback } from 'react';
import type { RecentAction } from '../types';

interface HistoryActionsProps {
  dispatch: React.Dispatch<any>;
  state: any;
  showNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

export const useHistoryActions = ({ dispatch, state, showNotification }: HistoryActionsProps) => {
  // 历史记录操作
  const addHistory = useCallback((action: RecentAction) => {
    dispatch({ type: 'ADD_HISTORY', payload: action });
  }, [dispatch]);
  
  const undo = useCallback(() => {
    if (state.historyIndex >= 0) {
      dispatch({ type: 'UNDO' });
      showNotification('已撤销操作', 'info');
    }
  }, [state.historyIndex, showNotification]);
  
  const redo = useCallback(() => {
    if (state.historyIndex < state.history.length - 1) {
      dispatch({ type: 'REDO' });
      showNotification('已重做操作', 'info');
    }
  }, [state.historyIndex, state.history.length, showNotification]);

  return {
    addHistory,
    undo,
    redo
  };
};

export type HistoryActions = ReturnType<typeof useHistoryActions>;
