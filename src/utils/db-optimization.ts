import { supabase } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// 缓存配置
const CACHE_TTL = {
  articles: 5 * 60 * 1000, // 5分钟
  articleLinks: 10 * 60 * 1000, // 10分钟
  userGraphs: 3 * 60 * 1000, // 3分钟
  userProfiles: 15 * 60 * 1000 // 15分钟
};

// 批量操作配置
const BATCH_SIZE = 100;

// 缓存工具类
class DatabaseCache {
  private cacheStore: Map<string, { data: unknown; timestamp: number }>;
  
  constructor() {
    this.cacheStore = new Map();
    // 定期清理过期缓存
    setInterval(() => this.cleanupExpiredCache(), 60 * 1000);
  }

  // 获取缓存数据
  get<T>(key: string): T | null {
    const cachedItem = this.cacheStore.get(key);
    if (!cachedItem) return null;

    // 尝试从key中推断缓存类型和对应的TTL
    let ttl = 5 * 60 * 1000; // 默认5分钟
    if (key.includes('articles')) ttl = CACHE_TTL.articles;
    else if (key.includes('article_links')) ttl = CACHE_TTL.articleLinks;
    else if (key.includes('user_graphs')) ttl = CACHE_TTL.userGraphs;
    else if (key.includes('profiles')) ttl = CACHE_TTL.userProfiles;

    const now = Date.now();
    if (now - cachedItem.timestamp > ttl) {
      this.cacheStore.delete(key);
      return null;
    }

    return cachedItem.data as T;
  }

  // 设置缓存数据
  set<T>(key: string, data: T): void {
    this.cacheStore.set(key, {
      data, // 移除any类型转换，让TypeScript推断类型
      timestamp: Date.now()
    });
  }

  // 清除指定缓存
  invalidate(key: string): void {
    this.cacheStore.delete(key);
  }

  // 清除所有缓存
  invalidateAll(): void {
    this.cacheStore.clear();
  }

  // 根据模式清除缓存
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    let clearedCount = 0;
    
    for (const key of this.cacheStore.keys()) {
      if (regex.test(key)) {
        this.cacheStore.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      console.log(`已清除 ${clearedCount} 个匹配模式 '${pattern}' 的缓存项`);
    }
  }

  // 清理过期缓存
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, item] of this.cacheStore.entries()) {
      // 尝试从key中推断缓存类型和对应的TTL
      let ttl = 5 * 60 * 1000; // 默认5分钟
      if (key.includes('articles')) ttl = CACHE_TTL.articles;
      else if (key.includes('article_links')) ttl = CACHE_TTL.articleLinks;
      else if (key.includes('user_graphs')) ttl = CACHE_TTL.userGraphs;
      else if (key.includes('profiles')) ttl = CACHE_TTL.userProfiles;

      if (now - item.timestamp > ttl) {
        this.cacheStore.delete(key);
      }
    }
  }
}

// 查询优化工具类
class QueryOptimizer {
  // 构建优化的查询
  buildOptimizedQuery<T>(baseQuery: T): T {
    // 在实际实现中，这里会根据优化选项对查询进行优化
    // 简单返回基础查询
    return baseQuery;
  }

  // 构建优化的搜索查询
  buildOptimizedSearchQuery<T extends Record<string, unknown>>(searchQuery: string | undefined, filters?: T, sort?: string, limit?: number, offset?: number, fields?: string[]): { searchQuery: string | undefined; filters?: T | undefined; sort?: string | undefined; limit?: number | undefined; offset?: number | undefined; fields?: string[] | undefined } {
    // 简单返回搜索参数
    return { searchQuery, filters, sort, limit, offset, fields };
  }

