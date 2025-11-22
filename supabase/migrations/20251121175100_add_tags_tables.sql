-- 创建标签表
CREATE TABLE IF NOT EXISTS wiki.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#007bff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_system_tag BOOLEAN DEFAULT FALSE,
  usage_count INT DEFAULT 0
);

-- 创建文章标签关联表
CREATE TABLE IF NOT EXISTS wiki.article_tags (
  article_id UUID REFERENCES wiki.articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES wiki.tags(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (article_id, tag_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_tags_name ON wiki.tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON wiki.tags(slug);
CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON wiki.article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON wiki.article_tags(tag_id);

-- 更新表权限
ALTER TABLE wiki.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki.article_tags ENABLE ROW LEVEL SECURITY;

-- 创建标签表策略
CREATE POLICY "Allow read access to all tags" ON wiki.tags
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to create tags" ON wiki.tags
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_system_tag = false);

CREATE POLICY "Allow system tag management by admins" ON wiki.tags
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- 创建文章标签关联表策略
CREATE POLICY "Allow read access to article tags" ON wiki.article_tags
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to add tags to articles they can edit" ON wiki.article_tags
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to remove tags from articles they can edit" ON wiki.article_tags
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 创建触发器函数更新标签使用计数
CREATE OR REPLACE FUNCTION wiki.update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  -- 根据操作类型更新标签使用计数
  IF TG_OP = 'INSERT' THEN
    UPDATE wiki.tags
    SET usage_count = usage_count + 1
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wiki.tags
    SET usage_count = usage_count - 1
    WHERE id = OLD.tag_id AND usage_count > 0;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_tag_usage_count_insert
AFTER INSERT ON wiki.article_tags
FOR EACH ROW
EXECUTE FUNCTION wiki.update_tag_usage_count();

CREATE TRIGGER update_tag_usage_count_delete
AFTER DELETE ON wiki.article_tags
FOR EACH ROW
EXECUTE FUNCTION wiki.update_tag_usage_count();

-- 创建触发器函数生成标签slug
CREATE OR REPLACE FUNCTION wiki.generate_tag_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- 生成slug: 转小写，空格替换为连字符，移除特殊字符
  NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-z0-9\s-]', '', 'gi'));
  NEW.slug := REGEXP_REPLACE(NEW.slug, '\s+', '-', 'g');
  NEW.slug := REGEXP_REPLACE(NEW.slug, '-+', '-', 'g');
  NEW.slug := BTRIM(NEW.slug, '-');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER generate_tag_slug
BEFORE INSERT OR UPDATE ON wiki.tags
FOR EACH ROW
WHEN (NEW.name IS NOT NULL AND NEW.slug IS NULL OR NEW.name <> OLD.name)
EXECUTE FUNCTION wiki.generate_tag_slug();

-- 插入一些默认系统标签
INSERT INTO wiki.tags (name, description, color, is_system_tag)
VALUES 
  ('Mathematics', '数学相关内容', '#17a2b8', true),
  ('Physics', '物理学相关内容', '#28a745', true),
  ('Computer Science', '计算机科学相关内容', '#6f42c1', true),
  ('Biology', '生物学相关内容', '#dc3545', true),
  ('Chemistry', '化学相关内容', '#fd7e14', true),
  ('Statistics', '统计学相关内容', '#ffc107', true)
ON CONFLICT (name) DO NOTHING;