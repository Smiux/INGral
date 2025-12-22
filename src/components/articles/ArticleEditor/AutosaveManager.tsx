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
    const titleChanged = title !== prevTitleRef.current;
    const visibilityChanged = visibility !== prevVisibilityRef.current;

    // 文档越大，保存间隔越长；变化越大，保存间隔越短
    // 标题或可见性变化时立即保存
    if (titleChanged || visibilityChanged) {
      // 标题或可见性变化时立即保存
      return 500;
    } else if (contentLength < 1000) {
      // 小文档：根据变化大小调整保存间隔
      // 变化大时2秒，变化小时5秒
      return contentChange > 500 ? 2000 : 5000;
    } else if (contentLength < 5000) {
      // 中等文档：根据变化大小调整保存间隔
      // 变化大时3秒，变化小时7秒
      return contentChange > 1000 ? 3000 : 7000;
    } else if (contentLength < 10000) {
      // 大文档：根据变化大小调整保存间隔
      // 变化大时5秒，变化小时10秒
      return contentChange > 2000 ? 5000 : 10000;
    }
    // 超大文档：根据变化大小调整保存间隔
    // 变化大时8秒，变化小时15秒
    return contentChange > 3000 ? 8000 : 15000;
  }, [content, title, visibility]);

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

        // 生成变化摘要的辅助函数
        function generateChangeSummary (titleChanged: boolean, visibilityChanged: boolean, contentChanged: number, contentChangePercent: number): string {
          if (titleChanged) {
            return '修改了标题';
          } else if (visibilityChanged) {
            return '修改了可见性设置';
          } else if (contentChanged > 2000 || contentChangePercent > 20) {
            return '大幅修改了内容';
          } else if (contentChanged > 500 || contentChangePercent > 10) {
            return '修改了部分内容';
          }
          return '微调了内容';
        }

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
          const history: Array<typeof draft & {
            id: string;
            isMajorChange: boolean;
            isMinorChange: boolean;
            changeType: 'title' | 'visibility' | 'content';
            contentChanged: number;
            contentChangePercent: number;
            titleChanged: boolean;
            visibilityChanged: boolean;
            versionNumber: number;
            changeSummary: string;
          }> = savedHistory ? JSON.parse(savedHistory) : [];

          // 计算变化量和变化类型
          const contentChanged = Math.abs(content.length - prevContentRef.current.length);
          const titleChanged = title !== prevTitleRef.current;
          const visibilityChanged = visibility !== prevVisibilityRef.current;
          const timeElapsed = now - lastSavedTimeRef.current > 30000;

          // 计算变化百分比
          const contentLength = prevContentRef.current.length || 1;
          const contentChangePercent = Math.round((contentChanged / contentLength) * 100);

          // 只在以下条件下保存新版本：
          // 1. 距离上次保存超过30秒
          // 2. 内容变化超过500个字符或10%
          // 3. 标题发生变化
          // 4. 可见性发生变化
          const shouldSaveVersion =
            timeElapsed ||
            (contentChanged > 500 || contentChangePercent > 10) ||
            titleChanged ||
            visibilityChanged;

          if (shouldSaveVersion) {
            // 生成详细的版本信息
            const versionInfo = {
              ...draft,
              'id': `version_${Date.now()}`,
              'isMajorChange': titleChanged || contentChanged > 2000 || contentChangePercent > 20,
              'isMinorChange': !titleChanged && contentChanged <= 2000 && contentChangePercent <= 20,
              // 确定变化类型
              'changeType': (() => {
                if (titleChanged) {
                  return 'title';
                }
                if (visibilityChanged) {
                  return 'visibility';
                }
                return 'content';
              })(),
              contentChanged,
              contentChangePercent,
              titleChanged,
              visibilityChanged,
              'versionNumber': history.length + 1,
              // 保存变化的摘要
              'changeSummary': generateChangeSummary(titleChanged, visibilityChanged, contentChanged, contentChangePercent)
            };

            // 添加新版本到历史记录
            history.push(versionInfo);

            // 根据版本重要性智能限制历史记录数量
            // 只保留最近的100个版本，其中前50个为重要版本，后50个为普通版本
            const importantVersions = history.filter(v => v.isMajorChange);
            const normalVersions = history.filter(v => !v.isMajorChange);

            let trimmedHistory = [];
            if (importantVersions.length > 50) {
              // 保留最近的50个重要版本
              trimmedHistory = [...importantVersions.slice(-50), ...normalVersions.slice(-50)];
            } else {
              // 保留所有重要版本和最近的50个普通版本
              trimmedHistory = [...importantVersions, ...normalVersions.slice(-50)];
            }

            // 确保总版本数不超过100
            if (trimmedHistory.length > 100) {
              trimmedHistory = trimmedHistory.slice(-100);
            }

            localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
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
