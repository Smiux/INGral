import { X, Settings } from 'lucide-react';

interface GalleryInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

export const GalleryInfoPanel = ({
  isOpen,
  onClose,
  title,
  description,
  onTitleChange,
  onDescriptionChange
}: GalleryInfoPanelProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      <div className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-neutral-800 shadow-xl z-50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-neutral-500" />
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              文章集信息
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="输入文章集标题"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="输入文章集描述（可选）"
              rows={4}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 resize-none"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default GalleryInfoPanel;
