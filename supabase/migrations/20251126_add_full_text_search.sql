-- 添加全文搜索索引和搜索函数

-- 为articles表添加全文搜索向量列
ALTER TABLE articles ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 为comments表添加全文搜索向量列
ALTER TABLE comments ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 更新articles表的搜索向量
UPDATE articles
SET search_vector = 
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(slug, '')), 'C') ||
    setweight(to_tsvector('english', coalesce((SELECT string_agg(name, ' ') FROM tags WHERE id IN (SELECT tag_id FROM article_tags WHERE article_id = articles.id)), '')), 'D');

-- 更新comments表的搜索向量
UPDATE comments
SET search_vector = 
    setweight(to_tsvector('english', coalesce(content, '')), 'A');

-- 创建articles表的全文搜索索引
CREATE INDEX IF NOT EXISTS articles_search_idx ON articles USING gin(search_vector);

-- 创建comments表的全文搜索索引
CREATE INDEX IF NOT EXISTS comments_search_idx ON comments USING gin(search_vector);

-- 创建articles表的搜索向量更新触发器
CREATE OR REPLACE FUNCTION update_articles_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector = 
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.slug, '')), 'C') ||
        setweight(to_tsvector('english', coalesce((SELECT string_agg(name, ' ') FROM tags WHERE id IN (SELECT tag_id FROM article_tags WHERE article_id = NEW.id)), '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建articles表的触发器
CREATE TRIGGER articles_search_vector_update
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_articles_search_vector();

-- 创建comments表的搜索向量更新触发器
CREATE OR REPLACE FUNCTION update_comments_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector = 
        setweight(to_tsvector('english', coalesce(NEW.content, '')), 'A');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建comments表的触发器
CREATE TRIGGER comments_search_vector_update
    BEFORE INSERT OR UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_search_vector();

-- 创建搜索文章的函数
CREATE OR REPLACE FUNCTION search_articles(query text, limit_count int DEFAULT 20) 
RETURNS TABLE (
    id uuid,
    title text,
    slug text,
    content text,
    author_id uuid,
    created_at timestamptz,
    updated_at timestamptz,
    published boolean,
    visibility text,
    search_rank float
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.slug,
        a.content,
        a.author_id,
        a.created_at,
        a.updated_at,
        a.published,
        a.visibility,
        ts_rank(a.search_vector, plainto_tsquery('english', query)) AS search_rank
    FROM articles a
    WHERE 
        a.search_vector @@ plainto_tsquery('english', query)
        AND a.published = true
    ORDER BY search_rank DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 创建根据标签搜索文章的函数
CREATE OR REPLACE FUNCTION search_articles_by_tag(query text, tag_id_filter uuid, limit_count int DEFAULT 20) 
RETURNS TABLE (
    id uuid,
    title text,
    slug text,
    content text,
    author_id uuid,
    created_at timestamptz,
    updated_at timestamptz,
    published boolean,
    visibility text,
    search_rank float
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.slug,
        a.content,
        a.author_id,
        a.created_at,
        a.updated_at,
        a.published,
        a.visibility,
        ts_rank(a.search_vector, plainto_tsquery('english', query)) AS search_rank
    FROM articles a
    JOIN article_tags at ON a.id = at.article_id
    WHERE 
        a.search_vector @@ plainto_tsquery('english', query)
        AND at.tag_id = tag_id_filter
        AND a.published = true
    ORDER BY search_rank DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 创建搜索建议函数
CREATE OR REPLACE FUNCTION search_suggestions(query text, limit_count int DEFAULT 5) 
RETURNS TABLE (
    id uuid,
    title text
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (a.title) 
        a.id,
        a.title
    FROM articles a
    WHERE 
        a.search_vector @@ plainto_tsquery('english', query)
        AND a.published = true
    ORDER BY a.title, ts_rank(a.search_vector, plainto_tsquery('english', query)) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 创建搜索评论的函数
CREATE OR REPLACE FUNCTION search_comments(query text, limit_count int DEFAULT 20) 
RETURNS TABLE (
    id uuid,
    article_id uuid,
    user_id uuid,
    content text,
    created_at timestamptz,
    updated_at timestamptz,
    search_rank float
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.article_id,
        c.user_id,
        c.content,
        c.created_at,
        c.updated_at,
        ts_rank(c.search_vector, plainto_tsquery('english', query)) AS search_rank
    FROM comments c
    WHERE 
        c.search_vector @@ plainto_tsquery('english', query)
    ORDER BY search_rank DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
