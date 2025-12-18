import React, { useReducer, ReactNode } from 'react';

// 导入Context和类型
import { GraphContext } from './GraphContextType';

// 导入外部模块
import { getInitialState } from './GraphState';
import { graphReducer } from './GraphReducer';
import { useGraphEffects } from './GraphEffects';
import { useAllActions } from './actions';

// ===========================
// Provider组件
// ===========================

export const GraphProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 使用Reducer管理状态
  const [state, dispatch] = useReducer(graphReducer, getInitialState());
  
  // 应用所有副作用
  useGraphEffects({ state, dispatch });
  
  // 生成所有actions
  const actions = useAllActions(dispatch, state);

  // 组装上下文值
  const contextValue = {
    state,
    actions
  } as const;

  return (
    <GraphContext.Provider value={contextValue}>
      {children}
    </GraphContext.Provider>
  );
};