import { useCallback } from 'react';
import type { ReactFlowInstance } from 'reactflow';
import type { EnhancedNode, EnhancedGraphConnection } from '../types';

interface NodeConnectionActionsProps {
  dispatch: React.Dispatch<any>;
}

export const useNodeConnectionActions = ({ dispatch }: NodeConnectionActionsProps) => {
  // ReactFlow相关操作
  const setReactFlowInstance = useCallback((instance: ReactFlowInstance | null) => {
    dispatch({ type: 'SET_REACT_FLOW_INSTANCE', payload: instance });
  }, [dispatch]);
  
  // 节点和连接操作
  const setNodes = useCallback((nodes: EnhancedNode[]) => {
    dispatch({ type: 'SET_NODES', payload: nodes });
  }, [dispatch]);
  
  const setConnections = useCallback((connections: EnhancedGraphConnection[]) => {
    dispatch({ type: 'SET_CONNECTIONS', payload: connections });
  }, [dispatch]);
  
  const addNode = useCallback((node: EnhancedNode) => {
    dispatch({ type: 'ADD_NODE', payload: node });
  }, [dispatch]);
  
  const updateNode = useCallback((node: EnhancedNode) => {
    dispatch({ type: 'UPDATE_NODE', payload: node });
  }, [dispatch]);
  
  const deleteNode = useCallback((nodeId: string) => {
    dispatch({ type: 'DELETE_NODE', payload: nodeId });
  }, [dispatch]);
  
  const addConnection = useCallback((connection: EnhancedGraphConnection) => {
    dispatch({ type: 'ADD_CONNECTION', payload: connection });
  }, [dispatch]);
  
  const updateConnection = useCallback((connection: EnhancedGraphConnection) => {
    dispatch({ type: 'UPDATE_CONNECTION', payload: connection });
  }, [dispatch]);
  
  const deleteConnection = useCallback((connectionId: string) => {
    dispatch({ type: 'DELETE_CONNECTION', payload: connectionId });
  }, [dispatch]);

  return {
    setReactFlowInstance,
    setNodes,
    setConnections,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    updateConnection,
    deleteConnection
  };
};

export type NodeConnectionActions = ReturnType<typeof useNodeConnectionActions>;
