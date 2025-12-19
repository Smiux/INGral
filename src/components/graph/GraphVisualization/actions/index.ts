import { useNodeConnectionActions, type NodeConnectionActions } from './NodeConnectionActions';
import { useSelectionActions, type SelectionActions } from './SelectionActions';
import { useInteractionActions, type InteractionActions } from './InteractionActions';
import { useLayoutActions, type LayoutActions } from './LayoutActions';
import { useUIActions, type UIActions } from './UIActions';
import { useHistoryActions, type HistoryActions } from './HistoryActions';
import { useClusteringActions, type ClusteringActions } from './ClusteringActions';
import { useBusinessLogicActions, type BusinessLogicActions } from './BusinessLogicActions';
import { GraphActions as GraphActionsInterface, type GraphState, type GraphAction } from '../GraphContextType';

// 整合所有actions类型
export type AllActions =
  & NodeConnectionActions
  & SelectionActions
  & InteractionActions
  & LayoutActions
  & UIActions
  & HistoryActions
  & ClusteringActions
  & BusinessLogicActions;

// 确保AllActions与GraphActionsInterface兼容
// 以下类型断言会在编译时检查AllActions是否与GraphActionsInterface兼容
export type _EnsureActionsCompatibility = AllActions extends GraphActionsInterface ? true : never;

// 整合所有actions hook
export const useAllActions = (dispatch: React.Dispatch<GraphAction>, state: GraphState) => {
  // 先获取UIActions，因为其他actions可能依赖showNotification
  const uiActions = useUIActions({ dispatch });
  // 提取showNotification以便传递给其他actions
  const { showNotification } = uiActions;

  const nodeConnectionActions = useNodeConnectionActions({ dispatch });
  const selectionActions = useSelectionActions({ dispatch });
  const interactionActions = useInteractionActions({ dispatch });
  const layoutActions = useLayoutActions({ dispatch, state, showNotification });
  const historyActions = useHistoryActions({ dispatch, state, showNotification });
  const clusteringActions = useClusteringActions({ dispatch, state, showNotification });
  const businessLogicActions = useBusinessLogicActions({ dispatch, state, showNotification });

  return {
    ...nodeConnectionActions,
    ...selectionActions,
    ...interactionActions,
    ...layoutActions,
    ...uiActions,
    ...historyActions,
    ...clusteringActions,
    ...businessLogicActions
  };
};
