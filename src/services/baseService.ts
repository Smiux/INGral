import { supabase } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
/**
 * 基础服务类，提供通用的数据库操作和错误处理
 */
export abstract class BaseService {
  protected supabase: SupabaseClient = supabase;

  /**
   * 检查 Supabase 客户端是否初始化
   */
  protected checkSupabaseClient (): void {
    if (!this.supabase) {
      throw new Error('Supabase client is not initialized');
    }
  }

  /**
   * 处理成功响应
   * @param data 响应数据
   * @param defaultData 默认数据（如果 data 为 null 或 undefined）
   */
  protected handleSuccessResponse<T> (data: T | null | undefined, defaultData: T): T {
    return data ?? defaultData;
  }

  /**
   * 应用分页
   * @param query Supabase 查询对象
   * @param limit 限制数量
   * @param offset 偏移量
   */
  protected applyPagination<T extends { limit?: (_limit: number) => T; range?: (_start: number, _end: number) => T }>(query: T, limit?: number, offset?: number): T {
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
   * 获取单个记录
   * @param table 表名
   * @param id 记录ID
   */
  protected async getById<T> (table: string, id: string | number): Promise<T | null> {
    try {
      const result = await this.supabase.from(table).select('*')
        .eq('id', id)
        .single<T>();
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * 按字段获取单个记录
   * @param table 表名
   * @param field 字段名
   * @param value 字段值
   */
  protected async getByField<T> (table: string, field: string, value: string | number): Promise<T | null> {
    try {
      const result = await this.supabase.from(table).select('*')
        .eq(field, value)
        .single<T>();
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * 获取记录列表
   * @param table 表名
   * @param params 查询参数
   */
  protected async getList<T> (table: string, params?: Record<string, string | number | boolean | undefined>): Promise<T[]> {
    try {
      let query = this.supabase.from(table).select('*');

      // 应用查询参数
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (key !== 'limit' && key !== 'offset' && key !== 'order' && key !== 'sort') {
            query = query.eq(key, value);
          }
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
          const sort = params.sort === 'asc' ? { 'ascending': true } : { 'ascending': false };
          query = query.order(params.order, sort);
        }
      }

      const result = await query;
      return result.data || [];
    } catch {
      return [];
    }
  }

  /**
   * 创建记录
   * @param table 表名
   * @param data 记录数据
   */
  protected async create<T> (table: string, data: Record<string, unknown>): Promise<T | null> {
    try {
      const result = await this.supabase.from(table).insert(data)
        .select()
        .single<T>();
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * 批量创建记录
   * @param table 表名
   * @param data 记录数据数组
   */
  protected async bulkCreate<T> (table: string, data: Record<string, unknown>[]): Promise<T[] | null> {
    if (data.length === 0) {
      return [];
    }

    try {
      const result = await this.supabase.from(table).insert(data)
        .select();
      return result.data as T[] | null;
    } catch {
      return [];
    }
  }

  /**
   * 更新记录
   * @param table 表名
   * @param id 记录ID
   * @param data 更新数据
   */
  protected async update<T> (table: string, id: string | number, data: Record<string, unknown>): Promise<T | null> {
    try {
      const result = await this.supabase.from(table).update(data)
        .eq('id', id)
        .select()
        .single<T>();
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * 按条件更新记录
   * @param table 表名
   * @param data 更新数据
   * @param condition 条件对象
   */
  protected async updateByCondition<T> (table: string, data: Record<string, unknown>, condition: Record<string, string | number>): Promise<T[] | null> {
    try {
      let query = this.supabase.from(table).update(data)
        .select();

      // 应用条件
      for (const [key, value] of Object.entries(condition)) {
        query = query.eq(key, value);
      }

      const result = await query;
      return result.data as T[] | null;
    } catch {
      return null;
    }
  }

  /**
   * 删除记录
   * @param table 表名
   * @param id 记录ID
   */
  protected async delete (table: string, id: string | number): Promise<boolean> {
    try {
      const result = await this.supabase.from(table).delete()
        .eq('id', id);
      return !result.error;
    } catch {
      return false;
    }
  }

  /**
   * 按条件删除记录
   * @param table 表名
   * @param condition 条件对象
   */
  protected async deleteByCondition (table: string, condition: Record<string, string | number>): Promise<boolean> {
    try {
      let query = this.supabase.from(table).delete();

      // 应用条件
      for (const [key, value] of Object.entries(condition)) {
        query = query.eq(key, value);
      }

      const result = await query;
      return !result.error;
    } catch {
      return false;
    }
  }
}
