/**
 * 文章草稿类型定义
 */
export interface ArticleDraft {
  // 草稿唯一标识符
  id: string;
  // 草稿标题
  title: string;
  // 草稿内容
  content: string;
  // 可见性设置
  visibility: 'public' | 'unlisted';
  // 作者名称
  authorName: string;
  // 作者邮箱
  authorEmail: string;
  // 作者网站
  authorUrl: string;
  // 最后保存时间
  lastSaved: string;
  // 创建时间
  createdAt: string;
  // 版本号
  version?: number;
  // 是否为增量保存
  incremental?: boolean;
}
