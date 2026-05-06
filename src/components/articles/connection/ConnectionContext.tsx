import React, { useReducer, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ConnectionContext,
  type ConnectionPoint,
  type Connection,
  type ConnectionState,
  type ConnectionAction,
  type ConnectionContextValue
} from './types';
import {
  getConnectionPointsByArticles,
  getConnectionsByPointIds,
  getConnectionPointsByIds,
  saveConnectionData,
  type ConnectionPointData,
  type ConnectionData
} from '../../../services/connectionService';

function generateId (): string {
  return `${Date.now()}-${Math.random().toString(36)
    .slice(2, 11)}`;
}

function generateColor (): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.floor(Math.random() * 20);
  const lightness = 45 + Math.floor(Math.random() * 15);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

const initialState: ConnectionState = {
  'points': new Map(),
  'connections': new Map(),
  'selectedPointId': null,
  'isConnecting': false,
  'isLoaded': false
};

function connectionReducer (state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case 'ADD_POINT': {
      const newPoints = new Map(state.points);
      newPoints.set(action.point.id, action.point);
      return { ...state, 'points': newPoints };
    }
    case 'REMOVE_POINT': {
      const newPoints = new Map(state.points);
      newPoints.delete(action.pointId);
      const newConnections = new Map(state.connections);
      for (const [id, conn] of newConnections) {
        if (conn.sourcePointId === action.pointId || conn.targetPointId === action.pointId) {
          newConnections.delete(id);
        }
      }
      const newSelectedPointId = state.selectedPointId === action.pointId ? null : state.selectedPointId;
      return {
        ...state,
        'points': newPoints,
        'connections': newConnections,
        'selectedPointId': newSelectedPointId
      };
    }
    case 'ADD_CONNECTION': {
      const newConnections = new Map(state.connections);
      newConnections.set(action.connection.id, action.connection);
      return { ...state, 'connections': newConnections, 'isConnecting': false, 'selectedPointId': null };
    }
    case 'REMOVE_CONNECTION': {
      const newConnections = new Map(state.connections);
      newConnections.delete(action.connectionId);
      return { ...state, 'connections': newConnections };
    }
    case 'UPDATE_CONNECTION_LABEL': {
      const newConnections = new Map(state.connections);
      const conn = newConnections.get(action.connectionId);
      if (conn) {
        newConnections.set(action.connectionId, { ...conn, 'label': action.label });
      }
      return { ...state, 'connections': newConnections };
    }
    case 'SELECT_POINT':
      return { ...state, 'selectedPointId': action.pointId };
    case 'SET_CONNECTING':
      return { ...state, 'isConnecting': action.isConnecting };
    case 'CLEAR_ALL':
      return { ...initialState, 'isLoaded': state.isLoaded };
    case 'LOAD_DATA': {
      const pointsMap = new Map<string, ConnectionPoint>();
      const connectionsMap = new Map<string, Connection>();
      for (const point of action.points) {
        pointsMap.set(point.id, point);
      }
      for (const conn of action.connections) {
        connectionsMap.set(conn.id, conn);
      }
      return {
        ...state,
        'points': pointsMap,
        'connections': connectionsMap,
        'isLoaded': true
      };
    }
    default:
      return state;
  }
}

interface ConnectionProviderProps {
  children: React.ReactNode;
  articleIds?: string[];
}

