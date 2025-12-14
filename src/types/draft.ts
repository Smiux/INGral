/**
 * 文章草稿类型定义
 */
export interface ArticleDraft {
  id: string;            // 草稿唯一标识符
  title: string;         // 草稿标题
  content: string;       // 草稿内容
  visibility: 'public' | 'unlisted';  // 可见性设置
  authorName: string;    // 作者名称
  authorEmail: string;   // 作者邮箱
  authorUrl: string;     // 作者网站
  lastSaved: string;     // 最后保存时间
  createdAt: string;     // 创建时间
  version?: number;      // 版本号
  incremental?: boolean; // 是否为增量保存
}