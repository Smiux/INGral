-- 创建页面访问记录表
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type VARCHAR(50) NOT NULL, -- 'article', 'home', 'search', etc.
  page_id VARCHAR(255), -- 相关实体ID，如文章slug
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255) NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(50),
  referrer TEXT,
  duration INTEGER DEFAULT 0, -- 停留时间（秒）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建访问统计索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_page_type ON page_views(page_type);
CREATE INDEX IF NOT EXISTS idx_page_views_page_id ON page_views(page_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);

-- 创建文章交互表
CREATE TABLE IF NOT EXISTS article_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  interaction_type VARCHAR(50) NOT NULL, -- 'like', 'bookmark', 'comment', 'share'
  session_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建文章交互索引
CREATE INDEX IF NOT EXISTS idx_article_interactions_article_id ON article_interactions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_interactions_user_id ON article_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_article_interactions_type ON article_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_article_interactions_created_at ON article_interactions(created_at);

-- 创建用户活跃度表
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  page_views INTEGER DEFAULT 0,
  articles_viewed INTEGER DEFAULT 0,
  articles_created INTEGER DEFAULT 0,
  comments_posted INTEGER DEFAULT 0,
  total_time INTEGER DEFAULT 0, -- 总在线时间（秒）
  last_active TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_date) -- 确保每个用户每天只有一条记录
);

-- 创建用户活跃度索引
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity(activity_date);

-- 创建汇总统计表（用于快速查询）
CREATE TABLE IF NOT EXISTS analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC(18,6) NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'day', 'week', 'month'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  dimension VARCHAR(100), -- 可选维度，如 'article', 'user', 'page_type'
  dimension_value VARCHAR(255), -- 维度值
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_name, period_type, period_start, dimension, dimension_value) -- 确保唯一性
);

-- 创建汇总统计索引
CREATE INDEX IF NOT EXISTS idx_analytics_summary_metric ON analytics_summary(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_period ON analytics_summary(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_dimension ON analytics_summary(dimension, dimension_value);

-- 创建触发器函数：更新用户活跃度
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- 插入或更新用户每日活动记录
  INSERT INTO user_activity(user_id, activity_date, page_views, last_active)
  VALUES (NEW.user_id, DATE(NEW.created_at), 1, NEW.created_at)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET 
    page_views = user_activity.page_views + 1,
    last_active = NEW.created_at;
  
  -- 如果是文章页面，增加文章浏览计数
  IF NEW.page_type = 'article' THEN
    UPDATE user_activity
    SET articles_viewed = articles_viewed + 1
    WHERE user_id = NEW.user_id AND activity_date = DATE(NEW.created_at);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：当添加新页面访问时更新用户活跃度
CREATE TRIGGER trigger_update_user_activity
AFTER INSERT ON page_views
FOR EACH ROW
WHEN (NEW.user_id IS NOT NULL)
EXECUTE FUNCTION update_user_activity();

-- 创建触发器函数：记录文章创建
CREATE OR REPLACE FUNCTION track_article_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新用户活动记录
  INSERT INTO user_activity(user_id, activity_date, articles_created, last_active)
  VALUES (NEW.author_id, DATE(NEW.created_at), 1, NEW.created_at)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET 
    articles_created = user_activity.articles_created + 1,
    last_active = NEW.created_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：当创建新文章时更新用户活动
CREATE TRIGGER trigger_track_article_creation
AFTER INSERT ON articles
FOR EACH ROW
EXECUTE FUNCTION track_article_creation();

-- 创建触发器函数：记录评论发布
CREATE OR REPLACE FUNCTION track_comment_post()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新用户活动记录
  INSERT INTO user_activity(user_id, activity_date, comments_posted, last_active)
  VALUES (NEW.user_id, DATE(NEW.created_at), 1, NEW.created_at)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET 
    comments_posted = user_activity.comments_posted + 1,
    last_active = NEW.created_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：当发布新评论时更新用户活动
CREATE TRIGGER trigger_track_comment_post
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION track_comment_post();

-- 创建函数：生成每日汇总统计
CREATE OR REPLACE FUNCTION generate_daily_summary()
RETURNS void AS $$
DECLARE
  summary_date DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  -- 统计总访问量
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at)
  VALUES ('total_page_views', (SELECT COUNT(*) FROM page_views WHERE DATE(created_at) = summary_date), 
          'day', summary_date, summary_date, NOW())
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
  
  -- 统计独立访客数
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at)
  VALUES ('unique_visitors', (SELECT COUNT(DISTINCT session_id) FROM page_views WHERE DATE(created_at) = summary_date), 
          'day', summary_date, summary_date, NOW())
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
  
  -- 统计文章访问量
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, 
                              dimension, dimension_value, created_at)
  SELECT 'article_views', COUNT(*), 'day', summary_date, summary_date, 
         'article', page_id, NOW()
  FROM page_views 
  WHERE DATE(created_at) = summary_date AND page_type = 'article'
  GROUP BY page_id
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
  
  -- 统计页面类型访问量
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, 
                              dimension, dimension_value, created_at)
  SELECT 'page_type_views', COUNT(*), 'day', summary_date, summary_date, 
         'page_type', page_type, NOW()
  FROM page_views 
  WHERE DATE(created_at) = summary_date
  GROUP BY page_type
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
  
  -- 统计用户活跃度
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at)
  VALUES ('active_users', (SELECT COUNT(*) FROM user_activity WHERE activity_date = summary_date), 
          'day', summary_date, summary_date, NOW())
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
  
  -- 统计新增内容
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at)
  VALUES ('new_articles', (SELECT COUNT(*) FROM articles WHERE DATE(created_at) = summary_date), 
          'day', summary_date, summary_date, NOW())
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
  
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at)
  VALUES ('new_comments', (SELECT COUNT(*) FROM comments WHERE DATE(created_at) = summary_date), 
          'day', summary_date, summary_date, NOW())
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：生成每周汇总统计
CREATE OR REPLACE FUNCTION generate_weekly_summary()
RETURNS void AS $$
DECLARE
  week_start DATE := DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week';
  week_end DATE := week_start + INTERVAL '6 days';
