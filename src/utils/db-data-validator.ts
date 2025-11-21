/**
 * 数据库数据验证和写入保障模块
 * 提供数据验证、事务管理和写入保障功能，确保数据正确写入数据库
 */

import { dbLogger } from './db-logger';

/**
 * 数据验证错误类
 */
export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 文章数据验证器
 */
export class ArticleValidator {
  /**
   * 验证文章数据
   * @param articleData 文章数据
   * @throws ValidationError 当数据验证失败时
   */
  static validate(articleData: Record<string, unknown>): void {
    // 验证标题
    if (!articleData['title'] || typeof articleData['title'] !== 'string') {
      throw new ValidationError('title', '文章标题不能为空且必须是字符串');
    }
    if ((articleData['title'] as string).length < 2) {
      throw new ValidationError('title', '文章标题至少需要2个字符');
    }
    if ((articleData['title'] as string).length > 200) {
      throw new ValidationError('title', '文章标题不能超过200个字符');
    }

    // 验证内容
    if (!articleData['content'] || typeof articleData['content'] !== 'string') {
      throw new ValidationError('content', '文章内容不能为空且必须是字符串');
    }
    if ((articleData['content'] as string).length < 10) {
      throw new ValidationError('content', '文章内容至少需要10个字符');
    }

    // 验证slug
    if (articleData['slug'] !== undefined && articleData['slug'] !== null) {
      if (typeof articleData['slug'] !== 'string') {
        throw new ValidationError('slug', '文章slug必须是字符串');
      }
      // 验证slug格式
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(articleData['slug'] as string)) {
        throw new ValidationError('slug', '文章slug只能包含小写字母、数字和短横线');
      }
    }

    // 验证发布日期
    if (articleData['publishDate']) {
      if (typeof articleData['publishDate'] !== 'string' && !(articleData['publishDate'] instanceof Date)) {
        throw new ValidationError('publishDate', '发布日期必须是字符串或Date对象');
      }
    }

    // 验证状态
    if (articleData['status']) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (typeof articleData['status'] === 'string' && !validStatuses.includes(articleData['status'])) {
        throw new ValidationError('status', '文章状态必须是draft、published或archived之一');
      }
    }

    // 验证标签
    if (articleData['tags']) {
      if (!Array.isArray(articleData['tags'])) {
        throw new ValidationError('tags', '文章标签必须是数组');
      }
      (articleData['tags'] as unknown[]).forEach((tag: unknown, index: number) => {
        if (typeof tag !== 'string') {
          throw new ValidationError(`tags[${index}]`, '标签必须是字符串');
        }
      });
    }

    dbLogger.debug('文章数据验证通过', { articleId: articleData['id'] });
  }

  /**
   * 安全地清理文章数据
   * @param articleData 原始文章数据
   * @returns 清理后的文章数据
   */
  static sanitize(articleData: { title?: unknown; content?: unknown; status?: unknown; [key: string]: unknown }): Record<string, unknown> {
    // 使用正确的类型初始化sanitized对象
    const sanitized: Record<string, unknown> = {
      title: articleData['title'] ? String(articleData['title']).trim() : '',
      content: articleData['content'] ? String(articleData['content']).trim() : '',
      status: articleData['status'] || 'draft',
      createdAt: articleData['createdAt'] || new Date().toISOString(),
      tags: [] as string[],
      publishDate: null,
      slug: ''
    };

    // 可选字段
    if ('slug' in articleData && articleData['slug'] !== undefined && articleData['slug'] !== null) {
      sanitized['slug'] = String(articleData['slug']).trim().toLowerCase();
    }
    if (articleData['publishDate']) {
      sanitized['publishDate'] = String(articleData['publishDate']);
    }
    // 可选字段
    if (articleData['tags'] && Array.isArray(articleData['tags'])) {
      // 确保tags是字符串数组
      const stringTags: string[] = [];
      (articleData['tags'] as unknown[]).forEach(tag => {
        if (typeof tag === 'string') {
          const trimmedTag = tag.trim();
          if (trimmedTag) {
            stringTags.push(trimmedTag);
          }
        }
      });
      sanitized['tags'] = stringTags;
    }

    return sanitized;
  }
}

/**
 * 图表数据验证器
 */
