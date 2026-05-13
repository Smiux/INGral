import React, { useState } from 'react';
import { Trash2, Pencil, Plus, FileText, Search, Clock, X } from 'lucide-react';
import {
  ArticleDraft,
  getAllDrafts,
  deleteDraft
} from '../utils/draft';
import { ConfirmDialog } from '@/components/ui';

interface DraftManagerProps {
  'isOpen': boolean;
  'onClose': () => void;
  'onLoadDraft': (draft: ArticleDraft) => void;
  'onCreateNewDraft': () => void;
}

const stripHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

export const DraftManager: React.FC<DraftManagerProps> = ({
  isOpen,
  onClose,
  onLoadDraft,
  onCreateNewDraft
}) => {
  const [drafts, setDrafts] = useState<ArticleDraft[]>(() => getAllDrafts());
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filteredDrafts = drafts.filter(draft => {
    const searchLower = searchTerm.toLowerCase();
    return draft.title.toLowerCase().includes(searchLower) ||
           draft.content.toLowerCase().includes(searchLower);
  });

  const handleDeleteDraft = (draftId: string) => {
    if (deleteDraft(draftId)) {
      setDrafts(prev => prev.filter(d => d.id !== draftId));
    }
    setDeleteTarget(null);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="确认删除"
        message="确定要删除这个草稿吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={() => handleDeleteDraft(deleteTarget!)}
        onCancel={() => setDeleteTarget(null)}
        className="z-[60]"
      />
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center flex-shrink-0">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-500" />
              文章草稿管理
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100/40 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索草稿..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200/60 dark:border-slate-700/60 rounded bg-slate-200/50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                />
              </div>
              <button
                onClick={onCreateNewDraft}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded transition-colors font-medium"
              >
                <Plus size={16} />
                <span>新建草稿</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredDrafts.length === 0 ? (
              <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100/40 dark:bg-slate-800/40 mb-4">
                  <FileText className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {searchTerm ? '未找到匹配的草稿' : '暂无保存的草稿'}
                </p>
                <p className="text-sm text-slate-400">
                  {searchTerm ? '尝试其他搜索关键词' : ''}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="bg-slate-100/40 dark:bg-slate-800/40 rounded p-4 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/80 transition-colors border border-slate-200/60 dark:border-slate-700/60"
                    onClick={() => {
                      onLoadDraft(draft);
                      onClose();
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-700 dark:text-slate-300 truncate text-lg">
                          {draft.title || '无标题草稿'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                          {stripHtml(draft.content) || '空草稿'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                        <button
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/80 transition-colors"
                          title="编辑草稿"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLoadDraft(draft);
                            onClose();
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/80 transition-colors"
                          title="删除草稿"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(draft.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        创建: {new Date(draft.createdAt).toLocaleString('zh-CN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        保存: {new Date(draft.lastSaved).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/90 dark:bg-slate-900/90 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                共 <span className="font-medium text-slate-700 dark:text-slate-300">{drafts.length}</span> 个草稿
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200/50 hover:bg-slate-300/80 dark:bg-slate-800/80 dark:hover:bg-slate-600/80 text-slate-700 dark:text-slate-300 rounded transition-colors font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
