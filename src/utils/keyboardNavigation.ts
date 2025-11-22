/**
 * 键盘导航助手工具类
 * 提供键盘事件处理、快捷键管理和焦点控制功能
 */

export enum KeyCode {
  // 字母键
  A = 'a',
  B = 'b',
  C = 'c',
  D = 'd',
  E = 'e',
  F = 'f',
  G = 'g',
  H = 'h',
  I = 'i',
  J = 'j',
  K = 'k',
  L = 'l',
  M = 'm',
  N = 'n',
  O = 'o',
  P = 'p',
  Q = 'q',
  R = 'r',
  S = 's',
  T = 't',
  U = 'u',
  V = 'v',
  W = 'w',
  X = 'x',
  Y = 'y',
  Z = 'z',
  // 数字键
  DIGIT_0 = '0',
  DIGIT_1 = '1',
  DIGIT_2 = '2',
  DIGIT_3 = '3',
  DIGIT_4 = '4',
  DIGIT_5 = '5',
  DIGIT_6 = '6',
  DIGIT_7 = '7',
  DIGIT_8 = '8',
  DIGIT_9 = '9',
  // 功能键
  F1 = 'F1',
  F2 = 'F2',
  F3 = 'F3',
  F4 = 'F4',
  F5 = 'F5',
  F6 = 'F6',
  F7 = 'F7',
  F8 = 'F8',
  F9 = 'F9',
  F10 = 'F10',
  F11 = 'F11',
  F12 = 'F12',
  // 特殊键
  TAB = 'Tab',
  ENTER = 'Enter',
  ESCAPE = 'Escape',
  SPACE = ' ',
  BACKSPACE = 'Backspace',
  DELETE = 'Delete',
  ARROW_UP = 'ArrowUp',
  ARROW_DOWN = 'ArrowDown',
  ARROW_LEFT = 'ArrowLeft',
  ARROW_RIGHT = 'ArrowRight',
  PAGE_UP = 'PageUp',
  PAGE_DOWN = 'PageDown',
  HOME = 'Home',
  END = 'End',
  // 修饰键
  SHIFT = 'Shift',
  CONTROL = 'Control',
  ALT = 'Alt',
  META = 'Meta', // Windows 键或 macOS Command 键
}

export interface KeyBinding {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

interface ShortcutHandler {
  (event: KeyboardEvent): void;
}

export interface ShortcutRegistration {
  binding: KeyBinding;
  handler: ShortcutHandler;
  description: string;
  group: string;
}

/**
 * 键盘导航管理器类
 */
export class KeyboardNavigationManager {
  private shortcuts: Map<string, ShortcutRegistration> = new Map();
  private isActive: boolean = true;
  private focusTrapStack: HTMLElement[] = [];

  /**
   * 注册键盘快捷键
   * @param id 快捷键唯一标识符
   * @param binding 键绑定配置
   * @param handler 处理函数
   * @param description 快捷键描述
   * @param group 快捷键分组
   */
  registerShortcut(
    id: string,
    binding: KeyBinding,
    handler: ShortcutHandler,
    description: string = '',
    group: string = 'general'
  ): void {
    this.shortcuts.set(id, {
      binding,
      handler,
      description,
      group,
    });
  }

