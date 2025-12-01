# MyMathWiki 数据库结构文档

## 1. 数据库概述

MyMathWiki是一个基于Supabase的知识图谱应用，使用PostgreSQL数据库存储数据。数据库包含文章管理、知识图谱、评论系统、标签系统和数据分析等核心功能模块，支持匿名提交。

## 2. 核心表结构

### 2.1 文章表 (articles)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | 文章唯一标识符 |
| `title` | `text` | `NOT NULL` | | 文章标题 |
| `slug` | `text` | `NOT NULL UNIQUE` | | 文章URL友好标识符 |
| `content` | `text` | `NOT NULL` | | 文章内容 |
| `author_id` | `uuid` | | | 作者ID（可选，支持匿名） |
| `author_name` | `text` | | `'Anonymous'` | 作者名称 |
| `author_email` | `text` | | | 作者邮箱（可选） |
| `author_url` | `text` | | | 作者URL（可选） |
| `visibility` | `text` | `CHECK (visibility IN ('public', 'private'))` | `'public'` | 文章可见性 |
| `allow_contributions` | `boolean` | | `false` | 是否允许贡献 |
| `contributors` | `jsonb` | | `'[]'` | 贡献者列表 |
| `upvotes` | `integer` | | `0` | 点赞数 |
| `comment_count` | `integer` | | `0` | 评论数 |
| `view_count` | `integer` | | `0` | 浏览数 |
| `contribution_date` | `timestamp with time zone` | | | 贡献日期 |
| `created_at` | `timestamp with time zone` | | `now()` | 文章创建时间 |
| `updated_at` | `timestamp with time zone` | | `now()` | 文章更新时间 |
| `search_vector` | `tsvector` | | | 全文搜索向量 |
| `review_status` | `text` | `CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision'))` | `'pending'` | 审核状态 |
| `reviewer_id` | `uuid` | | | 审核者ID |
| `reviewer_name` | `text` | | | 审核者名称 |
| `review_date` | `timestamp with time zone` | | | 审核日期 |
| `review_comments` | `text` | | | 审核评论 |
| `accuracy_score` | `integer` | `CHECK (accuracy_score BETWEEN 0 AND 5)` | `0` | 准确性评分 |
| `has_accuracy_issues` | `boolean` | | `false` | 是否有准确性问题 |
| `is_verified` | `boolean` | | `false` | 是否已验证 |
| `verification_date` | `timestamp with time zone` | | | 验证日期 |
| `verification_notes` | `text` | | | 验证说明 |

### 2.2 文章版本表 (article_versions)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | 版本唯一标识符 |
| `article_id` | `uuid` | `NOT NULL` | | 关联文章ID |
| `author_id` | `uuid` | | | 版本作者ID（可选，支持匿名） |
| `author_name` | `text` | | `'Anonymous'` | 作者名称 |
| `author_email` | `text` | | | 作者邮箱（可选） |
| `author_url` | `text` | | | 作者URL（可选） |
| `title` | `text` | `NOT NULL` | | 版本标题 |
| `content` | `text` | `NOT NULL` | | 版本内容 |
| `excerpt` | `text` | | | 版本摘要 |
| `tags` | `uuid[]` | | `'{}'` | 版本标签ID数组 |
| `version_number` | `integer` | `NOT NULL` | | 版本号 |
| `change_summary` | `text` | | `''` | 变更摘要 |
| `is_published` | `boolean` | | `false` | 是否发布 |
| `metadata` | `jsonb` | | `'{}'` | 版本元数据 |
| `parent_version_id` | `uuid` | | | 父版本ID |
| `created_at` | `timestamp with time zone` | | `now()` | 版本创建时间 |
| `updated_at` | `timestamp with time zone` | | `now()` | 版本更新时间 |
| `review_status` | `text` | `CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision'))` | `'pending'` | 审核状态 |
| `reviewer_id` | `uuid` | | | 审核者ID |
| `reviewer_name` | `text` | | | 审核者名称 |
| `review_date` | `timestamp with time zone` | | | 审核日期 |
| `review_comments` | `text` | | | 审核评论 |
| `accuracy_score` | `integer` | `CHECK (accuracy_score BETWEEN 0 AND 5)` | `0` | 准确性评分 |
| `has_accuracy_issues` | `boolean` | | `false` | 是否有准确性问题 |
| `is_verified` | `boolean` | | `false` | 是否已验证 |
| `verification_date` | `timestamp with time zone` | | | 验证日期 |
| `verification_notes` | `text` | | | 验证说明 |
| **外键** | | `FOREIGN KEY (article_id) REFERENCES articles(id)` | | 与文章关联 |
| **外键** | | `FOREIGN KEY (parent_version_id) REFERENCES article_versions(id)` | | 与父版本关联 |

