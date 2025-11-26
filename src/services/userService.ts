import { supabase } from '../lib/supabase';
import { UserProfile, Article } from '../types';

/**
 * 基础用户信息接口
 */
export interface User {
  /** 用户唯一标识符 */
  id: string;
  /** 用户邮箱（可选） */
  email?: string;
  /** 用户显示名称（可选） */
  displayName?: string;
}

/**
 * 用户资料更新数据类型
 */
export type UserProfileUpdateData = Partial<Omit<UserProfile, 'id' | 'join_date' | 'articles_created' | 'articles_contributed' | 'total_views' | 'reputation_score'>>;

/**
 * 用户服务类，提供统一的用户数据访问接口
 * 整合auth.user和users表的数据，包含缓存机制和超时处理
 */
export class UserService {
  /** 单例实例 */
  private static instance: UserService;
  /** 内存缓存，存储用户相关数据 */
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  /** 缓存有效期（毫秒），默认5分钟 */
  private cacheDuration = 5 * 60 * 1000;

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor() {}

  /**
   * 获取UserService单例实例
   * @returns {UserService} UserService实例
   */
  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * 从缓存获取数据
   * @template T 缓存数据类型
   * @param {string} key 缓存键
   * @returns {T | null} 缓存的数据，如果不存在或已过期则返回null
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data as T;
    }
    // 缓存已过期，删除并返回null
    this.cache.delete(key);
    return null;
  }

  /**
   * 设置缓存数据
   * @template T 缓存数据类型
   * @param {string} key 缓存键
   * @param {T} data 要缓存的数据
   */
  private setCached<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 清除用户相关缓存
   * @param {string} [userId] 用户ID，可选。如果提供则只清除该用户的缓存，否则清除所有用户缓存
   */
  clearUserCache(userId?: string): void {
    if (userId) {
      // 清除特定用户的缓存
      this.cache.forEach((_, key) => {
        if (key.includes(`user_${userId}`)) {
          this.cache.delete(key);
        }
      });
    } else {
      // 清除所有用户相关缓存
      this.cache.forEach((_, key) => {
        if (key.includes('user_')) {
          this.cache.delete(key);
        }
      });
    }
  }

  /**
   * 根据用户ID获取用户完整资料
   * @param {string} userId 用户ID
   * @param {boolean} [forceRefresh=false] 是否强制刷新（忽略缓存）
   * @returns {Promise<UserProfile | null>} 用户完整资料，获取失败则返回null
   */
  async getUserProfile(userId: string, forceRefresh: boolean = false): Promise<UserProfile | null> {
    const cacheKey = `user_profile_${userId}`;
    const localStorageKey = `user_profile_${userId}`;
    
    try {
      console.log('Getting user profile:', userId, 'forceRefresh:', forceRefresh);
      
      // 1. 首先尝试从内存缓存获取，除非强制刷新
      if (!forceRefresh) {
        const cachedProfile = this.getCached<UserProfile>(cacheKey);
        if (cachedProfile) {
          console.log('Returning cached profile for user:', userId);
          return cachedProfile;
        }
      }
      
      // 2. 然后尝试从本地存储获取，除非强制刷新
      if (!forceRefresh) {
        try {
          const localStorageProfile = localStorage.getItem(localStorageKey);
          if (localStorageProfile) {
            const parsedProfile = JSON.parse(localStorageProfile) as UserProfile;
            console.log('Returning profile from local storage for user:', userId);
            // 同时更新内存缓存
            this.setCached(localStorageKey, parsedProfile);
            return parsedProfile;
          }
        } catch (parseError) {
          console.error('Failed to parse profile from local storage:', parseError);
        }
      }
      
      // 3. 如果没有缓存，尝试从数据库获取，但设置超时限制
      if (!supabase) {
        // 如果Supabase未初始化，返回默认资料
        console.warn('Supabase client not initialized, returning default profile');
        return this.getDefaultUserProfile(userId);
      }

      // 使用超时机制，避免长时间阻塞
      const dbTimeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Database query timeout'));
        }, 2000); // 2秒超时
      });

      // 尝试从数据库获取资料
      try {
        // 从视图中获取用户资料
        let dbData: Partial<UserProfile> | null = null;
        let dbError: { message: string } | null = null;
        
        // 先尝试从user_profiles视图获取
        try {
          const viewResult = await Promise.race([
            supabase
              .from('user_profiles')
              .select('*')
              .eq('id', userId)
              .single(),
            dbTimeoutPromise
          ]);
          if (viewResult) {
            dbData = viewResult.data;
            dbError = viewResult.error;
          } else {
            dbError = { message: 'Database query timeout' };
          }
        } catch (viewErr) {
          console.log('View query failed or timed out, attempting direct table access:', viewErr instanceof Error ? viewErr.message : 'Unknown error');
          dbError = { message: viewErr instanceof Error ? viewErr.message : 'Unknown error' };
        }

        if (dbError || !dbData) {
          console.log('Attempting to get profile directly from users table');
          
          // 尝试直接从users表查询，但同样设置超时
          try {
            const tableResult = await Promise.race([
              supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single(),
              dbTimeoutPromise
            ]);
            if (tableResult) {
              dbData = tableResult.data;
              dbError = tableResult.error;
            } else {
              dbError = { message: 'Database query timeout' };
            }
          } catch (tableErr) {
            console.log('Table query also failed or timed out:', tableErr instanceof Error ? tableErr.message : 'Unknown error');
            dbError = { message: tableErr instanceof Error ? tableErr.message : 'Unknown error' };
          }
          
          if (dbError || !dbData) {
          console.log('Failed to retrieve user profile from database, returning default profile');
          return this.getDefaultUserProfile(userId);
        }
        }

        if (dbData) {
          // 确保数值字段有默认值
          const processedProfileData: UserProfile = {
            ...dbData as UserProfile,
            articles_created: (dbData as UserProfile).articles_created || 0,
            articles_contributed: (dbData as UserProfile).articles_contributed || 0,
            total_views: (dbData as UserProfile).total_views || 0,
            reputation_score: (dbData as UserProfile).reputation_score || 0
          };
          
          // 设置缓存
          this.setCached(cacheKey, processedProfileData);
          // 同时保存到本地存储
          try {
            localStorage.setItem(localStorageKey, JSON.stringify(processedProfileData));
          } catch (storageError) {
            console.warn('Failed to save profile to local storage:', storageError);
          }
          console.log('User profile retrieved and cached:', userId);
          
          return processedProfileData;
        }
      } catch (dbError) {
        console.error('Database query failed:', dbError);
        // 数据库查询失败，返回默认资料
        return this.getDefaultUserProfile(userId);
      }
      
      // 所有尝试都失败了，返回默认资料
      return this.getDefaultUserProfile(userId);
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      // 出错时返回默认资料
      return this.getDefaultUserProfile(userId);
    }
  }
  
  /**
   * 获取默认用户资料
   * @param {string} userId 用户ID
   * @returns {UserProfile} 默认用户资料
   */
  private getDefaultUserProfile(userId: string): UserProfile {
    // 创建完整的用户资料对象，包含所有UserProfile必需字段
    const defaultProfile: UserProfile = {
      id: userId,
      email: '',
      username: `user_${userId.substring(0, 8)}`,
      bio: '',
      avatar_url: '',
      join_date: new Date().toISOString(),
      articles_created: 0,
      articles_contributed: 0,
      total_views: 0,
      reputation_score: 0
    };
    
    // 缓存默认资料到本地存储
    try {
      localStorage.setItem(`user_profile_${userId}`, JSON.stringify(defaultProfile));
    } catch (storageError) {
      console.warn('Failed to save default profile to local storage:', storageError);
    }
    
    return defaultProfile;
  }

  /**
   * 更新用户资料
   * @param {string} userId 用户ID
   * @param {UserProfileUpdateData} profileData 要更新的用户资料数据
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateUserProfile(
    userId: string,
    profileData: UserProfileUpdateData
  ): Promise<boolean> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // 更新users表中的扩展信息
      const { error } = await supabase
        .from('users')
        .update(profileData)
        .eq('id', userId);

      if (error) {
        console.error('Failed to update user profile:', error);
        return false;
      }

      // 清除缓存和本地存储
      this.clearUserCache(userId);
      // 清除本地存储中的旧数据
      const localStorageKey = `user_profile_${userId}`;
      localStorage.removeItem(localStorageKey);
      return true;
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      return false;
    }
  }

  /**
   * 获取用户创建的文章
   * @param {string} userId 用户ID
   * @returns {Promise<Article[]>} 用户创建的文章列表
   */
  async getUserArticles(userId: string): Promise<Article[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      const cacheKey = `user_articles_${userId}`;
      const cachedArticles = this.getCached<Article[]>(cacheKey);
      if (cachedArticles) {
        return cachedArticles;
      }

      // 查询用户创建的文章
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch user articles:', error);
        return [];
      }

      const articles = data || [];
      this.setCached(cacheKey, articles);
      return articles;
    } catch (error) {
      console.error('Error in getUserArticles:', error);
      return [];
    }
  }

  /**
   * 获取用户贡献的文章
   * @param userId 用户ID
   * @returns 用户贡献的文章列表
   */
  async getUserContributions(userId: string): Promise<Article[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      const cacheKey = `user_contributions_${userId}`;
      const cachedContributions = this.getCached<Article[]>(cacheKey);
      if (cachedContributions) {
        return cachedContributions;
      }

      // 查询用户贡献的文章
      // 文章贡献者信息存储在articles表的contributors字段中（JSONB类型）
      // 使用PostgREST的'cs'操作符（contains）查询JSONB数组中是否包含特定用户ID
      const { data, error } = await supabase
      .from('articles')
      .select('*')
      .filter('contributors', 'cs', `["${userId}"]`)
      .order('contribution_date', { ascending: false });

      if (error) {
        console.error('Failed to fetch user contributions:', error);
        return [];
      }

      // 直接返回文章数据，不需要额外提取
      const articles = data || [];
      this.setCached(cacheKey, articles);
      return articles;
    } catch (error) {
      console.error('Error in getUserContributions:', error);
      return [];
    }
  }

  /**
   * 确保用户资料存在
   * 在用户登录或注册后调用，确保users表中有对应的记录
   * @param user 用户信息
   * @returns 是否成功
   */
  async ensureUserExists(user: User): Promise<boolean> {
    // 添加超时机制，防止长时间等待
    const timeout = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timed out')), 10000)
    );
    
    try {
      console.log('Ensuring user exists:', user.id);
      
      if (!supabase) {
        console.warn('Supabase client is not initialized, storing user info locally');
        // 即使Supabase未初始化，也在本地存储用户信息
        try {
          localStorage.setItem(`user_${user.id}`, JSON.stringify(user));
          return true;
        } catch (storageError) {
          console.error('Failed to store user info locally:', storageError);
          return false;
        }
      }

      // 使用Promise.race实现超时控制和重试逻辑
      const result = await Promise.race([
        (async () => {
          let attempts = 0;
          const maxAttempts = 2;
          
          while (attempts < maxAttempts) {
            try {
              attempts++;
              // 检查用户是否已经存在
              const { data, error } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .single();

              if (error) {
                // 如果是"找不到记录"的错误，继续处理
                if (error.code === 'PGRST116') {
                  console.log('User not found, will create:', user.id);
                } else {
                  // 区分网络错误和其他错误
                  if (error.message && (error.message.includes('Network') || error.message.includes('fetch'))) {
                    if (attempts < maxAttempts) {
                      console.warn(`Network error checking user, retrying (${attempts}/${maxAttempts})...`);
                      await new Promise(resolve => setTimeout(resolve, 500 * attempts));
                      continue;
                    }
                    console.error('Network error checking user:', error);
                    // 网络错误时，尝试本地存储
                    this.storeUserLocally(user);
                    return true; // 即使网络失败，也返回成功以便应用继续运行
                  }
                  console.error('Failed to check if user exists:', error);
                  return false;
                }
              }

              // 如果用户存在，更新本地存储
              if (data) {
                this.storeUserLocally(user);
                return true;
              }

              // 如果用户不存在，则创建
              const username = user.email ? user.email.split('@')[0] : `user_${user.id.slice(0, 8)}`; 
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: user.id,
                  email: user.email || null,
                  username,
                  bio: '',
                  avatar_url: '',
                });

              if (insertError) {
                // 区分网络错误和其他错误
                if (insertError.message && (insertError.message.includes('Network') || insertError.message.includes('fetch'))) {
                  if (attempts < maxAttempts) {
                    console.warn(`Network error creating user, retrying (${attempts}/${maxAttempts})...`);
                    await new Promise(resolve => setTimeout(resolve, 500 * attempts));
                    continue;
                  }
                  console.error('Network error creating user:', insertError);
                  // 网络错误时，尝试本地存储
                  this.storeUserLocally(user);
                  return true;
                }
                console.error('Failed to create user record:', insertError);
                return false;
              }
              
              console.log('Created new user:', user.id);
              this.storeUserLocally(user);
              return true;
            } catch (err) {
              // 捕获网络异常进行重试
              if ((err as Error).name === 'TypeError' && (err as Error).message.includes('Failed to fetch')) {
                if (attempts < maxAttempts) {
                  console.warn(`Network fetch error, retrying (${attempts}/${maxAttempts})...`);
                  await new Promise(resolve => setTimeout(resolve, 500 * attempts));
                  continue;
                }
                console.error('Network fetch error:', err);
                // 网络错误时，尝试本地存储
                this.storeUserLocally(user);
                return true;
              }
              console.error('Exception in ensureUserExists:', err);
              throw err;
            }
          }
          
          // 所有重试都失败，但尝试本地存储
          this.storeUserLocally(user);
          return true;
        })(),
        timeout
      ]);
      
      return result;
    } catch (error) {
      console.error('Error in ensureUserExists:', error);
      // 即使超时或发生其他错误，也尝试在本地存储用户信息
      this.storeUserLocally(user);
      return true; // 返回true以便应用可以继续运行
    }
  }
  
  /**
   * 本地存储用户信息
   */
  private storeUserLocally(user: User): void {
    try {
      localStorage.setItem(`user_${user.id}`, JSON.stringify(user));
      console.log('User info stored locally:', user.id);
    } catch (storageError) {
      console.warn('Failed to store user info locally:', storageError);
    }
  }

  /**
   * 获取用户列表（支持分页）
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 用户列表
   */
  async getUsers(limit = 20, offset = 0): Promise<UserProfile[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // 尝试从缓存获取
      const cacheKey = `users_list_${limit}_${offset}`;
      const cachedUsers = this.getCached<UserProfile[]>(cacheKey);
      if (cachedUsers) {
        return cachedUsers;
      }

      // 获取用户列表
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.error('Failed to get users list:', error);
        return [];
      }

      // 设置缓存
      this.setCached(cacheKey, data);
      return data as UserProfile[];
    } catch (error) {
      console.error('Error in getUsers:', error);
      return [];
    }
  }

  /**
   * 搜索用户
   * @param query 搜索关键词
   * @param limit 限制数量
   * @returns 匹配的用户列表
   */
  async searchUsers(query: string, limit = 10): Promise<UserProfile[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // 尝试从缓存获取
      const cacheKey = `users_search_${query}_${limit}`;
      const cachedResults = this.getCached<UserProfile[]>(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }

      // 搜索用户
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(limit);

      if (error || !data) {
        console.error('Failed to search users:', error);
        return [];
      }

      // 设置缓存
      this.setCached(cacheKey, data);
      return data as UserProfile[];
    } catch (error) {
      console.error('Error in searchUsers:', error);
      return [];
    }
  }

  /**
   * 获取用户统计信息
   * @returns 用户统计信息
   */
  async getUserStatistics(): Promise<{ totalUsers: number; newUsersToday: number } | null> {
    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // 获取总用户数
      const { error: totalError, count } = await supabase
        .from('users')
        .select('id', { count: 'exact' });

      if (totalError) {
        console.error('Failed to get total users count:', totalError);
        return null;
      }

      // 获取今日新增用户数
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData, error: todayError } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .gte('created_at', today);

      if (todayError) {
        console.error('Failed to get today\'s new users count:', todayError);
        return null;
      }

      return {
        totalUsers: typeof count === 'number' ? count : 0,
        newUsersToday: todayData ? todayData.length : 0,
      };
    } catch (error) {
      console.error('Error in getUserStatistics:', error);
      return null;
    }
  }
}

// 导出单例实例
export const userService = UserService.getInstance();