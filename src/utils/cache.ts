/**
 * 内存缓存实现，支持LRU淘汰机制
 *
 * 功能特性：
 * - 支持设置过期时间
 * - 自动清理过期数据
 * - LRU缓存淘汰机制
 * - 线程安全的单例模式
 * - 类型安全的API
 * - 支持设置最大缓存大小
 */
class Cache {
  // 缓存数据结构，使用Map保持插入顺序
  private readonly cache: Map<string, { value: unknown; expiry: number }>;

  // 5分钟清理一次过期数据
  private readonly cleanupInterval: number = 5 * 60 * 1000;

  // 最大缓存大小
  private readonly maxSize: number;

  // 默认过期时间（毫秒）
  private readonly defaultTtl: number;

  /**
   * 构造函数
   * @param maxSize 最大缓存大小，默认1000
   * @param defaultTtl 默认过期时间（秒），默认5分钟
   */
  constructor (maxSize: number = 1000, defaultTtl: number = 300) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl * 1000;
    // 启动定期清理过期数据的定时器
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttlInSeconds 过期时间（秒），默认5分钟
   */
  set<T> (key: string, value: T, ttlInSeconds?: number): void {
    const expiry = Date.now() + (ttlInSeconds ? ttlInSeconds * 1000 : this.defaultTtl);

    // 如果键已存在，先删除它（LRU策略：最近使用的放在后面）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果缓存大小超过最大值，删除最久未使用的项（Map的第一个元素）
    if (this.cache.size >= this.maxSize) {
      const iterator = this.cache.keys();
      const result = iterator.next();
      if (!result.done) {
        this.cache.delete(result.value);
      }
    }

    // 添加到缓存末尾
    this.cache.set(key, { value, expiry });
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期则返回undefined
   */
  get<T> (key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    // LRU策略：将最近访问的项移到末尾
    const value = item.value;
    this.cache.delete(key);
    this.cache.set(key, item);

    return value as T;
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   */
  delete (key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear (): void {
    this.cache.clear();
  }

  /**
   * 获取所有缓存键（包括已过期的）
   * @returns 缓存键数组
   */
  keys (): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 清理过期的缓存项
   */
  private cleanup (): void {
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
  has (key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 获取缓存大小（仅包含未过期的项）
   * @returns 缓存大小
   */
  size (): number {
    // 先清理过期项
    this.cleanup();
    return this.cache.size;
  }

  /**
   * 获取最大缓存大小
   * @returns 最大缓存大小
   */
  getMaxSize (): number {
    return this.maxSize;
  }

  /**
   * 手动执行LRU清理，删除最久未使用的项
   * @param count 要删除的项数
   */
  cleanupLRU (count: number = 1): void {
    for (let i = 0; i < count && this.cache.size > 0; i += 1) {
      const iterator = this.cache.keys();
      const result = iterator.next();
      if (!result.done) {
        this.cache.delete(result.value);
      }
    }
  }
}

// 导出单例
export const cache = new Cache();

// 导出Cache类，允许创建自定义缓存实例
export { Cache };
