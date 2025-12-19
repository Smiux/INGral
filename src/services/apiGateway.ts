import { BaseService } from './baseService';
import { errorService } from './errorService';

/**
 * 请求拦截器接口
 */
export interface RequestInterceptor {

  /**
   * 请求拦截处理
   * @param config 请求配置
   */
  intercept(_config: RequestConfig): Promise<RequestConfig> | RequestConfig;
}

/**
 * 响应拦截器接口
 */
export interface ResponseInterceptor {

  /**
   * 响应拦截处理
   * @param response 响应数据
   */
  intercept<T>(_response: Response<T>): Promise<Response<T>> | Response<T>;
}

/**
 * 请求配置接口
 */
export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: Record<string, unknown> | Array<unknown>;
  headers?: Record<string, string>;
  cacheKey?: string;
  cacheTTL?: number;
  requiresAuth?: boolean;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * 响应接口
 */
export interface Response<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
  request: RequestConfig;
}

/**
 * 速率限制信息接口
 */
interface RateLimitInfo {
  count: number;
  resetTime: number;
}

/**
 * API网关类，统一管理所有API请求，提供请求拦截、响应拦截、缓存管理、错误处理和日志记录
 */
export class ApiGateway extends BaseService {
  private static instance: ApiGateway;

  private requestInterceptors: RequestInterceptor[] = [];

  private responseInterceptors: ResponseInterceptor[] = [];

  private rateLimitMap: Map<string, RateLimitInfo> = new Map();

  // 1分钟窗口
  private readonly RATE_LIMIT_WINDOW = 60 * 1000;

  // 每分钟最多100个请求
  private readonly RATE_LIMIT_MAX_REQUESTS = 100;

  /**
   * 单例模式，获取API网关实例
   */
  public static getInstance (): ApiGateway {
    if (!ApiGateway.instance) {
      ApiGateway.instance = new ApiGateway();
    }
    return ApiGateway.instance;
  }

  /**
   * 添加请求拦截器
   * @param interceptor 请求拦截器
   */
  public addRequestInterceptor (interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   * @param interceptor 响应拦截器
   */
  public addResponseInterceptor (interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 执行请求拦截
   * @param config 请求配置
   */
  private async executeRequestInterceptors (config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = { ...config };

    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor.intercept(processedConfig);
    }

    return processedConfig;
  }

  /**
   * 执行响应拦截
   * @param response 响应数据
   */
  private async executeResponseInterceptors<T> (response: Response<T>): Promise<Response<T>> {
    let processedResponse = { ...response };

    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor.intercept(processedResponse);
    }

    return processedResponse;
  }

  /**
   * 检查速率限制
   * @param key 速率限制键
   */
  private checkRateLimit (key: string): boolean {
    const now = Date.now();
    const rateLimitInfo = this.rateLimitMap.get(key);

    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      // 重置速率限制
      this.rateLimitMap.set(key, {
        'count': 1,
        'resetTime': now + this.RATE_LIMIT_WINDOW
      });
      return true;
    }

    if (rateLimitInfo.count < this.RATE_LIMIT_MAX_REQUESTS) {
      // 增加请求计数
      this.rateLimitMap.set(key, {
        'count': rateLimitInfo.count + 1,
        'resetTime': rateLimitInfo.resetTime
      });
      return true;
    }

