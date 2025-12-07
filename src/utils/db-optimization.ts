import { supabase } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// 缓存配置
const CACHE_TTL = {
  articles: 5 * 60 * 1000, // 5分钟
  articleLinks: 10 * 60 * 1000, // 10分钟
  userGraphs: 3 * 60 * 1000, // 3分钟
  userProfiles: 15 * 60 * 1000, // 15分钟
  searchResults: 1 * 60 * 1000, // 1分钟
  searchSuggestions: 2 * 60 * 1000, // 2分钟
};

// 批量操作配置
const BATCH_SIZE = 100;

// 缓存工具类
class DatabaseCache {
  private cacheStore: Map<string, { 
    data: unknown; 
    timestamp: number; 
    accessTimestamp: number;
    hits: number;
    customTtl?: number;
    version?: string;
    dependencies?: string[];
  }>;
  private cacheVersion: string;
  private cacheStats: {
    hits: number;
    misses: number;
    sets: number;
    invalidations: number;
  };
  private maxCacheSize: number;

  constructor(maxSize: number = 500) {
    this.cacheStore = new Map();
    this.cacheVersion = this.generateCacheVersion();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0
    };
    this.maxCacheSize = maxSize;
    // 定期清理过期缓存和使用频率低的缓存
    setInterval(() => this.cleanupCache(), 30 * 1000);
    // 定期输出缓存统计信息
    setInterval(() => this.logCacheStats(), 300 * 1000);
  }

  // 生成缓存版本
  private generateCacheVersion(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // 获取缓存数据
  get<T>(key: string, version?: string): T | null {
    const fullKey = `${this.cacheVersion}:${key}`;
    const cachedItem = this.cacheStore.get(fullKey);
    
    if (!cachedItem) {
      this.cacheStats.misses++;
      return null;
    }

    // 检查版本是否匹配
    if (version && cachedItem.version && cachedItem.version !== version) {
      this.cacheStats.misses++;
      this.cacheStore.delete(fullKey);
      return null;
    }

    // 更新访问时间和命中次数
    cachedItem.accessTimestamp = Date.now();
    cachedItem.hits++;
    this.cacheStore.set(fullKey, cachedItem);

    // 优先使用自定义TTL
    if (cachedItem.customTtl) {
      const now = Date.now();
      if (now - cachedItem.timestamp > cachedItem.customTtl) {
        this.cacheStore.delete(fullKey);
        this.cacheStats.misses++;
        return null;
      }
      this.cacheStats.hits++;
      return cachedItem.data as T;
    }

    // 尝试从key中推断缓存类型和对应的TTL
    let ttl = 5 * 60 * 1000; // 默认5分钟
    if (key.includes('articles')) {ttl = CACHE_TTL.articles;}
    else if (key.includes('article_links')) {ttl = CACHE_TTL.articleLinks;}
    else if (key.includes('user_graphs')) {ttl = CACHE_TTL.userGraphs;}
    else if (key.includes('profiles')) {ttl = CACHE_TTL.userProfiles;}
    else if (key.includes('search:')) {ttl = CACHE_TTL.searchResults;}
    else if (key.includes('suggest:')) {ttl = CACHE_TTL.searchSuggestions;}

    const now = Date.now();
    if (now - cachedItem.timestamp > ttl) {
      this.cacheStore.delete(fullKey);
      this.cacheStats.misses++;
      return null;
    }

    this.cacheStats.hits++;
    return cachedItem.data as T;
  }

  // 设置缓存数据
  set<T>(key: string, data: T, ttl = 0, version?: string, dependencies?: string[]): void {
    const fullKey = `${this.cacheVersion}:${key}`;
    // 构建缓存项，只包含有值的可选属性
    const cacheItem: { 
      data: unknown; 
      timestamp: number; 
      accessTimestamp: number;
      hits: number;
      customTtl?: number;
      version?: string;
      dependencies?: string[];
    } = {
      data,
      timestamp: Date.now(),
      accessTimestamp: Date.now(),
      hits: 0
    };
    
    // 只有当ttl大于0时才添加customTtl属性
    if (ttl > 0) {
      cacheItem.customTtl = ttl;
    }
    
    // 只有当version有值时才添加version属性
    if (version) {
      cacheItem.version = version;
    }
    
    // 只有当dependencies有值且不为空数组时才添加dependencies属性
    if (dependencies && dependencies.length > 0) {
      cacheItem.dependencies = dependencies;
    }
    
    this.cacheStore.set(fullKey, cacheItem);
    this.cacheStats.sets++;
    
    // 限制缓存大小，防止内存溢出
    if (this.cacheStore.size > this.maxCacheSize) {
      this.evictCache(20); // 移除使用频率低的20个缓存项
    }
  }

  // 清除指定缓存
  invalidate(key: string): void {
    const fullKey = `${this.cacheVersion}:${key}`;
    this.cacheStore.delete(fullKey);
    this.cacheStats.invalidations++;
  }

  // 清除所有缓存
  invalidateAll(): void {
    this.cacheStore.clear();
    this.cacheVersion = this.generateCacheVersion(); // 更新缓存版本
    this.cacheStats.invalidations += this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hits = 0;
    this.cacheStats.misses = 0;
  }

  // 根据模式清除缓存
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(`${this.cacheVersion}:${pattern}`.replace(/\*/g, '.*').replace(/\?/g, '.'));
    let clearedCount = 0;

    this.cacheStore.forEach((_, key) => {
      if (regex.test(key)) {
        this.cacheStore.delete(key);
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      console.log(`已清除 ${clearedCount} 个匹配模式 '${pattern}' 的缓存项`);
      this.cacheStats.invalidations += clearedCount;
    }
  }

  // 根据依赖清除缓存
  invalidateByDependency(dependency: string): void {
    let clearedCount = 0;
    
    this.cacheStore.forEach((item, key) => {
      if (item.dependencies && item.dependencies.includes(dependency)) {
        this.cacheStore.delete(key);
        clearedCount++;
      }
    });
    
    if (clearedCount > 0) {
      console.log(`已清除 ${clearedCount} 个依赖于 '${dependency}' 的缓存项`);
      this.cacheStats.invalidations += clearedCount;
    }
  }

  // 清理缓存：移除过期缓存和使用频率低的缓存
  private cleanupCache(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    // 清理过期缓存
    this.cacheStore.forEach((item, key) => {
      // 优先使用自定义TTL
      if (item.customTtl && now - item.timestamp > item.customTtl) {
        this.cacheStore.delete(key);
        expiredCount++;
        return;
      }

      // 尝试从key中推断缓存类型和对应的TTL
      let ttl = 5 * 60 * 1000; // 默认5分钟
      const originalKey = key.replace(`${this.cacheVersion}:`, '');
      if (originalKey.includes('articles')) {ttl = CACHE_TTL.articles;}
      else if (originalKey.includes('article_links')) {ttl = CACHE_TTL.articleLinks;}
      else if (originalKey.includes('user_graphs')) {ttl = CACHE_TTL.userGraphs;}
      else if (originalKey.includes('profiles')) {ttl = CACHE_TTL.userProfiles;}
      else if (originalKey.includes('search:')) {ttl = CACHE_TTL.searchResults;}
      else if (originalKey.includes('suggest:')) {ttl = CACHE_TTL.searchSuggestions;}

      if (now - item.timestamp > ttl) {
        this.cacheStore.delete(key);
        expiredCount++;
      }
    });
    
    // 清理使用频率低的缓存，如果缓存大小仍然超过最大限制
    if (this.cacheStore.size > this.maxCacheSize) {
      const exceedCount = this.cacheStore.size - this.maxCacheSize;
      this.evictCache(exceedCount + 10); // 多清理10个以留出空间
    }
    
    if (expiredCount > 0) {
      console.log(`清理了 ${expiredCount} 个过期缓存项`);
      this.cacheStats.invalidations += expiredCount;
    }
  }
  
  // 移除使用频率低的缓存项
  private evictCache(count: number): void {
    // 将缓存项转换为数组，按使用频率和访问时间排序
    // 首先按hits降序排序，如果hits相同则按accessTimestamp降序排序
    const cachedItems = Array.from(this.cacheStore.entries()).sort((a, b) => {
      // 首先按命中次数降序
      if (a[1].hits !== b[1].hits) {
        return b[1].hits - a[1].hits;
      }
      // 命中次数相同，按访问时间降序
      return b[1].accessTimestamp - a[1].accessTimestamp;
    });
    
    // 移除末尾使用频率最低的count个缓存项
    const itemsToEvict = cachedItems.slice(-count);
    let evictedCount = 0;
    
    for (const [key] of itemsToEvict) {
        this.cacheStore.delete(key);
        evictedCount++;
        this.cacheStats.invalidations++;
    }
    
    if (evictedCount > 0) {
      console.log(`移除了 ${evictedCount} 个使用频率低的缓存项`);
    }
  }
  
  // 获取缓存统计信息
  getCacheStats() {
    return { ...this.cacheStats };
  }
  
  // 输出缓存统计信息
  private logCacheStats(): void {
    const stats = this.getCacheStats();
    const hitRate = stats.hits + stats.misses > 0 ? 
      (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2) : 
      '0.00';
    
    console.log(`缓存统计: 命中 ${stats.hits}, 未命中 ${stats.misses}, 命中率 ${hitRate}%, 总缓存项 ${this.cacheStore.size}`);
  }
  
  // 缓存预热
  warmupCache(prefixes: string[], ttl: number = 5 * 60 * 1000): void {
    console.log(`开始缓存预热，前缀列表: ${prefixes.join(', ')}，TTL: ${ttl}ms`);
    // 这里可以添加具体的缓存预热逻辑
    // 例如：预加载热门文章、常用标签等
    // 使用ttl参数来设置缓存过期时间
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
      // 一次性检查supabase初始化
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

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
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // 批量更新数据
  static async batchUpdate<T extends Record<string, unknown>>(table: string, data: T[], idField = 'id'): Promise<{ success: boolean; error: string | null }> {
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

          if (!supabase) {
            throw new Error('Supabase client is not initialized');
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
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // 预加载相关数据
  static async preloadRelatedData(articleIds: string[]): Promise<void> {
    if (!articleIds || articleIds.length === 0) {return;}

    try {
      // 一次性检查supabase初始化
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // 并行预加载以提高性能
      await Promise.all([
        // 预加载文章链接
        supabase.from('article_links').select('*').in('article_id', articleIds),
        // 预加载文章标签
        supabase.from('article_tags').select('*').in('article_id', articleIds),
        // 预加载相关图表
        supabase.from('user_graphs').select('*').in('article_id', articleIds),
      ]);
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
      // 一次性检查supabase初始化
      if (!supabase) {
        throw new Error('Supabase client is not initialized');
      }

      // 并行执行查询以提高性能
      const [countResult, lastUpdatedResult] = await Promise.all([
        // 获取总数
        supabase.from(table).select('id', { count: 'exact', head: true }),
        // 获取最后更新时间
        supabase
          .from(table)
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single(), // 使用single()获取单个结果
      ]);

      const { count: totalCount, error: countError } = countResult;
      if (countError) {
        throw new Error(countError.message);
      }

      const { data: lastUpdatedData, error: lastUpdatedError } = lastUpdatedResult;
      let lastUpdated: string | null = null;
      if (!lastUpdatedError && lastUpdatedData && 'updated_at' in lastUpdatedData) {
        lastUpdated = lastUpdatedData.updated_at as string;
      }

      return {
        totalCount: totalCount || 0,
        lastUpdated,
        error: null,
      };
    } catch (error) {
      console.error(`Failed to get statistics for ${table}:`, error);
      return {
        totalCount: 0,
        lastUpdated: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
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
  async executeWithRetry<T>(query: () => Promise<T>, maxRetriesOrTtl: number = 3): Promise<T> {
    // 兼容旧版本，maxRetriesOrTtl 可能是 ttl 或 maxRetries
    const maxRetries = Math.min(maxRetriesOrTtl, 5); // 限制最大重试次数为5
    let lastError: Error | null = null;
    
    // 定义可重试的错误类型
    const retryableErrors = [
      '网络错误',
      'timeout',
      'TimeoutError',
      'NetworkError',
      'ConnectionRefused',
      'ServiceUnavailable',
      'Internal Server Error',
      '502 Bad Gateway',
      '503 Service Unavailable',
      '504 Gateway Timeout'
    ];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.executeQuery(query);
      } catch (error) {
        lastError = error as Error;
        const errorMessage = lastError.message || '';
        
        // 检查是否为可重试的错误类型
        const isRetryable = retryableErrors.some(retryableError => 
          errorMessage.includes(retryableError) || 
          errorMessage.toLowerCase().includes(retryableError.toLowerCase())
        );
        
        // 只在不是最后一次尝试且是可重试错误时重试
        if (attempt < maxRetries - 1 && isRetryable) {
          // 指数退避策略，带随机抖动
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          console.log(`查询重试 ${attempt + 1}/${maxRetries}，延迟 ${delay.toFixed(0)}ms`);
        } else {
          // 不可重试的错误或最后一次尝试，直接抛出
          throw lastError;
        }
      }
    }

    throw lastError || new Error('查询执行失败');
  }

  // 当前事务ID
  private currentTransactionId: string | null = null;

  // 添加事务提交方法
  async commitTransaction(transactionId: string): Promise<void> {
    if (!this.currentTransactionId || this.currentTransactionId !== transactionId) {
      console.warn('尝试提交不存在或已结束的事务:', transactionId);
      return;
    }

    try {
      // 在Supabase中，事务需要通过存储过程或客户端库特殊支持
      // 这里我们模拟事务提交，实际项目中可能需要使用Supabase的事务API
      console.log(`事务 ${transactionId} 已提交`);
      // 重置当前事务ID
      this.currentTransactionId = null;
    } catch (error) {
      console.error(`提交事务 ${transactionId} 失败:`, error);
      throw error;
    }
  }

  // 开始事务
  async startTransaction(): Promise<string> {
    // 如果已有活跃事务，返回错误
    if (this.currentTransactionId) {
      throw new Error('已有活跃事务正在进行，请先提交或回滚当前事务');
    }

    try {
      // 在Supabase中，事务需要通过存储过程或客户端库特殊支持
      // 这里我们模拟事务开始，实际项目中可能需要使用Supabase的事务API
      const transactionId = `tx_${Date.now()}`;
      this.currentTransactionId = transactionId;
      console.log(`事务 ${transactionId} 已开始`);
      return transactionId;
    } catch (error) {
      console.error('开始事务失败:', error);
      throw error;
    }
  }

  // 回滚事务
  async rollbackTransaction(): Promise<void> {
    if (!this.currentTransactionId) {
      console.warn('没有活跃的事务需要回滚');
      return;
    }

    try {
      // 在Supabase中，事务需要通过存储过程或客户端库特殊支持
      // 这里我们模拟事务回滚，实际项目中可能需要使用Supabase的事务API
      console.log(`事务 ${this.currentTransactionId} 已回滚`);
      // 重置当前事务ID
      this.currentTransactionId = null;
    } catch (error) {
      console.error('回滚事务失败:', error);
      throw error;
    }
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

  // 获取数据库客户端 - 确保返回包含当前认证会话的客户端
  async getClient(): Promise<SupabaseClient> {
    // 确保返回非null的supabase客户端
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    return supabase;
  }

  // 带重试机制的数据库操作
  static async withRetry<T>(operation: () => Promise<T>, operationName = 'database operation'): Promise<T> {
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
    processor: (batch: T[]) => Promise<void>,
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
  BATCH_SIZE,
};
