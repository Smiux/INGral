import React, { useState } from 'react';
import { Trash2, Pencil, Plus, FileText, Search, Clock, X, AlertTriangle } from 'lucide-react';
import {
  ArticleDraft,
  getAllDrafts,
  deleteDraft
} from '../utils/draft';

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
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">确认删除</h3>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">确定要删除这个草稿吗？此操作无法撤销。</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteDraft(deleteTarget)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center flex-shrink-0">
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-500" />
              文章草稿管理
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="搜索草稿..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                />
              </div>
              <button
                onClick={onCreateNewDraft}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md transition-colors font-medium"
              >
                <Plus size={16} />
                <span>新建草稿</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredDrafts.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-700 mb-4">
                  <FileText className="w-10 h-10 text-neutral-400" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {searchTerm ? '未找到匹配的草稿' : '暂无保存的草稿'}
                </p>
                <p className="text-sm text-neutral-400">
                  {searchTerm ? '尝试其他搜索关键词' : ''}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700"
                    onClick={() => {
                      onLoadDraft(draft);
                      onClose();
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-800 dark:text-neutral-200 truncate text-lg">
                          {draft.title || '无标题草稿'}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2">
                          {stripHtml(draft.content) || '空草稿'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                        <button
                          className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
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
                          className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
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
                    <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500 dark:text-neutral-400">
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

          <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                共 <span className="font-medium text-neutral-800 dark:text-neutral-200">{drafts.length}</span> 个草稿
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-md transition-colors font-medium"
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