export class GraphValidator {
  /**
   * 验证图表数据
   * @param graphData 图表数据
   * @throws ValidationError 当数据验证失败时
   */
  static validate(graphData: { type?: string; [key: string]: unknown }): void {
    // 验证图表类型
    const validTypes = ['bar', 'line', 'pie', 'scatter', 'area'];
    if (!graphData['type'] || (typeof graphData['type'] !== 'string' || !validTypes.includes(graphData['type']))) {
      throw new ValidationError('type', `图表类型必须是${validTypes.join('、')}之一`);
    }

    // 验证标题
    if (!graphData['title'] || typeof graphData['title'] !== 'string') {
      throw new ValidationError('title', '图表标题不能为空且必须是字符串');
    }

    // 验证数据
    if (!graphData['data'] || !Array.isArray(graphData['data'])) {
      throw new ValidationError('data', '图表数据不能为空且必须是数组');
    }
    if (graphData['data'].length === 0) {
      throw new ValidationError('data', '图表数据数组不能为空');
    }

    // 验证元数据
    if (graphData['metadata']) {
      if (typeof graphData['metadata'] !== 'object' || graphData['metadata'] === null) {
        throw new ValidationError('metadata', '图表元数据必须是对象');
      }
    }

    dbLogger.debug('图表数据验证通过', { graphId: graphData['id'] });
  }

  /**
   * 安全地清理图表数据
   * @param graphData 原始图表数据
   * @returns 清理后的图表数据
   */
  static sanitize(graphData: { type?: unknown; title?: unknown; data?: unknown; metadata?: unknown; [key: string]: unknown }): Record<string, unknown> {
    return {
      type: graphData['type'] || 'bar',
      title: graphData['title'] ? String(graphData['title']).trim() : '',
      data: graphData['data'] || [],
      metadata: graphData['metadata'] || {},
      createdAt: graphData['createdAt'] || new Date().toISOString(),
    };
  }
}

/**
 * 用户数据验证器
 */
export class UserValidator {
  /**
   * 验证用户数据
   * @param userData 用户数据
   * @throws ValidationError 当数据验证失败时
   */
 static validate(userData: Record<string, unknown>): void {
    // 验证用户名
    if (!userData['username'] || typeof userData['username'] !== 'string') {
      throw new ValidationError('username', '用户名不能为空且必须是字符串');
    }
    if ((userData['username'] as string).length < 3) {
      throw new ValidationError('username', '用户名至少需要3个字符');
    }
    if ((userData['username'] as string).length > 50) {
      throw new ValidationError('username', '用户名不能超过50个字符');
    }

    // 验证邮箱
    if (!userData['email'] || typeof userData['email'] !== 'string') {
      throw new ValidationError('email', '邮箱不能为空且必须是字符串');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData['email'] as string)) {
      throw new ValidationError('email', '邮箱格式不正确');
    }

    // 验证角色
    if (userData['role']) {
      const validRoles = ['admin', 'editor', 'user'];
      if (typeof userData['role'] === 'string' && !validRoles.includes(userData['role'] as string)) {
        throw new ValidationError('role', '用户角色必须是admin、editor或user之一');
      }
    }

    // 密码验证（仅在创建或更新密码时）
    if (userData['password']) {
      if (typeof userData['password'] !== 'string') {
        throw new ValidationError('password', '密码必须是字符串');
      }
      if ((userData['password'] as string).length < 6) {
        throw new ValidationError('password', '密码至少需要6个字符');
      }
    }

    dbLogger.debug('用户数据验证通过', { username: userData['username'] });
  }

  /**
   * 安全地清理用户数据
   * @param userData 原始用户数据
   * @returns 清理后的用户数据
   */
  static sanitize(userData: { username?: unknown; email?: unknown; role?: unknown; name?: unknown; avatar?: unknown; [key: string]: unknown }): Record<string, unknown> {
    // 使用Record类型以允许动态添加name属性
    const sanitized: Record<string, unknown> = {
      username: userData['username'] ? String(userData['username']).trim() : '',
      email: userData['email'] ? String(userData['email']).trim().toLowerCase() : '',
      role: userData['role'] || 'viewer',
      createdAt: userData['createdAt'] || new Date().toISOString(),
      avatar: ''
    };

    // 可选字段
    if (userData['name']) {
      // 修复：使用name而不是重复的username
      const nameValue = String(userData['name']).trim();
      if (nameValue) {
        sanitized['name'] = nameValue;
      }
    }
    if (userData['avatar']) {
      sanitized['avatar'] = String(userData['avatar']);
    }

    return sanitized;
  }
}

/**
 * 数据写入保障类
 * 提供额外的数据写入验证和错误处理
 */
