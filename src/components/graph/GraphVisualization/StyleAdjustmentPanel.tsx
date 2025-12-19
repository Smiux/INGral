import React from 'react';
import { SlidersHorizontal, PaintBucket, Link as LinkIcon } from 'lucide-react';

// 导入类型定义
import { EnhancedNode, EnhancedGraphConnection } from './types';
import { GraphTheme, NodeStyle, LinkStyle } from './ThemeTypes';

interface StyleAdjustmentPanelProps {
  selectedNode: EnhancedNode | null;
  selectedNodes: EnhancedNode[];
  selectedLinks: EnhancedGraphConnection[];
  currentTheme: GraphTheme;
  handleCopyNodeStyle: () => void;
  handleCopyLinkStyle: () => void;
  handlePasteStyle: () => void;
  setCurrentTheme: (_theme: GraphTheme) => void;
}

/**
 * 样式调整面板
 * 允许用户调整当前选中节点/链接的样式
 */
export const StyleAdjustmentPanel: React.FC<StyleAdjustmentPanelProps> = ({
  selectedNode,
  selectedNodes,
  selectedLinks,
  currentTheme,
  handleCopyNodeStyle,
  handleCopyLinkStyle,
  handlePasteStyle,
  setCurrentTheme
}) => {
  // 检查是否有选中的节点或链接
  const hasSelectedNodes = selectedNodes.length > 0 || selectedNode !== null;
  const hasSelectedLinks = selectedLinks.length > 0;

  // 更新节点样式
  const updateNodeStyle = (style: Partial<NodeStyle>) => {
    setCurrentTheme({
      ...currentTheme,
      'node': {
        ...currentTheme.node,
        ...style
      }
    });
  };

  // 更新链接样式
  const updateLinkStyle = (style: Partial<LinkStyle>) => {
    setCurrentTheme({
      ...currentTheme,
      'link': {
        ...currentTheme.link,
        ...style
      }
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* 提示信息 */}
      {!hasSelectedNodes && !hasSelectedLinks && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          <p>请先选中节点或链接以调整样式</p>
        </div>
      )}

      {/* 复制粘贴样式功能 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <PaintBucket className="w-4 h-4 text-gray-500" />
          样式复制粘贴
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopyNodeStyle}
            disabled={!hasSelectedNodes}
            className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-1"
            title="复制节点样式"
          >
            <PaintBucket className="w-3 h-3" />
            复制节点样式
          </button>
          <button
            onClick={handleCopyLinkStyle}
            disabled={!hasSelectedLinks}
            className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-1"
            title="复制链接样式"
          >
            <LinkIcon className="w-3 h-3" />
            复制链接样式
          </button>
          <button
            onClick={handlePasteStyle}
            className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-sm col-span-2 flex items-center justify-center gap-1"
            title="粘贴样式"
          >
            <SlidersHorizontal className="w-3 h-3" />
            粘贴样式
          </button>
        </div>
      </div>

      {/* 节点样式调整 */}
      {hasSelectedNodes && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <PaintBucket className="w-4 h-4 text-blue-500" />
            节点样式调整
          </h3>

          {/* 节点大小调整 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">节点大小</label>
              <span className="text-sm font-medium text-gray-800">{currentTheme.node.radius}</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={currentTheme.node.radius}
              onChange={(e) => updateNodeStyle({ 'radius': parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-all duration-200 ease-in-out"
            />
          </div>

          {/* 节点颜色调整 */}
          <div className="space-y-2 mt-3">
            <label className="text-sm text-gray-600 block">节点颜色</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={currentTheme.node.fill}
                onChange={(e) => updateNodeStyle({ 'fill': e.target.value })}
                className="w-12 h-10 rounded-lg cursor-pointer border border-gray-300 transition-all duration-200 ease-in-out hover:scale-[1.05]"
              />
              <input
                type="text"
                value={currentTheme.node.fill}
                onChange={(e) => updateNodeStyle({ 'fill': e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 节点边框调整 */}
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">边框宽度</label>
              <span className="text-sm font-medium text-gray-800">{currentTheme.node.strokeWidth}</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={currentTheme.node.strokeWidth}
              onChange={(e) => updateNodeStyle({ 'strokeWidth': parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-all duration-200 ease-in-out"
            />
          </div>
        </div>
      )}

      {/* 链接样式调整 */}
      {hasSelectedLinks && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-green-500" />
            链接样式调整
          </h3>

          {/* 链接宽度调整 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">链接宽度</label>
              <span className="text-sm font-medium text-gray-800">{currentTheme.link.strokeWidth}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={currentTheme.link.strokeWidth}
              onChange={(e) => updateLinkStyle({ 'strokeWidth': parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600 transition-all duration-200 ease-in-out"
            />
          </div>

          {/* 链接颜色调整 */}
          <div className="space-y-2 mt-3">
            <label className="text-sm text-gray-600 block">链接颜色</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={currentTheme.link.stroke}
                onChange={(e) => updateLinkStyle({ 'stroke': e.target.value })}
                className="w-12 h-10 rounded-lg cursor-pointer border border-gray-300 transition-all duration-200 ease-in-out hover:scale-[1.05]"
              />
              <input
                type="text"
                value={currentTheme.link.stroke}
                onChange={(e) => updateLinkStyle({ 'stroke': e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* 链接透明度调整 */}
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">透明度</label>
              <span className="text-sm font-medium text-gray-800">{(currentTheme.link.strokeOpacity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentTheme.link.strokeOpacity}
              onChange={(e) => updateLinkStyle({ 'strokeOpacity': parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600 transition-all duration-200 ease-in-out"
            />
          </div>
        </div>
      )}
    </div>
  );
};
