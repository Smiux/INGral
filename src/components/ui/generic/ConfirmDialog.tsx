import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ConfirmDialog ({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  isLoading = false,
  className = ''
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-slate-50 dark:bg-slate-800 rounded max-w-md w-full mx-4 border border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50/80 dark:bg-red-950/30 rounded">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-slate-500 dark:text-slate-400">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-700/80 border border-slate-200/60 dark:border-slate-600/60 rounded hover:bg-slate-200/80 dark:hover:bg-slate-600/80 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
