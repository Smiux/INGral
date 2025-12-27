import React from 'react';
import type { GraphNode } from './GraphTypes';
import type { ReactFlowInstance } from '@xyflow/react';

export interface GraphNavigationControlsProps {
  nodes: GraphNode[];
  reactFlowInstance?: ReactFlowInstance | null;
}

const areEqual = (prevProps: GraphNavigationControlsProps, nextProps: GraphNavigationControlsProps) => {
  return prevProps.nodes.length === nextProps.nodes.length && prevProps.reactFlowInstance === nextProps.reactFlowInstance;
};

export const GraphNavigationControls: React.FC<GraphNavigationControlsProps> = React.memo(({
  nodes,
  reactFlowInstance
}) => {
  const handleCenterAlign = () => {
    if (reactFlowInstance) {
      if (nodes.length > 0) {
        reactFlowInstance.fitView({
          'padding': 100,
          'duration': 500
        });
      } else {
        reactFlowInstance.setViewport({
          'x': 0,
          'y': 0,
          'zoom': 1
        }, {
          'duration': 500
        });
      }
    }
  };

  const handleFitToScreen = () => {
    if (reactFlowInstance && nodes.length > 0) {
      reactFlowInstance.fitView({
        'padding': 100,
        'duration': 500
      });
    }
  };

  const handleZoomIn = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn({ 'duration': 200 });
    }
  };

  const handleZoomOut = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut({ 'duration': 200 });
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      <button
        onClick={handleCenterAlign}
        className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 border border-gray-200"
        title="居中对齐"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 16v4M4 16H4M12 4v16" />
        </svg>
      </button>
      <button
        onClick={handleFitToScreen}
        className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 border border-gray-200"
        title="适应屏幕"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3h6v6h-6M9 21H3v-6h6M10 14l2-2m0 0l-2 2m0 0l-2 2" />
        </svg>
      </button>
      <button
        onClick={handleZoomIn}
        className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 border border-gray-200"
        title="放大"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5l7-7M13 10V7a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2h6a2 2 0 002-2v-3" />
        </svg>
      </button>
      <button
        onClick={handleZoomOut}
        className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 border border-gray-200"
        title="缩小"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5l7-7M13 10V7a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2h6a2 2 0 002-2v-3" />
        </svg>
      </button>
    </div>
  );
}, areEqual);

export default GraphNavigationControls;
