import katex from 'katex';

/**
 * KaTeXCache class for caching rendered KaTeX formulas
 * This improves performance by avoiding repeated rendering of the same formulas
 */
export class KaTeXCache {
  private cache: Map<string, { html: string; timestamp: number }>;
  private maxSize: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRenderTime: 0
  };

  /**
   * Create a new KaTeXCache instance
   * @param maxSize Maximum number of formulas to cache (default: 1000)
   */
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Render a KaTeX formula, using cache if available
   * @param formula LaTeX formula string
   * @param options KaTeX options
   * @returns Rendered HTML string
   */
  render(formula: string, options: katex.KatexOptions = {}): string {
    // 清理公式字符串
    const cleanedFormula = formula.trim();
    if (!cleanedFormula) {
      return '';
    }

    // Create a cache key based on formula and options
    const cacheKey = this.createCacheKey(cleanedFormula, options);

    // Check if formula is already in cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        // Move to end of map to keep recently used formulas
        this.cache.delete(cacheKey);
        this.cache.set(cacheKey, { html: cached.html, timestamp: Date.now() });
        this.stats.hits++;
        return cached.html;
      }
    }

    this.stats.misses++;
    const startTime = performance.now();

    // 默认配置，启用更多LaTeX功能
    const defaultOptions: katex.KatexOptions = {
      displayMode: false,
      throwOnError: false,
      errorColor: '#cc0000',
      strict: false, // 放宽严格性，允许更多非标准LaTeX语法
      trust: true, // 启用信任模式，允许渲染更多LaTeX命令
      ...options
    };

    // Render formula if not in cache
    try {
      const html = katex.renderToString(cleanedFormula, defaultOptions);
      this.stats.totalRenderTime += performance.now() - startTime;
      
      // Add to cache with LRU policy
      this.addToCache(cacheKey, html);
      
      return html;
    } catch (error) {
      console.error('Error rendering KaTeX formula:', error);
      // Return a fallback if rendering fails
      return `<span class="text-red-500 dark:text-red-400">Error rendering formula: ${cleanedFormula}</span>`;
    }
  }

  /**
   * Create a cache key from formula and options
   * @param formula LaTeX formula string
   * @param options KaTeX options
   * @returns Cache key string
   */
  private createCacheKey(formula: string, options: katex.KatexOptions | null | undefined): string {
    // Include only relevant options in cache key
    const relevantOptions = {
      displayMode: options?.displayMode,
      throwOnError: options?.throwOnError,
      errorColor: options?.errorColor,
      strict: options?.strict,
      trust: options?.trust
    };
    
    // 使用公式内容和关键选项生成简单的缓存键
    return `${formula}__${JSON.stringify(relevantOptions)}`;
  }

  /**
   * Add a rendered formula to the cache with LRU policy
   * @param key Cache key
   * @param html Rendered HTML
   */
  private addToCache(key: string, html: string): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, { html, timestamp: Date.now() });
  }

  /**
   * Evict the oldest entries from cache
   * @param count Number of entries to evict (default: 1)
   */
  private evictOldest(count = 1): void {
    // 按时间戳排序，移除最旧的条目
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const entry = entries[i];
      if (entry && entry[0]) {
        this.cache.delete(entry[0]);
        this.stats.evictions++;
      }
    }
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    // 重置统计数据
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRenderTime: 0
    };
  }

  /**
   * Get the current cache size
   * @returns Number of formulas in cache
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Remove a specific formula from the cache
   * @param formula LaTeX formula string
   * @param options KaTeX options
   */
  remove(formula: string, options: katex.KatexOptions = {}): void {
    const cleanedFormula = formula.trim();
    const cacheKey = this.createCacheKey(cleanedFormula, options);
    this.cache.delete(cacheKey);
  }

  /**
   * Get cache statistics
   * @returns Cache statistics object
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRenderTime: 0
    };
  }
}

// Create a singleton instance of KaTeXCache
export const katexCache = new KaTeXCache();

// 添加性能监控
if (process.env.NODE_ENV === 'development') {
  // 定期记录缓存统计
  setInterval(() => {
    const stats = katexCache.getStats();
    const hitRate = stats.hits + stats.misses > 0 
      ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100) 
      : 0;
    console.log(`[KaTeX Cache] Hits: ${stats.hits}, Misses: ${stats.misses}, Hit Rate: ${hitRate}%, Evictions: ${stats.evictions}`);
  }, 30000); // 每30秒记录一次
}
