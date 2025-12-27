import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { GraphNode, GraphConnection } from './GraphTypes';

interface UnifiedControlPanelProps {
  selectedNode: GraphNode | null;
  selectedConnection: GraphConnection | null;
  selectedNodes: GraphNode[];
  selectedConnections: GraphConnection[];
  onUpdateNode: (_node: GraphNode) => void;
  onDeleteNode: (_nodeId: string) => void;
  onUpdateConnection: (_connection: GraphConnection) => void;
  onDeleteConnection: (_connectionId: string) => void;
  onClose: () => void;
  nodes: GraphNode[];
  connections: GraphConnection[];
  setNodes: (_nodes: GraphNode[]) => void;
  setConnections: (_connections: GraphConnection[]) => void;
  showNotification: (_message: string, _type: 'error' | 'success' | 'info' | 'warning') => void;
  panelPosition: 'left' | 'right';
}

// 面板类型枚举
type PanelType = 'node' | 'connection';

/**
 * 统一控制面板组件
 */
export const UnifiedControlPanel: React.FC<UnifiedControlPanelProps> = ({
  selectedNode,
  selectedConnection,
  selectedNodes,
  selectedConnections,
  onUpdateNode,
  onDeleteNode,
  onUpdateConnection,
  onDeleteConnection,
  onClose,
  //
  panelPosition
}) => {
  // 当前激活的面板类型
  const [activePanel, setActivePanel] = useState<PanelType>('node');

  const [nodeFormData, setNodeFormData] = useState<GraphNode>({
    'id': '',
    'title': '',
    'connections': 0,
    'type': 'concept',
    'shape': 'rect',
    'state': {
      'isExpanded': false,
      'isFixed': false,
      'isSelected': false,
      'isHovered': false,
      'isDragging': false,
      'isCollapsed': false
    },
    'metadata': {
      'is_custom': true,
      'createdAt': Date.now(),
      'updatedAt': Date.now(),
      'version': 1,
      'content': ''
    },
    'layout': {
      'x': 0,
      'y': 0,
      'isFixed': false,
      'isExpanded': false
    },
    'group': {
      'isGroup': false,
      'memberIds': [],
      'isGroupExpanded': false
    },
    'handles': {
      'handleCount': 4,
      'lockedHandles': {},
      'handleLabels': {}
    }
  });

  const [connectionFormData, setConnectionFormData] = useState<GraphConnection>({
    'id': '',
    'source': '',
    'target': '',
    'sourceHandle': null,
    'targetHandle': null,
    'type': '',
    'label': '',
    'weight': 1,
    'metadata': {
      'createdAt': Date.now(),
      'updatedAt': Date.now(),
      'version': 1
    },
    'state': {
      'isSelected': false,
      'isHovered': false,
      'isEditing': false
    },
    'curveControl': {
      'controlPointsCount': 1,
      'controlPoints': [],
      'curveType': 'default',
      'locked': false
    },
    'animation': {
      'dynamicEffect': 'none',
      'isAnimating': false
    }
  });

  const [history, setHistory] = useState<GraphConnection[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = (connection: GraphConnection) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ ...connection });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 撤销操作
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const connection = history[newIndex];
      if (connection) {
        setHistoryIndex(newIndex);
        setConnectionFormData(connection);
        onUpdateConnection(connection);
      }
    }
  };

  // 重做操作
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const connection = history[newIndex];
      if (connection) {
        setHistoryIndex(newIndex);
        setConnectionFormData(connection);
        onUpdateConnection(connection);
      }
    }
  };

  const handleHandleCountChange = (delta: number) => {
    setNodeFormData(prev => {
      const currentCount = prev.handles.handleCount;
      const newCount = Math.max(1, Math.min(20, currentCount + delta));
      return {
        ...prev,
        'handles': {
          ...prev.handles,
          'handleCount': newCount
        }
      };
    });
  };

  // 当选中节点变化时，更新表单数据
  useEffect(() => {
    if (selectedNode) {
      setNodeFormData(selectedNode);
      setActivePanel('node');
    } else if (selectedConnection) {
      setConnectionFormData(selectedConnection);
      setActivePanel('connection');
    }
  }, [selectedNode, selectedConnection]);

  const handleNodeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (name === 'handleCount' && type === 'number') {
      const numValue = parseInt(value, 10) || 4;
      setNodeFormData(prev => ({
        ...prev,
        'handles': {
          ...prev.handles,
          'handleCount': Math.max(1, Math.min(20, numValue))
        }
      }));
    } else if (name === 'content') {
      setNodeFormData(prev => ({
        ...prev,
        'metadata': {
          ...prev.metadata,
          'content': value
        }
      }));
    } else {
      setNodeFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleConnectionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (name === 'controlPointsCount') {
      setConnectionFormData(prev => ({
        ...prev,
        'curveControl': {
          ...prev.curveControl,
          'controlPointsCount': parseInt(value, 10) || 1
        }
      }));
    } else if (name === 'dynamicEffect') {
      setConnectionFormData(prev => ({
        ...prev,
        'animation': {
          ...prev.animation,
          'dynamicEffect': value,
          'isAnimating': value !== 'none'
        }
      }));
    } else {
      setConnectionFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 1 : value
      }));
    }
  };

  // 处理保存节点
  const handleSaveNode = () => {
    if (selectedNode) {
      onUpdateNode(nodeFormData);
    }
  };

  // 处理删除节点
  const handleDeleteNode = () => {
    if (selectedNode) {
      onDeleteNode(selectedNode.id);
      onClose();
    }
  };

  const handleSaveConnection = () => {
    if (selectedConnection) {
      saveToHistory(connectionFormData);
      onUpdateConnection(connectionFormData);
    }
  };

  // 处理删除连接
  const handleDeleteConnection = () => {
    if (selectedConnection) {
      onDeleteConnection(selectedConnection.id);
      onClose();
    }
  };

  const renderNodeEditPanel = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            节点标题
          </label>
          <input
            type="text"
            name="title"
            value={nodeFormData.title}
            onChange={handleNodeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入节点标题"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            节点类型
          </label>
          <input
            type="text"
            name="type"
            value={nodeFormData.type}
            onChange={handleNodeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入节点类型"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            节点内容
          </label>
          <textarea
            name="content"
            value={nodeFormData.metadata.content}
            onChange={handleNodeChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入节点内容"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            节点形状
          </label>
          <select
            name="shape"
            value={nodeFormData.shape}
            onChange={handleNodeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="rect">矩形</option>
            <option value="rectangle">矩形</option>
            <option value="circle">圆形</option>
            <option value="ellipse">椭圆形</option>
            <option value="triangle">三角形</option>
            <option value="diamond">菱形</option>
            <option value="hexagon">六边形</option>
          </select>
        </div>

        <div className="space-y-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-700">连接点配置</h3>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              连接点数量
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleHandleCountChange(-1)}
                className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                title="减少连接点"
              >
                -
              </button>
              <input
                type="number"
                name="handleCount"
                min="1"
                max="20"
                value={nodeFormData.handles.handleCount}
                onChange={handleNodeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
              />
              <button
                type="button"
                onClick={() => handleHandleCountChange(1)}
                className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                title="增加连接点"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              连接点会根据节点形状自动分布在节点外围
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderConnectionEditPanel = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            连接类型
          </label>
          <input
            type="text"
            name="type"
            value={connectionFormData.type}
            onChange={handleConnectionChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入连接类型"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            连接标签
          </label>
          <input
            type="text"
            name="label"
            value={connectionFormData.label}
            onChange={handleConnectionChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入连接标签"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
          连接权重
          </label>
          <input
            type="number"
            name="weight"
            min="0"
            step="0.1"
            value={connectionFormData.weight}
            onChange={handleConnectionChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入连接权重"
          />
        </div>

        <div className="space-y-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-700">连接线样式</h3>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              箭头数量
            </label>
            <select
              name="arrowCount"
              value={connectionFormData.style?.arrowCount?.toString() || '1'}
              onChange={handleConnectionChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5].map(count => (
                <option key={count} value={count.toString()}>{count} 个</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-700">动态效果</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                效果开关
              </label>
              <input
                type="checkbox"
                checked={connectionFormData.animation.isAnimating}
                onChange={(e) => {
                  setConnectionFormData(prev => ({
                    ...prev,
                    'animation': {
                      ...prev.animation,
                      'isAnimating': e.target.checked,
                      'dynamicEffect': e.target.checked ? (prev.animation.dynamicEffect || 'none') : 'none'
                    }
                  }));
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                预设效果
              </label>
              <select
                name="dynamicEffect"
                value={connectionFormData.animation.dynamicEffect || 'none'}
                onChange={handleConnectionChange}
                disabled={!connectionFormData.animation.isAnimating}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !connectionFormData.animation.isAnimating ? 'opacity-50 cursor-not-allowed' : ''
                }"
              >
                <option value="none">无效果</option>
                <option value="flow">流动动画</option>
                <option value="pulse">脉冲效果</option>
                <option value="gradient">渐变过渡</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-md shadow-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="撤销"
          >
            撤销
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-md shadow-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="重做"
          >
            重做
          </button>
        </div>
      </div>
    );
  };

  // 渲染当前激活的面板内容
  const renderActivePanelContent = () => {
    switch (activePanel) {
      case 'node':
        return renderNodeEditPanel();
      case 'connection':
        return renderConnectionEditPanel();
      default:
        return null;
    }
  };

  // 如果没有选中节点或连接，不渲染面板
  if (!selectedNode && !selectedConnection && selectedNodes.length === 0 && selectedConnections.length === 0) {
    return null;
  }

  // 可用面板列表
  const availablePanels: Array<{ type: PanelType; label: string; icon?: React.ReactNode }> = [];

  if (selectedNode || selectedNodes.length > 0) {
    availablePanels.push({ 'type': 'node', 'label': '节点编辑' });
  }

  if (selectedConnection || selectedConnections.length > 0) {
    availablePanels.push({ 'type': 'connection', 'label': '连接编辑' });
  }

  return (
    <div className={`w-72 bg-white shadow-lg flex flex-col overflow-hidden h-full ${panelPosition === 'left' ? 'border-r border-gray-200 absolute left-0 top-0 z-10' : 'border-l border-gray-200 absolute right-0 top-0 z-10'}`}>
      {/* 面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm z-10">
        <h2 className="text-lg font-semibold">
          {/* 面板标题 */}
          {(() => {
            if (selectedNode) {
              return '编辑节点';
            }
            if (selectedConnection) {
              return '编辑连接';
            }
            return '控制面板';
          })()}
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          title="关闭面板"
        >
          <X size={20} />
        </button>
      </div>

      {/* 面板导航菜单 */}
      <div className="border-b border-gray-200 bg-white overflow-x-auto">
        <div className="flex min-w-max">
          {availablePanels.map(panel => (
            <button
              key={panel.type}
              onClick={() => setActivePanel(panel.type)}
              className={`px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap ${activePanel === panel.type ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {panel.icon}
              {panel.label}
            </button>
          ))}
        </div>
      </div>

      {/* 面板内容区域 - 带滚动分页 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {renderActivePanelContent()}
      </div>

      {/* 面板底部操作栏 */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {activePanel === 'node' && selectedNode && (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleDeleteNode}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 transition-colors"
              title="删除节点"
            >
              删除节点
            </button>
            <button
              onClick={handleSaveNode}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition-colors"
              title="保存节点"
            >
              保存节点
            </button>
          </div>
        )}

        {activePanel === 'connection' && selectedConnection && (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleDeleteConnection}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 transition-colors"
              title="删除连接"
            >
              删除连接
            </button>
            <button
              onClick={handleSaveConnection}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition-colors"
              title="保存连接"
            >
              保存连接
            </button>
          </div>
        )}


      </div>
    </div>
  );
};
