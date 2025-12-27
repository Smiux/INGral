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
/* eslint-disable no-unused-vars */
export enum ResourceType {
  ARTICLE = 'article',
  GRAPH = 'graph'
}
/* eslint-enable no-unused-vars */

/**
 * 文章状态类型
 */
/* eslint-disable no-unused-vars */
export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published'
}
/* eslint-enable no-unused-vars */

/**
 * 文章可见性类型
 */
/* eslint-disable no-unused-vars */
export enum ArticleVisibility {
  PUBLIC = 'public',
  UNLISTED = 'unlisted'
}
/* eslint-enable no-unused-vars */

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
  // 数学公式数据
  formulas?: Formula[];
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
 * 评论状态类型
 */
/* eslint-disable no-unused-vars */
export enum CommentStatus {
  APPROVED = 'approved'
}
/* eslint-enable no-unused-vars */

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
/* eslint-disable no-unused-vars */
export enum GraphNodeType {
  ARTICLE = 'article',
  CONCEPT = 'concept'
}
/* eslint-enable no-unused-vars */

/**
 * 知识图谱节点接口
 */
export interface GraphNode {
  id: string;
  title: string;
  connections: number;
  // 增强知识图谱节点
  // 节点类型
  type?: GraphNodeType;
  // 简短描述
  description?: string;
  // 节点内容
  content?: string;
  // 创建者ID
  creator_id?: string;
  // 节点颜色
  color?: string;
  // 节点大小
  size?: number;
  // x坐标
  x?: number;
  // y坐标
  y?: number;
  // z坐标
  z?: number;
}

/**
 * 知识图谱链接接口（用于前端可视化）
 */
export interface GraphLink {
  source: string;
  target: string;
  type: string;
  // 增强知识图谱链接
  // 链接标签
  label?: string;
  // 连接权重
  weight?: number;
  // 连接颜色
  color?: string;
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
/* eslint-disable no-unused-vars */
export enum GraphVisibility {
  PUBLIC = 'public',
  UNLISTED = 'unlisted'
}
/* eslint-enable no-unused-vars */

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
/* eslint-disable no-unused-vars */
export enum GraphLayoutType {
  FORCE = 'force'
}
/* eslint-enable no-unused-vars */

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
/* eslint-disable no-unused-vars */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv'
}
/* eslint-enable no-unused-vars */

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

/**
 * 编辑器目录组件Props接口
 */

export interface EditorTableOfContentsProps {
  items: TableOfContentsItem[];
  expandedItems: Set<string>;
  activeItem: string;
  onItemClick: (_itemId: string) => void;
  onToggleExpand: (_items: Set<string>) => void;
}

/**
 * UI目录组件Props接口
 */
export interface UITableOfContentsProps {
  content: string;
  className?: string;
  title?: string;
}

/**
 * 编辑器侧边栏组件Props接口
 */

export interface EditorSidebarProps {
  showToc: boolean;
  onToggleToc: () => void;
  tableOfContents: TableOfContentsItem[];
  expandedTocItems: Set<string>;
  setExpandedTocItems: (_items: Set<string>) => void;
  activeTocItem: string;
  setActiveTocItem: (_itemId: string) => void;
}

/**
 * 错误类型枚举
 */
/* eslint-disable no-unused-vars */
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}
/* eslint-enable no-unused-vars */

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