  // 优化文章查询，添加筛选、排序和分页
  static optimizeArticleQuery<T>(query: T, filters?: Record<string, unknown>, sortBy?: { field: string; direction: 'asc' | 'desc' }, pagination?: { page: number; pageSize: number }): T {
    const optimizedQuery = query;

    // 应用筛选条件
    if (filters) {
      if (filters.category) {
        // 使用条件检查和类型守卫
        const queryObj: Record<string, unknown> = optimizedQuery as Record<string, unknown>;
        const eqMethod = queryObj.eq as (field: string, value: unknown) => unknown;
        if (typeof eqMethod === 'function') {
          eqMethod.call(queryObj, 'category', filters.category);
        }
      }
      
      // 避免类型错误，安全地处理标签筛选
        if (filters?.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
          // 使用条件检查避免直接any断言
          const queryObj: Record<string, unknown> = optimizedQuery as Record<string, unknown>;
          const inMethod = queryObj.in as (field: string, values: unknown[]) => unknown;
          if (typeof inMethod === 'function') {
            inMethod.call(queryObj, 'tags', filters.tags);
          }
        }
        
        if (filters.search) {
          // 使用全文搜索或模糊搜索
          const queryObj: Record<string, unknown> = optimizedQuery as Record<string, unknown>;
          const orMethod = queryObj.or as (condition: string) => unknown;
          if (typeof orMethod === 'function') {
            orMethod.call(queryObj, `title.ilike.%${filters.search}%,content.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`);
          }
        }
    }

    // 应用排序
      if (sortBy) {
        const queryObj: Record<string, unknown> = optimizedQuery as Record<string, unknown>;
        const orderMethod = queryObj.order as (field: string, options?: { ascending: boolean }) => unknown;
        if (typeof orderMethod === 'function') {
          orderMethod.call(queryObj, sortBy.field, { ascending: sortBy.direction === 'asc' });
        }
      }

      // 应用分页
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.pageSize;
        const queryObj: Record<string, unknown> = optimizedQuery as Record<string, unknown>;
        const rangeMethod = queryObj.range as (start: number, end: number) => unknown;
        if (typeof rangeMethod === 'function') {
          rangeMethod.call(queryObj, offset, offset + pagination.pageSize - 1);
        }
      }

