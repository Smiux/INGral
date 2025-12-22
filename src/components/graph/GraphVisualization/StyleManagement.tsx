/**
 * 样式管理组件
 * 负责节点和连接样式的批量编辑功能
 */
import React, { useState } from 'react';
import { Palette, SlidersHorizontal } from 'lucide-react';
import type { EnhancedNode, EnhancedGraphConnection, NodeStyle, ConnectionStyleEnhanced } from './types';
import type { GraphTheme } from './ThemeTypes';

/**
 * 样式管理组件属性
 */
export interface StyleManagementProps {
  // 所有节点
  nodes: EnhancedNode[];
  // 所有连接
  connections: EnhancedGraphConnection[];
  // 选中的节点
  selectedNodes: EnhancedNode[];
  // 选中的连接
  selectedConnections: EnhancedGraphConnection[];
  // 设置节点
  setNodes: (_nodes: EnhancedNode[]) => void;
  // 设置连接
  setConnections: (_connections: EnhancedGraphConnection[]) => void;
  // 当前主题
  currentTheme: GraphTheme;
  // 复制节点样式
  handleCopyNodeStyle: () => void;
  // 复制连接样式
  handleCopyConnectionStyle: () => void;
  // 粘贴样式
  handlePasteStyle: () => void;
  // 设置当前主题
  setCurrentTheme: (_theme: GraphTheme) => void;
  // 显示通知
  showNotification: (_message: string, _type: 'success' | 'error' | 'info') => void;
}

/**
 * 样式管理组件
 * @param props - 组件属性
 */
