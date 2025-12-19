/**
 * 模板类型定义
 */

// 模板分类接口
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

// 内容模板接口
export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  // 模板的Markdown内容
  content: string;
  category_id: string;
  is_public: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  // 模板缩略图URL
  thumbnail?: string;
  // 模板标签
  tags?: string[];
  // 使用次数
  usage_count?: number;
}

// 模板元数据接口
export interface TemplateMetadata {
  id: string;
  title: string;
  description: string;
  author: string;
  date: string;
  category: string;
  tags: string[];
}

// 模板创建请求接口
export interface CreateTemplateRequest {
  name: string;
  description: string;
  content: string;
  category_id: string;
  is_public: boolean;
  tags?: string[];
}

// 模板更新请求接口
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  content?: string;
  category_id?: string;
  is_public?: boolean;
  tags?: string[];
}
