-- 添加文章版本控制系统

-- 1. 创建article_versions表存储文章历史版本
CREATE TABLE IF NOT EXISTS article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  tags UUID[] DEFAULT '{}',
  version_number INTEGER NOT NULL,
  change_summary TEXT DEFAULT '',
  is_published BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  parent_version_id UUID REFERENCES article_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 添加article_versions表的updated_at触发器
CREATE TRIGGER set_updated_at_article_versions
BEFORE UPDATE ON article_versions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 3. 创建article_tags表的版本控制关联
CREATE TABLE IF NOT EXISTS article_version_tags (
  article_version_id UUID NOT NULL REFERENCES article_versions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (article_version_id, tag_id)
);

-- 4. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_article_versions_article_id ON article_versions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_versions_version_number ON article_versions(version_number DESC);
CREATE INDEX IF NOT EXISTS idx_article_versions_author_id ON article_versions(author_id);
CREATE INDEX IF NOT EXISTS idx_article_versions_parent_version_id ON article_versions(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_article_version_tags_version_id ON article_version_tags(article_version_id);

-- 5. 创建函数：在文章更新时自动创建版本记录
CREATE OR REPLACE FUNCTION create_article_version()
RETURNS TRIGGER AS $$
DECLARE
  new_version_number INTEGER;
  current_article_id UUID;
  current_author_id UUID;
  current_title TEXT;
  current_content TEXT;
  current_tags UUID[];
  current_is_published BOOLEAN;
BEGIN
  -- 获取当前文章的最新版本号
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO new_version_number
  FROM article_versions
  WHERE article_id = NEW.id;
  
  -- 获取当前文章的标签ID数组
  SELECT ARRAY_AGG(tag_id)
  INTO current_tags
  FROM article_tags
  WHERE article_id = NEW.id;
  
  -- 插入新版本记录
  INSERT INTO article_versions (
    article_id,
    author_id,
    title,
    content,
    excerpt,
    tags,
    version_number,
    change_summary,
    is_published,
    metadata
  ) VALUES (
    NEW.id,
    NEW.author_id,
    NEW.title,
    NEW.content,
    '',
    COALESCE(current_tags, '{}'),
    new_version_number,
    '自动创建的版本',
    (NEW.visibility = 'public'),
    '{}'
  );
  
  -- 为新版本创建标签关联
  IF current_tags IS NOT NULL THEN
    INSERT INTO article_version_tags (article_version_id, tag_id, article_id)
    SELECT 
      av.id,
      tag_id,
      NEW.id
    FROM unnest(current_tags) AS tag_id
    CROSS JOIN article_versions av
    WHERE av.article_id = NEW.id
    ORDER BY av.created_at DESC
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建触发器：在文章插入或更新时自动创建版本
DROP TRIGGER IF EXISTS create_article_version_trigger ON articles;
CREATE TRIGGER create_article_version_trigger
AFTER INSERT OR UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION create_article_version();

-- 7. 创建函数：获取文章的版本历史
CREATE OR REPLACE FUNCTION get_article_versions(p_article_id UUID, page_number INTEGER DEFAULT 1, page_size INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  article_id UUID,
  author_id UUID,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  tags UUID[],
  version_number INTEGER,
  change_summary TEXT,
  is_published BOOLEAN,
  metadata JSONB,
  parent_version_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  author_name TEXT,
  author_avatar TEXT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    av.id,
    av.article_id,
    av.author_id,
    av.title,
    av.content,
    av.excerpt,
    av.tags,
    av.version_number,
    av.change_summary,
    av.is_published,
    av.metadata,
    av.parent_version_id,
    av.created_at,
    av.updated_at,
    u.username AS author_name,
    u.avatar_url AS author_avatar
  FROM article_versions av
  JOIN users u ON av.author_id = u.id
  WHERE av.article_id = p_article_id
  ORDER BY av.version_number DESC
  LIMIT page_size
  OFFSET (page_number - 1) * page_size;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建函数：获取版本总数
CREATE OR REPLACE FUNCTION count_article_versions(p_article_id UUID)
RETURNS INTEGER
AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM article_versions WHERE article_id = p_article_id;
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建函数：比较两个版本的差异
CREATE OR REPLACE FUNCTION compare_article_versions(version1_id UUID, version2_id UUID)
RETURNS JSONB
AS $$
DECLARE
  version1 article_versions%ROWTYPE;
  version2 article_versions%ROWTYPE;
  diff JSONB;
BEGIN
  -- 获取两个版本的详细信息
  SELECT * INTO version1 FROM article_versions WHERE id = version1_id;
  SELECT * INTO version2 FROM article_versions WHERE id = version2_id;
  
  -- 确保两个版本属于同一篇文章
  IF version1.article_id != version2.article_id THEN
    RAISE EXCEPTION '不能比较不同文章的版本';
  END IF;
  
  -- 构建差异JSON
  diff := jsonb_build_object(
    'version1', jsonb_build_object(
      'id', version1.id,
      'version_number', version1.version_number,
      'created_at', version1.created_at
    ),
    'version2', jsonb_build_object(
      'id', version2.id,
      'version_number', version2.version_number,
      'created_at', version2.created_at
    ),
    'differences', jsonb_build_object(
      'title', version1.title != version2.title,
      'content', version1.content != version2.content,
      'excerpt', version1.excerpt != version2.excerpt,
      'tags', version1.tags != version2.tags,
      'is_published', version1.is_published != version2.is_published,
      'metadata', version1.metadata != version2.metadata
    )
  );
  
  RETURN diff;
END;
$$ LANGUAGE plpgsql;

-- 10. 创建函数：还原文章到指定版本
CREATE OR REPLACE FUNCTION restore_article_version(version_id UUID, user_id UUID, restore_comment TEXT DEFAULT '还原版本')
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_version_id UUID
)
AS $$
DECLARE
  version_to_restore article_versions%ROWTYPE;
  new_version_number INTEGER;
  created_version_id UUID;
BEGIN
  -- 获取要还原的版本
  SELECT * INTO version_to_restore FROM article_versions WHERE id = version_id;
  
  -- 确保版本存在
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '版本不存在', NULL::UUID;
    RETURN;
  END IF;
  
  -- 更新文章内容
  UPDATE articles
  SET 
    title = version_to_restore.title,
    content = version_to_restore.content,
    visibility = CASE WHEN version_to_restore.is_published THEN 'public' ELSE 'private' END
  WHERE id = version_to_restore.article_id;
  
  -- 更新文章标签
  DELETE FROM article_tags WHERE article_id = version_to_restore.article_id;
  
  INSERT INTO article_tags (article_id, tag_id)
  SELECT version_to_restore.article_id, tag_id
  FROM unnest(version_to_restore.tags) AS tag_id
  ON CONFLICT (article_id, tag_id) DO NOTHING;
  
  -- 获取新的版本号
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO new_version_number
  FROM article_versions
  WHERE article_id = version_to_restore.article_id;
  
  -- 创建新的版本记录，标记为还原版本
  INSERT INTO article_versions (
    article_id,
    author_id,
    title,
    content,
    excerpt,
    tags,
    version_number,
    change_summary,
    is_published,
    metadata,
    parent_version_id
  ) VALUES (
    version_to_restore.article_id,
    user_id,
    version_to_restore.title,
    version_to_restore.content,
    version_to_restore.excerpt,
    version_to_restore.tags,
    new_version_number,
    restore_comment,
    version_to_restore.is_published,
    version_to_restore.metadata,
    version_id
  )
  RETURNING id INTO created_version_id;
  
  -- 为新版本创建标签关联
  INSERT INTO article_version_tags (article_version_id, tag_id, article_id)
  SELECT 
    created_version_id,
    tag_id,
    version_to_restore.article_id
  FROM unnest(version_to_restore.tags) AS tag_id;
  
  RETURN QUERY SELECT true, '版本还原成功', created_version_id;
END;
$$ LANGUAGE plpgsql;

-- 11. 创建函数：创建分支版本
CREATE OR REPLACE FUNCTION create_branch_version(version_id UUID, author_id UUID, branch_name TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  branch_version_id UUID
)
AS $$
DECLARE
  original_version article_versions%ROWTYPE;
  new_version_number INTEGER;
  created_branch_id UUID;
BEGIN
  -- 获取原始版本
  SELECT * INTO original_version FROM article_versions WHERE id = version_id;
  
  -- 确保版本存在
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '原始版本不存在', NULL::UUID;
    RETURN;
  END IF;
  
  -- 获取新的版本号
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO new_version_number
  FROM article_versions
  WHERE article_id = original_version.article_id;
  
  -- 创建分支版本
  INSERT INTO article_versions (
    article_id,
    author_id,
    title,
    content,
    excerpt,
    tags,
    version_number,
    change_summary,
    is_published,
    metadata,
    parent_version_id
  ) VALUES (
    original_version.article_id,
    author_id,
    original_version.title,
    original_version.content,
    original_version.excerpt,
    original_version.tags,
    new_version_number,
    '分支版本: ' || branch_name,
    original_version.is_published,
    original_version.metadata,
    version_id
  )
  RETURNING id INTO created_branch_id;
  
  -- 为分支版本创建标签关联
  INSERT INTO article_version_tags (article_version_id, tag_id, article_id)
  SELECT 
    created_branch_id,
    tag_id,
    original_version.article_id
  FROM unnest(original_version.tags) AS tag_id;
  
  RETURN QUERY SELECT true, '分支版本创建成功', created_branch_id;
END;
$$ LANGUAGE plpgsql;

-- 12. 添加RLS策略以确保安全性
ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_version_tags ENABLE ROW LEVEL SECURITY;

-- 12.1 article_versions的RLS策略
CREATE POLICY "public_can_view_versions_of_public_articles" ON article_versions
  FOR SELECT
  TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM articles 
      WHERE articles.id = article_versions.article_id 
      AND articles.visibility = 'public'
    )
  );

