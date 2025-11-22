-- 更新文章事务函数以支持标签功能

-- 更新创建文章事务函数
CREATE OR REPLACE FUNCTION public.create_article_transaction(article_data jsonb, tag_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
DECLARE
    new_article_id uuid;
    tag_id uuid;
BEGIN
    -- 创建文章
    INSERT INTO public.articles (title, content, summary, slug, image_url, published, author_id)
    VALUES (
        article_data->>'title',
        article_data->>'content',
        article_data->>'summary',
        article_data->>'slug',
        article_data->>'image_url',
        (article_data->>'published')::boolean,
        article_data->>'author_id'
    )
    RETURNING id INTO new_article_id;
    
    -- 如果提供了标签ID，添加文章标签关联
    IF tag_ids IS NOT NULL THEN
        FOREACH tag_id IN ARRAY tag_ids LOOP
            INSERT INTO public.article_tags (article_id, tag_id)
            VALUES (new_article_id, tag_id);
            
            -- 更新标签使用计数
            UPDATE public.tags
            SET usage_count = usage_count + 1
            WHERE id = tag_id;
        END LOOP;
    END IF;
END;
$$;

-- 更新更新文章事务函数
CREATE OR REPLACE FUNCTION public.update_article_transaction(article_id uuid, article_data jsonb, tag_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
DECLARE
    tag_id uuid;
    old_tag_id uuid;
BEGIN
    -- 更新文章基本信息
    UPDATE public.articles
    SET 
        title = article_data->>'title',
        content = article_data->>'content',
        summary = article_data->>'summary',
        slug = article_data->>'slug',
        image_url = article_data->>'image_url',
        published = (article_data->>'published')::boolean,
        updated_at = NOW()
    WHERE id = article_id;
    
    -- 如果提供了标签ID，更新文章标签关联
    IF tag_ids IS NOT NULL THEN
        -- 首先减少旧标签的使用计数
        FOR old_tag_id IN
            SELECT tag_id FROM public.article_tags WHERE article_id = article_id
        LOOP
            UPDATE public.tags
            SET usage_count = usage_count - 1
            WHERE id = old_tag_id;
        END LOOP;
        
        -- 删除旧的标签关联
        DELETE FROM public.article_tags WHERE article_id = article_id;
        
        -- 添加新的标签关联
        FOREACH tag_id IN ARRAY tag_ids LOOP
            INSERT INTO public.article_tags (article_id, tag_id)
            VALUES (article_id, tag_id);
            
            -- 更新标签使用计数
            UPDATE public.tags
            SET usage_count = usage_count + 1
            WHERE id = tag_id;
        END LOOP;
    END IF;
END;
$$;

-- 更新函数权限
ALTER FUNCTION public.create_article_transaction(article_data jsonb, tag_ids uuid[]) OWNER TO postgres;
ALTER FUNCTION public.update_article_transaction(article_id uuid, article_data jsonb, tag_ids uuid[]) OWNER TO postgres;

-- 为匿名用户授予执行权限
GRANT EXECUTE ON FUNCTION public.create_article_transaction(article_data jsonb, tag_ids uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.update_article_transaction(article_id uuid, article_data jsonb, tag_ids uuid[]) TO anon;

-- 为认证用户授予执行权限
GRANT EXECUTE ON FUNCTION public.create_article_transaction(article_data jsonb, tag_ids uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_article_transaction(article_id uuid, article_data jsonb, tag_ids uuid[]) TO authenticated;
