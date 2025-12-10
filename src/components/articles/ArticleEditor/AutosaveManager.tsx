import { useEffect } from 'react';

/**
 * 自动保存管理器组件
 * 定期将编辑器内容保存到本地存储，防止意外丢失
 */
interface AutosaveManagerProps {
  title: string;
  content: string;
  visibility: 'public' | 'unlisted';
  slug?: string | undefined;
}

export function AutosaveManager({
  title,
  content,
  visibility,
  slug,
}: AutosaveManagerProps) {
  /**
   * 自动保存逻辑
   * 5秒自动保存一次，避免过于频繁的保存
   */
  useEffect(() => {
    if (!title && !content) {return;}

    const timer = setTimeout(() => {
      try {
        const draftKey = `draft_anonymous_${slug || 'new'}`;
        const currentDate = new Date();
        const draft = {
          title,
          content,
          visibility,
          lastSaved: currentDate.toISOString(),
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
        
        console.log('自动保存成功');
      } catch (err) {
        console.warn('自动保存草稿失败:', err);
      }
    }, 5000); // 5秒自动保存一次

    return () => clearTimeout(timer);
  }, [title, content, visibility, slug]);

  return null;
}
