-- MyMathWiki 完整数据库结构
-- 支持匿名提交功能

-- 1. 文章表 (articles)
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  author_id uuid,
  author_name text DEFAULT 'Anonymous',
  author_email text,
  author_url text,
  visibility text CHECK (visibility IN ('public', 'private')) DEFAULT 'public',
  allow_contributions boolean DEFAULT false,
  contributors jsonb DEFAULT '[]',
  upvotes integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  contribution_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  search_vector tsvector
);

-- 2. 文章版本表 (article_versions)
CREATE TABLE IF NOT EXISTS article_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text DEFAULT 'Anonymous',
  author_email text,
  author_url text,
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  tags uuid[] DEFAULT '{}',
  version_number integer NOT NULL,
  change_summary text DEFAULT '',
  is_published boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  parent_version_id uuid REFERENCES article_versions(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. 标签表 (tags)
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#6B7280',
  slug text UNIQUE,
  usage_count integer DEFAULT 0,
  is_system_tag boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. 文章标签关联表 (article_tags)
CREATE TABLE IF NOT EXISTS article_tags (
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  added_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (article_id, tag_id)
);

-- 5. 文章版本标签关联表 (article_version_tags)
CREATE TABLE IF NOT EXISTS article_version_tags (
  article_version_id uuid NOT NULL REFERENCES article_versions(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  added_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (article_version_id, tag_id)
);

-- 6. 文章链接表 (article_links)
CREATE TABLE IF NOT EXISTS article_links (
  source_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'related',
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (source_id, target_id, relationship_type)
);

-- 7. 评论表 (comments)
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE SET NULL,
  content text NOT NULL,
  user_id uuid,
  author_name text DEFAULT 'Anonymous',
  author_email text,
  author_url text,
  is_deleted boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  search_vector tsvector
);

-- 8. 用户图谱表 (user_graphs)
CREATE TABLE IF NOT EXISTS user_graphs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Graph',
  graph_data jsonb NOT NULL DEFAULT '{}',
  user_id uuid,
  author_name text DEFAULT 'Anonymous',
  author_email text,
  author_url text,
  is_template boolean NOT NULL DEFAULT false,
  visibility text CHECK (visibility IN ('public', 'private')) DEFAULT 'private',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 9. 数据分析表 (analytics_summary)
CREATE TABLE IF NOT EXISTS analytics_summary (
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  period_type text NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  dimension text NOT NULL DEFAULT '',
  dimension_value text NOT NULL DEFAULT '',
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (metric_name, period_type, period_start, dimension, dimension_value)
);

-- 10. 文章交互表 (article_interactions)
CREATE TABLE IF NOT EXISTS article_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id uuid,
  interaction_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 11. 页面访问表 (page_views)
CREATE TABLE IF NOT EXISTS page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL,
  page_type text NOT NULL,
  session_id text NOT NULL,
  referrer text,
  duration integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 12. 索引
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_visibility ON articles(visibility);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_author_name ON articles(author_name);

CREATE INDEX IF NOT EXISTS idx_article_versions_article_id ON article_versions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_versions_author_id ON article_versions(author_id);
CREATE INDEX IF NOT EXISTS idx_article_versions_created_at ON article_versions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author_name ON comments(author_name);

CREATE INDEX IF NOT EXISTS idx_user_graphs_user_id ON user_graphs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_graphs_visibility ON user_graphs(visibility);
CREATE INDEX IF NOT EXISTS idx_user_graphs_author_name ON user_graphs(author_name);

CREATE INDEX IF NOT EXISTS idx_article_interactions_article_id ON article_interactions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_interactions_user_id ON article_interactions(user_id);

CREATE INDEX IF NOT EXISTS idx_page_views_page_id ON page_views(page_id, page_type);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);

-- 13. 函数

-- 自动生成标签slug
CREATE OR REPLACE FUNCTION generate_tag_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name) THEN
    -- 处理中文名称，使用更简单的方式生成slug
    -- 1. 先将空格替换为连字符
    NEW.slug := REGEXP_REPLACE(COALESCE(NEW.name, ''), '\s+', '-', 'g');
    -- 2. 移除所有特殊字符，保留字母、数字、连字符和中文字符
    NEW.slug := REGEXP_REPLACE(NEW.slug, '[^a-zA-Z0-9\-\u4e00-\u9fa5]', '', 'g');
    -- 3. 转换为小写
    NEW.slug := LOWER(NEW.slug);
    -- 4. 移除连续的连字符
    NEW.slug := REGEXP_REPLACE(NEW.slug, '\-+', '-', 'g');
    -- 5. 修剪首尾连字符
    NEW.slug := BTRIM(NEW.slug, '-');
    
    -- 确保slug不为空
    IF NEW.slug = '' THEN
      NEW.slug := 'tag-' || gen_random_uuid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 自动更新updated_at字段
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 增加文章阅读计数
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE articles
  SET view_count = view_count + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

-- 更新贡献日期
CREATE OR REPLACE FUNCTION update_contribution_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contributors IS DISTINCT FROM OLD.contributors THEN
    NEW.contribution_date := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. 触发器

