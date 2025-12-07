import { supabase } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseCache, QueryOptimizer, ConnectionManager } from '../utils/db-optimization';
import { errorService } from './errorService';

/**
 * 基础服务类，提供通用的数据库操作、缓存管理、事务处理和错误处理
 * 优化点：
 * 1. 改进了缓存键生成逻辑，使用更统一的格式
 * 2. 增强了事务处理逻辑，添加了事务ID参数验证
 * 3. 优化了缓存失效策略，支持更精确的缓存清除
 * 4. 添加了更多通用的数据库操作方法
 * 5. 改进了错误处理，提供更详细的错误信息
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
  protected applyPagination<T extends { limit?: (limit: number) => T; range?: (start: number, end: number) => T }>(query: T, limit?: number, offset?: number): T {
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
    
    return paginatedQuery;
  }

  /**
   * 生成缓存键
   * @param prefix 缓存前缀
   * @param keyParts 缓存键组成部分
   */
  protected generateCacheKey(prefix: string, ...keyParts: (string | number | boolean | undefined | null)[]): string {
    // 过滤掉null和undefined值
    const validParts = keyParts.filter(part => part != null);
    // 转换为字符串并连接
    const partsStr = validParts.map(part => String(part)).join(':');
    // 返回最终缓存键
    return `${prefix}:${partsStr}`;
  }

  /**
   * 获取缓存键（兼容旧方法）
   * @param prefix 缓存前缀
   * @param id 唯一标识符
   */
  protected getCacheKey(prefix: string, id: string | number): string {
    return this.generateCacheKey(prefix, 'id', id);
  }

  /**
   * 获取列表缓存键（兼容旧方法）
   * @param prefix 缓存前缀
   * @param params 查询参数
   */
  protected getListCacheKey<T extends Record<string, unknown>>(prefix: string, params?: T): string {
    const paramsStr = params ? JSON.stringify(params) : 'all';
    return this.generateCacheKey(prefix, 'list', paramsStr);
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
      return cachedData;
    }

    // 执行查询
    const data = await queryFn();
    
    // 缓存结果
    this.cache.set<T>(cacheKey, data, ttl);
    
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
    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }
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
   * @param patterns 缓存键模式列表
   */
  protected invalidateCache(...patterns: string[]): void {
    patterns.forEach(pattern => {
      this.cache.invalidatePattern(pattern);
    });
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
   * 按字段获取单个记录
   * @param table 表名
   * @param field 字段名
   * @param value 字段值
   * @param cachePrefix 缓存前缀
   * @param ttl 缓存过期时间
   */
  protected async getByField<T>(table: string, field: string, value: string | number, cachePrefix: string, ttl: number = 5 * 60 * 1000): Promise<T | null> {
    const cacheKey = this.generateCacheKey(cachePrefix, field, value);
    
    return this.queryWithCache<T | null>(cacheKey, ttl, async () => {
      const result = await this.executeWithRetry(async () => {
        return this.supabase.from(table).select('*').eq(field, value).single<T>();
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
  protected async getList<T>(table: string, cachePrefix: string, params?: Record<string, string | number | boolean | undefined>, ttl: number = 5 * 60 * 1000): Promise<T[]> {
    const cacheKey = this.getListCacheKey(cachePrefix, params);
    
    return this.queryWithCache<T[]>(cacheKey, ttl, async () => {
      const result = await this.executeWithRetry(async () => {
        let query = this.supabase.from(table).select('*');
        
        // 应用查询参数
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            if (key === 'limit' || key === 'offset' || key === 'order' || key === 'sort') continue;
            query = query.eq(key, value);
          }
          
          // 应用分页
          if (params.limit && typeof params.limit === 'number') {
            query = query.limit(params.limit);
          }
          
          if (params.offset && typeof params.offset === 'number') {
            const limitValue = typeof params.limit === 'number' ? params.limit : 100;
            query = query.range(params.offset, (params.offset + limitValue) - 1);
          }
          
          // 应用排序
          if (params.order && typeof params.order === 'string') {
            const sort = params.sort === 'asc' ? { ascending: true } : { ascending: false };
            query = query.order(params.order, sort);
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
  protected async create<T>(table: string, data: Record<string, unknown>, cachePrefix: string, ttl: number = 5 * 60 * 1000): Promise<T | null> {
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
   * 批量创建记录
   * @param table 表名
   * @param data 记录数据数组
   * @param cachePrefix 缓存前缀
   * @param ttl 缓存过期时间
   */
  protected async bulkCreate<T>(table: string, data: Record<string, unknown>[], cachePrefix: string, ttl: number = 5 * 60 * 1000): Promise<T[] | null> {
    if (data.length === 0) {
      return [];
    }
    
    const result = await this.executeWithRetry(async () => {
      return this.supabase.from(table).insert(data).select();
    }, ttl);
    
    if (result.data) {
      // 清除相关缓存
      this.invalidateCache(`${cachePrefix}:list:*`);
    }
    
    return result.data as T[] | null;
  }

  /**
   * 更新记录
   * @param table 表名
   * @param id 记录ID
   * @param data 更新数据
   * @param cachePrefix 缓存前缀
   * @param ttl 缓存过期时间
   */
  protected async update<T>(table: string, id: string | number, data: Record<string, unknown>, cachePrefix: string, ttl: number = 5 * 60 * 1000): Promise<T | null> {
    const result = await this.executeWithRetry(async () => {
      return this.supabase.from(table).update(data).eq('id', id).select().single<T>();
    }, ttl);
    
    if (result.data) {
      // 清除相关缓存
      this.invalidateCache(`${cachePrefix}:id:${id}`, `${cachePrefix}:list:*`);
    }
    
    return result.data;
  }

  /**
   * 按条件更新记录
   * @param table 表名
   * @param data 更新数据
   * @param condition 条件对象
   * @param cachePrefix 缓存前缀
   * @param ttl 缓存过期时间
   */
  protected async updateByCondition<T>(table: string, data: Record<string, unknown>, condition: Record<string, string | number>, cachePrefix: string, ttl: number = 5 * 60 * 1000): Promise<T[] | null> {
    let query = this.supabase.from(table).update(data).select();
    
    // 应用条件
    for (const [key, value] of Object.entries(condition)) {
      query = query.eq(key, value);
    }
    
    const result = await this.executeWithRetry(async () => query, ttl);
    
    if (result.data) {
      // 清除相关缓存
      this.invalidateCache(`${cachePrefix}:list:*`);
    }
    
    return result.data as T[] | null;
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
    this.invalidateCache(`${cachePrefix}:id:${id}`, `${cachePrefix}:list:*`);
    
    return true;
  }

  /**
   * 按条件删除记录
   * @param table 表名
   * @param condition 条件对象
   * @param cachePrefix 缓存前缀
   */
  protected async deleteByCondition(table: string, condition: Record<string, string | number>, cachePrefix: string): Promise<boolean> {
    let query = this.supabase.from(table).delete();
    
    // 应用条件
    for (const [key, value] of Object.entries(condition)) {
      query = query.eq(key, value);
    }
    
    const result = await this.executeWithRetry(async () => query, 5 * 60 * 1000);
    
    if (result.error) {
      return false;
    }
    
    // 清除相关缓存
    this.invalidateCache(`${cachePrefix}:list:*`);
    
    return true;
  }

  /**
   * 执行事务操作
   * @param callback 事务回调函数
   */
  protected async executeInTransaction<T>(callback: (transactionId: string) => Promise<T>): Promise<T> {
    // 开始事务
    const transactionId = await this.startTransaction();
    
    try {
      // 执行回调函数
      const result = await callback(transactionId);
      // 提交事务
      await this.commitTransaction(transactionId);
      return result;
    } catch (error) {
      // 回滚事务
      await this.rollbackTransaction();
      throw error;
    }
  }
}