export function ConnectionProvider ({ children, articleIds }: ConnectionProviderProps) {
  const [state, dispatch] = useReducer(connectionReducer, initialState);
  const [isLoading, setIsLoading] = useState(false);
  const loadedArticleIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!articleIds || articleIds.length === 0) {
      return;
    }

    const articleIdsKey = articleIds.slice().sort()
      .join(',');
    const loadedKey = Array.from(loadedArticleIdsRef.current).slice()
      .sort()
      .join(',');

    if (articleIdsKey === loadedKey) {
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const articlePoints = await getConnectionPointsByArticles(articleIds);
        const articlePointIds = articlePoints.map(p => p.id);

        const connections = articlePointIds.length > 0
          ? await getConnectionsByPointIds(articlePointIds)
          : [];

        const allPointIds = new Set<string>();
        for (const conn of connections) {
          allPointIds.add(conn.sourcePointId);
          allPointIds.add(conn.targetPointId);
        }

        const missingPointIds = Array.from(allPointIds).filter(
          id => !articlePointIds.includes(id)
        );

        let allPoints = [...articlePoints];
        if (missingPointIds.length > 0) {
          const additionalPoints = await getConnectionPointsByIds(missingPointIds);
          allPoints = [...allPoints, ...additionalPoints];
        }

        const mappedPoints: ConnectionPoint[] = allPoints.map(p => ({
          'id': p.id,
          'articleId': p.articleId,
          'documentPos': p.documentPos,
          'to': p.to,
          'selectedText': p.selectedText,
          'color': p.color,
          'createdAt': p.createdAt
        }));

        const mappedConnections: Connection[] = connections.map(c => ({
          'id': c.id,
          'sourcePointId': c.sourcePointId,
          'targetPointId': c.targetPointId,
          'label': c.label || '',
          'createdAt': c.createdAt
        }));

        loadedArticleIdsRef.current = new Set(articleIds);
        dispatch({ 'type': 'LOAD_DATA', 'points': mappedPoints, 'connections': mappedConnections });
      } catch {
        dispatch({ 'type': 'LOAD_DATA', 'points': [], 'connections': [] });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [articleIds]);

  const addPoint = useCallback((articleId: string, documentPos: number, to: number, selectedText: string): string => {
    const id = generateId();
    const color = generateColor();
    const point: ConnectionPoint = {
      id,
      articleId,
      documentPos,
      to,
      selectedText,
      color,
      'createdAt': Date.now()
    };
    dispatch({ 'type': 'ADD_POINT', point });
    return id;
  }, []);

  const removePoint = useCallback((pointId: string) => {
    dispatch({ 'type': 'REMOVE_POINT', pointId });
  }, []);

  const addConnection = useCallback((sourcePointId: string, targetPointId: string): string => {
    if (sourcePointId === targetPointId) {
      return '';
    }
    for (const conn of state.connections.values()) {
      if (conn.sourcePointId === sourcePointId && conn.targetPointId === targetPointId) {
        return '';
      }
    }
    const id = generateId();
    const connection: Connection = {
      id,
      sourcePointId,
      targetPointId,
      'label': '',
      'createdAt': Date.now()
    };
    dispatch({ 'type': 'ADD_CONNECTION', connection });
    return id;
  }, [state.connections]);

  const removeConnection = useCallback((connectionId: string) => {
    dispatch({ 'type': 'REMOVE_CONNECTION', connectionId });
  }, []);

  const updateConnectionLabel = useCallback((connectionId: string, label: string) => {
    dispatch({ 'type': 'UPDATE_CONNECTION_LABEL', connectionId, label });
  }, []);

  const selectPoint = useCallback((pointId: string | null) => {
    dispatch({ 'type': 'SELECT_POINT', pointId });
  }, []);

  const setConnecting = useCallback((isConnecting: boolean) => {
    dispatch({ 'type': 'SET_CONNECTING', isConnecting });
  }, []);

  const getPointsByArticle = useCallback((articleId: string): ConnectionPoint[] => {
    return Array.from(state.points.values()).filter(p => p.articleId === articleId);
  }, [state.points]);

  const getConnectionsForPoint = useCallback((pointId: string): Connection[] => {
    return Array.from(state.connections.values()).filter(
      c => c.sourcePointId === pointId || c.targetPointId === pointId
    );
  }, [state.connections]);

  const save = useCallback(async (): Promise<boolean> => {
    try {
      const points: ConnectionPointData[] = Array.from(state.points.values()).map(p => ({
        'id': p.id,
        'articleId': p.articleId,
        'documentPos': p.documentPos,
        'to': p.to,
        'selectedText': p.selectedText,
        'color': p.color,
        'createdAt': p.createdAt
      }));

      const connections: ConnectionData[] = Array.from(state.connections.values()).map(c => ({
        'id': c.id,
        'sourcePointId': c.sourcePointId,
        'targetPointId': c.targetPointId,
        'label': c.label,
        'createdAt': c.createdAt
      }));

      await saveConnectionData({ points, connections });
      return true;
    } catch {
      return false;
    }
  }, [state.points, state.connections]);

  const value = useMemo<ConnectionContextValue & { save:() => Promise<boolean>; isLoading: boolean }>(() => ({
    state,
    dispatch,
    addPoint,
    removePoint,
    addConnection,
    removeConnection,
    updateConnectionLabel,
    selectPoint,
    setConnecting,
    getPointsByArticle,
    getConnectionsForPoint,
    save,
    isLoading
  }), [
    state,
    addPoint,
    removePoint,
    addConnection,
    removeConnection,
    updateConnectionLabel,
    selectPoint,
    setConnecting,
    getPointsByArticle,
    getConnectionsForPoint,
    save,
    isLoading
  ]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__connCtx = value;
  }, [value]);

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}
