import React from 'react';

// 导入自定义Hook
import { useGraph } from './useGraph';

// 移除areEqual函数，简化组件
export const GraphSettingsPanel: React.FC = () => {
  // 使用useGraph Hook获取状态和操作
  const { state, actions } = useGraph();

  // 从state中解构需要的状态
  const { isSettingsPanelOpen, toolbarAutoHide, currentTheme } = state;

  if (!isSettingsPanelOpen) {
    return null;
  }

  return (
    <div className={`fixed top-16 right-4 shadow-xl rounded-md p-4 w-80 z-50 ${currentTheme.backgroundColor} border border-gray-200`}>
      <h3 className="font-medium mb-3 text-gray-800">设置</h3>

      {/* 顶部工具栏显示模式 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">顶部工具栏显示模式</h4>
        <div className="flex gap-2">
          <button
            onClick={() => actions.setToolbarAutoHide(false)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm transition-colors ${!toolbarAutoHide ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            固定显示
          </button>
          <button
            onClick={() => actions.setToolbarAutoHide(true)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm transition-colors ${toolbarAutoHide ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            自动收起
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">自动收起：鼠标离开工具栏3秒后自动隐藏，鼠标移到顶部区域时显示</p>
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={() => actions.setIsSettingsPanelOpen(false)}
        className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm mt-2 transition-colors"
      >
        关闭
      </button>
    </div>
  );
};
