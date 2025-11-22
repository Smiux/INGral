/**
 * 可访问性工具类
 * 提供屏幕阅读器支持和ARIA属性管理功能
 */

/**
 * ARIA角色类型定义
 */
export type AriaRole = 
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'button'
  | 'checkbox'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'form'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'main'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'navigation'
  | 'note'
  | 'option'
  | 'presentation'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'tab'
  | 'tablist'
  | 'tabpanel'
  | 'textbox'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem';

/**
 * 屏幕阅读器通知管理器类
 */
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer;
  private announcerElement: HTMLElement | null = null;

  /**
   * 获取单例实例
   */
  static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer();
    }
    return ScreenReaderAnnouncer.instance;
  }

  /**
   * 初始化屏幕阅读器通知元素
   */
  initialize(): void {
    // 检查是否已存在通知元素
    if (!this.announcerElement) {
      // 创建通知元素
      this.announcerElement = document.createElement('div');
      
      // 设置ARIA属性
      this.announcerElement.setAttribute('aria-live', 'polite');
      this.announcerElement.setAttribute('class', 'sr-only');
      
      // 添加到DOM
      document.body.appendChild(this.announcerElement);
    }
  }

  /**
   * 发送通知到屏幕阅读器
   * @param message 通知消息
   * @param urgent 是否为紧急通知（使用assertive模式）
   */
  announce(message: string, urgent: boolean = false): void {
    // 确保通知元素存在
    if (!this.announcerElement) {
      this.initialize();
    }

    if (this.announcerElement) {
      // 清除之前的内容
      this.announcerElement.textContent = '';
      
      // 设置ARIA活动区域模式
      this.announcerElement.setAttribute('aria-live', urgent ? 'assertive' : 'polite');
      
      // 触发重绘
      void this.announcerElement.offsetWidth;
      
      // 设置消息内容
      this.announcerElement.textContent = message;
    }
  }

  /**
   * 发送状态变化通知
   * @param message 状态消息
   */
  announceStatus(message: string): void {
    this.announce(message, false);
  }

  /**
   * 发送错误通知
   * @param message 错误消息
   */
  announceError(message: string): void {
    this.announce(`错误: ${message}`, true);
  }

  /**
   * 发送成功通知
   * @param message 成功消息
   */
  announceSuccess(message: string): void {
    this.announce(`成功: ${message}`, true);
  }

  /**
   * 发送警告通知
   * @param message 警告消息
   */
  announceWarning(message: string): void {
    this.announce(`警告: ${message}`, true);
  }

  /**
   * 发送加载通知
   * @param message 加载消息
   */
  announceLoading(message: string): void {
    this.announce(`加载中: ${message}`, false);
  }

  /**
   * 发送完成通知
   * @param message 完成消息
   */
  announceCompletion(message: string): void {
    this.announce(`已完成: ${message}`, true);
  }

  /**
   * 清理通知元素
   */
  destroy(): void {
    if (this.announcerElement && this.announcerElement.parentNode) {
      this.announcerElement.parentNode.removeChild(this.announcerElement);
      this.announcerElement = null;
    }
  }
}

/**
 * 屏幕阅读器通知管理器单例实例
 */
export const screenReaderAnnouncer = ScreenReaderAnnouncer.getInstance();

/**
 * 焦点管理器类
 */
export class FocusManager {
  private static instance: FocusManager;
  private focusStack: HTMLElement[] = [];

