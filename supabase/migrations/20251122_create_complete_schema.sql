-- schema.sql
-- Corrected schema with triggers, RLS policies, and fixes applied.
-- Review business rules (community visibility, grants, etc.) before running in production.

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  email_confirmed_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  slug TEXT UNIQUE,
  usage_count INTEGER DEFAULT 0,
  is_system_tag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Articles
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'community')),
  allow_contributions BOOLEAN DEFAULT FALSE,
  contributors JSONB DEFAULT '[]'::jsonb,
  upvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  contribution_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Article-Tags association
CREATE TABLE IF NOT EXISTS article_tags (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (article_id, tag_id)
);

-- 5. Article Links
CREATE TABLE IF NOT EXISTS article_links (
  source_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'related',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (source_id, target_id, relationship_type),
  CHECK (source_id <> target_id)
);

-- 6. Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_deleted BOOLEAN DEFAULT FALSE,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  content TEXT NOT NULL,
  reference_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Page views
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT NOT NULL,
  page_type TEXT NOT NULL,
  session_id TEXT NOT NULL,
  referrer TEXT,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Article interactions
CREATE TABLE IF NOT EXISTS article_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. User activity
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_date DATE DEFAULT CURRENT_DATE,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Analytics summary
CREATE TABLE IF NOT EXISTS analytics_summary (
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  period_type TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  dimension TEXT NOT NULL DEFAULT '',
  dimension_value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (metric_name, period_type, period_start, dimension, dimension_value)
);

-- 12. Functions

-- 12.1 Generate tag slug (safe for INSERT and UPDATE)
CREATE OR REPLACE FUNCTION generate_tag_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name) THEN
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-z0-9\\s-]', '', 'gi'));
    NEW.slug := REGEXP_REPLACE(NEW.slug, '\\s+', '-', 'g');
    NEW.slug := REGEXP_REPLACE(NEW.slug, '-+', '-', 'g');
    NEW.slug := BTRIM(NEW.slug, '-');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12.2 Increment article views
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE articles
  SET view_count = view_count + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql;

-- 12.3 Update contribution_date when contributors changes
CREATE OR REPLACE FUNCTION update_contribution_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contributors IS DISTINCT FROM OLD.contributors THEN
    NEW.contribution_date := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12.4 Get user profile
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  article_count INTEGER,
  contribution_count INTEGER
)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.username,
    u.created_at,
    (SELECT COUNT(*) FROM articles WHERE author_id = u.id) AS article_count,
    (SELECT COUNT(*) FROM articles WHERE contributors ? u.id::text) AS contribution_count
  FROM users u
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 12.5 Generate weekly summary
CREATE OR REPLACE FUNCTION generate_weekly_summary()
RETURNS void AS $$
DECLARE
  week_start TIMESTAMP WITH TIME ZONE := DATE_TRUNC('week', NOW()) - INTERVAL '1 week';
  week_end TIMESTAMP WITH TIME ZONE := week_start + INTERVAL '6 days' + INTERVAL '1 day';
BEGIN
  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at, dimension, dimension_value)
  VALUES (
    'total_page_views',
    (SELECT COUNT(*) FROM page_views WHERE created_at BETWEEN week_start AND week_end),
    'week', week_start, week_end, NOW(), '', ''
  )
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, created_at = EXCLUDED.created_at;

  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at, dimension, dimension_value)
  VALUES (
    'unique_visitors',
    (SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at BETWEEN week_start AND week_end),
    'week', week_start, week_end, NOW(), '', ''
  )
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, created_at = EXCLUDED.created_at;

  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at, dimension, dimension_value)
  VALUES (
    'active_users',
    (SELECT COUNT(DISTINCT user_id) FROM user_activity WHERE activity_date BETWEEN week_start::date AND week_end::date),
    'week', week_start, week_end, NOW(), '', ''
  )
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, created_at = EXCLUDED.created_at;

  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at, dimension, dimension_value)
  VALUES (
    'new_articles',
    (SELECT COUNT(*) FROM articles WHERE created_at BETWEEN week_start AND week_end),
    'week', week_start, week_end, NOW(), '', ''
  )
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, created_at = EXCLUDED.created_at;

  INSERT INTO analytics_summary(metric_name, metric_value, period_type, period_start, period_end, created_at, dimension, dimension_value)
  VALUES (
    'new_comments',
    (SELECT COUNT(*) FROM comments WHERE created_at BETWEEN week_start AND week_end),
    'week', week_start, week_end, NOW(), '', ''
  )
  ON CONFLICT (metric_name, period_type, period_start, dimension, dimension_value)
  DO UPDATE SET metric_value = EXCLUDED.metric_value, created_at = EXCLUDED.created_at;
END;
$$ LANGUAGE plpgsql;

-- 12.6 Generic updated_at setter for BEFORE UPDATE triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Triggers

-- 13.1 Tag slug trigger
DROP TRIGGER IF EXISTS tags_generate_slug_trigger ON tags;
CREATE TRIGGER tags_generate_slug_trigger
BEFORE INSERT OR UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION generate_tag_slug();

-- 13.2 Update contribution_date trigger on articles (BEFORE UPDATE)
DROP TRIGGER IF EXISTS articles_update_contribution_date ON articles;
CREATE TRIGGER articles_update_contribution_date
BEFORE UPDATE ON articles
FOR EACH ROW
WHEN (NEW.contributors IS DISTINCT FROM OLD.contributors)
EXECUTE FUNCTION update_contribution_date();