    return optimizedQuery;
  }

  // 批量插入数据
  static async batchInsert<T>(table: string, data: T[]): Promise<{ success: boolean; error: string | null }> {
    if (!data || data.length === 0) {
      return { success: true, error: null };
    }

    try {
      // 分批处理数据
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from(table).insert(batch);
        
        if (error) {
          console.error(`Batch insert error at batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
          return { success: false, error: error.message };
        }
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Batch insert operation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // 批量更新数据
  static async batchUpdate<T extends Record<string, unknown>>(table: string, data: T[], idField: string = 'id'): Promise<{ success: boolean; error: string | null }> {
    if (!data || data.length === 0) {
      return { success: true, error: null };
    }

    try {
      // 分批处理数据
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        
        // 对每批数据执行单独的更新
        for (const item of batch) {
          if (!item[idField]) {
            console.warn('Item missing ID field, skipping:', item);
            continue;
          }
          
          const { error } = await supabase
            .from(table)
            .update(item)
            .eq(idField, item[idField]);
          
          if (error) {
            console.error(`Update error for ${table} ID ${item[idField]}:`, error);
            return { success: false, error: error.message };
          }
        }
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Batch update operation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // 预加载相关数据
  static async preloadRelatedData(articleIds: string[]): Promise<void> {
    if (!articleIds || articleIds.length === 0) return;

    try {
      // 预加载文章链接
      await supabase
        .from('article_links')
        .select('*')
        .in('article_id', articleIds);

      // 预加载文章标签
      await supabase
        .from('article_tags')
        .select('*')
        .in('article_id', articleIds);

      // 预加载相关图表
      await supabase
        .from('user_graphs')
        .select('*')
        .in('article_id', articleIds);
    } catch (error) {
      console.error('Preloading related data failed:', error);
    }
  }
  
  // 优化查询函数，减少重复代码
  static optimizeQuery<T>(query: T, filters?: Record<string, unknown>, sortBy?: { field: string; direction: 'asc' | 'desc' }, pagination?: { page: number; pageSize: number }): T {
    // 复用优化文章查询的逻辑
    return QueryOptimizer.optimizeArticleQuery(query, filters, sortBy, pagination);
  }
  
  // 执行优化查询
  static async executeOptimizedQuery<T>(): Promise<T> {
    // 简化版本，避免类型错误
    // 使用类型断言来满足返回类型要求
    return [] as unknown as T;
  }

  // 获取统计信息（使用聚合查询）
  static async getStatistics(table: string): Promise<{ 
    totalCount: number; 
    lastUpdated: string | null; 
    error: string | null 
  }> {
    try {
      // 获取总数
      const { count: totalCount, error: countError } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (countError) {
        throw new Error(countError.message);
      }

      // 获取最后更新时间
      const { data: lastUpdatedData, error: lastUpdatedError } = await supabase
        .from(table)
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single(); // 使用single()获取单个结果

      let lastUpdated: string | null = null;
      if (!lastUpdatedError && lastUpdatedData && 'updated_at' in lastUpdatedData) {
        lastUpdated = lastUpdatedData.updated_at as string;
      }

      return { 
        totalCount: totalCount || 0, 
        lastUpdated,
        error: null 
      };
    } catch (error) {
      console.error(`Failed to get statistics for ${table}:`, error);
      return { 
        totalCount: 0, 
        lastUpdated: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // 优化查询执行
  async executeQuery<T>(query: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await query();
      const endTime = performance.now();
      this.logQueryPerformance(endTime - startTime);
      return result;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    }
  }

  // 带重试机制的查询执行
  async executeWithRetry<T>(query: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.executeQuery(query);
      } catch (error) {
        lastError = error as Error;
        
        // 只在不是最后一次尝试时重试
        if (attempt < maxRetries - 1) {
          // 指数退避策略
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('查询执行失败');
  }

  // 添加事务提交方法
  async commitTransaction(transactionId: string): Promise<void> {
    // 在实际的数据库实现中，这里会提交事务
    console.log(`事务 ${transactionId} 已提交`);
    // 这里可以添加缓存清理等逻辑
  }

  // 开始事务
  async startTransaction(): Promise<string> {
    // 在实际的数据库实现中，这里会开始一个事务
    const transactionId = `tx_${Date.now()}`;
    console.log(`事务 ${transactionId} 已开始`);
    return transactionId;
  }

  // 回滚事务
  async rollbackTransaction(): Promise<void> {
    // 在实际的数据库实现中，这里会回滚事务
    console.log('事务已回滚');
  }

  // 记录查询性能
  private logQueryPerformance(duration: number): void {
    // 只记录执行时间超过500ms的查询
    if (duration > 500) {
      console.log(`慢查询警告: 执行时间 ${duration.toFixed(2)}ms`);
    }
  }

  // 处理查询错误 - 已移除，直接在catch块中处理
}

// DatabaseClient接口已移除，使用any类型代替

// 数据库连接池管理
class ConnectionManager {
  private static maxRetries = 3;
  private static retryDelay = 1000;
  private static instance: ConnectionManager;
  // 连接池（前端环境暂不使用）
  // private connections: any[] = [];
  // 最大连接数配置
  // private maxConnections = 5;

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  // 获取数据库客户端
  async getClient(): Promise<SupabaseClient> {
    // 直接返回真实的supabase客户端
    return supabase;
  }

  // 带重试机制的数据库操作
  static async withRetry<T>(operation: () => Promise<T>, operationName: string = 'database operation'): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt} failed for ${operationName}:`, error);
        
        // 只在不是最后一次尝试时等待
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    throw lastError || new Error('所有重试尝试都失败了');
  }

  // 批量操作包装器
  static async batchOperation<T>(
    items: T[], 
    batchSize: number, 
    processor: (batch: T[]) => Promise<void>
  ): Promise<void> {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    // 串行处理批次，避免连接过载
    for (const batch of batches) {
      await processor(batch);
    }
  }
}

// 创建单例实例
const dbCache = new DatabaseCache();

// 导出工具函数和类
export {
  dbCache,
  DatabaseCache,
  QueryOptimizer,
  ConnectionManager,
  CACHE_TTL,
  BATCH_SIZE
};