  /**
   * 注销键盘快捷键
   * @param id 快捷键唯一标识符
   */
  unregisterShortcut(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * 启用键盘导航
   */
  enable(): void {
    this.isActive = true;
  }

  /**
   * 禁用键盘导航
   */
  disable(): void {
    this.isActive = false;
  }

  /**
   * 切换键盘导航状态
   */
  toggle(): void {
    this.isActive = !this.isActive;
  }

  /**
   * 获取所有注册的快捷键
   * @returns 快捷键配置数组
   */
  getAllShortcuts(): ShortcutRegistration[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * 获取指定分组的快捷键
   * @param group 分组名称
   * @returns 快捷键配置数组
   */
  getShortcutsByGroup(group: string): ShortcutRegistration[] {
    return Array.from(this.shortcuts.values()).filter(shortcut => shortcut.group === group);
  }

  /**
   * 处理键盘事件
   * @param event 键盘事件
   */
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.isActive) return;

    // 忽略在输入框、文本域等元素中的快捷键（可以根据需要调整）
    const target = event.target as HTMLElement;
    const inputTypes = ['INPUT', 'TEXTAREA', 'SELECT', 'CONTENTEDITABLE'];
    
    if (target && (
      inputTypes.includes(target.tagName) || 
      target.isContentEditable
    )) {
      return;
    }

    // 查找匹配的快捷键
    this.shortcuts.forEach((shortcut) => {
      const { binding } = shortcut;
      
      if (
        event.key === binding.key &&
        event.altKey === !!binding.altKey &&
        event.ctrlKey === !!binding.ctrlKey &&
        event.metaKey === !!binding.metaKey &&
        event.shiftKey === !!binding.shiftKey
      ) {
        // 阻止默认行为
        event.preventDefault();
        event.stopPropagation();
        
        // 执行处理函数
        shortcut.handler(event);
      }
    });
  }

  /**
   * 激活焦点陷阱
   * @param element 要捕获焦点的元素
   */
  activateFocusTrap(element: HTMLElement): void {
    if (!element) return;
    
    // 将元素添加到焦点陷阱堆栈
    this.focusTrapStack.push(element);
    
    // 找到第一个可聚焦的元素
    const firstFocusable = this.getFirstFocusableElement(element);
    if (firstFocusable) {
      firstFocusable.focus();
    }
    
    // 添加键盘事件监听器
    element.addEventListener('keydown', this.handleFocusTrapNavigation);
  }

  /**
   * 停用焦点陷阱
   */
  deactivateFocusTrap(): void {
    const element = this.focusTrapStack.pop();
    
    if (element) {
      element.removeEventListener('keydown', this.handleFocusTrapNavigation);
      
      // 恢复焦点到上一个陷阱或文档主体
      if (this.focusTrapStack.length > 0) {
        const previousTrap = this.focusTrapStack[this.focusTrapStack.length - 1];
        if (previousTrap) {
          const firstFocusable = this.getFirstFocusableElement(previousTrap);
          if (firstFocusable) firstFocusable.focus();
        }
      }
    }
  }

  /**
   * 处理焦点陷阱内的导航
   * @param event 键盘事件
   */
  private handleFocusTrapNavigation = (event: KeyboardEvent): void => {
    // 只有在按Tab键且焦点陷阱堆栈不为空时才处理
    if (event.key !== KeyCode.TAB || this.focusTrapStack.length === 0) return;
    
    // 确保currentTrap存在
    const currentTrap = this.focusTrapStack[this.focusTrapStack.length - 1];
    if (!currentTrap) return;
    
    const focusableElements = this.getFocusableElements(currentTrap);
    
    if (focusableElements.length === 0) return;
    
    // 获取当前焦点元素在列表中的索引，并确保它存在
    const activeElement = document.activeElement as HTMLElement | null;
    let currentIndex = activeElement ? focusableElements.findIndex(el => el === activeElement) : -1;
    
    // 如果当前元素不在列表中或不存在，默认为0
    if (currentIndex === -1) currentIndex = 0;
    
    // 确定下一个要聚焦的元素
    let nextIndex: number;
    if (event.shiftKey) {
      // Shift+Tab 向后导航
      nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
    } else {
      // Tab 向前导航
      nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
    }
    
    // 阻止默认行为并设置焦点
    event.preventDefault();
    focusableElements[nextIndex]?.focus();
  };

  /**
   * 获取元素内所有可聚焦的元素
   * @param container 容器元素
   * @returns 可聚焦元素数组
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ))
    .filter((el): el is HTMLElement => {
      // 排除隐藏或禁用的元素
      const isDisabled = (el as HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement).disabled;
      const style = window.getComputedStyle(el);
      
      return (
        el.offsetParent !== null &&
        !isDisabled &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      );
    });
  }

  /**
   * 获取元素内第一个可聚焦的元素
   * @param container 容器元素
   * @returns 第一个可聚焦元素
   */
  private getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
    const focusableElements = this.getFocusableElements(container);
    return focusableElements.length > 0 ? (focusableElements[0] || null) : null;
  }
}

