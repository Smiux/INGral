/**
 * 数据库操作日志记录模块
 * 提供数据库操作的监控、日志记录和性能追踪功能
 */

/**
 * 日志级别枚举
 */
enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * 数据库日志记录器
 */
export class DatabaseLogger {
  private static instance: DatabaseLogger;
  private logLevel: LogLevel = LogLevel.INFO;
  private enableConsoleLogging = true;

  /**
   * 获取日志记录器的单例实例
   */
  static getInstance(): DatabaseLogger {
    if (!DatabaseLogger.instance) {
      DatabaseLogger.instance = new DatabaseLogger();
    }
    return DatabaseLogger.instance;
  }

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  setLogLevel(level: string): void {
    const upperLevel = level.toUpperCase();
    if (Object.values(LogLevel).includes(upperLevel as LogLevel)) {
      this.logLevel = upperLevel as LogLevel;
      this.info(`日志级别已设置为: ${upperLevel}`);
    } else {
      this.warning(`无效的日志级别: ${level}，使用默认级别: ${this.logLevel}`);
    }
  }

  /**
   * 设置日志文件 - 在前端环境中暂不支持
   * @param filePath 日志文件路径
   */
  setLogFile(filePath: string): void {
    this.info(`日志文件功能在前端环境中暂不支持: ${filePath}`);
  }

  /**
   * 启用控制台日志
   */
  enableConsole(): void {
    this.enableConsoleLogging = true;
    this.info('控制台日志已启用');
  }

  /**
   * 禁用控制台日志
   */
  disableConsole(): void {
    this.enableConsoleLogging = false;
    this.info('控制台日志已禁用'); // 这将是最后一条控制台日志
  }

  /**
   * TRACE级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  trace(message: string, data?: unknown): void {
    this.log(LogLevel.TRACE, message, data);
  }

  /**
   * DEBUG级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * INFO级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * WARNING级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  warning(message: string, data?: unknown): void {
    this.log(LogLevel.WARNING, message, data);
  }

  /**
   * ERROR级别日志
   * @param message 日志消息
   * @param error 错误对象
   */
  error(message: string, error?: Error): void {
    this.log(LogLevel.ERROR, message, {
      error: error?.message,
      stack: error?.stack
    });
  }

  /**
   * CRITICAL级别日志
   * @param message 日志消息
   * @param error 错误对象
   */
  critical(message: string, error?: Error): void {
    this.log(LogLevel.CRITICAL, message, {
      error: error?.message,
      stack: error?.stack
    });
  }

  /**
   * 记录数据库查询操作
   * @param table 表名
   * @param operation 操作类型
   * @param query 查询内容
   * @param params 查询参数
   */
  logQuery(table: string, operation: string, query: string, params?: unknown[]): void {
    this.debug(`数据库查询 [${table}.${operation}]`, {
      query,
      params
    });
  }

  /**
   * 记录数据库操作结果
   * @param table 表名
   * @param operation 操作类型
   * @param success 是否成功
   * @param duration 操作耗时（毫秒）
   * @param data 结果数据
   */
  logOperationResult(table: string, operation: string, success: boolean, duration: number, data?: unknown): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const status = success ? '成功' : '失败';
    
    this.log(level, `数据库操作 [${table}.${operation}] ${status} (${duration}ms)`, data);
    