CREATE POLICY "authenticated_can_view_their_own_article_versions" ON article_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM articles 
      WHERE articles.id = article_versions.article_id 
      AND (articles.author_id = auth.uid() OR articles.visibility = 'community')
    )
  );

CREATE POLICY "authenticated_can_create_article_versions" ON article_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- 12.2 article_version_tags的RLS策略
CREATE POLICY "public_can_view_article_version_tags" ON article_version_tags
  FOR SELECT
  TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM article_versions 
      WHERE article_versions.id = article_version_tags.article_version_id
    )
  );

CREATE POLICY "authenticated_can_manage_article_version_tags" ON article_version_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM article_versions 
      WHERE article_versions.id = article_version_tags.article_version_id
      AND article_versions.author_id = auth.uid()
    )
  );

-- 13. 为现有的article_tags表添加版本历史支持
CREATE OR REPLACE FUNCTION update_article_tags_on_version()
RETURNS TRIGGER AS $$
BEGIN
  -- 当文章标签更新时，为最新版本创建标签关联
  IF TG_OP = 'INSERT' THEN
    -- 获取最新版本
    INSERT INTO article_version_tags (article_version_id, tag_id, article_id)
    SELECT 
      av.id,
      NEW.tag_id,
      NEW.article_id
    FROM article_versions av
    WHERE av.article_id = NEW.article_id
    ORDER BY av.version_number DESC
    LIMIT 1;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- 删除标签时，更新所有相关版本
    UPDATE article_versions
    SET tags = array_remove(tags, OLD.tag_id)
    WHERE article_id = OLD.article_id
    AND tags @> ARRAY[OLD.tag_id];
    
    -- 删除版本标签关联
    DELETE FROM article_version_tags
    WHERE tag_id = OLD.tag_id
    AND article_id = OLD.article_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 14. 创建触发器：在article_tags更新时同步到版本
