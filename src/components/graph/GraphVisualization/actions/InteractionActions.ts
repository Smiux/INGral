import { useCallback } from 'react';
import type { EnhancedNode } from '../types';
import type { GraphAction } from '../GraphContextType';

interface InteractionActionsProps {
  dispatch: React.Dispatch<GraphAction>;
}

export const useInteractionActions = ({ dispatch }: InteractionActionsProps) => {
  // 交互操作
  const setIsAddingConnection = useCallback((isAddingConnection: boolean) => {
    dispatch({ 'type': 'SET_IS_ADDING_CONNECTION', 'payload': isAddingConnection });
  }, [dispatch]);

  const setConnectionSourceNode = useCallback((node: EnhancedNode | null) => {
    dispatch({ 'type': 'SET_CONNECTION_SOURCE_NODE', 'payload': node });
  }, [dispatch]);

  const setMousePosition = useCallback((position: { x: number; y: number } | null) => {
    dispatch({ 'type': 'SET_MOUSE_POSITION', 'payload': position });
  }, [dispatch]);

  const setIsSimulationRunning = useCallback((isRunning: boolean) => {
    dispatch({ 'type': 'SET_IS_SIMULATION_RUNNING', 'payload': isRunning });
  }, [dispatch]);

  return {
    setIsAddingConnection,
    setConnectionSourceNode,
    setMousePosition,
    setIsSimulationRunning
  };
};

export type InteractionActions = ReturnType<typeof useInteractionActions>;
