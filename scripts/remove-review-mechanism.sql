-- 移除审核机制相关数据库结构的 SQL 脚本

-- ======================================================
-- 1. 删除审核相关表
-- ======================================================

-- 删除 article_reviews 表
DROP TABLE IF EXISTS public.article_reviews CASCADE;

-- ======================================================
-- 2. 修改 articles 表，移除审核相关字段
-- ======================================================

ALTER TABLE public.articles
  DROP COLUMN IF EXISTS review_status,
  DROP COLUMN IF EXISTS reviewer_id,
  DROP COLUMN IF EXISTS reviewer_name,
  DROP COLUMN IF EXISTS review_date,
  DROP COLUMN IF EXISTS review_comments,
  DROP COLUMN IF EXISTS accuracy_score,
  DROP COLUMN IF EXISTS has_accuracy_issues,
  DROP COLUMN IF EXISTS is_verified,
  DROP COLUMN IF EXISTS verification_date,
  DROP COLUMN IF EXISTS verification_notes;

-- ======================================================
-- 3. 修改 article_versions 表，移除审核相关字段
-- ======================================================

ALTER TABLE public.article_versions
  DROP COLUMN IF EXISTS review_status,
  DROP COLUMN IF EXISTS reviewer_id,
  DROP COLUMN IF EXISTS reviewer_name,
  DROP COLUMN IF EXISTS review_date,
  DROP COLUMN IF EXISTS review_comments,
  DROP COLUMN IF EXISTS accuracy_score,
  DROP COLUMN IF EXISTS has_accuracy_issues,
  DROP COLUMN IF EXISTS is_verified,
  DROP COLUMN IF EXISTS verification_date,
  DROP COLUMN IF EXISTS verification_notes;

-- ======================================================
-- 4. 检查并删除与审核相关的函数和触发器
-- ======================================================

-- 查找并删除与审核相关的函数
DO $$
DECLARE
  func_name text;
BEGIN
  FOR func_name IN (
    SELECT proname
    FROM pg_proc p
    JOIN pg_namespace ns ON p.pronamespace = ns.oid
    WHERE ns.nspname = 'public'
    AND proname ILIKE '%review%' OR proname ILIKE '%verify%' OR proname ILIKE '%approval%'
  )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.' || func_name || ' CASCADE';
    RAISE NOTICE 'Dropped function: %', func_name;
  END LOOP;
END $$;

-- 查找并删除与审核相关的触发器
DO $$
DECLARE
  trigger_name text;
  table_name text;
BEGIN
  FOR trigger_name, table_name IN (
    SELECT tgname, relname
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace ns ON c.relnamespace = ns.oid
    WHERE ns.nspname = 'public'
    AND tgname ILIKE '%review%' OR tgname ILIKE '%verify%' OR tgname ILIKE '%approval%'
  )
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON public.' || table_name || ' CASCADE';
    RAISE NOTICE 'Dropped trigger: % from table: %', trigger_name, table_name;
  END LOOP;
END $$;

-- 查找并删除与审核相关的索引
DO $$
DECLARE
  index_name text;
BEGIN
  FOR index_name IN (
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexdef ILIKE '%review%' OR indexdef ILIKE '%verify%' OR indexdef ILIKE '%approval%'
  )
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS public.' || index_name || ' CASCADE';
    RAISE NOTICE 'Dropped index: %', index_name;
  END LOOP;
END $$;

-- ======================================================
-- 5. 查找并删除与审核相关的视图
-- ======================================================

DO $$
DECLARE
  view_name text;
BEGIN
  FOR view_name IN (
    SELECT viewname
    FROM pg_views
    WHERE schemaname = 'public'
    AND viewname ILIKE '%review%' OR viewname ILIKE '%verify%' OR viewname ILIKE '%approval%'
  )
  LOOP
    EXECUTE 'DROP VIEW IF EXISTS public.' || view_name || ' CASCADE';
    RAISE NOTICE 'Dropped view: %', view_name;
  END LOOP;
END $$;

-- ======================================================
-- 6. 查找并删除与审核相关的物化视图
-- ======================================================

DO $$
DECLARE
  matview_name text;
BEGIN
  FOR matview_name IN (
    SELECT matviewname
    FROM pg_matviews
    WHERE schemaname = 'public'
    AND matviewname ILIKE '%review%' OR matviewname ILIKE '%verify%' OR matviewname ILIKE '%approval%'
  )
  LOOP
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.' || matview_name || ' CASCADE';
    RAISE NOTICE 'Dropped materialized view: %', matview_name;
  END LOOP;
END $$;

-- ======================================================
-- 7. 清理未使用的类型和枚举
-- ======================================================

-- 查找并删除与审核相关的类型
DO $$
DECLARE
  type_name text;
BEGIN
  FOR type_name IN (
    SELECT typname
    FROM pg_type
    JOIN pg_namespace ns ON pg_type.typnamespace = ns.oid
    WHERE ns.nspname = 'public'
    AND typname ILIKE '%review%' OR typname ILIKE '%verify%' OR typname ILIKE '%approval%'
  )
  LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.' || type_name || ' CASCADE';
    RAISE NOTICE 'Dropped type: %', type_name;
  END LOOP;
END $$;

-- 完成消息
RAISE NOTICE '审核机制相关数据库结构已全部移除！';
