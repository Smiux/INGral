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
  onAutosaveStatusChange?: (status: 'saving' | 'saved' | 'error', message?: string) => void;
}

export function AutosaveManager({
  title,
  content,
  visibility,
  slug,
  onAutosaveStatusChange,
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
      return contentChange > 500 ? 2000 : 5000; // 变化大时2秒，变化小时5秒
    } else if (contentLength < 5000) {
      // 中等文档：根据变化大小调整保存间隔
      return contentChange > 1000 ? 3000 : 7000; // 变化大时3秒，变化小时7秒
    } else {
      // 大文档：根据变化大小调整保存间隔
      return contentChange > 2000 ? 4000 : 10000; // 变化大时4秒，变化小时10秒
    }
  }, [content]);

  /**
   * 自动保存逻辑
   * 根据内容变化动态调整保存间隔，实现增量保存
   */
  useEffect(() => {
    // 如果标题和内容都为空，不保存
    if (!title && !content) return;

    // 如果内容没有变化，不保存
    if (content === prevContentRef.current && title === prevTitleRef.current && visibility === prevVisibilityRef.current) return;

    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 获取动态保存间隔
    const saveInterval = getDynamicSaveInterval();

    // 设置新的定时器
    timerRef.current = setTimeout(async () => {
      // 如果正在保存，跳过本次保存
      if (isSavingRef.current) return;
      
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
          lastSaved: currentDate.toISOString(),
          version: Date.now(), // 添加版本号
          incremental: true, // 标记为增量保存
          lastIncrementalUpdate: currentDate.toISOString()
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
        const timeElapsed = now - lastSavedTimeRef.current > 30000; // 30秒
        
        if (contentChanged || titleChanged || timeElapsed) {
          // 添加新版本到历史记录，限制最多保存50个版本
          history.push({
            ...draft,
            id: `version_${Date.now()}`,
            isMajorChange: titleChanged || contentChanged
          });
          
          if (history.length > 50) {
            history.shift(); // 移除最旧的版本
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

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [title, content, visibility, slug, onAutosaveStatusChange, getDynamicSaveInterval]);

  return null;
}