export class DataWriteGuard {
  /**
   * 安全写入数据，包含验证和错误处理
   * @param operation 数据库操作函数
   * @param dataType 数据类型
   * @param data 要写入的数据
   * @returns 操作结果
   */
  static async safeWrite<T>(operation: () => Promise<T>, dataType: string, data: Record<string, unknown>): Promise<T> {
    try {
      // 记录写入尝试
      dbLogger.info(`尝试写入${dataType}数据`, { id: data.id, type: dataType });

      // 执行操作
      const result = await operation();

      // 记录成功
      dbLogger.info(`成功写入${dataType}数据`, { id: data.id, type: dataType });
      return result;
    } catch (error) {
      // 记录失败
      dbLogger.error(`写入${dataType}数据失败`, {
        name: error instanceof Error ? error.name || 'Error' : 'Error',
        message: error instanceof Error ? error.message : String(error)
      });

      // 重新抛出错误
      throw error;
    }
  }

  /**
   * 重试写入操作
   * @param operation 数据库操作函数
   * @param dataType 数据类型
   * @param data 要写入的数据
   * @param maxRetries 最大重试次数，默认3次
   * @returns 操作结果
   */
  static async writeWithRetry<T>(operation: () => Promise<T>, dataType: string, data: Record<string, unknown>, maxRetries: number = 3): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        dbLogger.info(`写入尝试 ${attempt}/${maxRetries}`, { dataType, dataId: data.id });
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        dbLogger.error(`写入尝试 ${attempt}/${maxRetries} 失败，正在重试`, {
          name: lastError?.name || 'Error',
          message: lastError?.message || '未知错误'
        });
        
        // 指数退避策略
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 所有重试都失败
    dbLogger.error(`所有 ${maxRetries} 次写入尝试都失败`, {
        name: lastError?.name || 'Error',
        message: lastError?.message || '未知错误' 
      });
    throw lastError;
  }

  /**
   * 批量写入保障
   * @param operations 操作列表
   * @returns 所有操作的结果
   */
  static async safeBatchWrite<T>(operations: Array<() => Promise<T>>): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    let successCount = 0;
    
    dbLogger.info(`开始批量写入操作`, { totalOperations: operations.length });
    
    for (let i = 0; i < operations.length; i++) {
      try {
        // 添加额外的类型检查，确保operations[i]是一个有效的函数
        const operation = operations[i];
        if (typeof operation === 'function') {
          const result = await operation();
          results.push(result);
          successCount++;
          dbLogger.debug(`批量操作 ${i + 1}/${operations.length} 成功`);
        } else {
          dbLogger.error(`批量操作 ${i + 1}/${operations.length} 失败: 无效的操作函数`);
          results.push(null);
        }
      } catch (error) {
        dbLogger.error(`批量操作 ${i + 1}/${operations.length} 失败`, {
          name: error instanceof Error ? error.name || 'Error' : 'Error',
          message: error instanceof Error ? error.message : String(error)
        });
        results.push(null); // 用null标记失败的操作
      }
    }
    
    dbLogger.info(`批量写入完成`, {
      totalOperations: operations.length,
      successCount,
      failureCount: operations.length - successCount
    });
    
    return results;
  }
}

/**
 * 事务管理器
 * 提供数据库事务管理功能
 */
// 定义事务类型接口
export interface TableOperations<T = Record<string, unknown>> {
  select: (...args: unknown[]) => TableOperations<T>;
  insert: (data: Record<string, unknown>) => Promise<{ data: T[]; error: unknown }>;
  update: (data: Partial<Record<string, unknown>>) => Promise<{ data: T[]; error: unknown }>;
  delete: () => Promise<{ data: T[]; error: unknown }>;
  eq: (field: string, value: unknown) => TableOperations<T>;
  gt: (field: string, value: unknown) => TableOperations<T>;
  lt: (field: string, value: unknown) => TableOperations<T>;
  gte: (field: string, value: unknown) => TableOperations<T>;
  lte: (field: string, value: unknown) => TableOperations<T>;
  in: (field: string, values: unknown[]) => TableOperations<T>;
  order: (field: string, options?: { ascending?: boolean }) => TableOperations<T>;
  limit: (limit: number) => TableOperations<T>;
  single: () => Promise<{ data: T; error: unknown }>;
}

export interface TransactionObject {
  from: <T = Record<string, unknown>>(table: string) => TableOperations<T>;
  commit?: () => Promise<void>;
  rollback?: () => Promise<void>;
}

export class TransactionManager {
  /**
   * 执行数据库事务
   * @param operations 事务操作函数
   * @param tables 涉及的表名列表
   * @returns 事务结果
   */

