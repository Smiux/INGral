export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  // 社区和可见性相关字段
  visibility: 'public' | 'community' | 'private';
  allow_contributions: boolean;
  // 贡献者信息
  contributors?: Array<{
    contributor_id: string;
    contributor_email: string;
    contribution_date: string;
  }>;
  // 社区数据
  upvotes?: number;
  comment_count?: number;
  // 标签数据
  tags?: Tag[];
  article_tags?: ArticleTag[];
}

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

export interface ArticleTag {
  article_id: string;
  tag_id: string;
  added_at: string;
  added_by?: string;
  tag?: Tag;
}

export interface AuthState {
  user: { id: string; email: string } | null;
  isLoading: boolean;
}

// 添加用户档案接口
export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  join_date: string;
  // 贡献统计
  articles_created: number;
  articles_contributed: number;
  total_views: number;
  reputation_score: number;
}

export interface GraphNode {
  id: string;
  title: string;
  connections: number;
  // 增强知识图谱节点
  type?: 'article' | 'concept' | 'resource'; // 节点类型
  description?: string; // 简短描述
  content?: string; // 节点内容
  creator_id?: string; // 创建者ID
  color?: string; // 节点颜色
  size?: number; // 节点大小
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  // 增强知识图谱链接
  label?: string; // 链接标签
  weight?: number; // 连接权重
  color?: string; // 连接颜色
}

export interface Graph {
  id: string;
  user_id: string;
  name: string;
  nodes: Array<GraphNode>;
  links: Array<GraphLink>;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}
