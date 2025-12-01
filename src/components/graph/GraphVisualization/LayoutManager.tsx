/**
 * 布局管理组件
 * 负责图谱布局的管理和应用
 */
import React from 'react';
import type { LayoutManagerProps } from './types';

/**
 * 布局管理组件
 * @param props - 组件属性
 */
export const LayoutManager: React.FC<LayoutManagerProps> = ({
  nodes,
  links,
  layoutType,
  layoutDirection,
}) => {
  // 布局计算在GraphCanvas组件中处理，这里只显示布局信息

  // 布局计算在GraphCanvas组件中处理，这里只显示布局信息
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="text-sm text-gray-600">
        当前布局: {layoutType === 'force' ? '力导向' : layoutType === 'hierarchical' ? '层次化' : layoutType === 'circular' ? '圆形' : '网格'}布局
        {layoutType === 'hierarchical' && ` (${layoutDirection === 'top-bottom' ? '从上到下' : '从左到右'})`}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        节点数: {nodes.length} | 链接数: {links.length}
      </div>
    </div>
  );
};
