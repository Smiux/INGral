import { useContext } from 'react';
import { GraphContextType, GraphContext } from './GraphContextType';

/**
 * 自定义Hook，用于访问图谱上下文
 * @returns 图谱上下文
 */
export const useGraph = (): GraphContextType => {
  const context = useContext(GraphContext);
  if (context === undefined) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
};