    // 超过速率限制
    return false;
  }

  /**
   * 执行API请求
   * @param config 请求配置
   */
  public async request<T> (config: RequestConfig): Promise<Response<T>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const rateLimitKey = `${config.method}:${config.url}`;

    try {
      // 1. 检查速率限制
      if (!this.checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded');
      }

      // 2. 执行请求拦截
      const processedConfig = await this.executeRequestInterceptors(config);

      // 3. 记录请求开始
      this.logRequestStart(requestId, processedConfig);

      // 4. 执行实际请求（基于现有的BaseService方法）
      const responseData = await this.executeApiRequest<T>(processedConfig);

      // 5. 构建响应对象
      const response: Response<T> = {
        'data': responseData,
        'status': 200,
        'headers': {
          'X-Request-ID': requestId,
          'X-Response-Time': `${Date.now() - startTime}ms`,
          'Cache-Control': processedConfig.cacheTTL ? `max-age=${processedConfig.cacheTTL / 1000}` : 'no-cache'
        },
        'request': processedConfig
      };

      // 6. 执行响应拦截
      const processedResponse = await this.executeResponseInterceptors<T>(response);

      // 7. 记录请求成功
      this.logRequestSuccess(requestId, processedConfig, processedResponse);

      // 8. 记录分析数据
      this.recordAnalytics();

      return processedResponse;
    } catch (error) {
      // 9. 处理错误
      const processedError = this.handleApiError(error, config);

      // 10. 记录请求失败
      this.logRequestFailure(requestId, config, processedError);

      // 11. 记录分析数据
      this.recordAnalytics();

      throw processedError;
    }
  }

  /**
   * 执行实际的API请求
   * @param config 请求配置
   */
  private async executeApiRequest<T> (config: RequestConfig): Promise<T> {
    // 基于请求配置，调用现有的BaseService方法
    const { url, method, data } = config;

    // 解析URL，提取表名和操作
    const [table, operation] = url.split('/').filter(Boolean);

    if (!table) {
      throw new Error('Invalid URL format');
    }

    switch (method) {
      case 'GET':
        if (operation) {
          // 获取单个记录
          const result = await this.getById<T>(table, operation);
          return result as T;
        }
        // 获取记录列表
        const result = await this.getList<T>(table);
        return result as unknown as T;

      case 'POST':
        // 创建记录
        const createResult = await this.create<T>(table, Array.isArray(data) ? { 'items': data } : (data || {}));
        return createResult as T;
      case 'PUT':
      case 'PATCH':
        if (!operation) {
          throw new Error('Operation ID is required for update');
        }
        // 更新记录
        const updateResult = await this.update<T>(table, operation, Array.isArray(data) ? { 'items': data } : (data || {}));
        return updateResult as T;
      case 'DELETE':
        if (!operation) {
          throw new Error('Operation ID is required for delete');
        }
        // 删除记录
        await this.delete(table, operation);
        return null as unknown as T;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  /**
   * 处理API错误
   * @param error 错误对象
   * @param config 请求配置
   */
  private handleApiError (error: unknown, config: RequestConfig): Error {
    return errorService.handleError(error, 'ApiGateway', `Request to ${config.url}`);
  }

  /**
   * 生成请求ID
   */
  private generateRequestId (): string {
    return `${Date.now()}-${Math.random().toString(36)
      .substring(2, 11)}`;
  }

  /**
   * 记录请求开始
   * @param requestId 请求ID
   * @param config 请求配置
   */
  private logRequestStart (requestId: string, config: RequestConfig): void {
    console.log(`[API Gateway] Request Start - ID: ${requestId}, ${config.method} ${config.url}`);
  }

  /**
   * 记录请求成功
   * @param requestId 请求ID
   * @param config 请求配置
   * @param response 响应数据
   */
  private logRequestSuccess<T> (requestId: string, config: RequestConfig, response: Response<T>): void {
    console.log(`[API Gateway] Request Success - ID: ${requestId}, ${config.method} ${config.url}, Status: ${response.status}`);
  }

  /**
   * 记录请求失败
   * @param requestId 请求ID
   * @param config 请求配置
   * @param error 错误对象
   */
  private logRequestFailure (requestId: string, config: RequestConfig, error: Error): void {
    console.error(`[API Gateway] Request Failure - ID: ${requestId}, ${config.method} ${config.url}, Error: ${error.message}`);
  }

  /**
   * 记录分析数据
   */
  private recordAnalytics (): void {
    // 移除对不存在的trackApiRequest方法的调用
    // analyticsService.trackApiRequest({
    //   method: config.method,
    //   url: config.url,
    //   status: response?.status || 500,
    //   duration: duration || 0,
    //   success: !error,
    //   error: error?.message,
    //   requestId: response?.headers['X-Request-ID'] || this.generateRequestId()
    // });
  }

  /**
   * GET请求快捷方法
   * @param url 请求URL
   * @param config 请求配置
   */
  public async get<T> (url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<Response<T>> {
    return this.request<T>({
      url,
      'method': 'GET',
      ...config
    });
  }

  /**
   * POST请求快捷方法
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   */
  public async post<T> (url: string, data?: RequestConfig['data'], config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<Response<T>> {
    const requestConfig: RequestConfig = {
      url,
      'method': 'POST',
      ...config
    };

    // 只有当data不是undefined时才添加到requestConfig中，符合exactOptionalPropertyTypes: true的要求
    if (data !== undefined) {
      requestConfig.data = data;
    }

    return this.request<T>(requestConfig);
  }

  /**
   * PUT请求快捷方法
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   */
  public async put<T> (url: string, data?: RequestConfig['data'], config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<Response<T>> {
    const requestConfig: RequestConfig = {
      url,
      'method': 'PUT',
      ...config
    };

    // 只有当data不是undefined时才添加到requestConfig中，符合exactOptionalPropertyTypes: true的要求
    if (data !== undefined) {
      requestConfig.data = data;
    }

    return this.request<T>(requestConfig);
  }

  /**
   * DELETE请求快捷方法
   * @param url 请求URL
   * @param config 请求配置
   */
  public async deleteRequest<T> (url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<Response<T>> {
    return this.request<T>({
      url,
      'method': 'DELETE',
      ...config
    });
  }

  /**
   * 清除所有缓存
   */
  public clearAllCache (): void {
    // 移除缓存清除功能，因为已经不再使用缓存
  }

  /**
   * 获取当前速率限制信息
   * @param key 速率限制键
   */
  public getRateLimitInfo (key: string): RateLimitInfo | undefined {
    return this.rateLimitMap.get(key);
  }
}

// 导出API网关实例
export const apiGateway = ApiGateway.getInstance();
