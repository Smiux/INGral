

/**
 * 文章版本相关类型定义
 */

/**
 * 文章版本历史接口
 */
export interface ArticleVersion {
  /** 版本ID */
  id: string;
  /** 关联的文章ID */
  article_id: string;
  /** 版本标题 */
  title: string;
  /** 版本内容 */
  content: string;
  /** 版本摘要 */
  excerpt?: string;
  /** 标签数组 */
  tags?: string[];
  /** 版本作者ID */
  author_id?: string;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at?: string;
  /** 版本号 */
  version_number: number;
  /** 变更摘要 */
  change_summary?: string;
  /** 是否发布 */
  is_published: boolean;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 父版本ID */
  parent_version_id?: string;
  /** 作者名称 */
  author_name?: string;
  /** 作者头像 */
  author_avatar?: string;
}

/**
 * 版本比较结果接口
 */
export interface VersionDiff {
  /** 标题差异 */
  title: { old: string; new: string; changed: boolean };
  /** 内容差异 */
  content: { old: string; new: string; changed: boolean };
  /** 元数据差异 */
  metadata: { old: Record<string, unknown>; new: Record<string, unknown>; changed: boolean };
  /** 版本信息 */
  versionA: ArticleVersion;
  versionB?: ArticleVersion;
}

/**
 * 版本历史查询参数
 */
export interface VersionHistoryQueryParams {
  /** 文章ID */
  articleId: string;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 排序方向 */
  order?: 'asc' | 'desc';
}

/**
 * 版本历史分页结果
 */
export interface VersionHistoryResult {
  /** 版本列表 */
  versions: ArticleVersion[];
  /** 总数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 还原版本选项
 */
export interface RestoreVersionOptions {
  /** 版本ID */
  versionId: string;
  /** 文章ID */
  articleId: string;
  /** 是否创建新的版本记录 */
  createNewVersion?: boolean;
  /** 还原说明 */
  restoreComment?: string;
}
