/**
 * 布局管理组件
 * 负责图谱布局的管理和应用
 */
import React, { useState } from 'react';
import type { LayoutManagerProps, LayoutType, LayoutDirection, SavedLayout, CustomLayout } from './types';

/**
 * 力导向布局参数接口
 */
export interface ForceParameters {
  charge?: number;
  linkStrength?: number;
  linkDistance?: number;
  gravity?: number;
}

/**
 * 布局管理组件
 * @param props - 组件属性
 */
export const LayoutManager: React.FC<LayoutManagerProps & {
  onLayoutTypeChange?: (_type: LayoutType) => void;
  onLayoutDirectionChange?: (_direction: LayoutDirection) => void;
  nodeSpacing?: number;
  levelSpacing?: number;
  onNodeSpacingChange?: (_spacing: number) => void;
  onLevelSpacingChange?: (_spacing: number) => void;
  forceParameters?: ForceParameters;
  onForceParametersChange?: (_params: ForceParameters) => void;
  savedLayouts?: SavedLayout[];
  onSaveLayout?: (_layout: SavedLayout) => void;
  onLoadLayout?: (_layout: SavedLayout) => void;
  onDeleteLayout?: (_layoutId: string) => void;
}> = ({
  nodes,
  connections,
  layoutType,
  layoutDirection,
  nodeSpacing = 50,
  levelSpacing = 100,
  forceParameters,
  onLayoutTypeChange,
  onLayoutDirectionChange,
  onNodeSpacingChange,
  onLevelSpacingChange,
  onForceParametersChange,
  savedLayouts = [],
  onSaveLayout,
  onLoadLayout,
  onDeleteLayout
}) => {
  const [showSaveLayoutModal, setShowSaveLayoutModal] = useState(false);
  const [layoutName, setLayoutName] = useState('');

  // 生成唯一ID
  const generateId = () => {
    return `layout_${Date.now()}_${Math.random().toString(36)
      .substr(2, 9)}`;
  };

  // 保存布局
  const handleSaveLayout = () => {
    if (!layoutName.trim()) {
      return;
    }

    const currentLayout: CustomLayout = {
      'id': generateId(),
      'name': layoutName.trim(),
      layoutType,
      layoutDirection,
      nodeSpacing,
      levelSpacing,
      forceParameters,
      'createdAt': Date.now(),
      'updatedAt': Date.now()
    };

    // 收集节点位置
    const nodePositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        nodePositions[node.id] = { 'x': node.x, 'y': node.y };
      }
    });

    const savedLayout: SavedLayout = {
      'id': generateId(),
      'name': layoutName.trim(),
      'layout': currentLayout,
      nodePositions,
      'createdAt': Date.now(),
      'updatedAt': Date.now()
    };

    onSaveLayout?.(savedLayout);
    setShowSaveLayoutModal(false);
    setLayoutName('');
  };

  // 加载布局
  const handleLoadLayout = (layout: SavedLayout) => {
    onLoadLayout?.(layout);
  };

  // 删除布局
  const handleDeleteLayout = (layoutId: string) => {
    onDeleteLayout?.(layoutId);
  };
  return (
    <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">布局类型</h4>
        <div className="grid grid-cols-2 gap-2">
          {
            [
              { 'value': 'force', 'label': '力导向' },
              { 'value': 'tree', 'label': '树形' },
              { 'value': 'hierarchical', 'label': '层次化' },
              { 'value': 'circular', 'label': '圆形' },
              { 'value': 'grid', 'label': '网格' },
              { 'value': 'radial', 'label': '径向' },
              { 'value': 'geographic', 'label': '地理' }
            ].map((layout) => (
              <button
                key={layout.value}
                onClick={() => onLayoutTypeChange?.(layout.value as LayoutType)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${layoutType === layout.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {layout.label}
              </button>
            ))
          }
        </div>
      </div>

      {(layoutType === 'tree' || layoutType === 'hierarchical') && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">布局方向</h4>
          <div className="flex flex-wrap gap-2">
            {
              [
                { 'value': 'top-bottom', 'label': '从上到下' },
                { 'value': 'left-right', 'label': '从左到右' },
                { 'value': 'bottom-top', 'label': '从下到上' },
                { 'value': 'right-left', 'label': '从右到左' }
              ].map((direction) => (
                <button
                  key={direction.value}
                  onClick={() => onLayoutDirectionChange?.(direction.value as LayoutDirection)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${layoutDirection === direction.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {direction.label}
                </button>
              ))
            }
          </div>
        </div>
      )}

      {(layoutType === 'tree' || layoutType === 'hierarchical' || layoutType === 'radial') && (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">节点间距</h4>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="20"
                max="200"
                step="10"
                value={nodeSpacing}
                onChange={(e) => onNodeSpacingChange?.(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 min-w-[50px] text-right">{nodeSpacing}px</span>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">层级间距</h4>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="50"
                max="300"
                step="10"
                value={levelSpacing}
                onChange={(e) => onLevelSpacingChange?.(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 min-w-[50px] text-right">{levelSpacing}px</span>
            </div>
          </div>
        </div>
      )}

      {layoutType === 'force' && (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">力导向参数</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-600">节点排斥力</span>
                  <span className="text-xs font-medium text-gray-700">{forceParameters?.charge || -300}</span>
                </div>
                <input
                  type="range"
                  min="-500"
                  max="0"
                  step="50"
                  value={forceParameters?.charge || -300}
                  onChange={(e) => onForceParametersChange?.({ ...forceParameters, 'charge': parseInt(e.target.value, 10) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-600">链接强度</span>
                  <span className="text-xs font-medium text-gray-700">{(forceParameters?.linkStrength || 0.1).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={forceParameters?.linkStrength || 0.1}
                  onChange={(e) => onForceParametersChange?.({ ...forceParameters, 'linkStrength': parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-600">链接距离</span>
                  <span className="text-xs font-medium text-gray-700">{forceParameters?.linkDistance || 150}px</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={forceParameters?.linkDistance || 150}
                  onChange={(e) => onForceParametersChange?.({ ...forceParameters, 'linkDistance': parseInt(e.target.value, 10) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-600">重力</span>
                  <span className="text-xs font-medium text-gray-700">{(forceParameters?.gravity || 0.1).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={forceParameters?.gravity || 0.1}
                  onChange={(e) => onForceParametersChange?.({ ...forceParameters, 'gravity': parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 布局保存和加载功能 */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-700">布局管理</h4>
          <div className="flex gap-2">
            {/* 导入布局按钮 */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const importedLayouts = JSON.parse(event.target?.result as string);
                        if (Array.isArray(importedLayouts)) {
                          // 逐个加载导入的布局
                          importedLayouts.forEach(layout => {
                            onSaveLayout?.(layout);
                          });
                        } else {
                          // 单个布局导入
                          onSaveLayout?.(importedLayouts);
                        }
                      } catch (error) {
                        console.error('导入布局失败:', error);
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              />
              <button
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                title="导入布局"
              >
                导入布局
              </button>
            </label>

            {/* 导出布局按钮 */}
            <button
              onClick={() => {
                if (savedLayouts.length === 0) {
                  return;
                }

                const dataStr = JSON.stringify(savedLayouts, null, 2);
                const dataBlob = new Blob([dataStr], { 'type': 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `knowledge-graph-layouts-${Date.now()}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              disabled={savedLayouts.length === 0}
              className={`px-3 py-1.5 text-white text-sm rounded-md transition-colors ${savedLayouts.length > 0 ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-300 cursor-not-allowed'}`}
              title="导出布局"
            >
              导出布局
            </button>

            {/* 保存布局按钮 */}
            <button
              onClick={() => setShowSaveLayoutModal(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              title="保存当前布局"
            >
              保存布局
            </button>
          </div>
        </div>

        {/* 已保存布局列表 */}
        {savedLayouts.length > 0 ? (
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <h5 className="text-xs font-medium text-gray-600 mb-2">已保存的布局</h5>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {savedLayouts.map((layout) => (
                <div key={layout.id} className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {layout.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {layout.layout.layoutType}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      保存于: {new Date(layout.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleLoadLayout(layout)}
                      className="px-2 py-0.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                      title="加载布局"
                    >
                      加载
                    </button>
                    <button
                      onClick={() => handleDeleteLayout(layout.id)}
                      className="px-2 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                      title="删除布局"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">
            暂无保存的布局
          </div>
        )}
      </div>

      {/* 保存布局模态框 */}
      {showSaveLayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-xl w-full max-w-sm">
            <h4 className="text-lg font-medium text-gray-800 mb-4">保存当前布局</h4>
            <div className="space-y-4">
              <div>
                <label htmlFor="layout-name" className="block text-sm font-medium text-gray-700 mb-1">
                  布局名称
                </label>
                <input
                  type="text"
                  id="layout-name"
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  placeholder="输入布局名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSaveLayoutModal(false);
                    setLayoutName('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveLayout}
                  disabled={!layoutName.trim()}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    layoutName.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-300 text-white cursor-not-allowed'
                  }`}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        节点数: {nodes.length} | 链接数: {connections.length}
      </div>
    </div>
  );
};
