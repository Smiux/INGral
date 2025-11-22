-- 创建评论表
CREATE TABLE IF NOT EXISTS wiki.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES wiki.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  parent_id UUID REFERENCES wiki.comments(id) ON DELETE CASCADE,
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- 创建评论索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON wiki.comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON wiki.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON wiki.comments(parent_id);

-- 更新表权限
ALTER TABLE wiki.comments ENABLE ROW LEVEL SECURITY;

-- 创建策略，允许用户查看所有未删除的评论
CREATE POLICY "Allow read access to non-deleted comments" ON wiki.comments
  FOR SELECT
  USING (is_deleted = false);

-- 创建策略，允许用户创建自己的评论
CREATE POLICY "Allow users to create comments" ON wiki.comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 创建策略，允许用户更新自己的评论
CREATE POLICY "Allow users to update their own comments" ON wiki.comments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 创建策略，允许用户软删除自己的评论
CREATE POLICY "Allow users to soft delete their own comments" ON wiki.comments
  FOR UPDATE
  USING (auth.uid() = user_id AND is_deleted = false);

-- 创建触发器函数更新updated_at字段
CREATE OR REPLACE FUNCTION wiki.update_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_comment_timestamp
BEFORE UPDATE ON wiki.comments
FOR EACH ROW
EXECUTE FUNCTION wiki.update_comment_timestamp();