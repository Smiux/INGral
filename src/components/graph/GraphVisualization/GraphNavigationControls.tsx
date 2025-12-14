import React from 'react';
import { EnhancedNode } from './types';

// 导入类型定义
export interface GraphNavigationControlsProps {
  // 状态
  containerRef: React.RefObject<HTMLDivElement>;
  nodes: EnhancedNode[];
}

// 自定义比较函数，用于React.memo
const areEqual = (prevProps: GraphNavigationControlsProps, nextProps: GraphNavigationControlsProps) => {
  // 只比较节点数量，因为其他props变化较少
  return prevProps.nodes.length === nextProps.nodes.length;
};

export const GraphNavigationControls: React.FC<GraphNavigationControlsProps> = React.memo(({
  containerRef,
  nodes
}) => {
  // 中心对齐功能
  const handleCenterAlign = () => {
    const svg = containerRef.current?.querySelector('svg');
    if (svg) {
      // 使用D3的zoomIdentity重置缩放和平移
      const d3 = (window as unknown as { d3: typeof import('d3') }).d3;
      if (d3) {
        d3.select(svg).transition().duration(500).call(
          (d3.zoom() as d3.ZoomBehavior<SVGSVGElement, unknown>).transform, d3.zoomIdentity
        );
      }
    }
  };

  // 自适应缩放功能
  const handleFitToScreen = () => {
    const svg = containerRef.current?.querySelector('svg');
    if (svg && nodes.length > 0) {
      // 计算节点的边界框
      const xValues = nodes.map(n => n.x || 0);
      const yValues = nodes.map(n => n.y || 0);
      const xMin = Math.min(...xValues);
      const xMax = Math.max(...xValues);
      const yMin = Math.min(...yValues);
      const yMax = Math.max(...yValues);
      
      // 检查containerRef.current是否为null
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      // 计算缩放比例
      const scaleX = width / (xMax - xMin + 200);
      const scaleY = height / (yMax - yMin + 200);
      const scale = Math.min(scaleX, scaleY, 1);
      
      // 计算中心位置
      const centerX = (xMin + xMax) / 2;
      const centerY = (yMin + yMax) / 2;
      
      // 应用缩放和居中
      const d3 = (window as unknown as { d3: typeof import('d3') }).d3;
      if (d3) {
        d3.select(svg).transition().duration(500).call(
          (d3.zoom() as d3.ZoomBehavior<SVGSVGElement, unknown>).transform, 
          d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-centerX, -centerY)
        );
      }
    }
  };

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/90 rounded-xl shadow-md p-1.5 flex flex-col gap-1.5 backdrop-blur-sm border border-gray-100">
      {/* 缩放控制 */}
      <div className="flex gap-1.5">
        <button
          onClick={() => containerRef.current?.querySelector('svg')?.dispatchEvent(
            new WheelEvent('wheel', { deltaY: -100, bubbles: true })
          )}
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
          onClick={() => containerRef.current?.querySelector('svg')?.dispatchEvent(
            new WheelEvent('wheel', { deltaY: 100, bubbles: true })
          )}
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