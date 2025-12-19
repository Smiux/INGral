import { useCallback } from 'react';
import type { EnhancedNode, EnhancedGraphConnection } from '../types';
import type { GraphAction } from '../GraphContextType';

interface SelectionActionsProps {
  dispatch: React.Dispatch<GraphAction>;
}

export const useSelectionActions = ({ dispatch }: SelectionActionsProps) => {
  // 选择操作
  const selectNode = useCallback((node: EnhancedNode | null) => {
    dispatch({ 'type': 'SELECT_NODE', 'payload': node });
  }, [dispatch]);

  const selectNodes = useCallback((nodes: EnhancedNode[]) => {
    dispatch({ 'type': 'SELECT_NODES', 'payload': nodes });
  }, [dispatch]);

  const selectConnection = useCallback((connection: EnhancedGraphConnection | null) => {
    dispatch({ 'type': 'SELECT_CONNECTION', 'payload': connection });
  }, [dispatch]);

  const selectConnections = useCallback((connections: EnhancedGraphConnection[]) => {
    dispatch({ 'type': 'SELECT_CONNECTIONS', 'payload': connections });
  }, [dispatch]);

  const clearSelection = useCallback(() => {
    dispatch({ 'type': 'CLEAR_SELECTION' });
  }, [dispatch]);

  return {
    selectNode,
    selectNodes,
    selectConnection,
    selectConnections,
    clearSelection
  };
};

export type SelectionActions = ReturnType<typeof useSelectionActions>;
