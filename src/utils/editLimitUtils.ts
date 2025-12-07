/**
 * 编辑限制工具类，处理文章、图谱、评论等资源的编辑限制逻辑
 * 优化点：
 * 1. 支持多种资源类型的编辑限制
 * 2. 可配置的编辑限制规则
 * 3. 更灵活的计数重置逻辑
 * 4. 支持自定义时间窗口
 * 5. 增强的类型安全
 */

/**
 * 资源类型枚举
 */
export enum ResourceType {
  ARTICLE = 'article',
  GRAPH = 'graph',
  COMMENT = 'comment',
  DISCUSSION = 'discussion',
  REVIEW = 'review'
}

/**
 * 编辑限制状态接口
 */
export interface EditLimitStatus {
  editCount24h: number;
  editCount7d: number;
  isChangePublic: boolean;
  isSlowMode: boolean;
  isUnstable: boolean;
  slowModeUntil?: string | undefined;
  lastEditDate: string;
}

/**
 * 编辑限制配置接口
 */
export interface EditLimitConfig {
  // 24小时内编辑次数阈值
  changePublicThreshold?: number;
  // 24小时内编辑次数阈值，超过则进入慢速模式
  slowModeThreshold?: number;
  // 7天内编辑次数阈值，超过则标记为不稳定
  unstableThreshold?: number;
  // 慢速模式持续时间（毫秒）
  slowModeDuration?: number;
  // 自定义时间窗口（毫秒）
  timeWindows?: {
    // 24小时窗口（毫秒）
    short: number;
    // 7天窗口（毫秒）
    long: number;
  };
  // 资源类型特定配置
  resourceTypeConfig?: Partial<Record<ResourceType, Omit<EditLimitConfig, 'resourceTypeConfig' | 'timeWindows'>>>;
}

/**
 * 编辑限制默认配置
 */
export const DEFAULT_EDIT_LIMIT_CONFIG: Required<Omit<EditLimitConfig, 'resourceTypeConfig'>> = {
  changePublicThreshold: 3,
  slowModeThreshold: 3,
  unstableThreshold: 10,
  slowModeDuration: 24 * 60 * 60 * 1000, // 24小时
  timeWindows: {
    short: 24 * 60 * 60 * 1000, // 24小时
    long: 7 * 24 * 60 * 60 * 1000 // 7天
  }
};

/**
 * 计算编辑限制状态
 * @param currentEditCount24h 当前24小时编辑次数
 * @param currentEditCount7d 当前7天编辑次数
 * @param lastEditDate 上次编辑日期
 * @param config 编辑限制配置
 * @param resourceType 资源类型
 */
export function calculateEditLimitStatus(
  currentEditCount24h: number = 0,
  currentEditCount7d: number = 0,
  lastEditDate?: string | null,
  config: EditLimitConfig = {},
  resourceType?: ResourceType
): EditLimitStatus {
  const now = new Date();
  const nowISO = now.toISOString();
  
  // 合并默认配置和自定义配置
  const mergedConfig = { ...DEFAULT_EDIT_LIMIT_CONFIG, ...config };
  
  // 获取资源类型特定配置
  const resourceConfig = resourceType && mergedConfig.resourceTypeConfig?.[resourceType] 
    ? mergedConfig.resourceTypeConfig[resourceType]
    : {};
  
  // 合并最终配置
  const finalConfig = { ...mergedConfig, ...resourceConfig };
  
  // 使用配置的时间窗口
  const { short: shortWindow, long: longWindow } = finalConfig.timeWindows;
  
  // 计算是否在时间窗口内
  const lastEditTime = lastEditDate ? new Date(lastEditDate).getTime() : 0;
  const isWithinShortWindow = lastEditDate && (now.getTime() - lastEditTime < shortWindow);
  const isWithinLongWindow = lastEditDate && (now.getTime() - lastEditTime < longWindow);
  
  // 重置计数逻辑
  const editCount24h = isWithinShortWindow ? currentEditCount24h + 1 : 1;
  const editCount7d = isWithinLongWindow ? currentEditCount7d + 1 : 1;
  
  // 确定编辑限制状态
  const isChangePublic = editCount24h > finalConfig.changePublicThreshold;
  const isSlowMode = editCount24h > finalConfig.slowModeThreshold;
  const isUnstable = editCount7d > finalConfig.unstableThreshold;
  const slowModeUntil = isSlowMode 
    ? new Date(now.getTime() + finalConfig.slowModeDuration).toISOString() 
    : undefined;
  
  return {
    editCount24h,
    editCount7d,
    isChangePublic,
    isSlowMode,
    isUnstable,
    slowModeUntil,
    lastEditDate: nowISO
  };
}

/**
 * 构建更新对象，包含编辑限制字段（数据库字段名格式）
 * @param baseUpdates 基础更新数据
 * @param editLimitStatus 编辑限制状态
 */
export function buildUpdateWithEditLimit<T>(
  baseUpdates: T,
  editLimitStatus: EditLimitStatus
): T & Record<string, unknown> {
  return {
    ...baseUpdates,
    // 将驼峰命名转换为数据库下划线命名
    edit_count_24h: editLimitStatus.editCount24h,
    edit_count_7d: editLimitStatus.editCount7d,
    last_edit_date: editLimitStatus.lastEditDate,
    is_change_public: editLimitStatus.isChangePublic,
    is_slow_mode: editLimitStatus.isSlowMode,
    slow_mode_until: editLimitStatus.slowModeUntil,
    is_unstable: editLimitStatus.isUnstable
  };
}

/**
 * 检查是否允许编辑
 * @param status 编辑限制状态
 */
export function isEditAllowed(
  status: EditLimitStatus
): { allowed: boolean; reason?: string } {
  // 检查是否处于慢速模式
  if (status.isSlowMode) {
    return {
      allowed: false,
      reason: '编辑频率过高，已进入慢速模式，请稍后再试'
    };
  }
  
  // 检查是否处于不稳定状态
  if (status.isUnstable) {
    return {
      allowed: true,
      reason: '内容已被频繁编辑，建议检查内容准确性'
    };
  }
  
  return { allowed: true };
}

/**
 * 获取编辑限制状态的可读描述
 * @param status 编辑限制状态
 */
export function getEditLimitStatusDescription(
  status: EditLimitStatus
): string {
  if (status.isSlowMode) {
    return `已进入慢速模式，${status.slowModeUntil ? `将在 ${new Date(status.slowModeUntil).toLocaleString()} 后恢复` : ''}`;
  }
  
  if (status.isUnstable) {
    return '内容已被频繁编辑，建议检查内容准确性';
  }
  
  if (status.isChangePublic) {
    return '已达到公开变更限制';
  }
  
  return `24小时内编辑 ${status.editCount24h} 次，7天内编辑 ${status.editCount7d} 次`;
}

/**
 * 重置编辑限制状态
 */
export function resetEditLimitStatus(
): EditLimitStatus {
  const now = new Date();
  return {
    editCount24h: 0,
    editCount7d: 0,
    isChangePublic: false,
    isSlowMode: false,
    isUnstable: false,
    lastEditDate: now.toISOString()
  };
}

