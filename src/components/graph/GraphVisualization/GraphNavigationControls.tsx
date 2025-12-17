import React from 'react';
import { EnhancedNode } from './types';
import type { ReactFlowInstance } from 'reactflow';

// 导入类型定义
export interface GraphNavigationControlsProps {
  // 状态
  nodes: EnhancedNode[];
  reactFlowInstance?: ReactFlowInstance | null;
}

// 自定义比较函数，用于React.memo
const areEqual = (prevProps: GraphNavigationControlsProps, nextProps: GraphNavigationControlsProps) => {
  // 只比较节点数量和reactFlowInstance，因为其他props变化较少
  return prevProps.nodes.length === nextProps.nodes.length && prevProps.reactFlowInstance === nextProps.reactFlowInstance;
};

export const GraphNavigationControls: React.FC<GraphNavigationControlsProps> = React.memo(({
  nodes,
  reactFlowInstance
}) => {
  // 中心对齐功能
  const handleCenterAlign = () => {
    if (reactFlowInstance) {
      // 使用ReactFlow的API重置缩放和平移
      reactFlowInstance.setViewport({
        x: 0,
        y: 0,
        zoom: 1
      }, {
        duration: 500
      });
    }
  };

  // 自适应缩放功能
  const handleFitToScreen = () => {
    if (reactFlowInstance && nodes.length > 0) {
      // 使用ReactFlow的fitView方法自动适应视图
      reactFlowInstance.fitView({
        padding: 100,
        duration: 500
      });
    }
  };

  // 放大功能
  const handleZoomIn = () => {
    if (reactFlowInstance) {
      // 使用ReactFlow的API放大
      reactFlowInstance.zoomIn({ duration: 200 });
    }
  };

  // 缩小功能
  const handleZoomOut = () => {
    if (reactFlowInstance) {
      // 使用ReactFlow的API缩小
      reactFlowInstance.zoomOut({ duration: 200 });
    }
  };

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/90 rounded-xl shadow-md p-1.5 flex flex-col gap-1.5 backdrop-blur-sm border border-gray-100">
      {/* 缩放控制 */}
      <div className="flex gap-1.5">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-all duration-200 ease-in-out transform hover:scale-[1.05] shadow-sm hover:shadow-md"
          title="放大"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-all duration-200 ease-in-out transform hover:scale-[1.05] shadow-sm hover:shadow-md"
          title="缩小"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
      </div>
      
      {/* 视图控制 */}
      <div className="flex gap-1.5">
        <button
          onClick={handleCenterAlign}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-all duration-200 ease-in-out transform hover:scale-[1.05] shadow-sm hover:shadow-md"
          title="中心对齐"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-all duration-200 ease-in-out transform hover:scale-[1.05] shadow-sm hover:shadow-md"
          title="自适应视图"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="15"></line>
            <line x1="15" y1="9" x2="9" y2="15"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}, areEqual);