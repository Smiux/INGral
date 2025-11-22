import { supabase } from '../lib/supabase';
import { UserProfile, Article } from '../types';

// 获取用户档案
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  // 添加重试逻辑
  const maxRetries = 2;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 检查supabase是否可用
      if (!supabase) {
        console.error('Supabase client is not available');
        if (attempt === maxRetries - 1) {
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      
      // 首先获取用户基本信息
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (userError || !userData) {
        console.error(`Attempt ${attempt + 1}: Error fetching user data:`, userError?.message || 'Unknown error');
        if (attempt === maxRetries - 1) {
          return null;
        }
        // 重试前等待一段时间
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }

      // 获取用户创建的文章 - 添加错误处理
      let createdArticles: Article[] = [];
      let articlesError = null;
      if (supabase) {
        const { data, error } = await supabase
          .from('articles')
          .select('id, view_count')
          .eq('author_id', userId);
        // 确保数据格式正确，满足Article接口要求
        createdArticles = (data || []).map(article => ({
          ...article,
          id: article.id,
          view_count: article.view_count,
          title: '',
          slug: '',
          content: '',
          author_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: [],
          status: 'published',
          visibility: 'public',
          allow_contributions: false
        }));
        articlesError = error;
      } else {
        console.error('Supabase client is not available');
      }
      
      if (articlesError) {
        console.error(`Attempt ${attempt + 1}: Error fetching created articles:`, articlesError.message);
        // 继续执行，使用空数组作为降级方案
      }

      // 获取用户贡献的文章 - 添加错误处理
      let contributedArticles: Article[] = [];
      let contributionsError = null;
      if (supabase) {
        const { data, error } = await supabase
        .from('articles')
        .select('id, view_count')
        .filter('contributors', 'cs', `{${userId}}`); // 使用contains操作符
      
      // 转换数据格式以匹配Article接口
      contributedArticles = (data || []).map(item => ({
        id: item.id,
        view_count: item.view_count,
        // 添加所有必要的字段以满足Article接口
        title: '',
        slug: '',
        content: '',
        author_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: [],
        status: 'published',
        visibility: 'public',
        allow_contributions: false
      }));
      contributionsError = error;
      } else {
        console.error('Supabase client is not available');
      }
      
      if (contributionsError) {
        console.error(`Attempt ${attempt + 1}: Error fetching contributed articles:`, contributionsError.message);
        // 继续执行，使用空数组作为降级方案
      }

      // 计算统计数据
      const articlesCreated = createdArticles?.length || 0;
      const articlesContributed = contributedArticles?.length || 0;
      
      // 计算总阅读量
      const totalViews = (
        (createdArticles?.reduce((sum, article) => sum + (article.view_count || 0), 0) || 0) +
        (contributedArticles?.reduce((sum, article) => sum + (article.view_count || 0), 0) || 0)
      );
      
      // 简单的声望分数计算（可以根据需要调整算法）
      const reputationScore = articlesCreated * 10 + articlesContributed * 5 + totalViews / 100;

      // 构建用户档案
      const profile: UserProfile = {
        id: userData.id,
        email: userData.email,
        username: userData.email.split('@')[0], // 简单地使用邮箱前缀作为用户名
        join_date: userData.created_at,
        articles_created: articlesCreated,
        articles_contributed: articlesContributed,
        total_views: totalViews,
        reputation_score: Math.round(reputationScore),
      };

      return profile;
    } catch (error) {
      console.error(`Attempt ${attempt + 1}: Error fetching user profile:`, error instanceof Error ? error.message : String(error));
      if (attempt === maxRetries - 1) {
        return null;
      }
      // 重试前等待一段时间
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return null;
}

// 获取用户创建的文章
export async function fetchUserArticles(userId: string): Promise<Article[]> {
  try {
    if (!supabase) {
      console.error('Supabase client is not available');
      return [];
    }
    
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user articles:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user articles:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

// 获取用户贡献的文章
export async function fetchUserContributions(userId: string): Promise<Article[]> {
  try {
    if (!supabase) {
      console.warn('Supabase is not available, returning empty results');
      return [];
    }
    // 简化实现，实际查询可能需要根据数据库结构调整
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .filter('contributors', 'cs', `{${userId}}`)
      .order('contribution_date', { ascending: false });

    if (error) {
      console.error('Error fetching user contributions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user contributions:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

// 更新用户档案（可选功能）
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'username' | 'bio' | 'avatar_url'>>
): Promise<boolean> {
  // 添加参数验证
  if (!userId) {
    console.error('updateUserProfile: userId is required');
    return false;
  }
  
  // 过滤掉undefined值，避免更新字段为null
  const validUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      (acc as Record<string, unknown>)[key] = value;
    }
    return acc;
  }, {} as typeof updates);
  
  // 如果没有有效更新，直接返回成功
  if (Object.keys(validUpdates).length === 0) {
    return true;
  }
  
  // 添加重试逻辑
  const maxRetries = 2;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (!supabase) {
        console.warn('Supabase is not available, skipping profile update');
        return false;
      }
      const { error } = await supabase
        .from('users')
        .update(validUpdates)
        .eq('id', userId);

      if (error) {
        console.error(`Attempt ${attempt + 1}: Error updating user profile:`, error.message);
        if (attempt === maxRetries - 1) {
          return false;
        }
        // 重试前等待一段时间
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }

      return true;
    } catch (error) {
      console.error(`Attempt ${attempt + 1}: Error updating user profile:`, error instanceof Error ? error.message : String(error));
      if (attempt === maxRetries - 1) {
        return false;
      }
      // 重试前等待一段时间
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return false;
}