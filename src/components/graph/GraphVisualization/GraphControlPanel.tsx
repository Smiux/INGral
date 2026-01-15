import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Palette, Square, SquareGantt, Type, Heading, Text as TextIcon } from 'lucide-react';
import { useStore, useReactFlow, type Edge } from '@xyflow/react';

// 导入 colorPicker CSS
import 'tui-color-picker/dist/tui-color-picker.css';

// @ts-expect-error tui-color-picker 没有 TypeScript 类型定义
import * as colorPicker from 'tui-color-picker';

// 从CustomNode和CustomEdge导入类型
import { CustomNodeData } from './CustomNode';
import { CustomEdgeData } from './FloatingEdge';

interface GraphControlPanelProps {
  panelPosition?: 'left' | 'right';
}

// 面板类型枚举
type PanelType = 'node' | 'edge' | 'appearance' | 'edgeAppearance';

/**
 * 图谱控制面板组件
 * 支持节点和连接的编辑
 */
export const GraphControlPanel: React.FC<GraphControlPanelProps> = ({
  panelPosition = 'right'
}) => {
  // 使用useStore获取选中的节点和边，使用更精确的选择器
  // 只选择需要的数据字段，并使用equalityFn减少重渲染
  const selectedNode = useStore(
    (state) => {
      const foundNode = state.nodes.find((node) => node.selected);
      // 只选择需要的字段
      return foundNode ? {
        'id': foundNode.id,
        'data': foundNode.data
      } : null;
    },
    // 自定义比较函数，只在id或data变化时重新渲染
    (prev, next) => {
      if (prev === null && next === null) {
        return true;
      }
      if (prev === null || next === null) {
        return false;
      }
      return prev.id === next.id && JSON.stringify(prev.data) === JSON.stringify(next.data);
    }
  ) as { id: string; data: CustomNodeData } | null;

  // 只选择需要的数据字段，并使用equalityFn减少重渲染
  const selectedEdge = useStore(
    (state) => {
      const foundEdge = state.edges.find((edge) => edge.selected);
      // 只选择需要的字段
      return foundEdge ? {
        'id': foundEdge.id,
        'source': foundEdge.source,
        'target': foundEdge.target,
        'data': foundEdge.data
      } : null;
    },
    // 自定义比较函数，只在id、source、target或data变化时重新渲染
    (prev, next) => {
      if (prev === null && next === null) {
        return true;
      }
      if (prev === null || next === null) {
        return false;
      }
      return prev.id === next.id && prev.source === next.source && prev.target === next.target && JSON.stringify(prev.data) === JSON.stringify(next.data);
    }
  ) as { id: string; source: string; target: string; data: CustomEdgeData } | null;

  // 使用useReactFlow获取实例
  const reactFlowInstance = useReactFlow();

  // 当前激活的面板类型
  const [activePanel, setActivePanel] = useState<PanelType>('node');

  // 节点表单数据 - 只包含需要编辑的数据字段，不包含position
  const [nodeFormData, setNodeFormData] = useState<{
    id: string;
    data: CustomNodeData;
  }>({
    'id': '',
    'data': {
      'title': '',
      'category': '默认',
      'handleCount': 4,
      'shape': 'circle',
      'style': {
        'fill': '#fff',
        'stroke': '#4ECDC4',
        'strokeWidth': 2,
        'textColor': '#666',
        'titleBackgroundColor': '#4ECDC4'
      },
      'metadata': {
        'content': ''
      }
    }
  });

  // 连接表单数据
  const [edgeFormData, setEdgeFormData] = useState<Edge<CustomEdgeData>>({
    'id': '',
    'source': '',
    'target': '',
    'type': 'floating',
    'data': {
      'type': 'related',
      'weight': 1,
      'curveType': 'default',
      'label': '',
      'style': {
        'stroke': '#3b82f6',
        'strokeWidth': 2
      },
      'animation': {
        'dynamicEffect': 'flow',
        'isAnimating': false
      }
    }
  });

  // 当选中节点或连接变化时，更新表单数据
  useEffect(() => {
    if (selectedNode) {
      // 确保handleCount有默认值0，当节点没有handleCount属性时使用
      setNodeFormData({
        'id': selectedNode.id,
        'data': {
          ...selectedNode.data as CustomNodeData,
          'handleCount': selectedNode.data.handleCount ?? 0,
          'shape': selectedNode.data.shape ?? 'circle',
          'style': {
            'fill': selectedNode.data.style?.fill ?? '#fff',
            'stroke': selectedNode.data.style?.stroke ?? '#4ECDC4',
            'strokeWidth': selectedNode.data.style?.strokeWidth ?? 2,
            'textColor': selectedNode.data.style?.textColor ?? '#666',
            'titleBackgroundColor': selectedNode.data.style?.titleBackgroundColor ?? '#4ECDC4',
            'titleTextColor': selectedNode.data.style?.titleTextColor ?? '#FFFFFF',
            'innerAngle': selectedNode.data.style?.innerAngle ?? 0,
            'outerAngle': selectedNode.data.style?.outerAngle ?? 0,
            'isSyncRotation': selectedNode.data.style?.isSyncRotation ?? false
          }
        }
      });
    } else if (selectedEdge) {
      // 确保style对象中的所有属性都有默认值，避免UI上的动态计算导致颜色联动
      const currentStyle = selectedEdge.data?.style || {};
      const updatedEdge = {
        ...selectedEdge,
        'data': {
          ...selectedEdge.data,
          'style': {
            'stroke': currentStyle.stroke || '#3b82f6',
            'strokeWidth': currentStyle.strokeWidth || 2,
            'arrowColor': currentStyle.arrowColor || (currentStyle.stroke || '#3b82f6'),
            'labelBackgroundColor': currentStyle.labelBackgroundColor || (currentStyle.stroke || '#3b82f6'),
            'labelTextColor': currentStyle.labelTextColor || '#ffffff',
            'dasharray': currentStyle.dasharray || ''
          }
        }
      };
      setEdgeFormData(updatedEdge as unknown as Edge<CustomEdgeData>);
    }
  }, [selectedNode, selectedEdge]);

  // 处理节点连接点数量变化
  const handleHandleCountChange = useCallback((delta: number) => {
    if (selectedNode) {
      // 正确处理handleCount为0的情况，不使用默认值4
      const currentHandleCount = nodeFormData.data.handleCount ?? 4;
      const newHandleCount = Math.max(0, Math.min(20, currentHandleCount + delta));
      const updatedNodeData = {
        ...nodeFormData.data,
        'handleCount': newHandleCount
      };
      const updatedFormData = {
        ...nodeFormData,
        'data': updatedNodeData
      };
      setNodeFormData(updatedFormData);
      // 使用React Flow内置的updateNodeData方法更新节点数据
      reactFlowInstance.updateNodeData(selectedNode.id, updatedNodeData);
    }
  }, [selectedNode, nodeFormData, reactFlowInstance]);

  // 处理节点形状变化
  const handleShapeChange = useCallback((shape: 'circle' | 'square' | 'rectangle') => {
    if (selectedNode) {
      const updatedNodeData = {
        ...nodeFormData.data,
        shape
      };
      const updatedFormData = {
        ...nodeFormData,
        'data': updatedNodeData
      };
      setNodeFormData(updatedFormData);
      // 使用React Flow内置的updateNodeData方法更新节点数据
      reactFlowInstance.updateNodeData(nodeFormData.id, updatedNodeData);
    }
  }, [selectedNode, nodeFormData, reactFlowInstance]);

  // 处理节点样式颜色变化
  const handleColorChange = useCallback((property: 'fill' | 'stroke' | 'textColor' | 'titleBackgroundColor' | 'titleTextColor', color: string) => {
    if (selectedNode) {
      const updatedNodeData = {
        ...nodeFormData.data,
        'style': {
          ...nodeFormData.data.style,
          [property]: color
        }
      };
      const updatedFormData = {
        ...nodeFormData,
        'data': updatedNodeData
      };
      setNodeFormData(updatedFormData);
      // 使用React Flow内置的updateNodeData方法更新节点数据
      reactFlowInstance.updateNodeData(nodeFormData.id, updatedNodeData);
    }
  }, [selectedNode, nodeFormData, reactFlowInstance]);

  // 处理颜色输入框变化
  const handleColorInputChange = useCallback((property: 'fill' | 'stroke' | 'textColor' | 'titleBackgroundColor' | 'titleTextColor') => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      handleColorChange(property, value);
    };
  }, [handleColorChange]);

  // 处理节点表单变化
  const handleNodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // 处理连接点数量变化，确保值为数字类型
    if (name === 'handleCount') {
      // 正确处理空值和0值
      const numValue = parseInt(value, 10);
      const newHandleCount = Math.max(0, Math.min(20, isNaN(numValue) ? 0 : numValue));
      const updatedNodeData = {
        ...nodeFormData.data,
        'handleCount': newHandleCount
      };
      const updatedFormData = {
        ...nodeFormData,
        'data': updatedNodeData
      };
      setNodeFormData(updatedFormData);
      reactFlowInstance.updateNodeData(nodeFormData.id, updatedNodeData);
    } else if (name === 'content') {
      const updatedNodeData = {
        ...nodeFormData.data,
        'metadata': {
          ...nodeFormData.data.metadata,
          'content': value
        }
      };
      const updatedFormData = {
        ...nodeFormData,
        'data': updatedNodeData
      };
      setNodeFormData(updatedFormData);
      reactFlowInstance.updateNodeData(nodeFormData.id, updatedNodeData);
    } else if (name === 'innerAngle' || name === 'outerAngle') {
      // 处理旋转角度变化
      const angleValue = parseFloat(value) || 0;
      const updatedNodeData = {
        ...nodeFormData.data,
        'style': {
          ...nodeFormData.data.style,
          [name]: angleValue
        }
      };
      const updatedFormData = {
        ...nodeFormData,
        'data': updatedNodeData
      };
      setNodeFormData(updatedFormData);
      reactFlowInstance.updateNodeData(nodeFormData.id, updatedNodeData);
    } else if (name === 'isSyncRotation') {
      // 处理同步旋转选项
      const checked = (e.target as HTMLInputElement).checked;
      const updatedNodeData = {
        ...nodeFormData.data,
        'style': {
          ...nodeFormData.data.style,
          'isSyncRotation': checked
        }
      };
      const updatedFormData = {
        ...nodeFormData,
        'data': updatedNodeData
      };
      setNodeFormData(updatedFormData);
      reactFlowInstance.updateNodeData(nodeFormData.id, updatedNodeData);
    } else if (name === 'shape') {
      // 处理形状变化
      const updatedNodeData = {
        ...nodeFormData.data,
        'shape': value as 'circle' | 'square' | 'rectangle'
      };
      const updatedFormData = {
        ...nodeFormData,
        'data': updatedNodeData
      };
      setNodeFormData(updatedFormData);
      reactFlowInstance.updateNodeData(nodeFormData.id, updatedNodeData);
    } else {
      // 处理其他基本属性
      const updatedNodeData = {
        ...nodeFormData.data,
        [name]: value
      };
      const updatedFormData = {
        ...nodeFormData,
        'data': updatedNodeData
      };
      setNodeFormData(updatedFormData);
      reactFlowInstance.updateNodeData(nodeFormData.id, updatedNodeData);
    }
  }, [nodeFormData, reactFlowInstance]);

  // 处理连接样式颜色变化
  const handleEdgeColorChange = useCallback((property: 'stroke' | 'arrowColor' | 'labelBackgroundColor' | 'labelTextColor', color: string) => {
    if (selectedEdge) {
      const updatedEdgeData = {
        ...edgeFormData.data,
        'style': {
          ...(edgeFormData.data?.style || {}),
          [property]: color
        }
      };

      // 定义完整的边更新对象，包含markerEnd
      const updatedEdge = {
        ...edgeFormData,
        'data': updatedEdgeData
      };

      // 更新箭头颜色时同时更新markerEnd
      if (property === 'arrowColor') {
        updatedEdge.markerEnd = {
          'type': 'arrowclosed',
          color
        };
      }

      setEdgeFormData(updatedEdge as unknown as Edge<CustomEdgeData>);

      // 直接更新整个边
      reactFlowInstance.updateEdge(updatedEdge.id, updatedEdge);
    }
  }, [selectedEdge, edgeFormData, reactFlowInstance]);

  // 处理连接样式颜色输入框变化
  const handleEdgeColorInputChange = useCallback((property: 'stroke' | 'arrowColor' | 'labelBackgroundColor' | 'labelTextColor') => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      handleEdgeColorChange(property, value);
    };
  }, [handleEdgeColorChange]);

  // 处理连接表单变化
  const handleEdgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // 确保edgeFormData.data存在
    const currentData = edgeFormData.data || {};

    if (name === 'dynamicEffect') {
      const updatedEdgeData = {
        ...currentData,
        'animation': {
          ...(currentData.animation || {}),
          'dynamicEffect': value as 'flow' | 'arrow' | 'blink' | 'wave' | 'rotate' | 'color-change' | 'fade',
          // isAnimating保持不变，由专门的开关控制
          'isAnimating': (currentData.animation?.isAnimating || false)
        }
      };
      const updatedEdge = {
        ...edgeFormData,
        'data': updatedEdgeData
      };
      setEdgeFormData(updatedEdge as unknown as Edge<CustomEdgeData>);
      reactFlowInstance.updateEdgeData(edgeFormData.id, updatedEdgeData);
    } else if (name === 'weight') {
      const updatedEdgeData = {
        ...currentData,
        'weight': parseFloat(value) || 1
      };
      const updatedEdge = {
        ...edgeFormData,
        'data': updatedEdgeData
      };
      setEdgeFormData(updatedEdge as unknown as Edge<CustomEdgeData>);
      reactFlowInstance.updateEdgeData(edgeFormData.id, updatedEdgeData);
    } else if (name === 'strokeWidth') {
      const updatedEdgeData = {
        ...currentData,
        'style': {
          ...(currentData.style || {}),
          'strokeWidth': parseFloat(value) || 2
        }
      };
      const updatedEdge = {
        ...edgeFormData,
        'data': updatedEdgeData
      };
      setEdgeFormData(updatedEdge as unknown as Edge<CustomEdgeData>);
      reactFlowInstance.updateEdgeData(edgeFormData.id, updatedEdgeData);
    } else {
      const updatedEdgeData = {
        ...currentData,
        [name]: value
      };
      const updatedEdge = {
        ...edgeFormData,
        'data': updatedEdgeData
      };
      setEdgeFormData(updatedEdge as unknown as Edge<CustomEdgeData>);
      reactFlowInstance.updateEdgeData(edgeFormData.id, updatedEdgeData);
    }
  }, [edgeFormData, reactFlowInstance]);

  // 渲染节点编辑面板
  const renderNodeEditPanel = () => {
    if (!selectedNode) {
      return null;
    }

    return (
      <div className="space-y-6 p-1">
        {/* 节点基本信息 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 shadow-sm border border-blue-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            节点基本信息
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                节点标题
              </label>
              <input
                type="text"
                name="title"
                value={nodeFormData.data.title || ''}
                onChange={handleNodeChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-200"
                placeholder="输入节点标题"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                节点类别
              </label>
              <input
                type="text"
                name="category"
                value={nodeFormData.data.category || ''}
                onChange={handleNodeChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-200"
                placeholder="输入节点类别（如：概念、理论等）"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                节点内容
              </label>
              <textarea
                name="content"
                value={nodeFormData.data.metadata?.content || ''}
                onChange={handleNodeChange}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-200 resize-y"
                placeholder="输入节点内容"
              />
            </div>
          </div>
        </div>

        {/* 连接点配置 */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm border border-green-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            连接点配置
          </h3>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                连接点数量
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleHandleCountChange(-1)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  title="减少连接点"
                >
                  <span className="text-gray-700 font-medium">−</span>
                </button>
                <input
                  type="number"
                  name="handleCount"
                  min="0"
                  max="20"
                  // 使用nullish coalescing，只在undefined时使用默认值4，0时显示0
                  value={nodeFormData.data.handleCount ?? 4}
                  onChange={handleNodeChange}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:border-green-200 text-center"
                />
                <button
                  type="button"
                  onClick={() => handleHandleCountChange(1)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  title="增加连接点"
                >
                  <span className="text-gray-700 font-medium">+</span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1 italic">
                连接点会均匀分布在节点外围
              </p>
            </div>
          </div>
        </div>

        {/* 旋转配置 */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 shadow-sm border border-purple-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            旋转配置
          </h3>

          {/* 同步旋转选项 */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-purple-100 mb-4 transition-all duration-200 hover:shadow-md">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="isSyncRotation"
                checked={nodeFormData.data.style?.isSyncRotation || false}
                onChange={handleNodeChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer transition-all duration-200"
              />
              <span>同步内外层旋转</span>
            </label>
            <span className="text-xs text-gray-500 bg-purple-50 px-2 py-1 rounded-full">
              {nodeFormData.data.style?.isSyncRotation ? '同步' : '独立'}
            </span>
          </div>

          {/* 内层旋转 - 影响内容 */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                内层旋转角度（内容）
              </label>
              <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
                {nodeFormData.data.style?.innerAngle || 0}°
              </span>
            </div>
            <input
              type="range"
              name="innerAngle"
              min="0"
              max="360"
              step="1"
              value={nodeFormData.data.style?.innerAngle || 0}
              onChange={handleNodeChange}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-500 transition-all duration-200 hover:h-3"
            />
            <div className="mt-2">
              <input
                type="number"
                name="innerAngle"
                min="0"
                max="360"
                step="1"
                value={nodeFormData.data.style?.innerAngle || 0}
                onChange={handleNodeChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-purple-200 text-center"
                placeholder="输入角度值"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 italic">
              仅调整节点内容的旋转角度
            </p>
          </div>

          {/* 外层旋转 - 影响连接点和连接 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                外层旋转角度（连接点）
              </label>
              <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
                {nodeFormData.data.style?.outerAngle || 0}°
              </span>
            </div>
            <input
              type="range"
              name="outerAngle"
              min="0"
              max="360"
              step="1"
              value={nodeFormData.data.style?.outerAngle || 0}
              onChange={handleNodeChange}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-500 transition-all duration-200 hover:h-3"
              disabled={nodeFormData.data.style?.isSyncRotation || false}
            />
            <div className="mt-2">
              <input
                type="number"
                name="outerAngle"
                min="0"
                max="360"
                step="1"
                value={nodeFormData.data.style?.outerAngle || 0}
                onChange={handleNodeChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-purple-200 text-center"
                placeholder="输入角度值"
                disabled={nodeFormData.data.style?.isSyncRotation || false}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 italic">
              调整连接点和连接的旋转角度，影响连接计算
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 渲染连接编辑面板
  const renderEdgeEditPanel = () => {
    if (!selectedEdge) {
      return null;
    }

    return (
      <div className="space-y-6 p-1">
        {/* 连接基本信息 */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 shadow-sm border border-orange-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
            </svg>
            连接基本信息
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                连接类别
              </label>
              <input
                type="text"
                name="type"
                value={edgeFormData.data?.type || 'related'}
                onChange={handleEdgeChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:border-orange-200"
                placeholder="输入连接类别"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                连接权重
              </label>
              <input
                type="number"
                name="weight"
                min="0.1"
                max="10"
                step="0.1"
                value={edgeFormData.data?.weight || 1}
                onChange={handleEdgeChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:border-orange-200"
              />
            </div>
          </div>
        </div>

        {/* 连接线样式 */}
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 shadow-sm border border-teal-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            连接线样式
          </h3>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                连接线样式
              </label>
              <select
                name="curveType"
                value={edgeFormData.data?.curveType || 'default'}
                onChange={handleEdgeChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 hover:border-teal-200"
              >
                <option value="default">Bezier曲线</option>
                <option value="straight">直线</option>
                <option value="smoothstep">平滑阶梯线</option>
                <option value="simplebezier">简单Bezier曲线</option>
              </select>
            </div>
          </div>
        </div>

        {/* 动态效果 */}
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 shadow-sm border border-pink-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            动态效果
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-pink-100 transition-all duration-200 hover:shadow-md">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <span>效果开关</span>
              </label>
              <input
                type="checkbox"
                checked={edgeFormData.data?.animation?.isAnimating || false}
                onChange={(e) => {
                  // 确保edgeFormData.data存在
                  const currentData = edgeFormData.data || {};
                  const updatedEdge = {
                    ...edgeFormData,
                    'data': {
                      ...currentData,
                      'animation': {
                        ...(currentData.animation || {}),
                        'isAnimating': e.target.checked,
                        'dynamicEffect': e.target.checked ? ((currentData?.animation?.dynamicEffect as 'flow') || 'flow') : 'flow'
                      }
                    }
                  };
                  setEdgeFormData(updatedEdge as unknown as Edge<CustomEdgeData>);
                  // 使用React Flow内置的updateEdge方法更新连接
                  reactFlowInstance.updateEdge(edgeFormData.id, {
                    'data': updatedEdge.data
                  });
                }}
                className="w-10 h-5 bg-gray-200 rounded-full transition-all duration-300 ease-in-out cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-pink-500"
                style={{
                  'background': edgeFormData.data?.animation?.isAnimating ? 'linear-gradient(to right, #ec4899 0%, #f472b6 100%)' : 'linear-gradient(to right, #d1d5db 0%, #9ca3af 100%)',
                  'boxShadow': edgeFormData.data?.animation?.isAnimating ? '0 0 0 2px rgba(236, 72, 153, 0.2)' : 'none'
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                预设效果
              </label>
              <select
                name="dynamicEffect"
                value={edgeFormData.data?.animation?.dynamicEffect || 'flow'}
                onChange={handleEdgeChange}
                disabled={!(edgeFormData.data?.animation?.isAnimating || false)}
                className={`w-full px-4 py-2.5 border ${edgeFormData.data?.animation?.isAnimating ? 'border-gray-300' : 'border-gray-200 bg-gray-100 cursor-not-allowed'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 hover:border-pink-200`}
              >
                <option value="flow">流动动画</option>
                <option value="blink">闪烁效果</option>
                <option value="wave">波浪动画</option>
                <option value="rotate">旋转动画</option>
                <option value="color-change">颜色变化</option>
                <option value="fade">渐隐渐现</option>
                <option value="arrow">箭头动画</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染连接外观面板
  const renderEdgeAppearancePanel = () => {
    if (!selectedEdge) {
      return null;
    }

    return (
      <div className="space-y-6 p-1">
        {/* 连接外观 */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 shadow-sm border border-purple-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-600" />
            连接外观
          </h3>

          {/* 连接宽度 */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                连接宽度
              </label>
              <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
                {edgeFormData.data?.style?.strokeWidth || 2}px
              </span>
            </div>
            <input
              type="range"
              name="strokeWidth"
              min="1"
              max="10"
              step="0.5"
              value={edgeFormData.data?.style?.strokeWidth || 2}
              onChange={handleEdgeChange}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-500 transition-all duration-200 hover:h-3"
            />
            <div className="mt-2">
              <input
                type="number"
                name="strokeWidth"
                min="1"
                max="10"
                step="0.5"
                value={edgeFormData.data?.style?.strokeWidth || 2}
                onChange={handleEdgeChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-purple-200 text-center"
                placeholder="输入宽度值"
              />
            </div>
          </div>

          {/* 颜色选择区域 */}
          <div className="space-y-4 pt-2">
            {/* 连接颜色 */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <Square className="w-4 h-4 text-gray-500" />
                连接颜色
              </label>
              <div className="flex items-center gap-3">
                <div className="w-full h-10 rounded-lg border border-gray-300 flex items-center gap-0">
                  <div
                    className="relative ml-1"
                  >
                    <div
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                      style={{ 'backgroundColor': edgeFormData.data?.style?.stroke || '#3b82f6' }}
                      onClick={(e) => {
                        // 创建一个临时容器，显示在颜色块附近
                        const container = document.createElement('div');
                        container.style.position = 'absolute';
                        container.style.top = '100%';
                        container.style.left = '0';
                        container.style.zIndex = '1000';
                        container.style.marginTop = '4px';
                        e.currentTarget.parentElement?.appendChild(container);

                        // 确保容器有正确的样式
                        container.style.backgroundColor = 'white';
                        container.style.border = '1px solid #e5e7eb';
                        container.style.borderRadius = '0.375rem';
                        container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        container.style.padding = '4px';

                        // 创建颜色选择器，使用默认配置
                        const picker = colorPicker.create({
                          container,
                          'color': edgeFormData.data?.style?.stroke || '#3b82f6'
                        });

                        // 监听颜色选择事件
                        picker.on('selectColor', (event: { color: string }) => {
                          handleEdgeColorChange('stroke', event.color);
                        });

                        // 添加点击外部关闭的事件监听
                        const handleClickOutside = (event: MouseEvent) => {
                          if (container && !container.contains(event.target as Node)) {
                            picker.destroy();
                            container.remove();
                          }
                        };

                        document.addEventListener('mousedown', handleClickOutside);

                        // 确保容器移除时也移除事件监听
                        picker.on('hide', () => {
                          document.removeEventListener('mousedown', handleClickOutside);
                          container.remove();
                        });
                      }}
                    ></div>
                  </div>
                  <input
                    type="text"
                    value={edgeFormData.data?.style?.stroke || '#3b82f6'}
                    onChange={handleEdgeColorInputChange('stroke')}
                    className="flex-1 text-sm px-2 py-0 bg-gray-50 text-gray-700 border-0 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 箭头颜色 */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                箭头颜色
              </label>
              <div className="flex items-center gap-3">
                <div className="w-full h-10 rounded-lg border border-gray-300 flex items-center gap-0">
                  <div
                    className="relative ml-1"
                  >
                    <div
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                      style={{ 'backgroundColor': edgeFormData.data?.style?.arrowColor || (edgeFormData.data?.style?.stroke || '#3b82f6') }}
                      onClick={(e) => {
                        // 创建一个临时容器，显示在颜色块附近
                        const container = document.createElement('div');
                        container.style.position = 'absolute';
                        container.style.top = '100%';
                        container.style.left = '0';
                        container.style.zIndex = '1000';
                        container.style.marginTop = '4px';
                        e.currentTarget.parentElement?.appendChild(container);

                        // 确保容器有正确的样式
                        container.style.backgroundColor = 'white';
                        container.style.border = '1px solid #e5e7eb';
                        container.style.borderRadius = '0.375rem';
                        container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        container.style.padding = '4px';

                        // 创建颜色选择器，使用默认配置
                        const picker = colorPicker.create({
                          container,
                          'color': edgeFormData.data?.style?.arrowColor || (edgeFormData.data?.style?.stroke || '#3b82f6')
                        });

                        // 监听颜色选择事件
                        picker.on('selectColor', (event: { color: string }) => {
                          handleEdgeColorChange('arrowColor', event.color);
                        });

                        // 添加点击外部关闭的事件监听
                        const handleClickOutside = (event: MouseEvent) => {
                          if (container && !container.contains(event.target as Node)) {
                            picker.destroy();
                            container.remove();
                          }
                        };

                        document.addEventListener('mousedown', handleClickOutside);

                        // 确保容器移除时也移除事件监听
                        picker.on('hide', () => {
                          document.removeEventListener('mousedown', handleClickOutside);
                          container.remove();
                        });
                      }}
                    ></div>
                  </div>
                  <input
                    type="text"
                    value={edgeFormData.data?.style?.arrowColor || (edgeFormData.data?.style?.stroke || '#3b82f6')}
                    onChange={handleEdgeColorInputChange('arrowColor')}
                    className="flex-1 text-sm px-2 py-0 bg-gray-50 text-gray-700 border-0 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 标签背景颜色 */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <SquareGantt className="w-4 h-4 text-gray-500" />
                标签背景色
              </label>
              <div className="flex items-center gap-3">
                <div className="w-full h-10 rounded-lg border border-gray-300 flex items-center gap-0">
                  <div
                    className="relative ml-1"
                  >
                    <div
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300 flex items-center justify-center text-white font-bold"
                      style={{ 'backgroundColor': edgeFormData.data?.style?.labelBackgroundColor || (edgeFormData.data?.style?.stroke || '#3b82f6') }}
                      onClick={(e) => {
                        // 创建一个临时容器，显示在颜色块附近
                        const container = document.createElement('div');
                        container.style.position = 'absolute';
                        container.style.top = '100%';
                        container.style.left = '0';
                        container.style.zIndex = '1000';
                        container.style.marginTop = '4px';
                        e.currentTarget.parentElement?.appendChild(container);

                        // 确保容器有正确的样式
                        container.style.backgroundColor = 'white';
                        container.style.border = '1px solid #e5e7eb';
                        container.style.borderRadius = '0.375rem';
                        container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        container.style.padding = '4px';

                        // 创建颜色选择器，使用默认配置
                        const picker = colorPicker.create({
                          container,
                          'color': edgeFormData.data?.style?.labelBackgroundColor || (edgeFormData.data?.style?.stroke || '#3b82f6')
                        });

                        // 监听颜色选择事件
                        picker.on('selectColor', (event: { color: string }) => {
                          handleEdgeColorChange('labelBackgroundColor', event.color);
                        });

                        // 添加点击外部关闭的事件监听
                        const handleClickOutside = (event: MouseEvent) => {
                          if (container && !container.contains(event.target as Node)) {
                            picker.destroy();
                            container.remove();
                          }
                        };

                        document.addEventListener('mousedown', handleClickOutside);

                        // 确保容器移除时也移除事件监听
                        picker.on('hide', () => {
                          document.removeEventListener('mousedown', handleClickOutside);
                          container.remove();
                        });
                      }}
                    >
                      T
                    </div>
                  </div>
                  <input
                    type="text"
                    value={edgeFormData.data?.style?.labelBackgroundColor || (edgeFormData.data?.style?.stroke || '#3b82f6')}
                    onChange={handleEdgeColorInputChange('labelBackgroundColor')}
                    className="flex-1 text-sm px-2 py-0 bg-gray-50 text-gray-700 border-0 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 标签文字颜色 */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <TextIcon className="w-4 h-4 text-gray-500" />
                标签文字色
              </label>
              <div className="flex items-center gap-3">
                <div className="w-full h-10 rounded-lg border border-gray-300 flex items-center gap-0">
                  <div
                    className="relative ml-1"
                  >
                    <div
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300 flex items-center justify-center text-white font-bold"
                      style={{ 'backgroundColor': edgeFormData.data?.style?.labelTextColor || '#FFFFFF' }}
                      onClick={(e) => {
                        // 创建一个临时容器，显示在颜色块附近
                        const container = document.createElement('div');
                        container.style.position = 'absolute';
                        container.style.top = '100%';
                        container.style.left = '0';
                        container.style.zIndex = '1000';
                        container.style.marginTop = '4px';
                        e.currentTarget.parentElement?.appendChild(container);

                        // 确保容器有正确的样式
                        container.style.backgroundColor = 'white';
                        container.style.border = '1px solid #e5e7eb';
                        container.style.borderRadius = '0.375rem';
                        container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        container.style.padding = '4px';

                        // 创建颜色选择器，使用默认配置
                        const picker = colorPicker.create({
                          container,
                          'color': edgeFormData.data?.style?.labelTextColor || '#FFFFFF'
                        });

                        // 监听颜色选择事件
                        picker.on('selectColor', (event: { color: string }) => {
                          handleEdgeColorChange('labelTextColor', event.color);
                        });

                        // 添加点击外部关闭的事件监听
                        const handleClickOutside = (event: MouseEvent) => {
                          if (container && !container.contains(event.target as Node)) {
                            picker.destroy();
                            container.remove();
                          }
                        };

                        document.addEventListener('mousedown', handleClickOutside);

                        // 确保容器移除时也移除事件监听
                        picker.on('hide', () => {
                          document.removeEventListener('mousedown', handleClickOutside);
                          container.remove();
                        });
                      }}
                    >
                      A
                    </div>
                  </div>
                  <input
                    type="text"
                    value={edgeFormData.data?.style?.labelTextColor || '#FFFFFF'}
                    onChange={handleEdgeColorInputChange('labelTextColor')}
                    className="flex-1 text-sm px-2 py-0 bg-gray-50 text-gray-700 border-0 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染节点外观编辑面板
  const renderAppearancePanel = () => {
    if (!selectedNode) {
      return null;
    }

    return (
      <div className="space-y-6 p-1">
        {/* 节点外观设置 */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 shadow-sm border border-purple-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-600" />
            节点外观
          </h3>

          {/* 节点形状选择 */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
              节点形状
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleShapeChange('circle')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${nodeFormData.data.shape === 'circle' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span className="text-xs font-medium">圆形</span>
              </button>
              <button
                type="button"
                onClick={() => handleShapeChange('square')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${nodeFormData.data.shape === 'square' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
                <span className="text-xs font-medium">方形</span>
              </button>
              <button
                type="button"
                onClick={() => handleShapeChange('rectangle')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${nodeFormData.data.shape === 'rectangle' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                </svg>
                <span className="text-xs font-medium">矩形</span>
              </button>
            </div>
          </div>

          {/* 颜色选择区域 */}
          <div className="space-y-4 pt-2">
            {/* 背景颜色 */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <Square className="w-4 h-4 text-gray-500" />
                背景颜色
              </label>
              <div className="flex items-center gap-3">
                <div className="w-full h-10 rounded-lg border border-gray-300 flex items-center gap-0">
                  <div
                    className="relative ml-1"
                  >
                    <div
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                      style={{ 'backgroundColor': nodeFormData.data.style?.fill || '#fff' }}
                      onClick={(e) => {
                        // 创建一个临时容器，显示在颜色块附近
                        const container = document.createElement('div');
                        container.style.position = 'absolute';
                        container.style.top = '100%';
                        container.style.left = '0';
                        container.style.zIndex = '1000';
                        container.style.marginTop = '4px';
                        e.currentTarget.parentElement?.appendChild(container);

                        // 确保容器有正确的样式
                        container.style.backgroundColor = 'white';
                        container.style.border = '1px solid #e5e7eb';
                        container.style.borderRadius = '0.375rem';
                        container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        container.style.padding = '4px';

                        // 创建颜色选择器，使用默认配置
                        const picker = colorPicker.create({
                          container,
                          'color': nodeFormData.data.style?.fill || '#fff'
                        });

                        // 监听颜色选择事件
                        picker.on('selectColor', (event: { color: string }) => {
                          handleColorChange('fill', event.color);
                        });

                        // 添加点击外部关闭的事件监听
                        const handleClickOutside = (event: MouseEvent) => {
                          if (container && !container.contains(event.target as Node)) {
                            picker.destroy();
                            container.remove();
                          }
                        };

                        document.addEventListener('mousedown', handleClickOutside);

                        // 确保容器移除时也移除事件监听
                        picker.on('hide', () => {
                          document.removeEventListener('mousedown', handleClickOutside);
                          container.remove();
                        });
                      }}
                    ></div>
                  </div>
                  <input
                    type="text"
                    value={nodeFormData.data.style?.fill || '#fff'}
                    onChange={handleColorInputChange('fill')}
                    className="flex-1 text-sm px-2 py-0 bg-gray-50 text-gray-700 border-0 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 边框颜色 */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <SquareGantt className="w-4 h-4 text-gray-500" />
                边框颜色
              </label>
              <div className="flex items-center gap-3">
                <div className="w-full h-10 rounded-lg border border-gray-300 flex items-center gap-0">
                  <div
                    className="relative ml-1"
                  >
                    <div
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                      style={{ 'backgroundColor': nodeFormData.data.style?.stroke || '#4ECDC4' }}
                      onClick={(e) => {
                        // 创建一个临时容器，显示在颜色块附近
                        const container = document.createElement('div');
                        container.style.position = 'absolute';
                        container.style.top = '100%';
                        container.style.left = '0';
                        container.style.zIndex = '1000';
                        container.style.marginTop = '4px';
                        e.currentTarget.parentElement?.appendChild(container);

                        // 确保容器有正确的样式
                        container.style.backgroundColor = 'white';
                        container.style.border = '1px solid #e5e7eb';
                        container.style.borderRadius = '0.375rem';
                        container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        container.style.padding = '4px';

                        // 创建颜色选择器，使用默认配置
                        const picker = colorPicker.create({
                          container,
                          'color': nodeFormData.data.style?.stroke || '#4ECDC4'
                        });

                        // 监听颜色选择事件
                        picker.on('selectColor', (event: { color: string }) => {
                          handleColorChange('stroke', event.color);
                        });

                        // 添加点击外部关闭的事件监听
                        const handleClickOutside = (event: MouseEvent) => {
                          if (container && !container.contains(event.target as Node)) {
                            picker.destroy();
                            container.remove();
                          }
                        };

                        document.addEventListener('mousedown', handleClickOutside);

                        // 确保容器移除时也移除事件监听
                        picker.on('hide', () => {
                          document.removeEventListener('mousedown', handleClickOutside);
                          container.remove();
                        });
                      }}
                    ></div>
                  </div>
                  <input
                    type="text"
                    value={nodeFormData.data.style?.stroke || '#4ECDC4'}
                    onChange={handleColorInputChange('stroke')}
                    className="flex-1 text-sm px-2 py-0 bg-gray-50 text-gray-700 border-0 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 文字颜色 */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <Type className="w-4 h-4 text-gray-500" />
                文字颜色
              </label>
              <div className="flex items-center gap-3">
                <div className="w-full h-10 rounded-lg border border-gray-300 flex items-center gap-0">
                  <div
                    className="relative ml-1"
                  >
                    <div
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300 flex items-center justify-center text-white font-bold"
                      style={{ 'backgroundColor': nodeFormData.data.style?.textColor || '#666' }}
                      onClick={(e) => {
                        // 创建一个临时容器，显示在颜色块附近
                        const container = document.createElement('div');
                        container.style.position = 'absolute';
                        container.style.top = '100%';
                        container.style.left = '0';
                        container.style.zIndex = '1000';
                        container.style.marginTop = '4px';
                        e.currentTarget.parentElement?.appendChild(container);

                        // 确保容器有正确的样式
                        container.style.backgroundColor = 'white';
                        container.style.border = '1px solid #e5e7eb';
                        container.style.borderRadius = '0.375rem';
                        container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        container.style.padding = '4px';

                        // 创建颜色选择器，使用默认配置
                        const picker = colorPicker.create({
                          container,
                          'color': nodeFormData.data.style?.textColor || '#666'
                        });

                        // 监听颜色选择事件
                        picker.on('selectColor', (event: { color: string }) => {
                          handleColorChange('textColor', event.color);
                        });

                        // 添加点击外部关闭的事件监听
                        const handleClickOutside = (event: MouseEvent) => {
                          if (container && !container.contains(event.target as Node)) {
                            picker.destroy();
                            container.remove();
                          }
                        };

                        document.addEventListener('mousedown', handleClickOutside);

                        // 确保容器移除时也移除事件监听
                        picker.on('hide', () => {
                          document.removeEventListener('mousedown', handleClickOutside);
                          container.remove();
                        });
                      }}
                    >
                      A
                    </div>
                  </div>
                  <input
                    type="text"
                    value={nodeFormData.data.style?.textColor || '#666'}
                    onChange={handleColorInputChange('textColor')}
                    className="flex-1 text-sm px-2 py-0 bg-gray-50 text-gray-700 border-0 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 标题背景颜色 */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <Heading className="w-4 h-4 text-gray-500" />
                标题背景色
              </label>
              <div className="flex items-center gap-3">
                <div className="w-full h-10 rounded-lg border border-gray-300 flex items-center gap-0">
                  <div
                    className="relative ml-1"
                  >
                    <div
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300 flex items-center justify-center text-white font-bold"
                      style={{ 'backgroundColor': nodeFormData.data.style?.titleBackgroundColor || '#4ECDC4' }}
                      onClick={(e) => {
                        // 创建一个临时容器，显示在颜色块附近
                        const container = document.createElement('div');
                        container.style.position = 'absolute';
                        container.style.top = '100%';
                        container.style.left = '0';
                        container.style.zIndex = '1000';
                        container.style.marginTop = '4px';
                        e.currentTarget.parentElement?.appendChild(container);

                        // 确保容器有正确的样式
                        container.style.backgroundColor = 'white';
                        container.style.border = '1px solid #e5e7eb';
                        container.style.borderRadius = '0.375rem';
                        container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        container.style.padding = '4px';

                        // 创建颜色选择器，使用默认配置
                        const picker = colorPicker.create({
                          container,
                          'color': nodeFormData.data.style?.titleBackgroundColor || '#4ECDC4'
                        });

                        // 监听颜色选择事件
                        picker.on('selectColor', (event: { color: string }) => {
                          handleColorChange('titleBackgroundColor', event.color);
                        });

                        // 添加点击外部关闭的事件监听
                        const handleClickOutside = (event: MouseEvent) => {
                          if (container && !container.contains(event.target as Node)) {
                            picker.destroy();
                            container.remove();
                          }
                        };

                        document.addEventListener('mousedown', handleClickOutside);

                        // 确保容器移除时也移除事件监听
                        picker.on('hide', () => {
                          document.removeEventListener('mousedown', handleClickOutside);
                          container.remove();
                        });
                      }}
                    >
                      T
                    </div>
                  </div>
                  <input
                    type="text"
                    value={nodeFormData.data.style?.titleBackgroundColor || '#4ECDC4'}
                    onChange={handleColorInputChange('titleBackgroundColor')}
                    className="flex-1 text-sm px-2 py-0 bg-gray-50 text-gray-700 border-0 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 标题文本颜色 */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <TextIcon className="w-4 h-4 text-gray-500" />
                标题文字色
              </label>
              <div className="flex items-center gap-3">
                <div className="w-full h-10 rounded-lg border border-gray-300 flex items-center gap-0">
                  <div
                    className="relative ml-1"
                  >
                    <div
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300 flex items-center justify-center text-white font-bold"
                      style={{ 'backgroundColor': nodeFormData.data.style?.titleTextColor || '#FFFFFF' }}
                      onClick={(e) => {
                        // 创建一个临时容器，显示在颜色块附近
                        const container = document.createElement('div');
                        container.style.position = 'absolute';
                        container.style.top = '100%';
                        container.style.left = '0';
                        container.style.zIndex = '1000';
                        container.style.marginTop = '4px';
                        e.currentTarget.parentElement?.appendChild(container);

                        // 确保容器有正确的样式
                        container.style.backgroundColor = 'white';
                        container.style.border = '1px solid #e5e7eb';
                        container.style.borderRadius = '0.375rem';
                        container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        container.style.padding = '4px';

                        // 创建颜色选择器，使用默认配置
                        const picker = colorPicker.create({
                          container,
                          'color': nodeFormData.data.style?.titleTextColor || '#FFFFFF'
                        });

                        // 监听颜色选择事件
                        picker.on('selectColor', (event: { color: string }) => {
                          handleColorChange('titleTextColor', event.color);
                        });

                        // 添加点击外部关闭的事件监听
                        const handleClickOutside = (event: MouseEvent) => {
                          if (container && !container.contains(event.target as Node)) {
                            picker.destroy();
                            container.remove();
                          }
                        };

                        document.addEventListener('mousedown', handleClickOutside);

                        // 确保容器移除时也移除事件监听
                        picker.on('hide', () => {
                          document.removeEventListener('mousedown', handleClickOutside);
                          container.remove();
                        });
                      }}
                    >
                      Tt
                    </div>
                  </div>
                  <input
                    type="text"
                    value={nodeFormData.data.style?.titleTextColor || '#FFFFFF'}
                    onChange={handleColorInputChange('titleTextColor')}
                    className="flex-1 text-sm px-2 py-0 bg-gray-50 text-gray-700 border-0 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染当前激活的面板内容
  const renderActivePanelContent = () => {
    switch (activePanel) {
      case 'node':
        return renderNodeEditPanel();
      case 'edge':
        return renderEdgeEditPanel();
      case 'appearance':
        return renderAppearancePanel();
      case 'edgeAppearance':
        return renderEdgeAppearancePanel();
      default:
        return null;
    }
  };

  // 可用面板列表
  const availablePanels = useMemo(() => {
    const panels: Array<{ type: PanelType; label: string }> = [];

    if (selectedNode) {
      panels.push({ 'type': 'node', 'label': '节点编辑' });
      panels.push({ 'type': 'appearance', 'label': '节点外观' });
    }

    if (selectedEdge) {
      panels.push({ 'type': 'edge', 'label': '连接编辑' });
      panels.push({ 'type': 'edgeAppearance', 'label': '连接外观' });
    }

    return panels;
  }, [selectedNode, selectedEdge]);

  // 如果没有选中节点或连接，显示友好提示
  if (!selectedNode && !selectedEdge) {
    return (
      <div className={`w-72 bg-white shadow-lg flex flex-col overflow-hidden h-full ${panelPosition === 'left' ? 'border-r border-gray-200 absolute left-0 top-0 z-10' : 'border-l border-gray-200 absolute right-0 top-0 z-10'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              编辑面板
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              选择节点或连接进行编辑
            </p>
          </div>
          <button
            onClick={() => {
              // 直接使用reactFlowInstance取消所有选择
              reactFlowInstance.setNodes((nds) => nds.map((node) => ({
                ...node,
                'selected': false
              })));
              reactFlowInstance.setEdges((eds) => eds.map((edge) => ({
                ...edge,
                'selected': false
              })));
            }}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            title="关闭面板"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm">请选择一个节点或连接来编辑</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-72 bg-white shadow-lg flex flex-col overflow-hidden h-full transition-all duration-300 ease-in-out ${panelPosition === 'left' ? 'border-r border-gray-200 absolute left-0 top-0 z-10' : 'border-l border-gray-200 absolute right-0 top-0 z-10'}`}>
      {/* 面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {selectedNode ? '编辑节点' : '编辑连接'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {selectedNode ? '调整节点属性和连接点配置' : '修改连接样式和动态效果'}
          </p>
        </div>
        <button
          onClick={() => {
            // 直接使用reactFlowInstance取消所有选择
            reactFlowInstance.setNodes((nds) => nds.map((node) => ({
              ...node,
              'selected': false
            })));
            reactFlowInstance.setEdges((eds) => eds.map((edge) => ({
              ...edge,
              'selected': false
            })));
          }}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title="关闭面板"
          aria-label="关闭面板"
        >
          <X size={20} />
        </button>
      </div>

      {/* 面板导航菜单 */}
      <div className="border-b border-gray-200 bg-white overflow-x-auto shadow-sm">
        <div className="flex min-w-max">
          {availablePanels.map(panel => (
            <button
              key={panel.type}
              onClick={() => setActivePanel(panel.type)}
              className={`px-4 py-3 flex items-center gap-2 text-sm font-medium transition-all duration-200 ease-in-out whitespace-nowrap ${activePanel === panel.type ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-500'}`}
              aria-pressed={activePanel === panel.type}
            >
              {panel.label}
            </button>
          ))}
        </div>
      </div>

      {/* 面板内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
        {renderActivePanelContent()}
      </div>
    </div>
  );
};

// 使用React.memo优化组件渲染性能，减少不必要的重渲染
export default React.memo(GraphControlPanel);
