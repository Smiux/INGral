import React, { useState } from 'react';
import type { GraphNode, LayoutType, LayoutDirection, SavedLayout } from './GraphTypes';

export interface ForceParameters {
  charge?: number;
  linkStrength?: number;
  linkDistance?: number;
  gravity?: number;
}

export const LayoutManager: React.FC<{
  nodes: GraphNode[];
  layoutType: LayoutType;
  layoutDirection: LayoutDirection;
  nodeSpacing?: number;
  levelSpacing?: number;
  onLayoutTypeChange?: (_type: LayoutType) => void;
  onLayoutDirectionChange?: (_direction: LayoutDirection) => void;
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
  const [localLayoutType, setLocalLayoutType] = useState<LayoutType>(layoutType);
  const [localLayoutDirection, setLocalLayoutDirection] = useState<LayoutDirection>(layoutDirection);
  const [localNodeSpacing, setLocalNodeSpacing] = useState(nodeSpacing);
  const [localLevelSpacing, setLocalLevelSpacing] = useState(levelSpacing);
  const [localForceParameters, setLocalForceParameters] = useState<ForceParameters>(
    forceParameters || {
      'charge': -300,
      'linkStrength': 0.1,
      'linkDistance': 100,
      'gravity': 0.1
    }
  );

  const handleLayoutTypeChange = (type: LayoutType) => {
    setLocalLayoutType(type);
    onLayoutTypeChange?.(type);
  };

  const handleLayoutDirectionChange = (direction: LayoutDirection) => {
    setLocalLayoutDirection(direction);
    onLayoutDirectionChange?.(direction);
  };

  const handleNodeSpacingChange = (spacing: number) => {
    setLocalNodeSpacing(spacing);
    onNodeSpacingChange?.(spacing);
  };

  const handleLevelSpacingChange = (spacing: number) => {
    setLocalLevelSpacing(spacing);
    onLevelSpacingChange?.(spacing);
  };

  const handleForceParametersChange = (params: ForceParameters) => {
    setLocalForceParameters(params);
    onForceParametersChange?.(params);
  };

  const handleSaveLayout = () => {
    if (onSaveLayout) {
      const newLayout: SavedLayout = {
        'id': `layout-${Date.now()}`,
        'name': `布局 ${savedLayouts.length + 1}`,
        'layoutType': localLayoutType,
        'layoutDirection': localLayoutDirection,
        'nodePositions': nodes.reduce((acc, node) => {
          acc[node.id] = { 'x': node.layout.x, 'y': node.layout.y };
          return acc;
        }, {} as Record<string, { x: number; y: number }>),
        'createdAt': Date.now(),
        'updatedAt': Date.now()
      };
      onSaveLayout(newLayout);
    }
  };

  const handleLoadLayout = (layout: SavedLayout) => {
    if (onLoadLayout) {
      onLoadLayout(layout);
    }
  };

  const handleDeleteLayout = (layoutId: string) => {
    if (onDeleteLayout) {
      onDeleteLayout(layoutId);
    }
  };

  return (
    <div className="space-y-6 bg-gray-50 p-4 rounded-lg shadow-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          布局类型
        </label>
        <select
          value={localLayoutType}
          onChange={(e) => handleLayoutTypeChange(e.target.value as LayoutType)}
          className="block w-full bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:border-gray-300"
        >
          <option value="force">力导向布局</option>
          <option value="tree">树形布局</option>
          <option value="hierarchical">层次布局</option>
          <option value="circular">圆形布局</option>
          <option value="grid">网格布局</option>
          <option value="radial">径向布局</option>
          <option value="geographic">地理布局</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          布局方向
        </label>
        <select
          value={localLayoutDirection}
          onChange={(e) => handleLayoutDirectionChange(e.target.value as LayoutDirection)}
          className="block w-full bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:border-gray-300"
        >
          <option value="top-bottom">从上到下</option>
          <option value="left-right">从左到右</option>
          <option value="bottom-top">从下到上</option>
          <option value="right-left">从右到左</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          节点间距: {localNodeSpacing}
        </label>
        <input
          type="range"
          min="20"
          max="200"
          value={localNodeSpacing}
          onChange={(e) => handleNodeSpacingChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-gray-300 transition-colors duration-200"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          层级间距: {localLevelSpacing}
        </label>
        <input
          type="range"
          min="50"
          max="300"
          value={localLevelSpacing}
          onChange={(e) => handleLevelSpacingChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-gray-300 transition-colors duration-200"
        />
      </div>

      {localLayoutType === 'force' && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-4">力导向布局参数</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-600">电荷</label>
                <span className="text-sm font-semibold text-blue-600">{localForceParameters.charge}</span>
              </div>
              <input
                type="range"
                min="-500"
                max="-50"
                value={localForceParameters.charge}
                onChange={(e) => handleForceParametersChange({ ...localForceParameters, 'charge': parseInt(e.target.value, 10) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-gray-300 transition-colors duration-200"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-600">连接强度</label>
                <span className="text-sm font-semibold text-blue-600">{localForceParameters.linkStrength?.toFixed(2) ?? '0.10'}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={localForceParameters.linkStrength}
                onChange={(e) => handleForceParametersChange({ ...localForceParameters, 'linkStrength': parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-gray-300 transition-colors duration-200"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-600">连接距离</label>
                <span className="text-sm font-semibold text-blue-600">{localForceParameters.linkDistance}</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                value={localForceParameters.linkDistance}
                onChange={(e) => handleForceParametersChange({ ...localForceParameters, 'linkDistance': parseInt(e.target.value, 10) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-gray-300 transition-colors duration-200"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-600">重力</label>
                <span className="text-sm font-semibold text-blue-600">{localForceParameters.gravity?.toFixed(2) ?? '0.10'}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={localForceParameters.gravity}
                onChange={(e) => handleForceParametersChange({ ...localForceParameters, 'gravity': parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-gray-300 transition-colors duration-200"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-4">已保存布局</h4>
        <button
          onClick={handleSaveLayout}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          保存当前布局
        </button>

        {savedLayouts.length > 0 && (
          <div className="mt-4">
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {savedLayouts.map(layout => (
                <div key={layout.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 ease-in-out border border-gray-100 hover:border-gray-200">
                  <div className="flex-1 mb-3 sm:mb-0">
                    <div className="text-sm font-semibold text-gray-800">{layout.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {layout.layoutType} - {layout.layoutDirection}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      保存于: {new Date(layout.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoadLayout(layout)}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      加载
                    </button>
                    <button
                      onClick={() => handleDeleteLayout(layout.id)}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayoutManager;
