import React, { useState, useEffect } from 'react';
import { Trash2, Pencil, Plus } from 'lucide-react';
import { ArticleDraft } from '../../types/draft';

interface DraftManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDraft: (_draft: ArticleDraft) => void;
  onCreateNewDraft: () => void;
}

/**
 * 获取所有保存的草稿
 */
const getAllDrafts = (): ArticleDraft[] => {
  const drafts: ArticleDraft[] = [];

  // 遍历本地存储，找到所有草稿
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('draft_anonymous_')) {
      try {
        const draftStr = localStorage.getItem(key);
        if (draftStr) {
          const draft = JSON.parse(draftStr) as ArticleDraft;
          drafts.push(draft);
        }
      } catch (error) {
        console.error(`读取草稿 ${key} 失败:`, error);
      }
    }
  }

  // 按最后保存时间倒序排序
  return drafts.sort((a, b) => {
    return new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime();
  });
};

/**
 * 检查并删除匹配的草稿
 */
const checkAndDeleteDraft = (key: string, draftId: string): boolean => {
  const draftStr = localStorage.getItem(key);
  if (!draftStr) {
    return false;
  }

  try {
    const draft = JSON.parse(draftStr) as ArticleDraft;
    if (draft.id === draftId) {
      localStorage.removeItem(key);
      return true;
    }
  } catch {
    // 解析失败，忽略此草稿
  }

  return false;
};

/**
 * 删除草稿
 */
const deleteDraft = (draftId: string): boolean => {
  try {
    // 找到对应的草稿键并删除
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith('draft_anonymous_')) {
        if (checkAndDeleteDraft(key, draftId)) {
          return true;
        }
      }
    }
    return false;
  } catch (e) {
    console.error('删除草稿失败:', e);
    return false;
  }
};

/**
 * 文章草稿管理组件
 */
export function DraftManager ({
  isOpen,
  onClose,
  onLoadDraft,
  onCreateNewDraft
}: DraftManagerProps) {
  const [drafts, setDrafts] = useState<ArticleDraft[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 加载所有草稿
  const loadDrafts = () => {
    setDrafts(getAllDrafts());
  };

  // 初始加载草稿
  useEffect(() => {
    if (isOpen) {
      loadDrafts();
    }
  }, [isOpen]);

  // 过滤草稿
  const filteredDrafts = drafts.filter(draft => {
    const searchLower = searchTerm.toLowerCase();
    return draft.title.toLowerCase().includes(searchLower) ||
           draft.content.toLowerCase().includes(searchLower);
  });

  // 处理删除草稿
  const handleDeleteDraft = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // 直接删除草稿，不弹出确认
    const success = deleteDraft(draftId);
    if (success) {
      // 重新加载草稿列表
      loadDrafts();
    }
  };

  // 处理加载草稿
  const handleLoadDraft = (draft: ArticleDraft) => {
    onLoadDraft(draft);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            文章草稿管理
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索草稿..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={onCreateNewDraft}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              <Plus size={16} />
              <span>新建草稿</span>
            </button>
          </div>
        </div>

        <div className="p-4">
          {filteredDrafts.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              {searchTerm ? '未找到匹配的草稿' : '暂无保存的草稿'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDrafts.map((draft, index) => (
                <div
                  key={draft.id || `draft-${index}`}
                  className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleLoadDraft(draft)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {draft.title || '无标题草稿'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {draft.content || '空草稿'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="编辑草稿"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadDraft(draft);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="删除草稿"
                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      创建于: {new Date(draft.createdAt).toLocaleString()}
                    </span>
                    <span>
                      最后保存: {new Date(draft.lastSaved).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              共 {drafts.length} 个草稿
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
