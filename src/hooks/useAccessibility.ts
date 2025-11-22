import React, { useEffect, useRef, useCallback, useState } from 'react';
import { 
  screenReaderAnnouncer, 
  focusManager, 
  accessibilityUtils, 
  AriaRole 
} from '../utils/accessibility';

/**
 * 可访问性属性接口
 */
export interface AccessibilityProps {
  /**
   * ARIA角色
   */
  role?: AriaRole;
  
  /**
   * ARIA标签
   */
  ariaLabel?: string;
  
  /**
   * ARIA描述
   */
  ariaDescription?: string;
  
  /**
   * ARIA描述元素ID
   */
  ariaDescribedby?: string;
  
  /**
   * ARIA标签元素ID
   */
  ariaLabelledby?: string;
  
  /**
   * 是否为禁用状态
   */
  ariaDisabled?: boolean;
  
  /**
   * 状态提示文本
   */
  statusText?: string;
  
  /**
   * 是否为活动状态
   */
  isActive?: boolean;
  
  /**
   * 额外的ARIA属性
   */
  ariaAttributes?: Record<string, string | boolean | number>;
}

/**
 * 可访问性Hook，提供屏幕阅读器支持和ARIA属性管理
 * @param options 可访问性选项
 */
export const useAccessibility = (options: AccessibilityProps = {}) => {
  const {
    role,
    ariaLabel,
    ariaDescription,
    ariaDescribedby,
    ariaLabelledby,
    ariaDisabled,
    statusText,
    isActive = false,
    ariaAttributes = {}
  } = options;

  const ref = useRef<HTMLElement>(null);
  const descriptionIdRef = useRef<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // 生成唯一描述ID
  useEffect(() => {
    if (ariaDescription && !ariaDescribedby) {
      descriptionIdRef.current = accessibilityUtils.generateAriaId('description');
    }
  }, [ariaDescription, ariaDescribedby]);

  // 设置元素的ARIA属性
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // 设置角色
    if (role) {
      element.setAttribute('role', role);
    }

    // 设置标签
    if (ariaLabel) {
      element.setAttribute('aria-label', ariaLabel);
    }

    // 设置描述
    if (ariaDescription && !ariaDescribedby) {
      element.setAttribute('aria-describedby', descriptionIdRef.current);
      
      // 创建或更新描述元素
      let descriptionElement = document.getElementById(descriptionIdRef.current);
      if (!descriptionElement) {
        descriptionElement = document.createElement('div');
        descriptionElement.id = descriptionIdRef.current;
        descriptionElement.className = 'sr-only';
        document.body.appendChild(descriptionElement);
      }
      descriptionElement.textContent = ariaDescription;
    } else if (ariaDescribedby) {
      element.setAttribute('aria-describedby', ariaDescribedby);
    }

    // 设置标签关联
    if (ariaLabelledby) {
      element.setAttribute('aria-labelledby', ariaLabelledby);
    }

    // 设置禁用状态
    if (ariaDisabled !== undefined) {
      element.setAttribute('aria-disabled', ariaDisabled.toString());
    }

    // 设置活动状态
    element.setAttribute('aria-current', isActive ? 'page' : 'false');

    // 设置额外的ARIA属性
    Object.entries(ariaAttributes).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, value.toString());
      }
    });

    // 清理函数
    return () => {
      if (ariaDescription && !ariaDescribedby && descriptionIdRef.current) {
        const descriptionElement = document.getElementById(descriptionIdRef.current);
        if (descriptionElement && descriptionElement.parentNode) {
          descriptionElement.parentNode.removeChild(descriptionElement);
        }
      }
    };
  }, [role, ariaLabel, ariaDescription, ariaDescribedby, ariaLabelledby, ariaDisabled, isActive, ariaAttributes]);

  // 处理键盘焦点事件
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    
    // 如果有状态文本，在获取焦点时通知屏幕阅读器
    if (statusText) {
      screenReaderAnnouncer.announceStatus(statusText);
    }
  }, [statusText]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // 通知屏幕阅读器的方法
  const announce = useCallback((message: string, urgent?: boolean) => {
    screenReaderAnnouncer.announce(message, urgent);
  }, []);

  const announceStatus = useCallback((message: string) => {
    screenReaderAnnouncer.announceStatus(message);
  }, []);

  const announceError = useCallback((message: string) => {
    screenReaderAnnouncer.announceError(message);
  }, []);

  const announceSuccess = useCallback((message: string) => {
    screenReaderAnnouncer.announceSuccess(message);
  }, []);

  // 聚焦到元素的方法
  const focus = useCallback(() => {
    if (ref.current) {
      focusManager.focus(ref.current);
    }
  }, []);

  // 保存和恢复焦点的方法
  const saveFocus = useCallback(() => {
    focusManager.saveFocus();
  }, []);

  const restoreFocus = useCallback(() => {
    focusManager.restoreFocus();
  }, []);

  // 生成可访问性属性对象
  const getAccessibilityProps = useCallback(() => ({
    ref,
    onFocus: handleFocus,
    onBlur: handleBlur,
    tabIndex: ariaDisabled ? -1 : undefined
  }), [handleFocus, handleBlur, ariaDisabled]);

  return {
    // 元素引用
    ref,
    
    // 状态
    isFocused,
    
    // 方法
    announce,
    announceStatus,
    announceError,
    announceSuccess,
    focus,
    saveFocus,
    restoreFocus,
    
    // 工具函数
    getAccessibilityProps,
    
    // 描述ID
    descriptionId: descriptionIdRef.current
  };
};

