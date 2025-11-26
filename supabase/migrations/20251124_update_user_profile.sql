-- Migration to update user profile schema
-- This migration adds additional fields to the users table and creates the user_profiles view

-- 1. Add bio and avatar_url fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- 2. Create user_profiles view (drop existing first if it has different columns)
DROP VIEW IF EXISTS public.user_profiles;
CREATE VIEW public.user_profiles AS
SELECT
    u.id,
    u.username,
    u.email,
    u.bio,
    u.avatar_url,
    u.created_at AS join_date,
    u.email_confirmed_at,
    u.last_sign_in_at,
    COUNT(DISTINCT CASE WHEN a.author_id = u.id THEN a.id END) AS articles_created,
    COUNT(DISTINCT CASE WHEN a.author_id != u.id AND u.id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(a.contributors))) THEN a.id END) AS articles_contributed,
    COALESCE(SUM(a.view_count), 0) AS total_views,
    COALESCE(
        (COUNT(DISTINCT CASE WHEN a.author_id = u.id THEN a.id END) * 10) + 
        (COUNT(DISTINCT CASE WHEN a.author_id != u.id AND u.id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(a.contributors))) THEN a.id END) * 5) + 
        (SUM(a.view_count) * 0.1),
        0
    ) AS reputation_score
FROM
    public.users u
LEFT JOIN public.articles a ON u.id = a.author_id OR u.id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(a.contributors)))
GROUP BY u.id;

-- 3. Set appropriate permissions for the view
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;