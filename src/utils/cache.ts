/**
 * 内存缓存实现
 * 
 * 功能特性：
 * - 支持设置过期时间
 * - 自动清理过期数据
 * - 线程安全的单例模式
 * - 类型安全的API
 */
class Cache {
  private readonly cache: Map<string, { value: unknown; expiry: number }>;
  private readonly cleanupInterval: number = 5 * 60 * 1000; // 5分钟

  constructor() {
    this.cache = new Map();
    // 启动定期清理过期数据的定时器
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttlInSeconds 过期时间（秒），默认5分钟
   */
  set<T>(key: string, value: T, ttlInSeconds: number = 300): void {
    const expiry = Date.now() + ttlInSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期则返回undefined
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value as T;
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取所有缓存键（包括已过期的）
   * @returns 缓存键数组
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 清理过期的缓存项
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 检查键是否存在且未过期
   * @param key 缓存键
   * @returns 是否存在且未过期
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 获取缓存大小（仅包含未过期的项）
   * @returns 缓存大小
   */
  size(): number {
    this.cleanup(); // 先清理过期项
    return this.cache.size;
  }
}

// 导出单例
export const cache = new Cache();
