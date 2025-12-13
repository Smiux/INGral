import React from 'react';

// 导入类型定义
export interface GraphSettingsPanelProps {
  // 状态
  isSettingsPanelOpen: boolean;
  toolbarAutoHide: boolean;
  
  // 回调函数
  setIsSettingsPanelOpen: (open: boolean) => void;
  setToolbarAutoHide: (autoHide: boolean) => void;
}

// 自定义比较函数，用于React.memo
const areEqual = (prevProps: GraphSettingsPanelProps, nextProps: GraphSettingsPanelProps) => {
  // 比较面板状态和工具栏设置
  return prevProps.isSettingsPanelOpen === nextProps.isSettingsPanelOpen &&
         prevProps.toolbarAutoHide === nextProps.toolbarAutoHide;
};

export const GraphSettingsPanel: React.FC<GraphSettingsPanelProps> = React.memo(({
  isSettingsPanelOpen,
  toolbarAutoHide,
  setIsSettingsPanelOpen,
  setToolbarAutoHide
}) => {
  if (!isSettingsPanelOpen) {
    return null;
  }

  return (
    <div className="fixed top-16 right-4 bg-white shadow-xl rounded-md p-4 w-80 z-50">
      <h3 className="font-medium mb-3 text-gray-800">设置</h3>
      
      {/* 顶部工具栏显示模式 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">顶部工具栏显示模式</h4>
        <div className="flex gap-2">
          <button
            onClick={() => setToolbarAutoHide(false)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm transition-colors ${!toolbarAutoHide ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            固定显示
          </button>
          <button
            onClick={() => setToolbarAutoHide(true)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm transition-colors ${toolbarAutoHide ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            自动收起
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">自动收起：鼠标离开工具栏3秒后自动隐藏，鼠标移到顶部区域时显示</p>
      </div>
      
      {/* 关闭按钮 */}
      <button
        onClick={() => setIsSettingsPanelOpen(false)}
        className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm mt-2 transition-colors"
      >
        关闭
      </button>
    </div>
  );
}, areEqual);