### 2.3 文章审核表 (article_reviews)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | 审核记录唯一标识符 |
| `article_id` | `uuid` | `NOT NULL` | | 关联文章ID |
| `article_version_id` | `uuid` | | | 关联文章版本ID |
| `reviewer_id` | `uuid` | | | 审核者ID（可选，支持匿名） |
| `reviewer_name` | `text` | | `'Anonymous'` | 审核者名称 |
| `review_status` | `text` | `CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision'))` | | 审核状态 |
| `review_comments` | `text` | | | 审核评论 |
| `accuracy_score` | `integer` | `CHECK (accuracy_score BETWEEN 0 AND 5)` | | 准确性评分 |
| `has_accuracy_issues` | `boolean` | | `false` | 是否有准确性问题 |
| `is_verified` | `boolean` | | `false` | 是否已验证 |
| `verification_notes` | `text` | | | 验证说明 |
| `created_at` | `timestamp with time zone` | | `now()` | 审核创建时间 |
| **外键** | | `FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE` | | 与文章关联 |
| **外键** | | `FOREIGN KEY (article_version_id) REFERENCES article_versions(id) ON DELETE CASCADE` | | 与文章版本关联 |

### 2.4 标签表 (tags)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | 标签唯一标识符 |
| `name` | `text` | `NOT NULL UNIQUE` | | 标签名称 |
| `description` | `text` | | | 标签描述 |
| `color` | `text` | | `'#6B7280'` | 标签颜色 |
| `slug` | `text` | `UNIQUE` | | 标签URL友好标识符 |
| `usage_count` | `integer` | | `0` | 标签使用次数 |
| `is_system_tag` | `boolean` | | `false` | 是否为系统标签 |
| `created_at` | `timestamp with time zone` | | `now()` | 标签创建时间 |
| `updated_at` | `timestamp with time zone` | | `now()` | 标签更新时间 |

### 2.5 文章标签关联表 (article_tags)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `article_id` | `uuid` | `NOT NULL` | | 文章ID |
| `tag_id` | `uuid` | `NOT NULL` | | 标签ID |
| `added_at` | `timestamp with time zone` | | `now()` | 标签添加时间 |
| **主键** | | `PRIMARY KEY (article_id, tag_id)` | | 复合主键 |
| **外键** | | `FOREIGN KEY (article_id) REFERENCES articles(id)` | | 与文章关联 |
| **外键** | | `FOREIGN KEY (tag_id) REFERENCES tags(id)` | | 与标签关联 |

### 2.6 文章版本标签关联表 (article_version_tags)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `article_version_id` | `uuid` | `NOT NULL` | | 文章版本ID |
| `tag_id` | `uuid` | `NOT NULL` | | 标签ID |
| `article_id` | `uuid` | `NOT NULL` | | 文章ID |
| `added_at` | `timestamp with time zone` | | `now()` | 标签添加时间 |
| **主键** | | `PRIMARY KEY (article_version_id, tag_id)` | | 复合主键 |
| **外键** | | `FOREIGN KEY (article_version_id) REFERENCES article_versions(id)` | | 与文章版本关联 |
| **外键** | | `FOREIGN KEY (tag_id) REFERENCES tags(id)` | | 与标签关联 |
| **外键** | | `FOREIGN KEY (article_id) REFERENCES articles(id)` | | 与文章关联 |

### 2.7 文章链接表 (article_links)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `source_id` | `uuid` | `NOT NULL` | | 源文章ID |
| `target_id` | `uuid` | `NOT NULL` | | 目标文章ID |
| `relationship_type` | `text` | `NOT NULL` | `'related'` | 关系类型 |
| `created_at` | `timestamp with time zone` | | `now()` | 链接创建时间 |
| **主键** | | `PRIMARY KEY (source_id, target_id, relationship_type)` | | 复合主键 |
| **外键** | | `FOREIGN KEY (source_id) REFERENCES articles(id)` | | 与源文章关联 |
| **外键** | | `FOREIGN KEY (target_id) REFERENCES articles(id)` | | 与目标文章关联 |