  /**
   * 获取单例实例
   */
  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  /**
   * 保存当前焦点
   */
  saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }

  /**
   * 恢复上一个保存的焦点
   */
  restoreFocus(): void {
    const lastFocusedElement = this.focusStack.pop();
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  /**
   * 聚焦到元素
   * @param element 要聚焦的元素或选择器
   * @param options 聚焦选项
   */
  focus(element: HTMLElement | string, options?: FocusOptions): boolean {
    let targetElement: HTMLElement | null = null;

    if (typeof element === 'string') {
      targetElement = document.querySelector(element);
    } else {
      targetElement = element;
    }

    if (targetElement) {
      // 确保元素可聚焦
      if (!targetElement.hasAttribute('tabindex') &&
          !targetElement.matches('button, [href], input, select, textarea')) {
        targetElement.setAttribute('tabindex', '-1');
      }

      targetElement.focus(options);
      return true;
    }

    return false;
  }

  /**
   * 将焦点设置到第一个可聚焦元素
   * @param container 容器元素或选择器
   */
  focusFirstElement(container: HTMLElement | string): boolean {
    let containerElement: HTMLElement | null = null;

    if (typeof container === 'string') {
      containerElement = document.querySelector(container);
    } else {
      containerElement = container;
    }

    if (containerElement) {
      const focusable = containerElement.querySelector(
        'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      );

      if (focusable) {
        (focusable as HTMLElement).focus();
        return true;
      }
    }

    return false;
  }

  /**
   * 清空焦点堆栈
   */
  clearStack(): void {
    this.focusStack = [];
  }
}

/**
 * 辅助功能工具函数
 */
export const accessibilityUtils = {
  /**
   * 检查屏幕阅读器是否活跃
   */
  isScreenReaderActive(): boolean {
    // 这个函数提供一个简单的启发式检查
    // 实际应用中可能需要更复杂的检测方法
    const hasScreenReader = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return hasScreenReader;
  },

  /**
   * 获取适合屏幕阅读器的替代文本
   * @param text 原始文本
   * @param maxLength 最大长度
   */
  getAccessibleText(text: string, maxLength: number = 100): string {
    // 去除多余的空白字符
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // 截断过长文本
    if (cleanText.length > maxLength) {
      return cleanText.substring(0, maxLength) + '...';
    }
    
    return cleanText;
  },

  /**
   * 生成唯一的ARIA ID
   */
  generateAriaId(prefix: string = 'aria'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  },

  /**
   * 确保元素具有适当的ARIA属性
   * @param element 元素
   * @param role ARIA角色
   * @param ariaAttributes ARIA属性对象
   */
  ensureAriaAttributes(element: HTMLElement, role: AriaRole, ariaAttributes: Record<string, string> = {}): void {
    // 设置角色
    element.setAttribute('role', role);
    
    // 设置其他ARIA属性
    Object.entries(ariaAttributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  },

  /**
   * 创建ARIA标签
   * @param label 主要标签
   * @param describedby 描述元素ID
   */
  createAriaLabel(label: string, describedby?: string): Record<string, string> {
    const attributes: Record<string, string> = {
      'aria-label': label
    };

    if (describedby) {
      attributes['aria-describedby'] = describedby;
    }

    return attributes;
  },

  /**
   * 检查元素是否可访问
   * @param element 元素
   */
  isElementAccessible(element: HTMLElement): boolean {
    // 检查元素是否可见
    const isVisible = element.offsetParent !== null &&
                     window.getComputedStyle(element).display !== 'none' &&
                     window.getComputedStyle(element).visibility !== 'hidden';
    
    // 检查元素是否启用
    const isEnabled = !element.hasAttribute('disabled');
    
    // 检查元素是否可聚焦
    const isFocusable = element.hasAttribute('tabindex') ||
                       element.matches('button, [href], input, select, textarea');
    
    return isVisible && isEnabled && isFocusable;
  }
};

// 创建单例实例
export const focusManager = FocusManager.getInstance();

/**
 * React Hook for screen reader announcements
 */
export const useScreenReaderAnnouncer = () => {
  return {
    announce: (message: string, urgent?: boolean) => screenReaderAnnouncer.announce(message, urgent),
    announceStatus: (message: string) => screenReaderAnnouncer.announceStatus(message),
    announceError: (message: string) => screenReaderAnnouncer.announceError(message),
    announceSuccess: (message: string) => screenReaderAnnouncer.announceSuccess(message),
    announceWarning: (message: string) => screenReaderAnnouncer.announceWarning(message),
    announceLoading: (message: string) => screenReaderAnnouncer.announceLoading(message),
    announceCompletion: (message: string) => screenReaderAnnouncer.announceCompletion(message)
  };
};

/**
 * React Hook for focus management
 */
export const useFocusManager = () => {
  return {
    saveFocus: () => focusManager.saveFocus(),
    restoreFocus: () => focusManager.restoreFocus(),
    focus: (element: HTMLElement | string, options?: FocusOptions) => 
      focusManager.focus(element, options),
    focusFirstElement: (container: HTMLElement | string) => 
      focusManager.focusFirstElement(container),
    clearStack: () => focusManager.clearStack()
  };
};
