import type { GraphState } from './GraphContextType';

// ===========================
// 初始状态
// ===========================

export const getInitialState = (): GraphState => {
  // 从localStorage加载保存的状态
  const savedRightPanelVisible = localStorage.getItem('graphRightPanelVisible');
  const savedToolbarAutoHide = localStorage.getItem('graphToolbarAutoHide');

  return {
    // 节点和连接数据
    'nodes': [],
    'connections': [],
    'selectedNode': null,
    'selectedNodes': [],
    'selectedConnection': null,
    'selectedConnections': [],
    // ReactFlow实例引用
    'reactFlowInstance': null,

    // 交互状态
    'isAddingConnection': false,
    'connectionSourceNode': null,
    'mousePosition': null,
    'isSimulationRunning': true,

    // 布局状态
    'layoutType': 'force',
    'layoutDirection': 'top-bottom',
    'viewMode': '2d',

    // UI状态
    'isRightPanelVisible': savedRightPanelVisible ? JSON.parse(savedRightPanelVisible) : true,
    'isToolbarVisible': true,
    'isLeftToolbarVisible': true,
    'activePanel': null,
    'isBoxSelecting': false,
    'boxSelection': { 'x1': 0, 'y1': 0, 'x2': 0, 'y2': 0 },
    'isSettingsPanelOpen': false,
    'toolbarAutoHide': savedToolbarAutoHide ? JSON.parse(savedToolbarAutoHide) : false,
    'leftToolbarAutoHide': false,

    // 布局参数
    'nodeSpacing': 50,
    'levelSpacing': 100,
    'forceParameters': {
      'charge': -300,
      'linkStrength': 0.1,
      'linkDistance': 150,
      'gravity': 0.1
    },

    // 保存的布局
    'savedLayouts': [],

    // 通知状态
    'notification': null,

    // 历史记录
    'history': [],
    'historyIndex': -1,

    // 聚类状态
    'clusters': {},
    'clusterColors': [],
    'clusterCount': 3,
    'isClusteringEnabled': false
  };
};