### 2.7 评论表 (comments)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | 评论唯一标识符 |
| `article_id` | `uuid` | `NOT NULL` | | 关联文章ID |
| `parent_id` | `uuid` | | | 父评论ID |
| `content` | `text` | `NOT NULL` | | 评论内容 |
| `author_id` | `uuid` | | | 评论作者ID（可选，支持匿名） |
| `author_name` | `text` | | `'Anonymous'` | 作者名称 |
| `author_email` | `text` | | | 作者邮箱（可选） |
| `author_url` | `text` | | | 作者URL（可选） |
| `is_deleted` | `boolean` | | `false` | 是否删除 |
| `upvotes` | `integer` | | `0` | 点赞数 |
| `downvotes` | `integer` | | `0` | 点踩数 |
| `created_at` | `timestamp with time zone` | | `now()` | 评论创建时间 |
| `updated_at` | `timestamp with time zone` | | `now()` | 评论更新时间 |
| `search_vector` | `tsvector` | | | 全文搜索向量 |
| **外键** | | `FOREIGN KEY (article_id) REFERENCES articles(id)` | | 与文章关联 |
| **外键** | | `FOREIGN KEY (parent_id) REFERENCES comments(id)` | | 与父评论关联 |

### 2.10 知识图谱表 (user_graphs)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | 图谱唯一标识符 |
| `title` | `text` | `NOT NULL` | `'Untitled Graph'` | 图谱标题 |
| `graph_data` | `jsonb` | `NOT NULL` | `'{}'` | 图谱数据 |
| `author_id` | `uuid` | | | 作者ID（可选，支持匿名） |
| `author_name` | `text` | | `'Anonymous'` | 作者名称 |
| `author_email` | `text` | | | 作者邮箱（可选） |
| `author_url` | `text` | | | 作者URL（可选） |
| `is_template` | `boolean` | `NOT NULL` | `false` | 是否为模板 |
| `visibility` | `text` | `CHECK (visibility IN ('public', 'private', 'community'))` | `'private'` | 图谱可见性 |
| `created_at` | `timestamp with time zone` | | `now()` | 图谱创建时间 |
| `updated_at` | `timestamp with time zone` | | `now()` | 图谱更新时间 |

### 2.11 数据分析表 (analytics_summary)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `metric_name` | `text` | `NOT NULL` | | 指标名称 |
| `metric_value` | `numeric` | `NOT NULL` | | 指标值 |
| `period_type` | `text` | `NOT NULL` | | 周期类型 |
| `period_start` | `timestamp with time zone` | `NOT NULL` | | 周期开始时间 |
| `period_end` | `timestamp with time zone` | `NOT NULL` | | 周期结束时间 |
| `dimension` | `text` | `NOT NULL` | `''` | 维度 |
| `dimension_value` | `text` | `NOT NULL` | `''` | 维度值 |
| `created_at` | `timestamp with time zone` | | `now()` | 创建时间 |
| **主键** | | `PRIMARY KEY (metric_name, period_type, period_start, dimension, dimension_value)` | | 复合主键 |

### 2.12 文章交互表 (article_interactions)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | 交互唯一标识符 |
| `article_id` | `uuid` | `NOT NULL` | | 文章ID |
| `interaction_type` | `text` | `NOT NULL` | | 交互类型 |
| `created_at` | `timestamp with time zone` | | `now()` | 交互时间 |
| **外键** | | `FOREIGN KEY (article_id) REFERENCES articles(id)` | | 与文章关联 |

### 2.14 页面访问表 (page_views)

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|--------|----------|------|--------|------|
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | 访问唯一标识符 |
| `page_id` | `text` | `NOT NULL` | | 页面ID |
| `page_type` | `text` | `NOT NULL` | | 页面类型 |
| `session_id` | `text` | `NOT NULL` | | 会话ID |
| `referrer` | `text` | | | 来源URL |
| `duration` | `integer` | | `0` | 停留时间 |
| `created_at` | `timestamp with time zone` | | `now()` | 访问时间 |
| `updated_at` | `timestamp with time zone` | | `now()` | 更新时间 |

## 3. 表关系图

