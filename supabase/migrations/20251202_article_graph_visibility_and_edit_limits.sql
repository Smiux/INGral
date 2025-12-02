-- 修改文章和图表的可见性类型，添加编辑限制字段

-- 1. 删除所有可能依赖visibility列的策略
DROP POLICY IF EXISTS "Allow public access to public articles" ON articles;
DROP POLICY IF EXISTS "Allow public access to public graph nodes" ON graph_nodes;
DROP POLICY IF EXISTS "Allow public access to public graph links" ON graph_links;

-- 2. 检查并删除graph_links表的visibility列相关策略（如果存在）
DO $$ 
BEGIN
  -- 检查graph_links表是否存在visibility列
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'graph_links' AND column_name = 'visibility') THEN
    DROP POLICY IF EXISTS "Allow public access to public graph links" ON graph_links;
    
    -- 更新可见性值为文本类型
    UPDATE graph_links SET visibility = visibility::text;
    
    -- 修改列类型
    ALTER TABLE graph_links 
      ALTER COLUMN visibility SET DATA TYPE text,
      ALTER COLUMN visibility SET DEFAULT 'public';
    
    -- 添加graph_links表的可见性CHECK约束
    ALTER TABLE graph_links 
      DROP CONSTRAINT IF EXISTS graph_links_visibility_check,
      ADD CONSTRAINT graph_links_visibility_check CHECK (visibility IN ('public', 'unlisted'));
    
    -- 重新创建graph_links表策略
    CREATE POLICY "Allow public access to public graph links" ON graph_links
      FOR SELECT
      TO public
      USING (visibility = 'public');
  END IF;
END $$;

-- 2. 修改articles表
-- 更新可见性类型，将'private'改为'unlisted'
-- 由于PostgreSQL不允许直接修改被依赖列的类型，我们需要先将所有值转换为文本
UPDATE articles SET visibility = visibility::text;

-- 修改列类型
ALTER TABLE articles 
  ALTER COLUMN visibility SET DATA TYPE text,
  ALTER COLUMN visibility SET DEFAULT 'public',
  -- 移除允许贡献相关字段
  DROP COLUMN IF EXISTS allow_contributions,
  DROP COLUMN IF EXISTS contributors,
  DROP COLUMN IF EXISTS contribution_date,
  -- 添加编辑限制相关字段
  ADD COLUMN edit_count_24h integer DEFAULT 0,
  ADD COLUMN edit_count_7d integer DEFAULT 0,
  ADD COLUMN last_edit_date timestamp with time zone DEFAULT now(),
  ADD COLUMN is_change公示 boolean DEFAULT false,
  ADD COLUMN is_slow_mode boolean DEFAULT false,
  ADD COLUMN slow_mode_until timestamp with time zone,
  ADD COLUMN is_unstable boolean DEFAULT false;

-- 添加articles表的可见性CHECK约束
ALTER TABLE articles 
  DROP CONSTRAINT IF EXISTS articles_visibility_check,
  ADD CONSTRAINT articles_visibility_check CHECK (visibility IN ('public', 'unlisted'));

-- 重新创建articles表策略
CREATE POLICY "Allow public access to public articles" ON articles
  FOR SELECT
  TO public
  USING (visibility = 'public');

-- 3. 修改graph_nodes表（如果存在visibility列）
DO $$ 
BEGIN
  -- 检查graph_nodes表是否存在visibility列
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'graph_nodes' AND column_name = 'visibility') THEN
    -- 删除依赖于visibility列的策略
    DROP POLICY IF EXISTS "Allow public access to public graph nodes" ON graph_nodes;
    
    -- 更新可见性值为文本类型
    UPDATE graph_nodes SET visibility = visibility::text;
    
    -- 修改列类型
    ALTER TABLE graph_nodes 
      ALTER COLUMN visibility SET DATA TYPE text,
      ALTER COLUMN visibility SET DEFAULT 'public';
    
    -- 添加graph_nodes表的可见性CHECK约束
    ALTER TABLE graph_nodes 
      DROP CONSTRAINT IF EXISTS graph_nodes_visibility_check,
      ADD CONSTRAINT graph_nodes_visibility_check CHECK (visibility IN ('public', 'unlisted'));
    
    -- 重新创建graph_nodes表策略
    CREATE POLICY "Allow public access to public graph nodes" ON graph_nodes
      FOR SELECT
      TO public
      USING (visibility = 'public');
  END IF;
END $$;

-- 2. 修改user_graphs表（假设存在该表）
-- 先删除依赖于visibility列的策略
DROP POLICY IF EXISTS "Allow public access to public graphs" ON user_graphs;

-- 更新可见性类型，将'private'改为'unlisted'
-- 由于PostgreSQL不允许直接修改被依赖列的类型，我们需要先将所有值转换为文本
UPDATE user_graphs SET visibility = visibility::text;

