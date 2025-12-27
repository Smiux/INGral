import React from 'react';
import { useGraphContext } from './GraphContext';

export const GraphSettingsPanel: React.FC = () => {
  const { state, actions } = useGraphContext();

  const { isSettingsPanelOpen, toolbarAutoHide } = state;

  if (!isSettingsPanelOpen) {
    return null;
  }

  return (
    <div className="fixed top-16 right-4 shadow-xl rounded-md p-4 w-80 z-50 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="font-medium mb-3 text-gray-800">设置</h3>

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
            自动隐藏
          </button>
        </div>
      </div>

      <div className="border-t pt-3">
        <button
          onClick={() => actions.setIsSettingsPanelOpen(false)}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );
};

export default GraphSettingsPanel;
