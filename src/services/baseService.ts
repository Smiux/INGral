import { supabase } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseCache, QueryOptimizer, ConnectionManager } from '../utils/db-optimization';
import { errorService } from './errorService';

/**
 * 基础服务类，提供通用的数据库操作、缓存管理、事务处理和错误处理
 */
export abstract class BaseService {
  protected supabase: SupabaseClient = supabase;
  protected cache = new DatabaseCache();
  protected queryOptimizer = new QueryOptimizer();
  protected connectionManager = ConnectionManager.getInstance();

  /**
   * 检查 Supabase 客户端是否初始化
   */
  protected checkSupabaseClient(): void {
    if (!this.supabase) {
      throw new Error('Supabase client is not initialized');
    }
  }

  /**
   * 处理 Supabase 错误
   * @param error Supabase 错误对象
   * @param context 错误上下文
   * @param operation 操作描述
   */
  protected handleError(error: unknown, context: string = 'BaseService', operation: string): never {
    throw errorService.handleError(error, context, operation);
  }

  /**
   * 处理成功响应
   * @param data 响应数据
   * @param defaultData 默认数据（如果 data 为 null 或 undefined）
   */
  protected handleSuccessResponse<T>(data: T | null | undefined, defaultData: T): T {
    return data ?? defaultData;
  }

  /**
   * 生成 Slug
   * @param text 原始文本
   */
  protected generateSlug(text: string): string {
    return text.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * 应用分页
   * @param query Supabase 查询对象
   * @param limit 限制数量
   * @param offset 偏移量
   */
  protected applyPagination<T>(query: any, limit?: number, offset?: number): T {
    let paginatedQuery = query;
    
    // 应用限制
    if (limit && typeof paginatedQuery.limit === 'function') {
      paginatedQuery = paginatedQuery.limit(limit);
    }
    
    // 应用偏移量
    if (offset && offset > 0 && typeof paginatedQuery.range === 'function') {
      const end = offset + (limit || 100) - 1;
      paginatedQuery = paginatedQuery.range(offset, end);
    }
    
    return paginatedQuery as T;
  }

  /**
   * 获取缓存键
   * @param prefix 缓存前缀
   * @param id 唯一标识符
   */
  protected getCacheKey(prefix: string, id: string | number): string {
    return `${prefix}:${id}`;
  }

  /**
   * 获取列表缓存键
   * @param prefix 缓存前缀
   * @param params 查询参数
   */
  protected getListCacheKey(prefix: string, params?: Record<string, any>): string {
    const paramsStr = params ? JSON.stringify(params) : 'all';
    return `${prefix}:list:${paramsStr}`;
  }

  /**
   * 执行查询并缓存结果
   * @param cacheKey 缓存键
   * @param ttl 缓存过期时间
   * @param queryFn 查询函数
   */
  protected async queryWithCache<T>(cacheKey: string, ttl: number, queryFn: () => Promise<T>): Promise<T> {
    // 尝试从缓存获取
    const cachedData = this.cache.get<T>(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    // 执行查询
    const data = await queryFn();
    
    // 缓存结果
    this.cache.set<T>(cacheKey, data, ttl);
    console.log(`Cache set for ${cacheKey}`);
    
    return data;
  }

  /**
   * 执行带有重试逻辑的查询
   * @param queryFn 查询函数
   * @param ttl 缓存过期时间
   */
  protected async executeWithRetry<T>(queryFn: () => Promise<T>, ttl: number): Promise<T> {
    return this.queryOptimizer.executeWithRetry(queryFn, ttl);
  }

  /**
   * 开始事务
   */
  protected async startTransaction(): Promise<string> {
    return this.queryOptimizer.startTransaction();
  }

  /**
   * 提交事务
   * @param transactionId 事务ID
   */
  protected async commitTransaction(transactionId: string): Promise<void> {
    return this.queryOptimizer.commitTransaction(transactionId);
  }

  /**
   * 回滚事务
   */
  protected async rollbackTransaction(): Promise<void> {
    return this.queryOptimizer.rollbackTransaction();
  }

  /**
   * 清除缓存
   * @param pattern 缓存键模式
   */
  protected invalidateCache(pattern: string): void {
    this.cache.invalidatePattern(pattern);
    console.log(`Cache invalidated for pattern: ${pattern}`);
  }

  /**
   * 获取单个记录
   * @param table 表名
   * @param id 记录ID
   * @param cachePrefix 缓存前缀
   * @param ttl 缓存过期时间
   */
  protected async getById<T>(table: string, id: string | number, cachePrefix: string, ttl: number = 5 * 60 * 1000): Promise<T | null> {
    const cacheKey = this.getCacheKey(cachePrefix, id);
    
    return this.queryWithCache<T | null>(cacheKey, ttl, async () => {
      const result = await this.executeWithRetry(async () => {
        return this.supabase.from(table).select('*').eq('id', id).single<T>();
      }, ttl);
      
      return result.data;
    });
  }

  /**
   * 获取记录列表
   * @param table 表名
   * @param cachePrefix 缓存前缀
   * @param params 查询参数
   * @param ttl 缓存过期时间
   */
  protected async getList<T>(table: string, cachePrefix: string, params?: Record<string, any>, ttl: number = 5 * 60 * 1000): Promise<T[]> {
    const cacheKey = this.getListCacheKey(cachePrefix, params);
    
    return this.queryWithCache<T[]>(cacheKey, ttl, async () => {
      const result = await this.executeWithRetry(async () => {
        let query = this.supabase.from(table).select('*');
        
        // 应用查询参数
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            if (key === 'limit' || key === 'offset') continue;
            query = query.eq(key, value);
          }
          
          // 应用分页
          if (params.limit) {
            query = query.limit(params.limit);
          }
          
          if (params.offset) {
            query = query.range(params.offset, (params.offset + (params.limit || 100)) - 1);
          }
        }
        
        return query;
      }, ttl);
      
      return result.data || [];
    });
  }

