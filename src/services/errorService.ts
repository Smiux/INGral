/**
 * 错误处理服务类，提供统一的错误处理和日志记录
 */
export class ErrorService {
  private static instance: ErrorService;

  private errorLog: Array<{ timestamp: number; error: Error; context?: string }> = [];

  private maxLogSize = 100;

  private constructor () {}

  /**
   * 获取ErrorService单例实例
   */
  static getInstance (): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * 处理错误
   * @param error 错误对象
   * @param context 错误上下文
   * @param operation 操作描述
   */
  handleError (error: unknown, context: string, operation: string): never {
    // 转换为Error对象
    const errorObj = this.toErrorObject(error);

    // 记录错误日志
    this.logError(errorObj, context);

    // 格式化错误信息
    const errorMessage = this.formatErrorMessage(errorObj, operation);

    // 抛出格式化后的错误
    throw new Error(errorMessage);
  }

  /**
   * 将未知类型转换为Error对象
   * @param error 未知类型的错误
   */
  private toErrorObject (error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (typeof error === 'object' && error !== null) {
      try {
        return new Error(JSON.stringify(error));
      } catch {
        // 如果无法序列化，返回通用错误
        return new Error('未知错误');
      }
    }

    return new Error(String(error));
  }

  /**
   * 格式化错误信息
   * @param error 错误对象
   * @param operation 操作描述
   */
  private formatErrorMessage (error: Error, operation: string): string {
    return `${operation}失败: ${error.message}`;
  }

  /**
   * 记录错误日志
   * @param error 错误对象
   * @param context 错误上下文
   */
  private logError (error: Error, context: string = 'ErrorService'): void {
    // 添加到错误日志
    this.errorLog.push({
      'timestamp': Date.now(),
      error,
      context
    });

    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // 打印错误日志
    console.error(`[${new Date().toISOString()}] [${context}] 错误:`, error);
    console.error(`[${new Date().toISOString()}] 错误堆栈:`, error.stack);
  }

  /**
   * 获取错误日志
   */
  getErrorLog (): Array<{ timestamp: number; error: Error; context?: string }> {
    return [...this.errorLog];
  }

  /**
   * 清除错误日志
   */
  clearErrorLog (): void {
    this.errorLog = [];
  }

  /**
   * 获取用户友好的错误信息
   * @param error 错误对象
   */
  getUserFriendlyMessage (error: Error): string {
    // 常见错误类型处理
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return '网络连接失败，请检查您的网络设置后重试';
    }

    if (error.message.includes('permission') || error.message.includes('access')) {
      return '您没有权限执行此操作';
    }

    if (error.message.includes('not found') || error.message.includes('不存在')) {
      return '请求的资源不存在';
    }

    if (error.message.includes('duplicate') || error.message.includes('重复')) {
      return '资源已存在，请尝试使用不同的名称';
    }

    // 默认错误信息
    return '操作失败，请稍后重试';
  }

  /**
   * 处理异步操作错误
   * @param promise 异步操作
   * @param context 错误上下文
   * @param operation 操作描述
   */
  async handleAsyncError<T> (promise: Promise<T>, context: string, operation: string): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      this.handleError(error, context, operation);
      // 这里不会执行，因为handleError会抛出错误
      throw error;
    }
  }
}

// 导出单例实例
export const errorService = ErrorService.getInstance();
