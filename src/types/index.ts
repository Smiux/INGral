/**
 * 文章状态类型
 */
export type ArticleStatus = 'draft' | 'published' | 'archived';

/**
 * 文章可见性类型
 */
export type ArticleVisibility = 'public' | 'unlisted';



/**
 * 数学公式接口
 */
export interface Formula {
  id: string;
  content: string;
  type: 'inline' | 'block';
  label?: string;
  position: number;
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
  tags?: DiscussionTag[];
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
 * 讨论标签接口
 */
export interface DiscussionTag {
  id: number;
  name: string;
  slug: string;
  description?: string;
  usage_count: number;
  created_at: string;
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
  author_name?: string;
  author_email?: string | null;
  author_url?: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  // 社区和可见性相关字段
  visibility: ArticleVisibility;
  status: ArticleStatus;
  // 社区数据
  upvotes?: number;
  comment_count?: number;
  // 标签数据
  tags?: Tag[];
  article_tags?: ArticleTag[];
  // 数学公式数据
  formulas?: Formula[];
  // 内容审核相关字段
  review_status?: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  reviewer_id?: string;
  reviewer_name?: string;
  review_date?: string;
  review_comments?: string;
  accuracy_score?: number;
  has_accuracy_issues?: boolean;
  is_verified?: boolean;
  verification_date?: string;
  verification_notes?: string;
  // 编辑限制相关字段
  edit_count_24h?: number;
  edit_count_7d?: number;
  last_edit_date?: string;
  is_change_public?: boolean;
  is_slow_mode?: boolean;
  slow_mode_until?: string;
  is_unstable?: boolean;
  // 离线相关字段
  is_offline?: boolean;
  synced?: boolean;
  last_modified?: string;
}

/**
 * 内容审核日志接口
 */
export interface ArticleReview {
  id: string;
  article_id: string;
  article_version_id?: string;
  reviewer_id?: string;
  reviewer_name?: string;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  review_comments?: string;
  accuracy_score?: number;
  has_accuracy_issues?: boolean;
  is_verified?: boolean;
  verification_notes?: string;
  created_at: string;
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
  strength?: number; // 链接强度/相关性
  metadata?: Record<string, unknown>; // 额外元数据
}

/**
 * 标签接口
 */
export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  created_at: string;
  created_by?: string;
  is_system_tag: boolean;
  usage_count: number;
  // 前端使用的额外字段
  is_selected?: boolean;
}

/**
 * 文章标签关联接口
 */
export interface ArticleTag {
  article_id: string;
  tag_id: string;
  added_at: string;
  added_by?: string;
  tag?: Tag;
}

/**
 * 知识图谱节点类型
 */
export type GraphNodeType = 'article' | 'concept' | 'resource';

/**
 * 知识图谱节点接口
 */
export interface GraphNode {
  id: string;
  title: string;
  connections: number;
  // 增强知识图谱节点
  type?: GraphNodeType; // 节点类型
  description?: string; // 简短描述
  content?: string; // 节点内容
  creator_id?: string; // 创建者ID
  color?: string; // 节点颜色
  size?: number; // 节点大小
}

/**
 * 知识图谱链接接口
 */
export interface GraphLink {
  source: string;
  target: string;
  type: string;
  // 增强知识图谱链接
  label?: string; // 链接标签
  weight?: number; // 连接权重
  color?: string; // 连接颜色
}

/**
 * 知识图谱可见性类型
 */
export type GraphVisibility = 'public' | 'unlisted';

/**
 * 知识图谱接口
 */
export interface Graph {
  id: string;
  author_id?: string;
  author_name?: string;
  author_email?: string;
  author_url?: string;
  title: string;
  nodes: GraphNode[];
  links: GraphLink[];
  is_template: boolean;
  visibility: GraphVisibility;
  created_at: string;
  updated_at: string;
  // 编辑限制相关字段
  edit_count_24h?: number;
  edit_count_7d?: number;
  last_edit_date?: string;
  is_change_public?: boolean;
  is_slow_mode?: boolean;
  slow_mode_until?: string;
  is_unstable?: boolean;
}

/**
 * 离线文章接口，扩展自Article并添加离线相关字段
 */
export interface OfflineArticle extends Article {
  is_offline: boolean;
  synced: boolean;
  last_modified: string;
}

/**
 * 评论状态类型
 */
export type CommentStatus = 'approved' | 'pending' | 'rejected';

/**
 * 评论接口
 */
export interface Comment {
  id: string;
  article_id: string;
  user_id?: string;
  // 支持匿名提交的作者信息
  author_name?: string;
  author_email?: string | null;
  author_url?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  upvotes: number;
  downvotes: number;
  is_deleted: boolean;
  status: CommentStatus;
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
 * 更新评论数据接口
 */
export interface UpdateCommentData {
  content: string;
  status?: CommentStatus;
}

/**
 * 删除评论数据接口
 */
export interface DeleteCommentData {
  is_deleted: boolean;
}

/**
 * 分页查询参数接口
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应接口
 */
export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  id: string;
  title: string;
  type: 'article' | 'tag' | 'graph' | 'comment';
  score: number;
  snippet?: string;
  created_at: string;
}

/**
 * 知识图谱布局类型
 */
export type GraphLayoutType = 'force' | 'hierarchical' | 'circular' | 'grid';

/**
 * 知识图谱配置接口
 */
export interface GraphConfig {
  layout: GraphLayoutType;
  nodeRadius?: number;
  linkStrength?: number;
  collisionForce?: number;
  forceX?: number;
  forceY?: number;
}

/**
 * 导出格式类型
 */
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'png';

/**
 * 导出配置接口
 */
export interface ExportConfig {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeLinks?: boolean;
  includeTags?: boolean;
}
