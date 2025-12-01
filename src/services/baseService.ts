import { supabase } from '../lib/supabase';

/**
 * 基础服务类，提供通用的数据库操作和错误处理
 */
export class BaseService {
  protected supabase = supabase;

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
   * @param operation 操作描述
   */
  protected handleSupabaseError(error: unknown, operation: string): never {
    console.error(`${operation}失败:`, error);
    throw new Error(`${operation}失败`);
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
  protected applyPagination<T>(query: T, limit?: number, offset?: number): T {
    let paginatedQuery = query;
    
    // 应用限制
    if (limit) {
      paginatedQuery = (paginatedQuery as unknown as { limit: (limit: number) => T }).limit(limit);
    }
    
    // 应用偏移量
    if (offset && offset > 0) {
      const end = offset + (limit || 100) - 1;
      paginatedQuery = (paginatedQuery as unknown as { range: (start: number, end: number) => T }).range(offset, end);
    }
    
    return paginatedQuery;
  }
}
