/**
 * 无障碍访问工具
 * 
 * 功能特性：
 * - 屏幕阅读器通知支持
 * - 焦点管理
 * - 焦点陷阱
 * - 键盘导航支持
 * - 无障碍属性检查
 */

/**
 * ARIA角色类型定义
 */
export type AriaRole = 
  | 'button'
  | 'link'
  | 'checkbox'
  | 'radio'
  | 'dialog'
  | 'alert'
  | 'status'
  | 'navigation'
  | 'menu'
  | 'menuitem'
  | 'list'
  | 'listitem'
  | 'tab'
  | 'tabpanel'
  | 'combobox'
  | 'grid'
  | 'gridcell'
  | 'row'
  | 'cell';

/**
 * 屏幕阅读器通知工具
 */
export const screenReaderAnnouncer = {
  // 通知元素
  announcementElement: null as HTMLElement | null,
  
  /**
   * 初始化屏幕阅读器通知
   * 创建一个用于发送屏幕阅读器通知的元素
   */
  init: (): void => {
    // 检查是否已经创建了通知元素
    if (screenReaderAnnouncer.announcementElement) return;
    
    // 创建一个用于屏幕阅读器通知的元素
    screenReaderAnnouncer.announcementElement = document.createElement('div');
    screenReaderAnnouncer.announcementElement.setAttribute('role', 'status');
    screenReaderAnnouncer.announcementElement.setAttribute('aria-live', 'polite');
    screenReaderAnnouncer.announcementElement.setAttribute('aria-atomic', 'true');
    screenReaderAnnouncer.announcementElement.style.position = 'absolute';
    screenReaderAnnouncer.announcementElement.style.left = '-10000px';
    screenReaderAnnouncer.announcementElement.style.top = 'auto';
    screenReaderAnnouncer.announcementElement.style.width = '1px';
    screenReaderAnnouncer.announcementElement.style.height = '1px';
    screenReaderAnnouncer.announcementElement.style.overflow = 'hidden';
    document.body.appendChild(screenReaderAnnouncer.announcementElement);
  },
  
  /**
   * 初始化屏幕阅读器通知（别名，向后兼容）
   */
  initialize: (): void => {
    screenReaderAnnouncer.init();
  },
  
  /**
   * 发送屏幕阅读器通知
   * @param message 通知消息
   * @param priority 优先级：'polite'（默认）、'assertive' 或 boolean（true 为 assertive，false 为 polite）
   */
  announce: (message: string, priority: 'polite' | 'assertive' | boolean | undefined = 'polite'): void => {
    // 处理布尔值优先级，兼容旧代码
    const priorityValue = typeof priority === 'boolean' ? (priority ? 'assertive' : 'polite') : priority;
    
    // 初始化通知元素
    screenReaderAnnouncer.init();
    
    if (screenReaderAnnouncer.announcementElement) {
      // 设置通知优先级
      screenReaderAnnouncer.announcementElement.setAttribute('aria-live', priorityValue);
      
      // 使用 setTimeout 确保 DOM 更新
      setTimeout(() => {
        screenReaderAnnouncer.announcementElement!.textContent = '';
        
        setTimeout(() => {
          screenReaderAnnouncer.announcementElement!.textContent = message;
        }, 100);
      }, 100);
    }
  },
  
  /**
   * 发送状态通知
   * @param message 状态消息
   */
  announceStatus: (message: string): void => {
    screenReaderAnnouncer.announce(message, 'polite');
  },
  
  /**
   * 发送错误通知
   * @param message 错误消息
   */
  announceError: (message: string): void => {
    screenReaderAnnouncer.announce(message, 'assertive');
  },
  
  /**
   * 发送成功通知
   * @param message 成功消息
   */
  announceSuccess: (message: string): void => {
    screenReaderAnnouncer.announce(message, 'polite');
  }
};

/**
 * 焦点管理工具
 */
export const focusManager = {
  // 保存的焦点元素
  savedFocus: null as HTMLElement | null,
  
  /**
   * 聚焦到指定元素
   * @param element 要聚焦的元素
   */
  focus: (element: HTMLElement | null | undefined): void => {
    if (element && element.focus) {
      element.focus();
    }
  },
  
  /**
   * 保存当前焦点元素
   */
  saveFocus: (): void => {
    focusManager.savedFocus = document.activeElement as HTMLElement || null;
  },
  
  /**
   * 恢复焦点到之前保存的元素
   */
  restoreFocus: (): void => {
    focusManager.focus(focusManager.savedFocus);
  },
  
  /**
   * 陷阱焦点在指定元素内
   * 当用户按下 Tab 键时，焦点会在元素内的第一个和最后一个焦点元素之间循环
   * @param element 要陷阱焦点的元素
   */
  trapFocus: (element: HTMLElement): void => {
    const focusableElements = Array.from(element.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )) as HTMLElement[];
    
    if (focusableElements.length === 0) return;
    
    // 确保数组访问安全
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        // Shift + Tab 组合键
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab 键
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
  },
  
  /**
   * 聚焦到元素内的第一个可聚焦元素
   * @param element 容器元素
   */
  focusFirstElement: (element: HTMLElement): void => {
    const focusableElements = Array.from(element.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'  
    )) as HTMLElement[];
    
    if (focusableElements.length > 0) {
      focusManager.focus(focusableElements[0]);
    }
  },
  
  /**
   * 聚焦到元素内的最后一个可聚焦元素
   * @param element 容器元素
   */
  focusLastElement: (element: HTMLElement): void => {
    const focusableElements = Array.from(element.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'  
    )) as HTMLElement[];
    
    if (focusableElements.length > 0) {
      focusManager.focus(focusableElements[focusableElements.length - 1]);
    }
  }
};

