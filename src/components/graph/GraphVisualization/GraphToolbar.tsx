import React from 'react';
import {
  Undo,
  Redo,
  Settings,
  Layers,
  Activity,
  Target,
  Eye,
  EyeOff
} from 'lucide-react';
import { useGraphContext } from './GraphContext';

export const GraphToolbar: React.FC = React.memo(() => {
  const { state, actions } = useGraphContext();

  const {
    isToolbarVisible,
    viewMode,
    isSettingsPanelOpen,
    isLeftToolbarVisible,
    toolbarAutoHide,
    leftToolbarAutoHide
  } = state;

  if (!isToolbarVisible) {
    return null;
  }

  const handleUndo = () => {
    actions.undo();
  };

  const handleRedo = () => {
    actions.redo();
  };

  const handleToggleViewMode = () => {
    actions.setViewMode(viewMode === '2d' ? '3d' : '2d');
  };

  const handleToggleSettings = () => {
    actions.setIsSettingsPanelOpen(!isSettingsPanelOpen);
  };

  const handleToggleLeftToolbar = () => {
    actions.setIsLeftToolbarVisible(!isLeftToolbarVisible);
  };

  const handleToggleToolbarAutoHide = () => {
    actions.setToolbarAutoHide(!toolbarAutoHide);
  };

  const handleToggleLeftToolbarAutoHide = () => {
    actions.setLeftToolbarAutoHide(!leftToolbarAutoHide);
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex gap-2">
      <div className="flex gap-2 bg-white rounded-lg shadow-md border border-gray-200 p-2">
        <button
          onClick={handleUndo}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="撤销"
        >
          <Undo size={16} className="text-gray-700" />
        </button>
        <button
          onClick={handleRedo}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="重做"
        >
          <Redo size={16} className="text-gray-700" />
        </button>
        <div className="w-px h-6 bg-gray-200 mx-2" />
        <button
          onClick={handleToggleViewMode}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title={viewMode === '2d' ? '切换到3D视图' : '切换到2D视图'}
        >
          {viewMode === '2d' ? <Activity size={16} className="text-gray-700" /> : <Target size={16} className="text-gray-700" />}
        </button>
        <button
          onClick={handleToggleSettings}
          className={`p-2 hover:bg-gray-100 rounded-md transition-colors ${isSettingsPanelOpen ? 'bg-blue-100' : ''}`}
          title="设置"
        >
          <Settings size={16} className="text-gray-700" />
        </button>
      </div>

      <div className="flex gap-2 bg-white rounded-lg shadow-md border border-gray-200 p-2">
        <button
          onClick={handleToggleLeftToolbar}
          className={`p-2 hover:bg-gray-100 rounded-md transition-colors ${!isLeftToolbarVisible ? 'bg-blue-100' : ''}`}
          title="切换左侧工具栏"
        >
          <Layers size={16} className="text-gray-700" />
        </button>
        <button
          onClick={handleToggleToolbarAutoHide}
          className={`p-2 hover:bg-gray-100 rounded-md transition-colors ${toolbarAutoHide ? 'bg-blue-100' : ''}`}
          title="切换自动隐藏"
        >
          <Eye size={16} className="text-gray-700" />
        </button>
        <button
          onClick={handleToggleLeftToolbarAutoHide}
          className={`p-2 hover:bg-gray-100 rounded-md transition-colors ${leftToolbarAutoHide ? 'bg-blue-100' : ''}`}
          title="切换左侧自动隐藏"
        >
          <EyeOff size={16} className="text-gray-700" />
        </button>
      </div>
    </div>
  );
});

export default GraphToolbar;