-- 修改列类型
ALTER TABLE IF EXISTS user_graphs 
  ALTER COLUMN visibility SET DATA TYPE text,
  ALTER COLUMN visibility SET DEFAULT 'public',
  -- 移除允许贡献相关字段
  DROP COLUMN IF EXISTS allow_contributions,
  DROP COLUMN IF EXISTS contributors,
  DROP COLUMN IF EXISTS contribution_date,
  -- 添加编辑限制相关字段
  ADD COLUMN edit_count_24h integer DEFAULT 0,
  ADD COLUMN edit_count_7d integer DEFAULT 0,
  ADD COLUMN last_edit_date timestamp with time zone DEFAULT now(),
  ADD COLUMN is_change公示 boolean DEFAULT false,
  ADD COLUMN is_slow_mode boolean DEFAULT false,
  ADD COLUMN slow_mode_until timestamp with time zone,
  ADD COLUMN is_unstable boolean DEFAULT false;

-- 添加user_graphs表的可见性CHECK约束
ALTER TABLE IF EXISTS user_graphs 
  DROP CONSTRAINT IF EXISTS user_graphs_visibility_check,
  ADD CONSTRAINT user_graphs_visibility_check CHECK (visibility IN ('public', 'unlisted'));

-- 重新创建策略
CREATE POLICY "Allow public access to public graphs" ON user_graphs
  FOR SELECT
  TO public
  USING (visibility = 'public');

-- 3. 创建更新编辑计数的函数
CREATE OR REPLACE FUNCTION update_edit_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新articles表的编辑计数
  IF TG_TABLE_NAME = 'articles' THEN
    -- 更新24小时内的编辑次数
    NEW.edit_count_24h = (
      SELECT COALESCE(COUNT(*), 0)
      FROM articles
      WHERE id = NEW.id
        AND updated_at > now() - interval '24 hours'
    ) + 1;
    
    -- 更新7天内的编辑次数
    NEW.edit_count_7d = (
      SELECT COALESCE(COUNT(*), 0)
      FROM articles
      WHERE id = NEW.id
        AND updated_at > now() - interval '7 days'
    ) + 1;
    
    -- 更新最后编辑时间
    NEW.last_edit_date = now();
    
    -- 检查是否需要进入更改公示模式（24小时内编辑超过3次）
    IF NEW.edit_count_24h > 3 THEN
      NEW.is_change公示 = true;
      -- 进入慢速模式，24小时内只能编辑一次
      NEW.is_slow_mode = true;
      NEW.slow_mode_until = now() + interval '24 hours';
    END IF;
    
    -- 检查是否需要标记为不稳定内容（7天内编辑超过10次）
    IF NEW.edit_count_7d > 10 THEN
      NEW.is_unstable = true;
    END IF;
  END IF;
  
  -- 更新user_graphs表的编辑计数
  IF TG_TABLE_NAME = 'user_graphs' THEN
    -- 更新24小时内的编辑次数
    NEW.edit_count_24h = (
      SELECT COALESCE(COUNT(*), 0)
      FROM user_graphs
      WHERE id = NEW.id
        AND updated_at > now() - interval '24 hours'
    ) + 1;
    
    -- 更新7天内的编辑次数
    NEW.edit_count_7d = (
      SELECT COALESCE(COUNT(*), 0)
      FROM user_graphs
      WHERE id = NEW.id
        AND updated_at > now() - interval '7 days'
    ) + 1;
    
    -- 更新最后编辑时间
    NEW.last_edit_date = now();
    
    -- 检查是否需要进入更改公示模式（24小时内编辑超过3次）
    IF NEW.edit_count_24h > 3 THEN
      NEW.is_change公示 = true;
      -- 进入慢速模式，24小时内只能编辑一次
      NEW.is_slow_mode = true;
      NEW.slow_mode_until = now() + interval '24 hours';
    END IF;
    
    -- 检查是否需要标记为不稳定内容（7天内编辑超过10次）
    IF NEW.edit_count_7d > 10 THEN
      NEW.is_unstable = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建articles表的更新触发器
DROP TRIGGER IF EXISTS update_article_edit_counts ON articles;
CREATE TRIGGER update_article_edit_counts
BEFORE UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION update_edit_counts();

-- 5. 创建user_graphs表的更新触发器
DROP TRIGGER IF EXISTS update_graph_edit_counts ON user_graphs;
CREATE TRIGGER update_graph_edit_counts
BEFORE UPDATE ON user_graphs
FOR EACH ROW
EXECUTE FUNCTION update_edit_counts();

-- 6. 更新现有数据的可见性，将'private'改为'unlisted'
UPDATE articles 
SET visibility = 'unlisted' 
WHERE visibility = 'private';

-- 7. 如果存在user_graphs表，更新现有数据的可见性
UPDATE user_graphs 
SET visibility = 'unlisted' 
WHERE visibility = 'private';
