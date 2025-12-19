/**
 * 错误类型枚举
 */
export enum ErrorType {
  // eslint-disable-next-line no-unused-vars
  SUPABASE_ERROR = 'SUPABASE_ERROR',
  // eslint-disable-next-line no-unused-vars
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  // eslint-disable-next-line no-unused-vars
  NETWORK_ERROR = 'NETWORK_ERROR',
  // eslint-disable-next-line no-unused-vars
  AUTH_ERROR = 'AUTH_ERROR',
  // eslint-disable-next-line no-unused-vars
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 错误响应接口
 */
export interface ErrorResponse {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  statusCode?: number | undefined;
}

/**
 * 创建错误响应
 * @param type 错误类型
 * @param message 错误消息
 * @param originalError 原始错误对象
 * @param statusCode 状态码
 */
export const createErrorResponse = (
  type: ErrorType,
  message: string,
  originalError?: unknown,
  statusCode?: number
): ErrorResponse => {
  return {
    type,
    message,
    'originalError': originalError ?? undefined,
    'statusCode': statusCode ?? undefined
  };
};

/**
 * 处理 Supabase 错误
 * @param error Supabase 错误对象
 */
export const handleSupabaseError = (error: unknown): ErrorResponse => {
  console.error('Supabase 错误:', error);

  // 根据错误代码返回不同的错误响应
  const supabaseError = error as { code?: string };
  switch (supabaseError.code) {
    case 'PGRST116':
      return createErrorResponse(
        ErrorType.SUPABASE_ERROR,
        '资源不存在',
        error
      );
    case 'PGRST204':
      return createErrorResponse(
        ErrorType.SUPABASE_ERROR,
        '操作成功但未返回数据',
        error
      );
    case 'PGRST301':
      return createErrorResponse(
        ErrorType.SUPABASE_ERROR,
        '重定向错误',
        error
      );
    case 'PGRST303':
      return createErrorResponse(
        ErrorType.SUPABASE_ERROR,
        '资源已移动',
        error
      );
    case 'PGRST400':
      return createErrorResponse(
        ErrorType.VALIDATION_ERROR,
        '请求参数错误',
        error
      );
    case 'PGRST401':
      return createErrorResponse(
        ErrorType.AUTH_ERROR,
        '未授权访问',
        error
      );
    case 'PGRST403':
      return createErrorResponse(
        ErrorType.AUTH_ERROR,
        '禁止访问',
        error
      );
    case 'PGRST404':
      return createErrorResponse(
        ErrorType.SUPABASE_ERROR,
        '资源不存在',
        error
      );
    case 'PGRST405':
      return createErrorResponse(
        ErrorType.SUPABASE_ERROR,
        '不允许的方法',
        error
      );
    case 'PGRST406':
      return createErrorResponse(
        ErrorType.SUPABASE_ERROR,
        '不接受的媒体类型',
        error
      );
    case 'PGRST409':
      return createErrorResponse(
        ErrorType.SUPABASE_ERROR,
        '资源冲突',
        error
      );
    case 'PGRST500':
      return createErrorResponse(
        ErrorType.SUPABASE_ERROR,
        '服务器内部错误',
        error
      );
    default:
      return createErrorResponse(
        ErrorType.SUPABASE_ERROR,
        '数据库操作失败',
        error
      );
  }
};

/**
 * 处理网络错误
 * @param error 网络错误对象
 */
export const handleNetworkError = (error: unknown): ErrorResponse => {
  console.error('网络错误:', error);

  return createErrorResponse(
    ErrorType.NETWORK_ERROR,
    '网络连接失败，请检查您的网络设置',
    error
  );
};

/**
 * 处理验证错误
 * @param message 验证错误消息
 * @param originalError 原始错误对象
 */
export const handleValidationError = (message: string, originalError?: unknown): ErrorResponse => {
  console.error('验证错误:', message, originalError);

  return createErrorResponse(
    ErrorType.VALIDATION_ERROR,
    message,
    originalError
  );
};

/**
 * 处理未知错误
 * @param error 未知错误对象
 */
export const handleUnknownError = (error: unknown): ErrorResponse => {
  console.error('未知错误:', error);

  return createErrorResponse(
    ErrorType.UNKNOWN_ERROR,
    '发生未知错误，请稍后重试',
    error
  );
};

/**
 * 全局错误处理函数
 * @param error 错误对象
 */
export const globalErrorHandler = (error: unknown): ErrorResponse => {
  // 检查错误类型
  const typedError = error as { code?: string; name?: string; message?: string };
  if (typedError.code?.startsWith('PGRST')) {
    // Supabase 错误
    return handleSupabaseError(error);
  } else if (typedError.name === 'TypeError' && typedError.message?.includes('network')) {
    // 网络错误
    return handleNetworkError(error);
  } else if (typedError.name === 'ValidationError') {
    // 验证错误
    return handleValidationError(typedError.message || '验证失败', error);
  } else if (typedError.name === 'AuthError') {
    // 认证错误
    return createErrorResponse(
      ErrorType.AUTH_ERROR,
      typedError.message || '认证失败',
      error
    );
  }
  // 未知错误
  return handleUnknownError(error);
};

/**
 * 安全地解析 JSON
 * @param jsonString JSON 字符串
 * @param defaultValue 默认值
 */
export const safeJsonParse = <T>(jsonString: string, defaultValue: T): T => {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('JSON 解析错误:', error);
    return defaultValue;
  }
};
