import {
  Plus,
  Save,
  Undo2,
  Redo2,
  Trash2
} from 'lucide-react';

interface ToolbarProps {
  onAddNode: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  isSaving: boolean;
}

export const Toolbar = ({
  onAddNode,
  onSave,
  onUndo,
  onRedo,
  onDelete,
  canUndo,
  canRedo,
  hasSelection,
  isSaving
}: ToolbarProps) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onAddNode}
        className="flex flex-col items-center gap-1 px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
        title="添加文章节点"
      >
        <Plus className="w-5 h-5" />
        <span className="text-xs">添加节点</span>
      </button>

      <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="flex flex-col items-center gap-1 px-3 py-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="撤销 (Ctrl+Z)"
      >
        <Undo2 className="w-5 h-5" />
        <span className="text-xs">撤销</span>
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="flex flex-col items-center gap-1 px-3 py-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="重做 (Ctrl+Y)"
      >
        <Redo2 className="w-5 h-5" />
        <span className="text-xs">重做</span>
      </button>

      <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />

      {hasSelection && (
        <button
          onClick={onDelete}
          className="flex flex-col items-center gap-1 px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
          title="删除选中项"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs">删除</span>
        </button>
      )}

      <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />

      <button
        onClick={onSave}
        disabled={isSaving}
        className="flex flex-col items-center gap-1 px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="保存 (Ctrl+S)"
      >
        <Save className="w-5 h-5" />
        <span className="text-xs">{isSaving ? '保存中...' : '保存'}</span>
      </button>
    </div>
  );
};

export default Toolbar;
