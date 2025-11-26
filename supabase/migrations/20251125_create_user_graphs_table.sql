-- 创建user_graphs表
CREATE TABLE IF NOT EXISTS user_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled Graph',
  graph_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_template BOOLEAN NOT NULL DEFAULT false,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'community')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加updated_at触发器
CREATE TRIGGER set_updated_at_user_graphs
BEFORE UPDATE ON user_graphs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_user_graphs_user_id ON user_graphs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_graphs_is_template ON user_graphs(is_template);
CREATE INDEX IF NOT EXISTS idx_user_graphs_visibility ON user_graphs(visibility);

-- 添加RLS策略
ALTER TABLE user_graphs ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的图表
CREATE POLICY "users_can_view_their_own_graphs" ON user_graphs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 用户可以创建自己的图表
CREATE POLICY "users_can_create_their_own_graphs" ON user_graphs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 用户可以更新自己的图表
CREATE POLICY "users_can_update_their_own_graphs" ON user_graphs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 用户可以删除自己的图表
CREATE POLICY "users_can_delete_their_own_graphs" ON user_graphs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 用户可以查看公开的图表和模板
CREATE POLICY "users_can_view_public_graphs" ON user_graphs
  FOR SELECT
  TO authenticated
  USING (visibility = 'public' OR is_template = true);

-- 用户可以查看社区可见的图表
CREATE POLICY "users_can_view_community_graphs" ON user_graphs
  FOR SELECT
  TO authenticated
  USING (visibility = 'community');
