/**
 * 版本历史相关类型定义
 */

/**
 * 文章版本接口
 */
export interface ArticleVersion {
  /** 版本ID */
  id: string;
  /** 文章ID */
  article_id: string;
  /** 版本号 */
  version_number: number;
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 作者ID */
  author_id: string;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
  /** 变更摘要 */
  change_summary?: string;
  /** 是否发布 */
  is_published: boolean;
}

/**
 * 版本差异接口
 */
export interface VersionDiff {
  /** 标题差异 */
  title: {
    /** 旧值 */
    old: string;
    /** 新值 */
    new: string;
    /** 是否有变化 */
    changed: boolean;
  };
  /** 内容差异 */
  content: {
    /** 旧值 */
    old: string;
    /** 新值 */
    new: string;
    /** 是否有变化 */
    changed: boolean;
  };
  /** 元数据差异 */
  metadata: {
    /** 旧值 */
    old: Record<string, unknown>;
    /** 新值 */
    new: Record<string, unknown>;
    /** 是否有变化 */
    changed: boolean;
  };
  /** 版本A */
  versionA: ArticleVersion;
  /** 版本B */
  versionB: ArticleVersion;
}

/**
 * 版本历史结果接口
 */
export interface VersionHistoryResult {
  /** 版本列表 */
  versions: ArticleVersion[];
  /** 总数量 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 获取文章版本参数接口
 */
export interface GetArticleVersionsParams {
  /** 文章ID */
  articleId: string;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 排序方式 */
  order?: 'asc' | 'desc';
}

/**
 * 还原版本参数接口
 */
export interface RestoreVersionParams {
  /** 版本ID */
  versionId: string;
  /** 文章ID */
  articleId: string;
  /** 还原注释 */
  restoreComment?: string;
}
