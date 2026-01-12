/**
 * 类型定义文件，包含所有应用程序的类型定义
 */

/**
 * 文章可见性类型
 */

export enum ArticleVisibility {
  PUBLIC = 'public',
  UNLISTED = 'unlisted'
}

/**
 * 讨论分类接口
 */
export interface DiscussionCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

/**
 * 讨论主题接口
 */
export interface DiscussionTopic {
  id: number;
  title: string;
  content: string;
  author_name: string;
  author_email?: string;
  category_id: number;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  category?: DiscussionCategory;
}

/**
 * 讨论回复接口
 */
export interface DiscussionReply {
  id: number;
  topic_id: number;
  content: string;
  author_name: string;
  author_email?: string;
  parent_id?: number;
  created_at: string;
  replies?: DiscussionReply[];
}


/**
 * 文章接口
 */
export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  author_id?: string;
  // 支持匿名提交的作者信息
  author_name: string;
  author_email?: string | null;
  author_url?: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  // 社区和可见性相关字段
  visibility: ArticleVisibility;
  // 社区数据
  upvotes: number;
  comment_count: number;
  // 文章中的公式
  formulas?: Array<{
    id: string;
    content: string;
    type: 'inline' | 'block';
    label?: string;
    position: number;
  }>;
}

/**
 * 文章链接接口
 */
export interface ArticleLink {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: string;
  created_at: string;
  // 增强链接关系
  // 链接强度/相关性
  strength?: number;
  // 额外元数据
  metadata?: Record<string, unknown>;
}

/**
 * 评论接口
 */
export interface Comment {
  id: string;
  article_id: string;
  user_id?: string;
  // 支持匿名提交的作者信息
  author_name: string;
  author_email?: string | null;
  author_url?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  upvotes: number;
  downvotes: number;
  is_deleted: boolean;
  replies?: Comment[];
}

/**
 * 创建评论数据接口
 */
export interface CreateCommentData {
  article_id: string;
  content: string;
  parent_id?: string | null;
}

/**
 * 目录项接口
 */
export interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
  children: TableOfContentsItem[];
}

/**
 * 文章目录组件Props接口
 */

export interface ArticleTableOfContentsProps {
  contentRef: React.RefObject<HTMLDivElement>;
  activeHeadingId: string;
  onActiveHeadingChange: (_id: string) => void;
}
