import { useCallback } from 'react';
import type { GraphTheme, NodeStyle, LinkStyle } from '../ThemeTypes';

interface UIActionsProps {
  dispatch: React.Dispatch<any>;
}

export const useUIActions = ({ dispatch }: UIActionsProps) => {
  // UI操作
  const setIsRightPanelVisible = useCallback((isVisible: boolean) => {
    dispatch({ type: 'SET_IS_RIGHT_PANEL_VISIBLE', payload: isVisible });
  }, [dispatch]);
  
  const setIsToolbarVisible = useCallback((isVisible: boolean) => {
    dispatch({ type: 'SET_IS_TOOLBAR_VISIBLE', payload: isVisible });
  }, [dispatch]);
  
  const setIsLeftToolbarVisible = useCallback((isVisible: boolean) => {
    dispatch({ type: 'SET_IS_LEFT_TOOLBAR_VISIBLE', payload: isVisible });
  }, [dispatch]);
  
  const setActivePanel = useCallback((panelId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: panelId });
  }, [dispatch]);
  
  const setCurrentTheme = useCallback((theme: GraphTheme) => {
    dispatch({ type: 'SET_CURRENT_THEME', payload: theme });
  }, [dispatch]);
  
  const setCopiedStyle = useCallback((style: { type: 'node' | 'connection'; style: NodeStyle | LinkStyle } | null) => {
    dispatch({ type: 'SET_COPIED_STYLE', payload: style });
  }, [dispatch]);
  
  const setIsBoxSelecting = useCallback((isSelecting: boolean) => {
    dispatch({ type: 'SET_IS_BOX_SELECTING', payload: isSelecting });
  }, [dispatch]);
  
  const setBoxSelection = useCallback((selection: { x1: number; y1: number; x2: number; y2: number }) => {
    dispatch({ type: 'SET_BOX_SELECTION', payload: selection });
  }, [dispatch]);
  
  const setIsSettingsPanelOpen = useCallback((isOpen: boolean) => {
    dispatch({ type: 'SET_IS_SETTINGS_PANEL_OPEN', payload: isOpen });
  }, [dispatch]);
  
  const setToolbarAutoHide = useCallback((autoHide: boolean) => {
    dispatch({ type: 'SET_TOOLBAR_AUTO_HIDE', payload: autoHide });
  }, [dispatch]);
  
  const setLeftToolbarAutoHide = useCallback((autoHide: boolean) => {
    dispatch({ type: 'SET_LEFT_TOOLBAR_AUTO_HIDE', payload: autoHide });
  }, [dispatch]);

  // 通知操作
  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error') => {
    dispatch({ type: 'SHOW_NOTIFICATION', payload: { message, type } });
  }, [dispatch]);
  
  const closeNotification = useCallback(() => {
    dispatch({ type: 'CLOSE_NOTIFICATION' });
  }, [dispatch]);

  return {
    setIsRightPanelVisible,
    setIsToolbarVisible,
    setIsLeftToolbarVisible,
    setActivePanel,
    setCurrentTheme,
    setCopiedStyle,
    setIsBoxSelecting,
    setBoxSelection,
    setIsSettingsPanelOpen,
    setToolbarAutoHide,
    setLeftToolbarAutoHide,
    showNotification,
    closeNotification
  };
};

export type UIActions = ReturnType<typeof useUIActions>;