-- 标签slug生成触发器
DROP TRIGGER IF EXISTS tags_generate_slug_trigger ON tags;
CREATE TRIGGER tags_generate_slug_trigger
BEFORE INSERT OR UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION generate_tag_slug();

-- 更新updated_at触发器
DROP TRIGGER IF EXISTS set_updated_at_articles ON articles;
CREATE TRIGGER set_updated_at_articles
BEFORE UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_article_versions ON article_versions;
CREATE TRIGGER set_updated_at_article_versions
BEFORE UPDATE ON article_versions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_tags ON tags;
CREATE TRIGGER set_updated_at_tags
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_comments ON comments;
CREATE TRIGGER set_updated_at_comments
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_user_graphs ON user_graphs;
CREATE TRIGGER set_updated_at_user_graphs
BEFORE UPDATE ON user_graphs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_page_views ON page_views;
CREATE TRIGGER set_updated_at_page_views
BEFORE UPDATE ON page_views
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 更新贡献日期触发器
DROP TRIGGER IF EXISTS articles_update_contribution_date ON articles;
CREATE TRIGGER articles_update_contribution_date
BEFORE UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION update_contribution_date();

-- 更新search_vector触发器
DROP TRIGGER IF EXISTS articles_update_search_vector ON articles;
CREATE TRIGGER articles_update_search_vector
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION tsvector_update_trigger(
  search_vector, 'pg_catalog.english', title, content
);

DROP TRIGGER IF EXISTS comments_update_search_vector ON comments;
CREATE TRIGGER comments_update_search_vector
BEFORE INSERT OR UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION tsvector_update_trigger(
  search_vector, 'pg_catalog.english', content
);

-- 15. RLS策略

-- 启用RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- 文章RLS策略
DROP POLICY IF EXISTS "Allow public access to public articles" ON articles;
CREATE POLICY "Allow public access to public articles" ON articles
  FOR SELECT
  USING (visibility = 'public');

DROP POLICY IF EXISTS "Allow anonymous users to create articles" ON articles;
CREATE POLICY "Allow anonymous users to create articles" ON articles
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous users to update their articles" ON articles;
CREATE POLICY "Allow anonymous users to update their articles" ON articles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 评论RLS策略
DROP POLICY IF EXISTS "Allow public access to comments" ON comments;
CREATE POLICY "Allow public access to comments" ON comments
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous users to create comments" ON comments;
CREATE POLICY "Allow anonymous users to create comments" ON comments
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous users to update their comments" ON comments;
CREATE POLICY "Allow anonymous users to update their comments" ON comments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 标签RLS策略
DROP POLICY IF EXISTS "Allow public access to tags" ON tags;
CREATE POLICY "Allow public access to tags" ON tags
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous users to create tags" ON tags;
CREATE POLICY "Allow anonymous users to create tags" ON tags
  FOR INSERT
  WITH CHECK (true);

-- 用户图谱RLS策略
DROP POLICY IF EXISTS "Allow public access to public graphs" ON user_graphs;
CREATE POLICY "Allow public access to public graphs" ON user_graphs
  FOR SELECT
  USING (visibility = 'public');

DROP POLICY IF EXISTS "Allow anonymous users to create graphs" ON user_graphs;
CREATE POLICY "Allow anonymous users to create graphs" ON user_graphs
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous users to update their graphs" ON user_graphs;
CREATE POLICY "Allow anonymous users to update their graphs" ON user_graphs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 文章标签关联RLS策略
DROP POLICY IF EXISTS "Allow public access to article tags" ON article_tags;
CREATE POLICY "Allow public access to article tags" ON article_tags
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous users to manage article tags" ON article_tags;
CREATE POLICY "Allow anonymous users to manage article tags" ON article_tags
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 文章版本标签关联RLS策略
DROP POLICY IF EXISTS "Allow public access to article version tags" ON article_version_tags;
CREATE POLICY "Allow public access to article version tags" ON article_version_tags
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous users to manage article version tags" ON article_version_tags;
CREATE POLICY "Allow anonymous users to manage article version tags" ON article_version_tags
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 16. 视图

-- 评论带作者信息视图
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

-- 17. 初始化数据

-- 插入默认标签
INSERT INTO tags (name, description, color, is_system_tag)
VALUES
  ('数学', '数学相关内容', '#3B82F6', true),
  ('物理', '物理相关内容', '#EF4444', true),
  ('化学', '化学相关内容', '#10B981', true),
  ('计算机科学', '计算机科学相关内容', '#8B5CF6', true),
  ('生物学', '生物学相关内容', '#F59E0B', true)
ON CONFLICT (name) DO NOTHING;

-- 18. 权限设置

-- 授予public角色基本权限
GRANT USAGE ON SCHEMA public TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO public;
GRANT INSERT, UPDATE, DELETE ON articles, article_versions, article_links, article_tags, article_version_tags, comments, user_graphs, tags, analytics_summary, article_interactions, page_views TO public;

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE ON TABLES TO public;