```
┌─────────────────┐     ┌─────────────────┐
│   articles      │     │   user_graphs   │
└────────┬────────┘     └─────────────────┘
         │
         ├─────────────────────────────────────────────────────────────────┐
         │                                                                 │
┌──────▼─────┐ ┌──────────────┐ ┌───────────────┐ ┌───▼──────────┐ ┌───▼──────────┐
│ article_   │ │ article_     │ │ article_links │ │  comments    │ │ article_reviews │
│ versions   │ │ interactions  │ └───────────────┘ └─────────────┘ └─────────────┘
└──────┬─────┘ └──────────────┘
       │
       │ ┌──────────────┐
       └─┤ article_tags │
         └──────┬───────┘
                │
          ┌─────▼─────┐
          │   tags    │
          └───────────┘
```

## 4. 索引

| 表名 | 索引名 | 索引字段 | 类型 | 描述 |
|------|--------|----------|------|------|
| articles | idx_articles_author_id | author_id | 普通索引 | 加速按作者ID查询文章 |
| articles | idx_articles_slug | slug | 唯一索引 | 加速按slug查询文章 |
| articles | idx_articles_visibility | visibility | 普通索引 | 加速按可见性查询文章 |
| articles | idx_articles_created_at | created_at DESC | 普通索引 | 加速按创建时间排序 |
| articles | idx_articles_review_status | review_status | 普通索引 | 加速按审核状态查询文章 |
| comments | idx_comments_article_id | article_id | 普通索引 | 加速按文章查询评论 |
| comments | idx_comments_parent_id | parent_id | 普通索引 | 加速按父评论查询子评论 |
| user_graphs | idx_user_graphs_author_id | author_id | 普通索引 | 加速按作者ID查询图谱 |
| user_graphs | idx_user_graphs_visibility | visibility | 普通索引 | 加速按可见性查询图谱 |
| user_graphs | idx_user_graphs_created_at | created_at DESC | 普通索引 | 加速按创建时间排序 |
| page_views | idx_page_views_page_id | page_id, page_type | 复合索引 | 加速按页面ID和类型查询访问记录 |
| page_views | idx_page_views_session_id | session_id | 普通索引 | 加速按会话ID查询访问记录 |
| page_views | idx_page_views_created_at | created_at | 普通索引 | 加速按时间查询访问记录 |
| article_reviews | idx_article_reviews_article_id | article_id | 普通索引 | 加速按文章ID查询审核记录 |
| article_reviews | idx_article_reviews_reviewer_id | reviewer_id | 普通索引 | 加速按审核者ID查询审核记录 |
| article_reviews | idx_article_reviews_review_status | review_status | 普通索引 | 加速按审核状态查询审核记录 |
| article_reviews | idx_article_reviews_created_at | created_at DESC | 普通索引 | 加速按创建时间排序审核记录 |

## 5. 视图

### 5.1 评论带作者信息视图

```sql
CREATE OR REPLACE VIEW public.comments_with_author_info AS
SELECT
  comments.id,
  comments.article_id,
  comments.parent_id,
  comments.content,
  comments.user_id,
  comments.author_name,
  comments.author_email,
  comments.author_url,
  comments.is_deleted,
  comments.upvotes,
  comments.downvotes,
  comments.created_at,
  comments.updated_at
FROM public.comments;
```

## 6. 函数

### 6.1 generate_tag_slug()

```sql
CREATE OR REPLACE FUNCTION generate_tag_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name) THEN
    -- 生成slug，处理中文和特殊字符
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9\\s\\u4e00-\\u9fa5-]', '', 'g'));
    NEW.slug := REGEXP_REPLACE(NEW.slug, '\\s+', '-', 'g');
    NEW.slug := REGEXP_REPLACE(NEW.slug, '-+', '-', 'g');
    NEW.slug := BTRIM(NEW.slug, '-');
    
    -- 确保slug不为空
    IF NEW.slug = '' THEN
      NEW.slug := SUBSTRING(NEW.id::text FROM 1 FOR 8);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 6.2 increment_article_views(article_id UUID)

```sql
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE articles
  SET view_count = view_count + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;
