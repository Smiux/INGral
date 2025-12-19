/**
 * 输入验证工具函数，用于防止XSS攻击
 */

/**
 * 清理HTML字符串，移除危险的脚本标签
 * @param html HTML字符串，可为null或undefined
 * @returns 清理后的HTML字符串
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) {
    return '';
  }

  // 移除所有script标签
  let sanitized = html.replace(/<script[^>]*>.*?<\/script>/gi, '');

  // 移除所有on*事件属性
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["']?[^"'>]+["']?/gi, '');

  // 移除所有iframe标签
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');

  // 移除所有form标签和相关属性
  sanitized = sanitized.replace(/<form[^>]*>.*?<\/form>/gi, '');
  sanitized = sanitized.replace(/<input[^>]*>/gi, '');
  sanitized = sanitized.replace(/<button[^>]*>.*?<\/button>/gi, '');

  return sanitized;
};

/**
 * 验证文章标题
 * @param title 文章标题
 * @returns 验证结果，包含isValid和message
 */
export const validateTitle = (title: string): { isValid: boolean; message?: string } => {
  if (!title || title.trim().length === 0) {
    return { 'isValid': false, 'message': '文章标题不能为空' };
  }

  if (title.length > 200) {
    return { 'isValid': false, 'message': '文章标题不能超过200个字符' };
  }

  // 检查是否包含危险字符
  const dangerousChars = /[<>"'&]/;
  if (dangerousChars.test(title)) {
    return { 'isValid': false, 'message': '文章标题包含不允许的特殊字符' };
  }

  return { 'isValid': true };
};

/**
 * 验证文章内容
 * @param content 文章内容
 * @returns 验证结果，包含isValid、message和清理后的content
 */
export const validateContent = (content: string): { isValid: boolean; message?: string; content?: string } => {
  if (!content || content.trim().length === 0) {
    return { 'isValid': false, 'message': '文章内容不能为空' };
  }

  if (content.length > 100000) {
    return { 'isValid': false, 'message': '文章内容不能超过100000个字符' };
  }

  // 移除危险的HTML内容
  const sanitizedContent = sanitizeHtml(content);

  return { 'isValid': true, 'content': sanitizedContent };
};

/**
 * 验证作者信息
 * @param authorInfo 作者信息对象
 * @returns 验证结果，包含isValid和message
 */
export const validateAuthorInfo = (authorInfo: { name?: string | undefined; email?: string | undefined; url?: string | undefined }): { isValid: boolean; message?: string } => {
  // 验证作者名称
  if (authorInfo.name && authorInfo.name.length > 100) {
    return { 'isValid': false, 'message': '作者名称不能超过100个字符' };
  }

  // 验证作者邮箱
  if (authorInfo.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authorInfo.email)) {
      return { 'isValid': false, 'message': '请输入有效的邮箱地址' };
    }
    if (authorInfo.email.length > 100) {
      return { 'isValid': false, 'message': '邮箱地址不能超过100个字符' };
    }
  }

  // 验证作者URL
  if (authorInfo.url) {
    try {
      new URL(authorInfo.url);
      if (authorInfo.url.length > 200) {
        return { 'isValid': false, 'message': 'URL地址不能超过200个字符' };
      }
    } catch {
      return { 'isValid': false, 'message': '请输入有效的URL地址' };
    }
  }

  return { 'isValid': true };
};

/**
 * 验证可见性设置
 * @param visibility 可见性设置
 * @returns 验证结果，包含isValid和message
 */
export const validateVisibility = (visibility: string): { isValid: boolean; message?: string } => {
  const validVisibilities = ['public', 'unlisted'];
  if (!validVisibilities.includes(visibility)) {
    return { 'isValid': false, 'message': '无效的可见性设置' };
  }
  return { 'isValid': true };
};

/**
 * 验证标签数组
 * @param tags 标签数组或undefined
 * @returns 验证结果，包含isValid和message
 */
export const validateTags = (tags?: string[]): { isValid: boolean; message?: string } => {
  if (!tags) {
    return { 'isValid': true };
  }

  if (!Array.isArray(tags)) {
    return { 'isValid': false, 'message': '标签必须是数组格式' };
  }

  if (tags.length > 20) {
    return { 'isValid': false, 'message': '标签数量不能超过20个' };
  }

  // 验证每个标签
  for (const tag of tags) {
    if (typeof tag !== 'string' || tag.length > 50) {
      return { 'isValid': false, 'message': '每个标签必须是字符串且长度不超过50个字符' };
    }
  }

  return { 'isValid': true };
};

/**
 * 清理用户输入的文本，移除危险字符
 * @param text 用户输入的文本，可为null或undefined
 * @returns 清理后的文本
 */
export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) {
    return '';
  }

  // 替换<和>为HTML实体
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
