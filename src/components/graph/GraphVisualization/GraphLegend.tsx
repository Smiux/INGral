/**
 * 图谱图例组件
 * 负责显示图谱的图例和提供基本控制功能
 */
import React from 'react';
import type { GraphTheme, NodeStyle, LinkStyle } from './ThemeTypes';

/**
 * 图谱图例组件属性
 */
export interface GraphLegendProps {
  theme: GraphTheme;
  onNodeStyleChange?: (style: Partial<NodeStyle>) => void;
  onLinkStyleChange?: (style: Partial<LinkStyle>) => void;
}

/**
 * 图谱图例组件
 * @param props - 组件属性
 */
export const GraphLegend: React.FC<GraphLegendProps> = ({
  theme,
  onNodeStyleChange,
  onLinkStyleChange,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
      <h4 className="text-sm font-medium text-gray-700">图谱图例</h4>
      
      {/* 节点样式图例 */}
      <div>
        <h5 className="text-xs font-medium text-gray-600 mb-2">节点样式</h5>
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center" 
            style={{
              backgroundColor: theme.node.fill,
              border: `${theme.node.strokeWidth}px solid ${theme.node.stroke}`,
            }}
          >
            <span 
              className="text-xs font-medium" 
              style={{ color: theme.node.textFill }}
            >
              节点
            </span>
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500">节点半径: {theme.node.radius}px</div>
            <input
              type="range"
              min="10"
              max="40"
              value={theme.node.radius}
              onChange={(e) => onNodeStyleChange?.({ radius: parseInt(e.target.value) })}
              className="w-full mt-1 accent-blue-600"
            />
          </div>
        </div>
      </div>
      
      {/* 链接样式图例 */}
      <div>
        <h5 className="text-xs font-medium text-gray-600 mb-2">链接样式</h5>
        <div className="flex items-center gap-3">
          <div className="w-12 h-6 flex items-center">
            <div 
              className="w-full h-0.5" 
              style={{
                backgroundColor: theme.link.stroke,
                opacity: theme.link.strokeOpacity,
                height: `${theme.link.strokeWidth}px`,
              }}
            />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500">链接粗细: {theme.link.strokeWidth}px</div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={theme.link.strokeWidth}
              onChange={(e) => onLinkStyleChange?.({ strokeWidth: parseFloat(e.target.value) })}
              className="w-full mt-1 accent-blue-600"
            />
          </div>
        </div>
      </div>
      
      {/* 链接透明度控制 */}
      <div>
        <div className="text-xs text-gray-500 mb-1">链接透明度: {(theme.link.strokeOpacity * 100).toFixed(0)}%</div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={theme.link.strokeOpacity}
          onChange={(e) => onLinkStyleChange?.({ strokeOpacity: parseFloat(e.target.value) })}
          className="w-full accent-blue-600"
        />
      </div>
    </div>
  );
};
