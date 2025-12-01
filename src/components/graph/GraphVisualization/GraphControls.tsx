/**
 * 图谱控制组件
 * 提供图表的控制功能，包括编辑模式切换、模拟控制、布局选择等
 */
import React from 'react';
import { Edit, Save, Play, Pause, Grid, Circle, ArrowUpDown, ArrowLeftRight } from 'lucide-react';
import type { GraphControlsProps } from './types';

/**
 * 图谱控制组件
 * @param props - 组件属性
 */
export const GraphControls: React.FC<GraphControlsProps> = ({
  isEditMode,
  setIsEditMode,
  isSimulationRunning,
  setIsSimulationRunning,
  layoutType,
  setLayoutType,
  layoutDirection,
  setLayoutDirection,
  isAddingLink,
  cancelAddLink,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex flex-wrap gap-2">
        {/* 编辑模式切换 */}
        <button
          className={`px-4 py-2 rounded-md flex items-center gap-2 ${isEditMode ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          onClick={() => setIsEditMode(!isEditMode)}
        >
          <Edit size={16} />
          {isEditMode ? '退出编辑' : '进入编辑'}
        </button>

        {/* 模拟控制 */}
        <button
          className={`px-4 py-2 rounded-md flex items-center gap-2 ${isSimulationRunning ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          onClick={() => setIsSimulationRunning(!isSimulationRunning)}
        >
          {isSimulationRunning ? <Pause size={16} /> : <Play size={16} />}
          {isSimulationRunning ? '暂停模拟' : '开始模拟'}
        </button>

        {/* 布局选择 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">布局:</span>
          <div className="flex gap-1">
            <button
              className={`p-2 rounded-md ${layoutType === 'force' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setLayoutType('force')}
              title="力导向布局"
            >
              <Circle size={16} />
            </button>
            <button
              className={`p-2 rounded-md ${layoutType === 'hierarchical' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setLayoutType('hierarchical')}
              title="层次布局"
            >
              <ArrowUpDown size={16} />
            </button>
            <button
              className={`p-2 rounded-md ${layoutType === 'circular' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setLayoutType('circular')}
              title="圆形布局"
            >
              <Circle size={16} />
            </button>
            <button
              className={`p-2 rounded-md ${layoutType === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setLayoutType('grid')}
              title="网格布局"
            >
              <Grid size={16} />
            </button>
          </div>
        </div>

        {/* 布局方向 */}
        {layoutType === 'hierarchical' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">方向:</span>
            <div className="flex gap-1">
              <button
                className={`p-2 rounded-md ${layoutDirection === 'top-bottom' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                onClick={() => setLayoutDirection('top-bottom')}
                title="从上到下"
              >
                <ArrowUpDown size={16} />
              </button>
              <button
                className={`p-2 rounded-md ${layoutDirection === 'left-right' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                onClick={() => setLayoutDirection('left-right')}
                title="从左到右"
              >
                <ArrowLeftRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* 取消添加链接 */}
        {isAddingLink && (
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center gap-2"
            onClick={cancelAddLink}
          >
            <Save size={16} />
            取消添加链接
          </button>
        )}
      </div>
    </div>
  );
};
