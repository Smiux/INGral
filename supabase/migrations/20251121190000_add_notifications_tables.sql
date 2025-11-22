-- 创建通知表
CREATE TABLE IF NOT EXISTS wiki.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    actor_id UUID REFERENCES wiki.users(id),
    notification_type TEXT NOT NULL,
    content TEXT NOT NULL,
    reference_id TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON wiki.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON wiki.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON wiki.notifications(created_at DESC);

-- 创建通知触发器函数
CREATE OR REPLACE FUNCTION wiki.notify_on_comment() 
RETURNS TRIGGER AS $$
BEGIN
    -- 当有新评论时，通知文章作者
    INSERT INTO wiki.notifications (user_id, actor_id, notification_type, content, reference_id)
    SELECT 
        a.user_id,
        NEW.user_id,
        'comment',
        '有人评论了你的文章',
        a.id
    FROM wiki.articles a
    WHERE a.id = NEW.article_id AND a.user_id != NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建评论触发器
CREATE TRIGGER comment_notification_trigger
AFTER INSERT ON wiki.comments
FOR EACH ROW EXECUTE FUNCTION wiki.notify_on_comment();

-- 创建更新通知的函数
CREATE OR REPLACE FUNCTION wiki.update_notification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建更新触发器
CREATE TRIGGER update_notification_timestamp_trigger
BEFORE UPDATE ON wiki.notifications
FOR EACH ROW EXECUTE FUNCTION wiki.update_notification_timestamp();

-- 设置权限
GRANT ALL ON wiki.notifications TO authenticated;
GRANT USAGE ON SCHEMA wiki TO authenticated;
GRANT EXECUTE ON FUNCTION wiki.notify_on_comment() TO authenticated;
GRANT EXECUTE ON FUNCTION wiki.update_notification_timestamp() TO authenticated;
