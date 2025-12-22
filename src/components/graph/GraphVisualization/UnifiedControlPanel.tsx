/**
 * 统一控制面板组件
 * 整合节点编辑、连接编辑、样式管理等功能，提供菜单选择和分页功能
 */
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { EnhancedNode, EnhancedGraphConnection } from './types';

// 导入子面板组件
import { StyleManagement } from './StyleManagement';

import type { GraphTheme } from './ThemeTypes';

interface UnifiedControlPanelProps {
  selectedNode: EnhancedNode | null;
  selectedConnection: EnhancedGraphConnection | null;
  selectedNodes: EnhancedNode[];
  selectedConnections: EnhancedGraphConnection[];
  onUpdateNode: (_node: EnhancedNode) => void;
  onDeleteNode: (_nodeId: string) => void;
  onUpdateConnection: (_connection: EnhancedGraphConnection) => void;
  onDeleteConnection: (_connectionId: string) => void;
  onClose: () => void;
  // 样式管理相关属性
  nodes: EnhancedNode[];
  connections: EnhancedGraphConnection[];
  setNodes: (_nodes: EnhancedNode[]) => void;
  setConnections: (_connections: EnhancedGraphConnection[]) => void;
  currentTheme: GraphTheme;
  handleCopyNodeStyle: () => void;
  handleCopyConnectionStyle: () => void;
  handlePasteStyle: () => void;
  setCurrentTheme: (_theme: GraphTheme) => void;
  showNotification: (_message: string, _type: 'error' | 'success' | 'info' | 'warning') => void;
  panelPosition: 'left' | 'right';
}

// 面板类型枚举
type PanelType = 'node' | 'connection' | 'style' | 'properties';

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
  // 样式管理相关属性
  nodes,
  connections,
  setNodes,
  setConnections,
  currentTheme,
  handleCopyNodeStyle,
  handleCopyConnectionStyle,
  handlePasteStyle,
  setCurrentTheme,
  showNotification,
  panelPosition
}) => {
  // 当前激活的面板类型
  const [activePanel, setActivePanel] = useState<PanelType>('node');

  // 表单状态
  const [nodeFormData, setNodeFormData] = useState<EnhancedNode>({
    'id': '',
    'title': '',
    'connections': 0,
    'type': 'concept',
    'shape': 'rect',
    'style': {
      'fill': '#3b82f6',
      'stroke': '#2563eb',
      'strokeWidth': 2,
      'fontSize': 14,
      'textFill': '#fff'
    },
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
      'handlePositions': ['top', 'right', 'bottom', 'left'],
      'lockedHandles': {},
      'handleLabels': {}
    },
    'aggregation': {
      '_isAggregated': false,
      '_aggregatedNodes': [],
      '_averageImportance': 0,
      '_clusterCenter': { 'x': 0, 'y': 0 },
      '_clusterSize': 0,
      '_aggregationLevel': 0
    }
  });

  const [connectionFormData, setConnectionFormData] = useState<EnhancedGraphConnection>({
    'id': '',
    'source': '',
    'target': '',
    'type': '',
    'label': '',
    'weight': 1,
    'style': {
      'stroke': '#94a3b8',
      'strokeWidth': 2
    },
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
      'curveType': 'default'
    },
    'animation': {
      'dynamicEffect': 'none',
      'isAnimating': false
    }
  });

  // 连接点数量增减处理
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

  // 处理节点表单变化
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

  // 处理连接表单变化
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
          'dynamicEffect': value
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

  // 处理保存连接
  const handleSaveConnection = () => {
    if (selectedConnection) {
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

  // 渲染节点编辑面板
  const renderNodeEditPanel = () => {
    return (
      <div className="space-y-4">
        {/* 节点标题 */}
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

        {/* 节点类型 */}
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

        {/* 节点内容 */}
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

        {/* 节点形状 */}
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

        {/* 连接点配置 */}
        <div className="space-y-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-700">连接点配置</h3>

          {/* 连接点数量 */}
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

  // 渲染连接编辑面板
  const renderConnectionEditPanel = () => {
    return (
      <div className="space-y-4">
        {/* 连接类型 */}
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

        {/* 连接标签 */}
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

        {/* 连接权重 */}
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

        {/* 曲线控制 */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-2">
          曲线控制
          </h3>

          {/* 控制点数量 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
            控制点数量
            </label>
            <select
              name="controlPointsCount"
              value={connectionFormData.curveControl.controlPointsCount?.toString() || '1'}
              onChange={handleConnectionChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5].map(count => (
                <option key={count} value={count.toString()}>{count} 个</option>
              ))}
            </select>
          </div>

          {/* 曲线动态效果 */}
          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-medium text-gray-700">
            动态效果
            </h4>
            <select
              name="dynamicEffect"
              value={connectionFormData.animation.dynamicEffect || 'none'}
              onChange={handleConnectionChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="none">无效果</option>
              <option value="flow">流动动画</option>
              <option value="pulse">脉冲效果</option>
              <option value="gradient">渐变过渡</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  // 渲染样式管理面板
  const renderStyleManagementPanel = () => {
    return (
      <StyleManagement
        nodes={nodes}
        connections={connections}
        selectedNodes={selectedNodes}
        selectedConnections={selectedConnections}
        setNodes={setNodes}
        setConnections={setConnections}
        currentTheme={currentTheme}
        handleCopyNodeStyle={handleCopyNodeStyle}
        handleCopyConnectionStyle={handleCopyConnectionStyle}
        handlePasteStyle={handlePasteStyle}
        setCurrentTheme={setCurrentTheme}
        showNotification={showNotification}
      />
    );
  };

  // 渲染当前激活的面板内容
  const renderActivePanelContent = () => {
    switch (activePanel) {
      case 'node':
        return renderNodeEditPanel();
      case 'connection':
        return renderConnectionEditPanel();
      case 'style':
        return renderStyleManagementPanel();
      case 'properties':
        return <div className="p-4">属性面板内容</div>;
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

  // 样式管理面板始终可用
  availablePanels.push({ 'type': 'style', 'label': '样式管理' });
  availablePanels.push({ 'type': 'properties', 'label': '属性' });

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

        {(activePanel === 'style' || activePanel === 'properties') && (
          <div className="text-center text-sm text-gray-500 py-2">
            {activePanel === 'style' ? '样式管理' : '属性面板'}
          </div>
        )}
      </div>
    </div>
  );
};
