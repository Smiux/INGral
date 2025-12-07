-- 数据库优化迁移脚本
-- 主要添加索引以提高查询性能

-- 为articles表添加索引
-- 按标题和内容的全文搜索索引
CREATE INDEX IF NOT EXISTS idx_articles_title_content_fulltext ON articles USING GIN (to_tsvector('english', title || ' ' || content));

-- 按创建时间排序的索引
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- 按更新时间排序的索引
CREATE INDEX IF NOT EXISTS idx_articles_updated_at ON articles(updated_at DESC);

-- 按可见性和创建时间的复合索引
CREATE INDEX IF NOT EXISTS idx_articles_visibility_created_at ON articles(visibility, created_at DESC);

-- 按作者ID的索引
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);

-- 为article_links表添加索引
-- 按源文章ID的索引
CREATE INDEX IF NOT EXISTS idx_article_links_source_id ON article_links(source_id);

-- 按目标文章ID的索引
CREATE INDEX IF NOT EXISTS idx_article_links_target_id ON article_links(target_id);

-- 按源文章ID和类型的复合索引
CREATE INDEX IF NOT EXISTS idx_article_links_source_id_type ON article_links(source_id, relationship_type);

-- 为article_tags表添加索引
-- 按文章ID的索引
CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON article_tags(article_id);

-- 按标签ID的索引
CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON article_tags(tag_id);

-- 为article_node_mappings表添加索引
-- 按文章ID的索引
CREATE INDEX IF NOT EXISTS idx_article_node_mappings_article_id ON article_node_mappings(article_id);

-- 按节点ID的索引
CREATE INDEX IF NOT EXISTS idx_article_node_mappings_node_id ON article_node_mappings(node_id);

-- 按文章ID和映射类型的复合索引
CREATE INDEX IF NOT EXISTS idx_article_node_mappings_article_id_type ON article_node_mappings(article_id, mapping_type);

-- 为graph_nodes表添加索引
-- 按图谱ID的索引
CREATE INDEX IF NOT EXISTS idx_graph_nodes_graph_id ON graph_nodes(graph_id);

-- 按类型的索引
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(type);

-- 按图谱ID和类型的复合索引
CREATE INDEX IF NOT EXISTS idx_graph_nodes_graph_id_type ON graph_nodes(graph_id, type);

-- 为graph_links表添加索引
-- 按图谱ID的索引
CREATE INDEX IF NOT EXISTS idx_graph_links_graph_id ON graph_links(graph_id);

-- 按源节点ID的索引
CREATE INDEX IF NOT EXISTS idx_graph_links_source_id ON graph_links(source_id);

-- 按目标节点ID的索引
CREATE INDEX IF NOT EXISTS idx_graph_links_target_id ON graph_links(target_id);

-- 按源节点ID和目标节点ID的复合索引
CREATE INDEX IF NOT EXISTS idx_graph_links_source_target ON graph_links(source_id, target_id);

-- 为user_graphs表添加索引
-- 按用户ID的索引
CREATE INDEX IF NOT EXISTS idx_user_graphs_user_id ON user_graphs(user_id);

-- 按可见性的索引
CREATE INDEX IF NOT EXISTS idx_user_graphs_visibility ON user_graphs(visibility);

-- 按可见性和创建时间的复合索引
CREATE INDEX IF NOT EXISTS idx_user_graphs_visibility_created_at ON user_graphs(visibility, created_at DESC);

-- 为comments表添加索引
-- 按文章ID的索引
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);

-- 按用户ID的索引
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- 按创建时间的索引
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- 移除不存在的表的索引：search_history, notifications, review_requests, discussions
-- 这些表在当前数据库中不存在，所以移除它们的索引定义

-- 优化表结构，添加约束
-- 为articles表添加外键约束
-- 注意：articles表的author_id列没有对应的外键表，所以移除该约束

-- 为article_links表添加外键约束
-- 注意：article_links表已经在初始创建时定义了外键约束
-- 这里不再重复添加，避免冲突

-- 为article_tags表添加外键约束
ALTER TABLE article_tags 
ADD CONSTRAINT fk_article_tags_article_id 
FOREIGN KEY (article_id) 
REFERENCES articles(id) 
ON DELETE CASCADE;

ALTER TABLE article_tags 
ADD CONSTRAINT fk_article_tags_tag_id 
FOREIGN KEY (tag_id) 
REFERENCES tags(id) 
ON DELETE CASCADE;

-- 为article_node_mappings表添加外键约束
ALTER TABLE article_node_mappings 
ADD CONSTRAINT fk_article_node_mappings_article_id 
FOREIGN KEY (article_id) 
REFERENCES articles(id) 
ON DELETE CASCADE;

ALTER TABLE article_node_mappings 
ADD CONSTRAINT fk_article_node_mappings_node_id 
FOREIGN KEY (node_id) 
REFERENCES graph_nodes(id) 
ON DELETE CASCADE;

-- 为comments表添加外键约束
ALTER TABLE comments 
ADD CONSTRAINT fk_comments_article_id 
FOREIGN KEY (article_id) 
REFERENCES articles(id) 
ON DELETE CASCADE;

-- 优化数据类型，减少存储空间
-- 对于boolean类型，确保使用正确的类型
ALTER TABLE articles ALTER COLUMN is_slow_mode TYPE boolean USING is_slow_mode::boolean;
ALTER TABLE articles ALTER COLUMN is_unstable TYPE boolean USING is_unstable::boolean;
ALTER TABLE articles ALTER COLUMN is_change_public TYPE boolean USING is_change_public::boolean;

