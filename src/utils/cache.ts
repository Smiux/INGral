// 简单的内存缓存实现
class Cache {
  private cache: Map<string, { value: unknown; expiry: number }>;

  constructor() {
    this.cache = new Map();
    // 每5分钟清理一次过期数据
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  // 设置缓存项
  set<T>(key: string, value: T, ttlInSeconds: number = 300): void {
    const expiry = Date.now() + ttlInSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  // 获取缓存项
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

  // 删除缓存项
  delete(key: string): void {
    this.cache.delete(key);
  }

  // 清除所有缓存
  clear(): void {
    this.cache.clear();
  }

  // 获取所有缓存键
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // 清理过期的缓存项
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // 检查键是否存在
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  // 获取缓存大小
  size(): number {
    this.cleanup(); // 先清理过期项
    return this.cache.size;
  }
}

// 导出单例
export const cache = new Cache();
