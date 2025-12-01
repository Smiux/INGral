-- 内容审核机制数据库更新

-- 1. 更新文章表，添加审核相关字段
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS 
  review_status text CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS 
  reviewer_id uuid,
ADD COLUMN IF NOT EXISTS 
  reviewer_name text,
ADD COLUMN IF NOT EXISTS 
  review_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS 
  review_comments text,
ADD COLUMN IF NOT EXISTS 
  accuracy_score integer CHECK (accuracy_score BETWEEN 0 AND 5) DEFAULT 0,
ADD COLUMN IF NOT EXISTS 
  has_accuracy_issues boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS 
  is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS 
  verification_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS 
  verification_notes text;

-- 2. 更新文章版本表，添加审核相关字段
ALTER TABLE article_versions 
ADD COLUMN IF NOT EXISTS 
  review_status text CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS 
  reviewer_id uuid,
ADD COLUMN IF NOT EXISTS 
  reviewer_name text,
ADD COLUMN IF NOT EXISTS 
  review_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS 
  review_comments text,
ADD COLUMN IF NOT EXISTS 
  accuracy_score integer CHECK (accuracy_score BETWEEN 0 AND 5) DEFAULT 0,
ADD COLUMN IF NOT EXISTS 
  has_accuracy_issues boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS 
  is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS 
  verification_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS 
  verification_notes text;

-- 3. 创建审核日志表
CREATE TABLE IF NOT EXISTS article_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  article_version_id uuid REFERENCES article_versions(id) ON DELETE CASCADE,
  reviewer_id uuid,
  reviewer_name text DEFAULT 'Anonymous',
  review_status text CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  review_comments text,
  accuracy_score integer CHECK (accuracy_score BETWEEN 0 AND 5),
  has_accuracy_issues boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verification_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_article_reviews_article_id ON article_reviews(article_id);
CREATE INDEX IF NOT EXISTS idx_article_reviews_reviewer_id ON article_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_article_reviews_review_status ON article_reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_article_reviews_created_at ON article_reviews(created_at DESC);

-- 5. 更新文章表的搜索向量生成函数，包含新的审核字段
-- 注意：需要根据实际的搜索向量生成函数进行更新
-- 这里假设已经有一个生成搜索向量的函数，我们需要确保它包含新的字段

-- 6. 更新文章表的触发器，确保搜索向量在更新时重新生成
-- 注意：需要根据实际的触发器进行更新

-- 7. 为文章审核表添加RLS策略
ALTER TABLE article_reviews ENABLE ROW LEVEL SECURITY;

-- 允许公开访问文章审核记录
DROP POLICY IF EXISTS "Allow public access to article reviews" ON article_reviews;
CREATE POLICY "Allow public access to article reviews" ON article_reviews
  FOR SELECT
  USING (true);

-- 允许匿名用户创建审核记录
DROP POLICY IF EXISTS "Allow anonymous users to create article reviews" ON article_reviews;
CREATE POLICY "Allow anonymous users to create article reviews" ON article_reviews
  FOR INSERT
  WITH CHECK (true);

-- 允许匿名用户更新审核记录
DROP POLICY IF EXISTS "Allow anonymous users to update article reviews" ON article_reviews;
CREATE POLICY "Allow anonymous users to update article reviews" ON article_reviews
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 8. 更新权限设置
GRANT INSERT, UPDATE, DELETE ON article_reviews TO public;