// 创建单例实例
export const keyboardNavigationManager = new KeyboardNavigationManager();

/**
 * 焦点管理助手函数
 */
export const focusUtils = {
  /**
   * 将焦点设置到下一个可聚焦元素
   * @param currentElement 当前元素
   */
  focusNextElement(currentElement: HTMLElement): void {
    if (!currentElement) return;
    
    // 获取可聚焦元素
    const focusableElements = Array.from(document.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ));
    
    // 过滤出可见且未禁用的元素
    const visibleElements = focusableElements.filter(el => {
      const isDisabled = (el as HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement).disabled;
      const style = window.getComputedStyle(el);
      return !isDisabled && style.display !== 'none' && style.visibility !== 'hidden';
    });
    
    // 排序元素
    visibleElements.sort((a, b) => {
      const aTabIndex = parseInt(a.getAttribute('tabindex') || '0', 10);
      const bTabIndex = parseInt(b.getAttribute('tabindex') || '0', 10);
      return aTabIndex - bTabIndex;
    });
    
    // 找到当前元素在排序后列表中的索引
    const currentIndex = visibleElements.indexOf(currentElement);
    
    // 如果找到，聚焦到下一个元素，使用可选链确保安全
      if (currentIndex !== -1 && currentIndex < visibleElements.length - 1) {
        visibleElements[currentIndex + 1]?.focus();
      }
  },

  /**
   * 将焦点设置到上一个可聚焦元素
   * @param currentElement 当前元素
   */
  focusPreviousElement(currentElement: HTMLElement): void {
    if (!currentElement) return;
    
    // 获取可聚焦元素
    const focusableElements = Array.from(document.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ));
    
    // 过滤出可见且未禁用的元素
    const visibleElements = focusableElements.filter(el => {
      const isDisabled = (el as HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement).disabled;
      const style = window.getComputedStyle(el);
      return !isDisabled && style.display !== 'none' && style.visibility !== 'hidden';
    });
    
    // 排序元素
    visibleElements.sort((a, b) => {
      const aTabIndex = parseInt(a.getAttribute('tabindex') || '0', 10);
      const bTabIndex = parseInt(b.getAttribute('tabindex') || '0', 10);
      return aTabIndex - bTabIndex;
    });
    
    // 找到当前元素在列表中的索引
    const currentIndex = visibleElements.indexOf(currentElement);
    
    // 如果找到，聚焦到上一个元素，使用可选链确保安全
      if (currentIndex > 0) {
        visibleElements[currentIndex - 1]?.focus();
      }
  },

  /**
   * 将焦点设置到容器内的第一个可聚焦元素
   * @param container 容器元素
   */
  focusFirstElement(container: HTMLElement): void {
    if (!container) return;
    
    const firstFocusable = container.querySelector<HTMLElement>(
      'button:enabled, a[href]:not([disabled]), input:enabled, select:enabled, textarea:enabled, [tabindex]:not([tabindex="-1"]):not([disabled])'
    );
    
    if (firstFocusable) {
      firstFocusable.focus();
    }
  },

  /**
   * 将焦点设置到容器内的最后一个可聚焦元素
   * @param container 容器元素
   */
  focusLastElement(container: HTMLElement): void {
    if (!container) return;
    
    const focusableElements = Array.from(container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ));
    
    // 过滤出可见且未禁用的元素
    const visibleElements = focusableElements.filter(el => {
      // 安全地检查禁用状态
      let isDisabled = false;
      if (el instanceof HTMLInputElement || 
          el instanceof HTMLButtonElement || 
          el instanceof HTMLSelectElement || 
          el instanceof HTMLTextAreaElement) {
        isDisabled = el.disabled;
      }
      const style = window.getComputedStyle(el);
      return !isDisabled && style.display !== 'none' && style.visibility !== 'hidden';
    });
      
      if (visibleElements.length > 0) {
        const lastElement = visibleElements[visibleElements.length - 1];
        lastElement?.focus();
      }
  }
};
