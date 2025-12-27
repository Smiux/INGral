import React, { useReducer, ReactNode } from 'react';
import { GraphContext } from './GraphContext';
import { getInitialState, graphReducer } from './GraphReducer';
import { createGraphActions } from './GraphActions';
import type { GraphContextValue } from './GraphTypes';

export const GraphProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(graphReducer, getInitialState());
  const actions = createGraphActions(dispatch, state);

  const contextValue: GraphContextValue = {
    state,
    actions
  };

  return (
    <GraphContext.Provider value={contextValue}>
      {children}
    </GraphContext.Provider>
  );
};
