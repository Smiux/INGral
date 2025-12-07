/**
 * 类型定义文件，包含所有应用程序的类型定义
 * 优化点：
 * 1. 统一编辑限制相关字段到一个接口
 * 2. 添加更多枚举类型，提高代码可读性
 * 3. 优化接口结构，提高类型安全性
 * 4. 添加更多联合类型，减少重复代码
 * 5. 统一资源类型定义
 * 6. 增强类型文档
 */

/**
 * 资源类型枚举
 */
export enum ResourceType {
  ARTICLE = 'article',
  GRAPH = 'graph',
  COMMENT = 'comment',
  DISCUSSION = 'discussion',
  REVIEW = 'review',
  TAG = 'tag'
}

/**
 * 文章状态类型
 */
export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

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
 * 内容审核状态类型
 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

/**
 * 编辑限制接口，用于文章、图谱等资源的编辑限制
 */
export interface EditLimit {
  // 24小时内编辑次数
  edit_count_24h: number;
  // 7天内编辑次数
  edit_count_7d: number;
  // 上次编辑日期
  last_edit_date: string;
  // 是否允许公开变更
  is_change_public: boolean;
  // 是否进入慢速模式
  is_slow_mode: boolean;
  // 慢速模式结束时间
  slow_mode_until?: string;
  // 内容是否不稳定
  is_unstable: boolean;
}

/**
 * 内容审核相关字段接口
 */
export interface ReviewFields {
  // 审核状态
  review_status: ReviewStatus;
  // 审核者ID
  reviewer_id?: string;
  // 审核者名称
  reviewer_name?: string;
  // 审核日期
  review_date?: string;
  // 审核评论
  review_comments?: string;
  // 准确性评分
  accuracy_score: number;
  // 是否有准确性问题
  has_accuracy_issues: boolean;
  // 是否已验证
  is_verified: boolean;
  // 验证日期
  verification_date?: string;
  // 验证说明
  verification_notes?: string;
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
  parent_id?: string;
  children?: Tag[];
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
  status: ArticleStatus;
  // 社区数据
  upvotes: number;
  comment_count: number;
  // 标签数据
  tags?: Tag[];
  article_tags?: ArticleTag[];
  // 数学公式数据
  formulas?: Formula[];
  // 内容审核相关字段
  review_status: ReviewStatus;
  reviewer_id?: string;
  reviewer_name?: string;
  review_date?: string;
  review_comments?: string;
  accuracy_score: number;
  has_accuracy_issues: boolean;
  is_verified: boolean;
  verification_date?: string;
  verification_notes?: string;
  // 编辑限制相关字段
  edit_count_24h: number;
  edit_count_7d: number;
  last_edit_date: string;
  is_change_public: boolean;
  is_slow_mode: boolean;
  slow_mode_until?: string;
  is_unstable: boolean;
  // 离线相关字段
  is_offline: boolean;
  synced: boolean;
  last_modified: string;
}

/**
 * 内容审核日志接口
 */
export interface ArticleReview extends ReviewFields {
  id: string;
  article_id: string;
  article_version_id?: string;
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
 * 评论状态类型
 */
export enum CommentStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  REJECTED = 'rejected'
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
 * 知识图谱节点类型
 */
export enum GraphNodeType {
  ARTICLE = 'article',
  CONCEPT = 'concept',
  RESOURCE = 'resource'
}

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
  x?: number; // x坐标
  y?: number; // y坐标
  z?: number; // z坐标
}

/**
 * 知识图谱链接接口（用于前端可视化）
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
 * 数据库知识图谱链接接口（用于数据库存储）
 */
export interface DatabaseGraphLink {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  label?: string;
  weight?: number;
  color?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 知识图谱可见性类型
 */
export enum GraphVisibility {
  PUBLIC = 'public',
  UNLISTED = 'unlisted'
}

/**
 * 知识图谱接口
 */
export interface Graph {
  id: string;
  author_id?: string;
  author_name: string;
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
  edit_count_24h: number;
  edit_count_7d: number;
  last_edit_date: string;
  is_change_public: boolean;
  is_slow_mode: boolean;
  slow_mode_until?: string;
  is_unstable: boolean;
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
  type: ResourceType;
  score: number;
  snippet?: string;
  created_at: string;
}

/**
 * 知识图谱布局类型
 */
export enum GraphLayoutType {
  FORCE = 'force',
  HIERARCHICAL = 'hierarchical',
  CIRCULAR = 'circular',
  GRID = 'grid'
}

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
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  PNG = 'png'
}

/**
 * 导出配置接口
 */
export interface ExportConfig {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeLinks?: boolean;
  includeTags?: boolean;
}

/**
 * 应用主题类型
 */
export type ThemeType = 'light' | 'dark' | 'system';

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  type: ThemeType;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    border: string;
    // 更多颜色配置...
  };
}

/**
 * 键盘快捷键配置接口
 */
export interface KeyboardShortcutConfig {
  action: string;
  keys: string[];
  description?: string;
  category?: string;
}

/**
 * 应用配置接口
 */
export interface AppConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  theme: ThemeConfig;
  keyboardShortcuts: KeyboardShortcutConfig[];
  // 更多配置项...
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  AUTHENTICATION = 'authentication',
  UNKNOWN = 'unknown'
}

/**
 * 错误响应接口
 */
export interface ErrorResponse {
  type: ErrorType;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}