DROP TRIGGER IF EXISTS update_article_tags_on_version_trigger ON article_tags;
CREATE TRIGGER update_article_tags_on_version_trigger
AFTER INSERT OR DELETE ON article_tags
FOR EACH ROW
EXECUTE FUNCTION update_article_tags_on_version();

-- 15. 初始化现有文章的第一个版本
DO $$
DECLARE
  article_record RECORD;
  initial_version_number INTEGER;
  article_tags_array UUID[];
BEGIN
  -- 为每篇文章创建初始版本
  FOR article_record IN SELECT * FROM articles LOOP
    -- 检查是否已有版本记录
    IF NOT EXISTS (
      SELECT 1 FROM article_versions 
      WHERE article_id = article_record.id
    ) THEN
      -- 获取文章标签
      SELECT ARRAY_AGG(tag_id) INTO article_tags_array
      FROM article_tags
      WHERE article_id = article_record.id;
      
      -- 设置初始版本号
      initial_version_number := 1;
      
      -- 创建初始版本记录
      INSERT INTO article_versions (
        article_id,
        author_id,
        title,
        content,
        excerpt,
        tags,
        version_number,
        change_summary,
        is_published,
        metadata
      ) VALUES (
        article_record.id,
        article_record.author_id,
        article_record.title,
        article_record.content,
        '',
        COALESCE(article_tags_array, '{}'),
        initial_version_number,
        '初始版本',
        (article_record.visibility = 'public'),
        '{}'
      );
    END IF;
  END LOOP;
END;
$$;
