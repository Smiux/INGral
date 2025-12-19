import { useEffect, useRef, useCallback } from 'react';

/**
 * 自动保存管理器组件
 * 定期将编辑器内容保存到本地存储，防止意外丢失
 */
interface AutosaveManagerProps {
  title: string;
  content: string;
  visibility: 'public' | 'unlisted';
  slug?: string | undefined;
  onAutosaveStatusChange?: (_status: 'saving' | 'saved' | 'error', _message?: string) => void;
}

export function AutosaveManager ({
  title,
  content,
  visibility,
  slug,
  onAutosaveStatusChange
}: AutosaveManagerProps) {
  // 保存上一次保存的内容，用于增量保存
  const prevContentRef = useRef<string>(content);
  const prevTitleRef = useRef<string>(title);
  const prevVisibilityRef = useRef<string>(visibility);
  const lastSavedTimeRef = useRef<number>(0);
  const isSavingRef = useRef<boolean>(false);
  // 保存定时器引用
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 根据文档大小和变化频率动态调整保存间隔
  const getDynamicSaveInterval = useCallback(() => {
    const contentLength = content.length;
    const contentChange = Math.abs(content.length - prevContentRef.current.length);

    // 文档越大，保存间隔越长；变化越大，保存间隔越短
    if (contentLength < 1000) {
      // 小文档：根据变化大小调整保存间隔
      // 变化大时2秒，变化小时5秒
      return contentChange > 500 ? 2000 : 5000;
    } else if (contentLength < 5000) {
      // 中等文档：根据变化大小调整保存间隔
      // 变化大时3秒，变化小时7秒
      return contentChange > 1000 ? 3000 : 7000;
    }
    // 大文档：根据变化大小调整保存间隔
    // 变化大时4秒，变化小时10秒
    return contentChange > 2000 ? 4000 : 10000;
  }, [content]);

  /**
   * 自动保存逻辑
   * 根据内容变化动态调整保存间隔，实现增量保存
   */
  useEffect(() => {
    let saveTimeout: NodeJS.Timeout;

    // 只有在标题或内容不为空且内容有变化时才设置定时器
    if ((title || content) && (content !== prevContentRef.current || title !== prevTitleRef.current || visibility !== prevVisibilityRef.current)) {
      // 清除之前的定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // 获取动态保存间隔
      const saveInterval = getDynamicSaveInterval();

      // 设置新的定时器
      saveTimeout = setTimeout(async () => {
        // 如果正在保存，跳过本次保存
        if (isSavingRef.current) {
          return;
        }

        isSavingRef.current = true;

        try {
          onAutosaveStatusChange?.('saving', '正在自动保存...');

          const draftKey = `draft_anonymous_${slug || 'new'}`;
          const currentDate = new Date();
          const now = Date.now();

          // 实现增量保存：只保存变化的部分
          const savedDraftStr = localStorage.getItem(draftKey);
          const savedDraft = savedDraftStr ? JSON.parse(savedDraftStr) : {};

          // 更新需要保存的字段
          const draft = {
            ...savedDraft,
            title,
            content,
            visibility,
            'lastSaved': currentDate.toISOString(),
            // 添加版本号
            'version': Date.now(),
            // 标记为增量保存
            'incremental': true,
            'lastIncrementalUpdate': currentDate.toISOString()
          };

          // 保存到本地存储
          localStorage.setItem(draftKey, JSON.stringify(draft));

          // 保存版本历史：优化版本保存逻辑，只在特定条件下保存版本
          const historyKey = `draft_history_anonymous_${slug || 'new'}`;
          const savedHistory = localStorage.getItem(historyKey);
          const history = savedHistory ? JSON.parse(savedHistory) : [];

          // 只在以下条件下保存新版本：
          // 1. 距离上次保存超过30秒
          // 2. 内容变化超过1000个字符
          // 3. 标题发生变化
          const contentChanged = content.length - prevContentRef.current.length > 1000;
          const titleChanged = title !== prevTitleRef.current;
          // 30秒
          const timeElapsed = now - lastSavedTimeRef.current > 30000;

          if (contentChanged || titleChanged || timeElapsed) {
            // 添加新版本到历史记录，限制最多保存50个版本
            history.push({
              ...draft,
              'id': `version_${Date.now()}`,
              'isMajorChange': titleChanged || contentChanged
            });

            if (history.length > 50) {
              // 移除最旧的版本
              history.shift();
            }

            localStorage.setItem(historyKey, JSON.stringify(history));
            lastSavedTimeRef.current = now;
          }

          // 更新上次保存的内容
          prevContentRef.current = content;
          prevTitleRef.current = title;
          prevVisibilityRef.current = visibility;

          onAutosaveStatusChange?.('saved', '自动保存成功');
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '自动保存失败';
          console.warn('自动保存草稿失败:', errorMessage);
          onAutosaveStatusChange?.('error', `自动保存失败: ${errorMessage}`);
        } finally {
          isSavingRef.current = false;
        }
      }, saveInterval);

      timerRef.current = saveTimeout;
    }

    // 始终返回清理函数
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [title, content, visibility, slug, onAutosaveStatusChange, getDynamicSaveInterval]);

  return null;
}
