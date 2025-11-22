-- 添加全文搜索功能

-- 为文章表添加tsvector字段（用于全文搜索）
ALTER TABLE public.articles
ADD COLUMN search_vector tsvector;

-- 创建更新search_vector的函数
CREATE OR REPLACE FUNCTION public.update_article_search_vector() RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('chinese'::regconfig, coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('chinese'::regconfig, coalesce(NEW.content, '')), 'B') ||
        setweight(to_tsvector('chinese'::regconfig, coalesce(NEW.summary, '')), 'C');
    RETURN NEW;
END;
$$;

-- 创建触发器，在文章插入或更新时自动更新search_vector
CREATE TRIGGER update_article_search_vector
    BEFORE INSERT OR UPDATE
    ON public.articles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_article_search_vector();

-- 为search_vector创建GIN索引以提高搜索性能
CREATE INDEX IF NOT EXISTS articles_search_vector_idx
    ON public.articles
    USING gin (search_vector);

-- 更新现有的文章记录
UPDATE public.articles
SET search_vector = 
    setweight(to_tsvector('chinese'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('chinese'::regconfig, coalesce(content, '')), 'B') ||
    setweight(to_tsvector('chinese'::regconfig, coalesce(summary, '')), 'C');

-- 创建全文搜索函数
CREATE OR REPLACE FUNCTION public.search_articles(query text, limit_count integer = 20) RETURNS TABLE(
    id uuid,
    title text,
    summary text,
    content text,
    author_id uuid,
    published boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    slug text,
    image_url text,
    search_rank real
)
    LANGUAGE sql
AS $$
    SELECT 
        a.id, 
        a.title, 
        a.summary, 
        a.content, 
        a.author_id, 
        a.published, 
        a.created_at, 
        a.updated_at, 
        a.slug, 
        a.image_url,
        ts_rank(a.search_vector, plainto_tsquery('chinese', query)) as search_rank
    FROM 
        public.articles a
    WHERE 
        a.search_vector @@ plainto_tsquery('chinese', query)
        AND a.published = true
    ORDER BY 
        search_rank DESC
    LIMIT 
        limit_count;
$$;

-- 创建带标签过滤的搜索函数
CREATE OR REPLACE FUNCTION public.search_articles_by_tag(query text, tag_id_filter uuid, limit_count integer = 20) RETURNS TABLE(
    id uuid,
    title text,
    summary text,
    content text,
    author_id uuid,
    published boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    slug text,
    image_url text,
    search_rank real
)
    LANGUAGE sql
AS $$
    SELECT 
        a.id, 
        a.title, 
        a.summary, 
        a.content, 
        a.author_id, 
        a.published, 
        a.created_at, 
        a.updated_at, 
        a.slug, 
        a.image_url,
        ts_rank(a.search_vector, plainto_tsquery('chinese', query)) as search_rank
    FROM 
        public.articles a
    JOIN
        public.article_tags at ON a.id = at.article_id
    WHERE 
        a.search_vector @@ plainto_tsquery('chinese', query)
        AND a.published = true
        AND at.tag_id = tag_id_filter
    ORDER BY 
        search_rank DESC
    LIMIT 
        limit_count;
$$;

-- 更新函数权限
ALTER FUNCTION public.search_articles(query text, limit_count integer) OWNER TO postgres;
ALTER FUNCTION public.search_articles_by_tag(query text, tag_id_filter uuid, limit_count integer) OWNER TO postgres;

-- 为匿名用户授予执行权限
GRANT EXECUTE ON FUNCTION public.search_articles(query text, limit_count integer) TO anon;
GRANT EXECUTE ON FUNCTION public.search_articles_by_tag(query text, tag_id_filter uuid, limit_count integer) TO anon;

-- 为认证用户授予执行权限
GRANT EXECUTE ON FUNCTION public.search_articles(query text, limit_count integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_articles_by_tag(query text, tag_id_filter uuid, limit_count integer) TO authenticated;