-- 13.3 updated_at triggers for tables
DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_tags ON tags;
CREATE TRIGGER set_updated_at_tags
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_articles ON articles;
CREATE TRIGGER set_updated_at_articles
BEFORE UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_comments ON comments;
CREATE TRIGGER set_updated_at_comments
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_notifications ON notifications;
CREATE TRIGGER set_updated_at_notifications
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_page_views ON page_views;
CREATE TRIGGER set_updated_at_page_views
BEFORE UPDATE ON page_views
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_user_activity ON user_activity;
CREATE TRIGGER set_updated_at_user_activity
BEFORE UPDATE ON user_activity
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_analytics_summary ON analytics_summary;
CREATE TRIGGER set_updated_at_analytics_summary
BEFORE UPDATE ON analytics_summary
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 14. Views
-- Ensure comments.is_deleted exists (add if missing) and create an explicit view definition.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.comments ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  END IF;
END;
$$;

-- User profiles view
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  u.id,
  u.email,
  u.username,
  u.bio,
  u.avatar_url,
  u.created_at AS join_date,
  COUNT(DISTINCT a.id) AS articles_created,
  COUNT(DISTINCT CASE WHEN c.article_id IS NOT NULL AND a.author_id != u.id THEN c.article_id END) AS articles_contributed,
  COALESCE(SUM(a.view_count), 0) AS total_views,
  COALESCE(SUM(a.upvotes), 0) AS reputation_score
FROM public.users u
LEFT JOIN public.articles a ON u.id = a.author_id
LEFT JOIN public.article_tags c ON c.article_id = a.id AND u.id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(c.contributors)))
GROUP BY u.id;

CREATE OR REPLACE VIEW public.comments_with_user_info AS
SELECT
  comments.id,
  comments.article_id,
  comments.parent_id,
  comments.content,
  comments.user_id,
  comments.is_deleted,
  comments.upvotes,
  comments.downvotes,
  comments.created_at,
  comments.updated_at,
  users.username AS author_name,
  users.email AS author_email
FROM public.comments
JOIN public.users ON comments.user_id = users.id;

-- 15. Row Level Security (RLS)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_links ENABLE ROW LEVEL SECURITY;

-- 15.1 articles policies
CREATE POLICY "public_can_view_public_articles" ON articles
  FOR SELECT
  TO PUBLIC
  USING (visibility = 'public');

CREATE POLICY "authenticated_can_view_their_own_articles" ON articles
  FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "authenticated_can_view_community_articles" ON articles
  FOR SELECT
  TO authenticated
  USING (visibility = 'community');

CREATE POLICY "users_can_create_articles" ON articles
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "users_can_update_their_own_articles" ON articles
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "users_can_delete_their_own_articles" ON articles
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- 15.2 comments policies
CREATE POLICY "public_can_view_comments_on_public_articles" ON comments
  FOR SELECT
  TO PUBLIC
  USING (
    is_deleted = false AND 
    EXISTS (SELECT 1 FROM articles WHERE id = comments.article_id AND visibility = 'public')
  );

CREATE POLICY "authenticated_can_view_comments" ON comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_can_create_comments" ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_update_their_own_comments" ON comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 15.3 article_tags policies (added SELECT policy)
CREATE POLICY "users_can_view_article_tags_for_accessible_articles" ON article_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM articles a
      WHERE a.id = article_tags.article_id
        AND (
          a.visibility = 'public'
          OR a.author_id = auth.uid()
          OR a.visibility = 'community'
        )
    )
  );

CREATE POLICY "users_can_add_tags_to_their_own_articles" ON article_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM articles WHERE id = article_tags.article_id AND author_id = auth.uid())
  );

CREATE POLICY "users_can_delete_tags_from_their_own_articles" ON article_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM articles WHERE id = article_tags.article_id AND author_id = auth.uid())
  );

-- 15.4 notifications policies
CREATE POLICY "users_can_view_their_own_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 15.5 article_links policies
CREATE POLICY "authenticated_can_create_article_links" ON article_links
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_can_delete_article_links" ON article_links
  FOR DELETE
  TO authenticated
  USING (true);

-- 16. Default system tags (insert)
INSERT INTO tags (name, description, color, is_system_tag)
VALUES 
  ('Mathematics', '数学相关内容', '#17a2b8', true),
  ('Physics', '物理学相关内容', '#28a745', true),
  ('Computer Science', '计算机科学相关内容', '#6f42c1', true),
  ('Biology', '生物学相关内容', '#dc3545', true),
  ('Chemistry', '化学相关内容', '#fd7e14', true),
  ('Statistics', '统计学相关内容', '#ffc107', true)
ON CONFLICT (name) DO NOTHING;

-- 17. Indexes
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_visibility ON articles(visibility);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_page_views_page_id ON page_views(page_id, page_type);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_activity_date ON user_activity(activity_date);

-- 18. Grants
-- These functions are safe but review security needs. Consider limiting EXECUTE to service roles if needed.
GRANT EXECUTE ON FUNCTION increment_article_views(UUID) TO public;
GRANT EXECUTE ON FUNCTION update_contribution_date() TO public;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO public;
GRANT EXECUTE ON FUNCTION generate_tag_slug() TO public;
GRANT EXECUTE ON FUNCTION generate_weekly_summary() TO public;
GRANT EXECUTE ON FUNCTION set_updated_at() TO public;

-- End of schema.sql