-- 创建文章版本历史表
CREATE TABLE IF NOT EXISTS article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  tags TEXT[],
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version_number INTEGER NOT NULL,
  change_summary TEXT,
  is_published BOOLEAN DEFAULT false
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_article_versions_article_id ON article_versions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_versions_article_version ON article_versions(article_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_article_versions_author_id ON article_versions(author_id);
CREATE INDEX IF NOT EXISTS idx_article_versions_created_at ON article_versions(created_at);

-- 创建触发器函数，在文章更新时自动保存历史版本
CREATE OR REPLACE FUNCTION save_article_version()
RETURNS TRIGGER AS $$
BEGIN
  -- 获取当前最大版本号
  DECLARE
    max_version INTEGER;
    user_id UUID;
  BEGIN
    -- 尝试获取当前用户ID（从auth.context中获取）
    BEGIN
      SELECT nullif(current_setting('auth.uid', true), '')::UUID INTO user_id;
    EXCEPTION WHEN OTHERS THEN
      user_id := NULL;
    END;
    
    -- 获取当前文章的最大版本号
    SELECT COALESCE(MAX(version_number), 0) INTO max_version
    FROM article_versions
    WHERE article_id = NEW.id;
    
    -- 插入新版本
    INSERT INTO article_versions (
      article_id,
      title,
      content,
      excerpt,
      tags,
      author_id,
      version_number,
      change_summary,
      is_published
    ) VALUES (
      NEW.id,
      NEW.title,
      NEW.content,
      NEW.excerpt,
      NEW.tags,
      COALESCE(user_id, NEW.author_id),
      max_version + 1,
      '自动保存版本',
      NEW.is_published
    );
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器，在文章更新时自动调用函数
CREATE TRIGGER article_version_trigger
AFTER UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION save_article_version();

-- 授予必要的权限
GRANT ALL ON TABLE article_versions TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION save_article_version() TO postgres, authenticated, service_role;

-- 为已有的文章创建初始版本
INSERT INTO article_versions (
  article_id,
  title,
  content,
  excerpt,
  tags,
  author_id,
  version_number,
  change_summary,
  is_published
)
SELECT
  id,
  title,
  content,
  excerpt,
  tags,
  author_id,
  1,
  '初始版本',
  is_published
FROM
  articles
WHERE
  id NOT IN (SELECT article_id FROM article_versions);
