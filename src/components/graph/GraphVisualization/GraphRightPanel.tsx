import React from 'react';
import { GraphLegend } from './GraphLegend';
import { NodeProperties } from './NodeProperties';
import { LinkProperties } from './LinkProperties';

// 导入类型定义
import { EnhancedNode, EnhancedGraphLink } from './types';
import { GraphTheme } from './ThemeTypes';

export interface GraphRightPanelProps {
  // 状态
  nodes: EnhancedNode[];
  selectedNode: EnhancedNode | null;
  selectedLink: EnhancedGraphLink | null;
  currentTheme: GraphTheme;
  
  // 回调函数
  handleCopyNodeStyle: () => void;
  handleCopyLinkStyle: () => void;
  handleUpdateNode: (node: EnhancedNode) => void;
  handleUpdateLink: (link: EnhancedGraphLink) => void;
}

// 自定义比较函数，用于React.memo
const areEqual = (prevProps: GraphRightPanelProps, nextProps: GraphRightPanelProps) => {
  // 比较选中节点和链接
  if (prevProps.selectedNode?.id !== nextProps.selectedNode?.id ||
      prevProps.selectedLink?.id !== nextProps.selectedLink?.id) {
    return false;
  }
  
  // 比较节点数量
  if (prevProps.nodes.length !== nextProps.nodes.length) {
    return false;
  }
  
  // 比较主题颜色
  if (prevProps.currentTheme.node.fill !== nextProps.currentTheme.node.fill ||
      prevProps.currentTheme.link.stroke !== nextProps.currentTheme.link.stroke) {
    return false;
  }
  
  return true;
};

export const GraphRightPanel: React.FC<GraphRightPanelProps> = React.memo(({
  nodes,
  selectedNode,
  selectedLink,
  currentTheme,
  handleCopyNodeStyle,
  handleCopyLinkStyle,
  handleUpdateNode,
  handleUpdateLink
}) => {
  return (
    <div className="w-64 md:w-64 lg:w-64 bg-white shadow-md p-4 overflow-y-auto transition-all duration-300 ease-in-out">
      {/* 选择统计面板 */}
      <div className="mb-6 border rounded-lg p-3 bg-gray-50">
        <h3 className="font-medium mb-2 text-gray-800">选择统计</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">节点总数:</span>
            <span className="font-medium text-gray-900">{nodes.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">选中节点:</span>
            <span className="font-medium text-blue-600">{selectedNode ? 1 : 0}</span>
          </div>
          <div className="border-t pt-2 mt-2">
            {selectedNode && (
              <div className="text-xs text-gray-500">
                <p>按住Ctrl/Cmd键可以多选节点</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 图谱图例和控制 */}
      <div className="mb-6">
        <GraphLegend
          theme={currentTheme}
          onNodeStyleChange={() => {}} // 暂时留空，后续可以添加样式修改功能
          onLinkStyleChange={() => {}} // 暂时留空，后续可以添加样式修改功能
        />
      </div>
      
      {/* 节点属性面板 */}
      {selectedNode && (
        <div className="mb-6">
          <NodeProperties
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
            onCopyStyle={handleCopyNodeStyle}
          />
        </div>
      )}

      {/* 链接属性面板 */}
      {selectedLink && (
        <div className="mb-6">
          <LinkProperties
            link={selectedLink}
            nodes={nodes}
            onUpdateLink={handleUpdateLink}
            onCopyStyle={handleCopyLinkStyle}
          />
        </div>
      )}
    </div>
  );
}, areEqual);