```

### 6.3 set_updated_at()

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 7. 触发器

| 触发器名 | 表名 | 触发事件 | 触发时机 | 执行函数 | 描述 |
|----------|------|----------|----------|----------|------|
| tags_generate_slug_trigger | tags | INSERT OR UPDATE | BEFORE | generate_tag_slug() | 自动生成标签slug |
| set_updated_at_tags | tags | UPDATE | BEFORE | set_updated_at() | 自动更新updated_at字段 |
| set_updated_at_articles | articles | UPDATE | BEFORE | set_updated_at() | 自动更新updated_at字段 |
| set_updated_at_comments | comments | UPDATE | BEFORE | set_updated_at() | 自动更新updated_at字段 |
| set_updated_at_user_graphs | user_graphs | UPDATE | BEFORE | set_updated_at() | 自动更新updated_at字段 |
| set_updated_at_page_views | page_views | UPDATE | BEFORE | set_updated_at() | 自动更新updated_at字段 |
| set_updated_at_analytics_summary | analytics_summary | UPDATE | BEFORE | set_updated_at() | 自动更新updated_at字段 |

## 8. 权限设置

| 角色 | 表名 | 权限 | 描述 |
|------|------|------|------|
| public | articles | SELECT | 允许公开访问公开文章 |
| public | articles | INSERT | 允许匿名和认证用户创建文章 |
| public | comments | SELECT | 允许公开访问评论 |
| public | comments | INSERT | 允许匿名和认证用户创建评论 |
| public | user_graphs | SELECT | 允许公开访问公开图谱 |
| public | user_graphs | INSERT | 允许匿名和认证用户创建图谱 |
| public | article_tags | SELECT | 允许公开访问文章标签 |
| public | tags | SELECT | 允许公开访问标签 |
| authenticated | articles | UPDATE, DELETE | 允许认证用户更新和删除自己的文章 |
| authenticated | comments | UPDATE, DELETE | 允许认证用户更新和删除自己的评论 |
| authenticated | user_graphs | UPDATE, DELETE | 允许认证用户更新和删除自己的图谱 |

## 9. 数据流程

### 9.1 文章创建流程

1. 用户在前端创建文章，可选择留下作者信息或匿名提交
2. 前端调用Supabase API插入articles记录，包含作者信息（如果提供）
3. 自动生成slug和created_at/updated_at字段
4. 返回创建成功信息
5. 更新相关统计数据

### 9.2 评论流程

1. 用户在前端发表评论，可选择留下作者信息或匿名提交
2. 前端调用Supabase API插入comments记录，包含作者信息（如果提供）
3. 自动更新articles表的comment_count字段
4. 返回评论成功信息

### 9.3 知识图谱创建流程

1. 用户在前端创建知识图谱，可选择留下作者信息或匿名提交
2. 前端调用Supabase API插入user_graphs记录，包含作者信息（如果提供）
3. 自动生成created_at/updated_at字段
4. 返回创建成功信息
5. 更新相关统计数据

## 10. 最佳实践

1. **使用参数化查询**：避免SQL注入攻击
2. **利用索引**：为频繁查询的字段创建索引
3. **使用事务**：确保数据一致性
4. **合理使用JSONB**：适合存储半结构化数据
5. **定期清理数据**：删除过期的日志和临时数据
6. **使用RLS**：确保数据安全，只允许授权用户访问
7. **监控数据库性能**：定期检查慢查询和性能瓶颈

## 11. 维护与优化

1. **定期备份**：使用Supabase自动备份功能
2. **监控数据库大小**：及时清理不必要的数据
3. **优化查询**：分析慢查询并优化
4. **更新统计信息**：确保查询优化器使用正确的执行计划
5. **定期重建索引**：提高查询性能

## 12. 总结

MyMathWiki数据库采用了模块化设计，包含文章管理、知识图谱、评论系统、标签系统、数据分析和内容审核等核心功能模块，支持匿名提交。数据库结构清晰，关系明确，使用了索引、触发器和函数等高级PostgreSQL特性，提高了数据访问效率和数据一致性。

通过合理的权限设置和RLS策略，确保了数据的安全性。数据库设计考虑了扩展性，能够支持未来功能的扩展和数据量的增长。系统支持用户在提交内容时选择留下作者信息或匿名提交，提供了灵活的内容创作方式。

最新添加的内容审核机制进一步增强了系统的内容管理能力，支持对文章和版本进行审核、评分和验证，确保内容质量。审核系统包括完整的审核状态跟踪、准确性评分、审核评论和验证机制，能够有效管理和维护平台内容的质量和可信度。