/**
 * 表单字段可访问性Hook
 * @param label 字段标签
 * @param error 错误消息
 * @param isRequired 是否必填
 */
export const useFormFieldAccessibility = (label: string, error?: string, isRequired: boolean = false) => {
  const [errorId] = useState(() => accessibilityUtils.generateAriaId('error'));
  
  const ariaAttributes: Record<string, string> = {};
  if (error) {
    ariaAttributes['aria-invalid'] = 'true';
    ariaAttributes['aria-describedby'] = errorId;
  }
  
  if (isRequired) {
    ariaAttributes['aria-required'] = 'true';
  }
  
  const { getAccessibilityProps, announceError } = useAccessibility({
    ariaLabel: label,
    ariaAttributes
  });
  
  // 处理错误通知
  useEffect(() => {
    if (error) {
      announceError(error);
    }
  }, [error, announceError]);
  
  return {
    inputProps: {
      ...getAccessibilityProps(),
      ...(isRequired ? { required: true } : {})
    },
    errorProps: {
      id: errorId,
      role: 'alert' as AriaRole,
      'aria-live': 'assertive'
    }
  };
};

/**
 * 模态框可访问性Hook
 */
export const useModalAccessibility = () => {
  const modalRef = useRef<HTMLElement>(null);
  const [initialFocusRef] = useState(() => React.createRef<HTMLElement>());
  
  // 初始化模态框可访问性
  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;
    
    // 保存当前焦点
    focusManager.saveFocus();
    
    // 设置模态框属性
    modalElement.setAttribute('role', 'dialog');
    modalElement.setAttribute('aria-modal', 'true');
    
    // 聚焦到初始元素或模态框第一个可聚焦元素
    setTimeout(() => {
      if (initialFocusRef.current) {
        focusManager.focus(initialFocusRef.current);
      } else {
        focusManager.focusFirstElement(modalElement);
      }
    }, 100);
    
    // 处理焦点陷阱
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // 允许关闭模态框的逻辑通过props传入
        event.stopPropagation();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      // 清理
      document.removeEventListener('keydown', handleKeyDown);
      
      // 恢复焦点
      focusManager.restoreFocus();
    };
  }, [initialFocusRef]);
  
  return {
    modalRef,
    initialFocusRef
  };
};

/**
 * 动态内容区域可访问性Hook
 */
export const useLiveRegion = (initialText: string = '', mode: 'polite' | 'assertive' = 'polite') => {
  const [text, setText] = useState(initialText);
  const regionRef = useRef<HTMLElement>(null);
  
  // 更新活动区域内容
  const updateText = useCallback((newText: string) => {
    setText(newText);
    if (regionRef.current) {
      // 触发屏幕阅读器重新读取
      regionRef.current.textContent = '';
      void regionRef.current.offsetWidth; // 触发重绘
      regionRef.current.textContent = newText;
    }
  }, []);
  
  // 获取活动区域的props
  const getLiveRegionProps = useCallback(() => ({
    ref: regionRef,
    'aria-live': mode,
    'aria-atomic': 'true',
    className: 'sr-only',
    role: 'status' as AriaRole
  }), [mode]);
  
  return {
    text,
    updateText,
    getLiveRegionProps
  };
};