export const StyleManagement: React.FC<StyleManagementProps> = ({
  nodes,
  connections,
  selectedNodes,
  selectedConnections,
  setNodes,
  setConnections,
  handleCopyNodeStyle,
  handleCopyConnectionStyle,
  handlePasteStyle,
  showNotification
}) => {
  // 定义批量编辑表单类型
  interface BatchEditForm {
    nodes: {
      fill: string;
      stroke: string;
      strokeWidth: string;
      radius: string;
      fontSize: string;
      textFill: string;
      shape: string;
    };
    connections: {
      stroke: string;
      strokeWidth: string;
      strokeOpacity: string;
      type: string;
    };
  }

  // 选中的样式类型（节点或连接）
  const [selectedStyleType, setSelectedStyleType] = useState<'nodes' | 'connections'>(selectedNodes.length > 0 ? 'nodes' : 'connections');
  // 批量编辑表单数据
  const [batchEditForm, setBatchEditForm] = useState<BatchEditForm>({
    // 节点样式
    'nodes': {
      'fill': '',
      'stroke': '',
      'strokeWidth': '',
      'radius': '',
      'fontSize': '',
      'textFill': '',
      'shape': ''
    },
    // 连接样式
    'connections': {
      'stroke': '',
      'strokeWidth': '',
      'strokeOpacity': '',
      'type': ''
    }
  });

  /**
   * 处理表单变化
   * @param field - 字段路径（使用点分隔，如 'nodes.fill'）
   * @param value - 字段值
   */
  const handleFormChange = (field: string, value: string | number) => {
    const [type, property] = field.split('.') as ['nodes' | 'connections', string];
    setBatchEditForm((prev: BatchEditForm) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [property]: value
      }
    }));
  };

  /**
   * 应用样式更改
   */
  const handleApplyStyleChanges = () => {
    let updatedCount = 0;

    if (selectedStyleType === 'nodes' && selectedNodes.length > 0) {
      // 应用节点样式更改
      const updatedNodes = selectedNodes.map(node => {
        let hasChanges = false;
        const updatedNode = { ...node };
        const styleChanges = batchEditForm.nodes;

        // 更新节点样式
        if (!updatedNode.style) {
          updatedNode.style = {} as NodeStyle;
        }

        if (styleChanges.fill) {
          updatedNode.style.fill = styleChanges.fill;
          hasChanges = true;
        }
        if (styleChanges.stroke) {
          updatedNode.style.stroke = styleChanges.stroke;
          hasChanges = true;
        }
        if (styleChanges.strokeWidth) {
          updatedNode.style.strokeWidth = Number(styleChanges.strokeWidth);
          hasChanges = true;
        }
        if (styleChanges.radius) {
          updatedNode.style.radius = Number(styleChanges.radius);
          hasChanges = true;
        }
        if (styleChanges.fontSize) {
          updatedNode.style.fontSize = Number(styleChanges.fontSize);
          hasChanges = true;
        }
        if (styleChanges.textFill) {
          updatedNode.style.textFill = styleChanges.textFill;
          hasChanges = true;
        }
        if (styleChanges.shape) {
          updatedNode.shape = styleChanges.shape;
          hasChanges = true;
        }

        if (hasChanges) {
          updatedCount += 1;
        }
        return updatedNode;
      });

      // 更新所有节点列表
      const newNodes = nodes.map(node => {
        const updatedNode = updatedNodes.find(n => n.id === node.id);
        return updatedNode || node;
      });
      setNodes(newNodes);
    } else if (selectedStyleType === 'connections' && selectedConnections.length > 0) {
      // 应用连接样式更改
      const updatedConnections = selectedConnections.map(connection => {
        let hasChanges = false;
        const updatedConnection = { ...connection };
        const styleChanges = batchEditForm.connections;

        // 更新连接样式
        if (!updatedConnection.style) {
          updatedConnection.style = {} as ConnectionStyleEnhanced;
        }

        if (styleChanges.stroke) {
          updatedConnection.style.stroke = styleChanges.stroke;
          hasChanges = true;
        }
        if (styleChanges.strokeWidth) {
          updatedConnection.style.strokeWidth = Number(styleChanges.strokeWidth);
          hasChanges = true;
        }
        if (styleChanges.strokeOpacity) {
          updatedConnection.style.strokeOpacity = Number(styleChanges.strokeOpacity);
          hasChanges = true;
        }
        if (styleChanges.type) {
          updatedConnection.type = styleChanges.type;
          hasChanges = true;
        }

        if (hasChanges) {
          updatedCount += 1;
        }
        return updatedConnection;
      });

      // 更新所有连接列表
      const newConnections = connections.map(connection => {
        const updatedConnection = updatedConnections.find(c => c.id === connection.id);
        return updatedConnection || connection;
      });
      setConnections(newConnections);
    }

    if (updatedCount > 0) {
      showNotification(`已更新 ${updatedCount} 个${selectedStyleType === 'nodes' ? '节点' : '连接'}的样式`, 'success');
      // 重置表单
      setBatchEditForm({
        'nodes': {
          'fill': '',
          'stroke': '',
          'strokeWidth': '',
          'radius': '',
          'fontSize': '',
          'textFill': '',
          'shape': ''
        },
        'connections': {
          'stroke': '',
          'strokeWidth': '',
          'strokeOpacity': '',
          'type': ''
        }
      });
    } else {
      showNotification('没有可应用的样式更改', 'info');
    }
  };

  /**
   * 取消样式编辑
   */
  const handleCancelStyleEdit = () => {
    // 重置表单
    setBatchEditForm({
      'nodes': {
        'fill': '',
        'stroke': '',
        'strokeWidth': '',
        'radius': '',
        'fontSize': '',
        'textFill': '',
        'shape': ''
      },
      'connections': {
        'stroke': '',
        'strokeWidth': '',
        'strokeOpacity': '',
        'type': ''
      }
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      {/* 样式类型选择 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${selectedStyleType === 'nodes' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          onClick={() => setSelectedStyleType('nodes')}
          disabled={selectedNodes.length === 0}
        >
          <div className="flex items-center justify-center gap-2">
            <Palette size={16} />
            节点样式
          </div>
        </button>
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${selectedStyleType === 'connections' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          onClick={() => setSelectedStyleType('connections')}
          disabled={selectedConnections.length === 0}
        >
          <div className="flex items-center justify-center gap-2">
            <SlidersHorizontal size={16} />
            连接样式
          </div>
        </button>
      </div>

      {/* 样式编辑表单 */}
      <div className="space-y-4">
        {/* 样式复制粘贴工具 */}
        <div className="flex flex-wrap gap-2 bg-gray-50 p-3 rounded-md">
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
            onClick={handleCopyNodeStyle}
            disabled={selectedNodes.length === 0}
            title="复制选中节点的样式"
          >
            复制节点样式
          </button>
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
            onClick={handleCopyConnectionStyle}
            disabled={selectedConnections.length === 0}
            title="复制选中连接的样式"
          >
            复制连接样式
          </button>
          <button
            className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
            onClick={handlePasteStyle}
            disabled={selectedNodes.length === 0 && selectedConnections.length === 0}
            title="粘贴样式到选中的元素"
          >
            粘贴样式
          </button>
        </div>

        {/* 样式编辑表单 */}
        <div className="space-y-4">
          {selectedStyleType === 'nodes' ? (
            // 节点样式编辑表单
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">节点样式编辑 ({selectedNodes.length} 个选中)</h3>

              {/* 节点填充颜色 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">填充颜色</label>
                  <input
                    type="color"
                    value={batchEditForm.nodes.fill || '#8b5cf6'}
                    onChange={(e) => handleFormChange('nodes.fill', e.target.value)}
                    className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                  />
                </div>

                {/* 节点描边颜色 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">描边颜色</label>
                  <input
                    type="color"
                    value={batchEditForm.nodes.stroke || '#ffffff'}
                    onChange={(e) => handleFormChange('nodes.stroke', e.target.value)}
                    className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                  />
                </div>

                {/* 描边宽度 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">描边宽度</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="1"
                    value={batchEditForm.nodes.strokeWidth || ''}
                    onChange={(e) => handleFormChange('nodes.strokeWidth', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="2"
                  />
                </div>

                {/* 节点半径 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">节点半径</label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    step="1"
                    value={batchEditForm.nodes.radius || ''}
                    onChange={(e) => handleFormChange('nodes.radius', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="20"
                  />
                </div>

                {/* 字体大小 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">字体大小</label>
                  <input
                    type="number"
                    min="8"
                    max="24"
                    step="1"
                    value={batchEditForm.nodes.fontSize || ''}
                    onChange={(e) => handleFormChange('nodes.fontSize', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="12"
                  />
                </div>

                {/* 文本颜色 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">文本颜色</label>
                  <input
                    type="color"
                    value={batchEditForm.nodes.textFill || '#ffffff'}
                    onChange={(e) => handleFormChange('nodes.textFill', e.target.value)}
                    className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                  />
                </div>

                {/* 节点形状 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">节点形状</label>
                  <select
                    value={batchEditForm.nodes.shape || ''}
                    onChange={(e) => handleFormChange('nodes.shape', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">保持不变</option>
                    <option value="circle">圆形</option>
                    <option value="rect">矩形</option>
                    <option value="ellipse">椭圆</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            // 连接样式编辑表单
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">连接样式编辑 ({selectedConnections.length} 个选中)</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* 连接颜色 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">连接颜色</label>
                  <input
                    type="color"
                    value={batchEditForm.connections.stroke || '#6b7280'}
                    onChange={(e) => handleFormChange('connections.stroke', e.target.value)}
                    className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                  />
                </div>

                {/* 连接宽度 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">连接宽度</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={batchEditForm.connections.strokeWidth || ''}
                    onChange={(e) => handleFormChange('connections.strokeWidth', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="2"
                  />
                </div>

                {/* 连接透明度 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">透明度</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={batchEditForm.connections.strokeOpacity || ''}
                    onChange={(e) => handleFormChange('connections.strokeOpacity', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="0.8"
                  />
                </div>

                {/* 连接类型 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">连接类型</label>
                  <select
                    value={batchEditForm.connections.type || ''}
                    onChange={(e) => handleFormChange('connections.type', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">保持不变</option>
                    <option value="default">默认</option>
                    <option value="smoothstep">平滑</option>
                    <option value="step">阶梯</option>
                    <option value="straight">直线</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 应用按钮 */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            onClick={handleCancelStyleEdit}
          >
            取消
          </button>
          <button
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            onClick={handleApplyStyleChanges}
          >
            应用样式更改
          </button>
        </div>
      </div>
    </div>
  );
};