    static async executeTransaction<T>(
      operations: (tx: TransactionObject) => Promise<T>, 
      tables: string[] = []
    ): Promise<T> {
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 导入supabase（仅在需要时导入以避免循环依赖）
    const { supabase } = await import('../lib/supabase');
    
    dbLogger.logTransaction(transactionId, 'begin', tables);
    
    try {
      // 在真实环境中，这里应该使用supabase的事务API
      // 由于这是模拟环境，我们使用简单的try-catch来模拟事务
      
      // 模拟开始事务
      const mockTransaction = {
        ...supabase,
        from: (table: string) => {
          const tableOps = supabase.from(table);
          // 确保所有操作都记录在同一事务中
          // 移除自定义接口，直接使用TableOperations类型
          // 由于这是代理实现，我们需要使用as any来处理类型兼容性问题
          return new Proxy(tableOps as any, {
              get(target: any, prop: string | symbol) {
                const value = target[prop];
                if (typeof value === 'function') {
                  return function(this: any, ...args: unknown[]) {
                    dbLogger.debug(`事务操作 [${transactionId}] ${table}.${String(prop)}`, {
                      params: args
                    });
                    return (value as (...args: unknown[]) => unknown).apply(this, args);
                  };
                }
                return value;
              }
            });
        }
      };
      
      // 执行事务操作
      const result = await operations(mockTransaction);
      
      // 记录事务提交
      dbLogger.logTransaction(transactionId, 'commit', tables);
      
      return result;
    } catch (error) {
      // 记录事务回滚
      dbLogger.logTransaction(transactionId, 'rollback', tables);
      dbLogger.error(`事务失败 [${transactionId}]`, error instanceof Error ? error : new Error(String(error)));
      
      throw error;
    }
  }
}

/**
 * 数据一致性检查器
 * 用于验证数据库数据一致性
 */
export class DataConsistencyChecker {
  /**
   * 检查数据一致性
   * @param actualData 实际数据
   * @param expectedData 期望的数据结构
   * @returns 一致性检查结果
   */
  static checkConsistency(actualData: Record<string, unknown>, expectedData: Record<string, unknown>): {
    consistent: boolean;
    missingFields: string[];
    typeMismatches: { field: string; expected: string; actual: string }[];
  } {
    const missingFields: string[] = [];
    const typeMismatches: { field: string; expected: string; actual: string }[] = [];

    // 安全地处理actualData
    const safeData = actualData || {};
    
    Object.entries(expectedData).forEach(([field, expectedType]) => {
      if (!(field in safeData)) {
        // 移除any类型，使用更安全的方式检查required属性
        interface OptionalTypeDefinition {
          required?: boolean;
        }
        const isOptional = 
          typeof expectedType === 'object' && 
          expectedType !== null && 
          Object.prototype.hasOwnProperty.call(expectedType, 'required') && 
          (expectedType as OptionalTypeDefinition).required === false;
        if (!isOptional) { // 默认所有字段都是必需的
          missingFields.push(field);
        }
      } else {
        // 检查类型
        const actualValue = safeData[field];
        const actualType = typeof actualValue;
        // 使用类型守卫来安全地访问type属性
        if (typeof expectedType === 'object' && expectedType !== null && 'type' in expectedType) {
          const typeDef = expectedType as { type: string };
          if (typeDef.type && actualType !== typeDef.type) {
            typeMismatches.push({
              field,
              expected: typeDef.type,
              actual: actualType
            });
          }
        }
      }
    });


    return {
      consistent: missingFields.length === 0 && typeMismatches.length === 0,
      missingFields,
      typeMismatches
    };
  }

  /**
   * 生成一致性报告
   * @param checkResult 一致性检查结果
   * @param dataType 数据类型
   * @returns 格式化的报告字符串
   */
  static generateConsistencyReport(
    checkResult: ReturnType<typeof DataConsistencyChecker.checkConsistency>,
    dataType: string
  ): string {
    const report: string[] = [];
    report.push(`=== ${dataType} 数据一致性报告 ===`);
    report.push(`生成时间: ${new Date().toLocaleString()}`);
    
    if (checkResult.consistent) {
      report.push('✅ 数据一致性检查通过');
    } else {
      report.push('❌ 数据一致性检查失败');
      
      if (checkResult.missingFields.length > 0) {
        report.push('');
        report.push('缺失字段:');
        checkResult.missingFields.forEach(field => report.push(`- ${field}`));
      }
      
      if (checkResult.typeMismatches.length > 0) {
        report.push('');
        report.push('类型不匹配:');
        checkResult.typeMismatches.forEach(mismatch => {
          report.push(`- ${mismatch.field}: 期望 ${mismatch.expected}, 实际 ${mismatch.actual}`);
        });
      }
    }
    
    return report.join('\n');
  }
}