  /**
   * 创建记录
   * @param table 表名
   * @param data 记录数据
   * @param cachePrefix 缓存前缀
   * @param ttl 缓存过期时间
   */
  protected async create<T>(table: string, data: any, cachePrefix: string, ttl: number = 5 * 60 * 1000): Promise<T | null> {
    const result = await this.executeWithRetry(async () => {
      return this.supabase.from(table).insert(data).select().single<T>();
    }, ttl);
    
    if (result.data) {
      // 清除相关缓存
      this.invalidateCache(`${cachePrefix}:list:*`);
    }
    
    return result.data;
  }

  /**
   * 更新记录
   * @param table 表名
   * @param id 记录ID
   * @param data 更新数据
   * @param cachePrefix 缓存前缀
   * @param ttl 缓存过期时间
   */
  protected async update<T>(table: string, id: string | number, data: any, cachePrefix: string, ttl: number = 5 * 60 * 1000): Promise<T | null> {
    const result = await this.executeWithRetry(async () => {
      return this.supabase.from(table).update(data).eq('id', id).select().single<T>();
    }, ttl);
    
    if (result.data) {
      // 清除相关缓存
      this.invalidateCache(`${cachePrefix}:id:${id}`);
      this.invalidateCache(`${cachePrefix}:list:*`);
    }
    
    return result.data;
  }

  /**
   * 删除记录
   * @param table 表名
   * @param id 记录ID
   * @param cachePrefix 缓存前缀
   */
  protected async delete(table: string, id: string | number, cachePrefix: string): Promise<boolean> {
    const result = await this.executeWithRetry(async () => {
      return this.supabase.from(table).delete().eq('id', id);
    }, 5 * 60 * 1000);
    
    if (result.error) {
      return false;
    }
    
    // 清除相关缓存
    this.invalidateCache(`${cachePrefix}:id:${id}`);
    this.invalidateCache(`${cachePrefix}:list:*`);
    
    return true;
  }
}