BEGIN
  -- 统计周总访问量
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at)
  VALUES ('total_page_views', (SELECT COUNT(*) FROM page_views WHERE created_at BETWEEN week_start AND week_end + INTERVAL '1 day'), 
          'week', week_start, week_end, NOW())
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
  
  -- 统计周独立访客数
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at)
  VALUES ('unique_visitors', (SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at BETWEEN week_start AND week_end + INTERVAL '1 day'), 
          'week', week_start, week_end, NOW())
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
  
  -- 统计周活跃用户
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at)
  VALUES ('active_users', (SELECT COUNT(DISTINCT user_id) FROM user_activity WHERE activity_date BETWEEN week_start AND week_end), 
          'week', week_start, week_end, NOW())
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：生成每月汇总统计
CREATE OR REPLACE FUNCTION generate_monthly_summary()
RETURNS void AS $$
DECLARE
  month_start DATE := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month';
  month_end DATE := (month_start + INTERVAL '1 month') - INTERVAL '1 day';
BEGIN
  -- 统计月总访问量
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at)
  VALUES ('total_page_views', (SELECT COUNT(*) FROM page_views WHERE created_at BETWEEN month_start AND month_end + INTERVAL '1 day'), 
          'month', month_start, month_end, NOW())
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
  
  -- 统计月独立访客数
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at)
  VALUES ('unique_visitors', (SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at BETWEEN month_start AND month_end + INTERVAL '1 day'), 
          'month', month_start, month_end, NOW())
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
  
  -- 统计月活跃用户
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at)
  VALUES ('active_users', (SELECT COUNT(DISTINCT user_id) FROM user_activity WHERE activity_date BETWEEN month_start AND month_end), 
          'month', month_start, month_end, NOW())
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
END;
$$ LANGUAGE plpgsql;

-- 为现有数据生成初始汇总统计（可选）
-- SELECT generate_daily_summary();
-- SELECT generate_weekly_summary();
-- SELECT generate_monthly_summary();

-- 创建权限设置（可选）
-- GRANT SELECT, INSERT ON page_views TO authenticated;
-- GRANT SELECT ON article_interactions TO authenticated;
-- GRANT SELECT ON user_activity TO authenticated;
-- GRANT SELECT ON analytics_summary TO authenticated;