ALTER TABLE user_graphs ALTER COLUMN is_template TYPE boolean USING is_template::boolean;
ALTER TABLE user_graphs ALTER COLUMN is_slow_mode TYPE boolean USING is_slow_mode::boolean;
ALTER TABLE user_graphs ALTER COLUMN is_unstable TYPE boolean USING is_unstable::boolean;
ALTER TABLE user_graphs ALTER COLUMN is_change_public TYPE boolean USING is_change_public::boolean;

-- 对于整数类型，使用适当的范围
ALTER TABLE articles ALTER COLUMN edit_count_24h TYPE smallint USING edit_count_24h::smallint;
ALTER TABLE articles ALTER COLUMN edit_count_7d TYPE smallint USING edit_count_7d::smallint;
ALTER TABLE user_graphs ALTER COLUMN edit_count_24h TYPE smallint USING edit_count_24h::smallint;
ALTER TABLE user_graphs ALTER COLUMN edit_count_7d TYPE smallint USING edit_count_7d::smallint;

-- 优化text类型，对于较短的文本使用varchar
ALTER TABLE articles ALTER COLUMN slug TYPE varchar(255) USING slug::varchar(255);
ALTER TABLE tags ALTER COLUMN name TYPE varchar(100) USING name::varchar(100);
ALTER TABLE tags ALTER COLUMN slug TYPE varchar(100) USING slug::varchar(100);

-- 为大表添加分区表支持（如果需要）
-- 注意：Supabase使用PostgreSQL，支持分区表，但需要根据实际数据量决定是否启用
-- 以下是示例，实际启用时需要根据具体情况调整

-- 创建分区表（示例）
-- CREATE TABLE IF NOT EXISTS articles_partitioned (
--   CHECK (created_at >= '2023-01-01' AND created_at < '2024-01-01')
-- ) INHERITS (articles);

-- 创建分区索引（示例）
-- CREATE INDEX idx_articles_partitioned_created_at ON articles_partitioned(created_at);

-- 为分区表创建触发器函数（示例）
-- CREATE OR REPLACE FUNCTION articles_partition_trigger()
-- RETURNS TRIGGER AS $$
BEGIN
--   IF (NEW.created_at >= '2023-01-01' AND NEW.created_at < '2024-01-01') THEN
--     INSERT INTO articles_2023 VALUES (NEW.*);
--   ELSIF (NEW.created_at >= '2024-01-01' AND NEW.created_at < '2025-01-01') THEN
--     INSERT INTO articles_2024 VALUES (NEW.*);
--   ELSE
--     RAISE EXCEPTION 'Date out of range. Fix the articles_partition_trigger() function!';
--   END IF;
--   RETURN NULL;
-- END;
-- $$
-- LANGUAGE plpgsql;

-- 为分区表创建触发器（示例）
-- CREATE TRIGGER insert_articles_partition_trigger
-- BEFORE INSERT ON articles
-- FOR EACH ROW EXECUTE FUNCTION articles_partition_trigger();

-- 优化查询性能，添加物化视图（如果需要）
-- 物化视图可以预先计算常用的聚合查询结果

-- 创建文章统计物化视图（示例）
-- CREATE MATERIALIZED VIEW article_stats AS
-- SELECT
--   category,
--   COUNT(*) AS total_articles,
--   SUM(views) AS total_views,
--   AVG(views) AS avg_views,
--   MAX(created_at) AS latest_article
-- FROM articles
-- WHERE is_published = true
-- GROUP BY category;

-- 创建物化视图索引（示例）
-- CREATE INDEX idx_article_stats_category ON article_stats(category);

-- 优化连接查询，添加适当的索引
-- 对于经常连接查询的字段，确保有适当的索引

-- 优化JSONB字段查询，添加GIN索引
-- 对于存储在JSONB字段中的数据，添加GIN索引以提高查询性能

-- 示例：为graph_data字段添加GIN索引
-- CREATE INDEX IF NOT EXISTS idx_user_graphs_graph_data ON user_graphs USING GIN (graph_data);

-- 优化全文搜索，配置PostgreSQL全文搜索
-- 配置全文搜索配置（示例）
-- CREATE TEXT SEARCH CONFIGURATION english_custom (
--   COPY = english
-- );

-- 添加自定义词干规则（示例）
-- ALTER TEXT SEARCH CONFIGURATION english_custom
-- ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, hword, hword_part, word
-- WITH english_stem;

-- 优化数据库性能，调整PostgreSQL配置
-- 这些配置通常在数据库服务器级别进行调整
-- 示例配置：
-- shared_buffers = 256MB          # 内存缓冲区大小
-- work_mem = 4MB                  # 每个查询的工作内存
-- maintenance_work_mem = 64MB     # 维护操作的工作内存
-- effective_cache_size = 512MB    # 系统缓存大小估计
-- random_page_cost = 4.0           # 随机页面访问成本
-- effective_io_concurrency = 2     # IO并发度
-- max_connections = 100           # 最大连接数
-- wal_buffers = 16MB               # WAL缓冲区大小
-- checkpoint_completion_target = 0.9  # 检查点完成目标
-- synchronous_commit = off        # 异步提交（提高性能，但有数据丢失风险）

-- 注意：以上配置仅为示例，实际配置需要根据服务器硬件和负载情况进行调整

-- 结束迁移脚本