    // 如果操作耗时超过1秒，记录警告
    if (duration > 1000) {
      this.warning(`慢数据库操作 [${table}.${operation}] 耗时 ${duration}ms`);
    }
  }

  /**
   * 开始数据库操作追踪
   * @param table 表名
   * @param operation 操作类型
   * @returns 追踪ID
   */
  startOperation(table: string, operation: string): string {
    const traceId = this.generateTraceId();
    this.trace(`操作开始 [${traceId}] ${table}.${operation}`);
    return traceId;
  }

  /**
   * 结束数据库操作追踪
   * @param traceId 追踪ID
   * @param table 表名
   * @param operation 操作类型
   * @param success 是否成功
   * @param startTime 开始时间
   * @param data 结果数据
   */
  endOperation(traceId: string, table: string, operation: string, success: boolean, startTime: number, data?: unknown): void {
    const duration = Date.now() - startTime;
    this.trace(`操作结束 [${traceId}] ${table}.${operation} (${duration}ms)`);
    this.logOperationResult(table, operation, success, duration, data);
  }

  /**
   * 记录事务操作
   * @param transactionId 事务ID
   * @param operation 操作类型（开始/提交/回滚）
   * @param tables 涉及的表
   */
  logTransaction(transactionId: string, operation: 'begin' | 'commit' | 'rollback', tables?: string[]): void {
    const tableInfo = tables ? ` 表: ${tables.join(', ')}` : '';
    this.info(`事务 ${operation.toUpperCase()} [${transactionId}]${tableInfo}`);
  }

  /**
   * 刷新日志缓冲区 - 在前端环境中暂不支持
   */
  flushLogs(): void {
    // 在前端环境中暂不支持日志文件写入
  }

  /**
   * 生成追踪ID
   * @returns 追踪ID
   */
  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * 检查日志级别是否应该被记录
   * @param level 日志级别
   * @returns 是否应该记录
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    // 构建完整的日志条目
    let fullLog = logMessage;
    if (data !== undefined) {
      try {
        const dataStr = JSON.stringify(data, null, 2);
        fullLog = `${logMessage}\n${dataStr}`;
      } catch (e) {
        fullLog = `${logMessage}\n无法序列化数据: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    // 输出到控制台
    if (this.enableConsoleLogging) {
      // 根据不同的日志级别使用不同的控制台方法
      switch (level) {
        case LogLevel.TRACE:
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          console.log(fullLog);
          break;
        case LogLevel.WARNING:
          console.warn(fullLog);
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(fullLog);
          break;
      }
    }

    // 在前端环境中只输出到控制台，不支持文件日志
  }

  /**
   * 将日志写入文件 - 在前端环境中暂不支持
   * @param content 日志内容
   */
  // 文件写入功能在前端环境中不支持，已移除
}

/**
 * 数据库操作监控器
 * 提供更高级的数据库操作监控功能
 */
export class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private operationCounts: Map<string, number> = new Map();
  private operationTimes: Map<string, { total: number; count: number; max: number }> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private lastResetTime = Date.now();
  private logger = DatabaseLogger.getInstance();

  /**
   * 获取监控器的单例实例
   */
  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  /**
   * 记录数据库操作
   * @param table 表名
   * @param operation 操作类型
   * @param success 是否成功
   * @param duration 操作耗时（毫秒）
   */
  recordOperation(table: string, operation: string, success: boolean, duration: number): void {
    const key = `${table}.${operation}`;
    
    // 更新操作计数
    this.operationCounts.set(key, (this.operationCounts.get(key) || 0) + 1);
    
    // 更新操作时间统计
    const timeStats = this.operationTimes.get(key) || { total: 0, count: 0, max: 0 };
    timeStats.total += duration;
    timeStats.count += 1;
    timeStats.max = Math.max(timeStats.max, duration);
    this.operationTimes.set(key, timeStats);
    
    // 更新错误计数
    if (!success) {
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }
    
    // 记录慢查询
    if (duration > 1000) {
      this.logger.warning(`慢查询检测: ${key} 耗时 ${duration}ms`);
    }
  }

  /**
   * 获取操作统计信息
   */
  getStats(): {
    operations: Record<string, number>;
    performance: Record<string, { avgTime: number; maxTime: number }>;
    errors: Record<string, number>;
    uptime: number;
  } {
    const operations: Record<string, number> = {};
    const performance: Record<string, { avgTime: number; maxTime: number }> = {};
    const errors: Record<string, number> = {};
    
    // 转换操作计数
    this.operationCounts.forEach((count, key) => {
      operations[key] = count;
    });
    
    // 转换性能统计
    this.operationTimes.forEach((stats, key) => {
      performance[key] = {
        avgTime: stats.count > 0 ? stats.total / stats.count : 0,
        maxTime: stats.max
      };
    });
    
    // 转换错误计数
    this.errorCounts.forEach((count, key) => {
      errors[key] = count;
    });
    
    return {
      operations,
      performance,
      errors,
      uptime: Date.now() - this.lastResetTime
    };
  }

  /**
   * 生成性能报告 - 前端环境优化版
   */
  generatePerformanceReport(): string {
    const stats = this.getStats();
    const uptimeMinutes = (stats.uptime / 1000 / 60).toFixed(2);
    
    let report = `\n===== 数据库性能报告 =====\n`;
    report += `监控时间: ${uptimeMinutes} 分钟\n\n`;
    
    // 限制显示的操作数量，优化前端性能
    report += `----- 操作统计 -----\n`;
    Object.entries(stats.operations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // 仅显示前10个操作
      .forEach(([key, count]) => {
        const errorCount = stats.errors[key] || 0;
        const errorRate = count > 0 ? ((errorCount / count) * 100).toFixed(2) : '0.00';
        report += `${key}: ${count} 次 (错误率: ${errorRate}%)\n`;
      });
    
    report += `\n----- 性能统计 -----\n`;
    Object.entries(stats.performance)
      .sort(([, a], [, b]) => b.avgTime - a.avgTime)
      .slice(0, 10) // 仅显示前10个性能数据
      .forEach(([key, perf]) => {
        report += `${key}: 平均 ${perf.avgTime.toFixed(2)}ms, 最大 ${perf.maxTime.toFixed(2)}ms\n`;
      });
    
    report += `====================\n`;
    
    return report;
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.operationCounts.clear();
    this.operationTimes.clear();
    this.errorCounts.clear();
    this.lastResetTime = Date.now();
    this.logger.info('数据库性能统计已重置');
  }

  /**
   * 检查性能问题
   */
  checkPerformanceIssues(): string[] {
    const issues: string[] = [];
    const stats = this.getStats();
    
    // 检查慢查询
    Object.entries(stats.performance).forEach(([key, perf]) => {
      if (perf.avgTime > 500) {
        issues.push(`[慢查询] ${key} 平均响应时间: ${perf.avgTime.toFixed(2)}ms`);
      }
    });
    
    // 检查错误率
    Object.entries(stats.operations).forEach(([key, count]) => {
      const errorCount = stats.errors[key] || 0;
      if (count > 0 && errorCount / count > 0.05) { // 错误率超过5%
        issues.push(`[高错误率] ${key} 错误率: ${((errorCount / count) * 100).toFixed(2)}%`);
      }
    });
    
    return issues;
  }
}

/**
 * 导出工具函数，用于快速记录数据库操作
 */
export const dbLogger = DatabaseLogger.getInstance();
export const dbMonitor = DatabaseMonitor.getInstance();

/**
 * 数据库操作包装器，自动添加日志和监控
 * @param table 表名
 * @param operation 操作名称
 * @param fn 操作函数
 */
export async function logDatabaseOperation<T>(
  table: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const logger = dbLogger;
  const monitor = dbMonitor;
  const traceId = logger.startOperation(table, operation);
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    logger.endOperation(traceId, table, operation, true, startTime, {
      duration,
      result: result instanceof Object ? 'Object' : String(result)
    });
    
    monitor.recordOperation(table, operation, true, duration);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.endOperation(traceId, table, operation, false, startTime, {
      duration,
      error: error instanceof Error ? error.message : String(error)
    });
    
    monitor.recordOperation(table, operation, false, duration);
    
    throw error;
  }
}