/**
 * 无障碍工具函数集合
 */
export const accessibilityUtils = {
  /**
   * 生成唯一的ARIA ID
   * @param prefix ID前缀
   * @returns 唯一的ARIA ID
   */
  generateAriaId: (prefix: string = 'aria'): string => {
    return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
  },
  
  /**
   * 检查元素是否可见
   * @param element 要检查的元素
   * @returns 元素是否可见
   */
  isElementVisible: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },
  
  /**
   * 滚动到指定元素
   * @param element 要滚动到的元素
   * @param behavior 滚动行为：'smooth'（默认）或 'auto'
   */
  scrollToElement: (element: HTMLElement, behavior: ScrollBehavior = 'smooth'): void => {
    element.scrollIntoView({ behavior, block: 'center', inline: 'center' });
  },
  
  /**
    * 添加键盘导航支持
    * @param container 容器元素
    * @param items 可导航的项目数组
    * @param onSelect 选择项目时的回调函数
    */
  addKeyboardNavigation: (
    container: HTMLElement,
    items: HTMLElement[],
    onSelect: (index: number) => void
  ): void => {
    if (items.length === 0) return;
    
    let currentIndex = 0;
    
    // 聚焦第一个项目
    focusManager.focus(items[0]);
    
    container.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          currentIndex = Math.max(0, currentIndex - 1);
          focusManager.focus(items[currentIndex]);
          break;
          
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          currentIndex = Math.min(items.length - 1, currentIndex + 1);
          focusManager.focus(items[currentIndex]);
          break;
          
        case 'Enter':
        case ' ': // Spacebar
          event.preventDefault();
          onSelect(currentIndex);
          break;
          
        case 'Escape':
          event.preventDefault();
          container.blur();
          break;
          
        default:
          break;
      }
    });
  },
  
  /**
   * 检查无障碍属性
   * @param element 要检查的元素
   * @returns 无障碍问题数组
   */
  checkAccessibilityAttributes: (element: HTMLElement): string[] => {
    const issues: string[] = [];
    
    // 检查 ARIA 角色是否有相应的属性
    const role = element.getAttribute('role') as AriaRole | null;
    
    if (role) {
      switch (role) {
        case 'button':
          // 检查是否有可访问名称
          if (!element.textContent && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
            issues.push('Button role requires an accessible name (textContent, aria-label, or aria-labelledby)');
          }
          break;
          
        case 'link':
          // 检查是否有 href 属性
          if (!element.hasAttribute('href')) {
            issues.push('Link role requires an href attribute');
          }
          // 检查是否有可访问名称
          if (!element.textContent && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
            issues.push('Link role requires an accessible name');
          }
          break;
          
        case 'checkbox':
          // 检查是否有 aria-checked 属性
          if (!element.hasAttribute('aria-checked')) {
            issues.push('Checkbox role requires an aria-checked attribute');
          }
          break;
          
        case 'radio':
          // 检查是否有 aria-checked 属性
          if (!element.hasAttribute('aria-checked')) {
            issues.push('Radio role requires an aria-checked attribute');
          }
          break;
          
        default:
          break;
      }
    }
    
    return issues;
  },
  
  /**
   * 生成无障碍名称
   * @param element 要生成名称的元素
   * @returns 无障碍名称
   */
  generateAccessibleName: (element: HTMLElement): string => {
    // 优先使用 aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel;
    }
    
    // 然后使用 aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelledElement = document.getElementById(ariaLabelledBy);
      if (labelledElement) {
        return labelledElement.textContent || '';
      }
    }
    
    // 最后使用元素文本
    return element.textContent || '';
  }
};

// 导出单独的函数以保持向后兼容性
export function announce(message: string, priority: 'polite' | 'assertive' | boolean | undefined = 'polite'): void {
  screenReaderAnnouncer.announce(message, priority);
}

export function focusElement(element: HTMLElement | null): void {
  focusManager.focus(element);
}

export function saveFocus(): void {
  focusManager.saveFocus();
}

export function restoreFocus(): void {
  focusManager.restoreFocus();
}

export function trapFocus(element: HTMLElement): void {
  focusManager.trapFocus(element);
}
