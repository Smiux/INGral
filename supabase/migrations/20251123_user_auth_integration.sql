-- 用户认证系统整合迁移文件
-- 目的：将自定义users表与Supabase的auth.user表整合

-- 1. 修改users表，确保与auth.user正确关联
-- 检查主键约束是否已存在，避免删除依赖的约束
DO $$
BEGIN
  -- 检查主键是否已经是id列
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_pkey' 
    AND conrelid = 'users'::regclass
    AND contype = 'p'
  ) THEN
    -- 只在主键不存在时添加
    ALTER TABLE IF EXISTS users
      ADD PRIMARY KEY (id);
  END IF;
END $$;

-- 2. 添加外键约束，引用auth.users表
-- 检查外键约束是否已存在，避免重复创建
DO $$
BEGIN
  -- 检查users_auth_user_fkey约束是否已存在
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_auth_user_fkey' 
    AND conrelid = 'users'::regclass
    AND contype = 'f'
  ) THEN
    -- 只在约束不存在时添加
    ALTER TABLE IF EXISTS users
      ADD CONSTRAINT users_auth_user_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. 确保email字段在users表中是唯一的
-- 检查unique约束是否已存在，避免重复创建
DO $$
BEGIN
  -- 检查users_email_key约束是否已存在
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_key' 
    AND conrelid = 'users'::regclass
    AND contype = 'u'
  ) THEN
    -- 只在约束不存在时添加
    ALTER TABLE IF EXISTS users
      ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

-- 4. 创建用户同步触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- 当新用户注册时，在users表中创建对应记录
  INSERT INTO public.users (id, email, username, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SUBSTRING(NEW.email FROM 1 FOR POSITION('@' IN NEW.email) - 1)),
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建用户更新触发器函数
CREATE OR REPLACE FUNCTION public.handle_update_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 当auth.user表中的用户信息更新时，同步更新users表
  UPDATE public.users
  SET 
    email = NEW.email,
    username = COALESCE(NEW.raw_user_meta_data->>'username', users.username),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 创建用户删除触发器函数
CREATE OR REPLACE FUNCTION public.handle_delete_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 当auth.user表中的用户被删除时，删除users表中的对应记录
  -- 注意：由于已添加外键约束，可以依赖级联删除
  -- 这里保留此函数，以便将来可能需要的其他清理操作
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建触发器
-- 用户创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 用户更新触发器
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_update_user();

-- 用户删除触发器（如果需要额外处理，可以启用）
-- CREATE TRIGGER on_auth_user_deleted
--   BEFORE DELETE ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_delete_user();

-- 8. 创建视图，合并auth.user和users表的数据
-- 添加列的条件检查和创建
DO $$
BEGIN
  -- 检查bio列是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'bio'
  ) THEN
    ALTER TABLE users ADD COLUMN bio TEXT;
  END IF;
  
  -- 检查location列是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'location'
  ) THEN
    ALTER TABLE users ADD COLUMN location TEXT;
  END IF;
  
  -- 检查website列是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'website'
  ) THEN
    ALTER TABLE users ADD COLUMN website TEXT;
  END IF;
END $$;

-- 创建视图，确保所有列引用都有效
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  u.id,
  u.email,
  u.username,
  a.raw_user_meta_data->>'avatar_url' AS avatar_url,
  u.bio,
  u.location,
  u.website,
  u.created_at,
  u.updated_at,
  a.email_confirmed_at,
  a.last_sign_in_at
FROM public.users u
JOIN auth.users a ON u.id = a.id;

-- 9. 注意：PostgreSQL不支持对视图启用行级安全性
-- 视图的访问控制将通过底层表的RLS策略和函数权限来实现
-- 确保底层表的RLS策略正确配置

-- 10. 授权必要的权限
-- 允许authenticated角色执行handle_new_user函数
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_update_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_delete_user() TO authenticated;

-- 11. 更新现有RLS策略，确保与新的用户模型一致
-- 注意：这些更新应该谨慎执行，确保不会破坏现有功能

-- 为users表添加RLS策略（如果尚未添加）
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- 检查策略是否已存在
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update their own profile' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Users can update their own profile" ON public.users
      FOR UPDATE TO authenticated
      USING (id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Public can view user profiles' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Public can view user profiles" ON public.users
      FOR SELECT TO public
      USING (true);
  END IF;
END $$;

-- 12. 创建函数，用于在应用层获取完整的用户资料
CREATE OR REPLACE FUNCTION public.get_complete_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  email_confirmed_at TIMESTAMP,
  last_sign_in_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.user_profiles
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权执行该函数
GRANT EXECUTE ON FUNCTION public.get_complete_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_complete_user_profile(UUID) TO public;