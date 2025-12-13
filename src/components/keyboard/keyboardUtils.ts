import { useEffect } from 'react';
import { keyboardNavigationManager, KeyCode } from '../../utils/keyboardNavigation';

/**
 * Hook for registering global keyboard shortcuts in the application
 * Sets up navigation and common action shortcuts
 */
export const useGlobalKeyboardShortcuts = () => {
  useEffect(() => {
    // 注册常用的导航快捷键
    const registerGlobalShortcuts = () => {
      // 页面导航快捷键
      keyboardNavigationManager.registerShortcut(
        'nav-home',
        { key: KeyCode.H, altKey: true },
        () => window.location.href = '/',
        '导航到首页',
        '页面导航',
      );

      keyboardNavigationManager.registerShortcut(
        'nav-articles',
        { key: KeyCode.A, altKey: true },
        () => window.location.href = '/articles',
        '导航到文章列表',
        '页面导航',
      );

      keyboardNavigationManager.registerShortcut(
        'nav-search',
        { key: KeyCode.F, altKey: true },
        () => {
          window.location.href = '/search';
          // 尝试聚焦搜索输入框
          setTimeout(() => {
            const searchInput = document.querySelector('input[role="searchbox"]');
            if (searchInput) {
              (searchInput as HTMLInputElement).focus();
            }
          }, 100);
        },
        '导航到搜索页面',
        '页面导航',
      );

      keyboardNavigationManager.registerShortcut(
        'nav-dashboard',
        { key: KeyCode.D, altKey: true },
        () => window.location.href = '/dashboard',
        '导航到仪表板',
        '页面导航',
      );

      // 内容创建快捷键
      keyboardNavigationManager.registerShortcut(
        'create-article',
        { key: KeyCode.N, altKey: true },
        () => window.location.href = '/create',
        '创建新文章',
        '内容操作',
      );

      // 图谱操作快捷键 - 全局可用
      keyboardNavigationManager.registerShortcut(
        'graph-undo',
        { key: KeyCode.Z, ctrlKey: true },
        () => {
          // 查找并触发撤销按钮
          const undoBtn = document.querySelector('[title="撤销"] button');
          if (undoBtn) {
            (undoBtn as HTMLButtonElement).click();
          }
        },
        '撤销操作',
        '图谱操作',
      );

      keyboardNavigationManager.registerShortcut(
        'graph-redo',
        { key: KeyCode.Y, ctrlKey: true },
        () => {
          // 查找并触发重做按钮
          const redoBtn = document.querySelector('[title="重做"] button');
          if (redoBtn) {
            (redoBtn as HTMLButtonElement).click();
          }
        },
        '重做操作',
        '图谱操作',
      );

      keyboardNavigationManager.registerShortcut(
        'graph-redo-shift',
        { key: KeyCode.Z, ctrlKey: true, shiftKey: true },
        () => {
          // 查找并触发重做按钮（Shift+Ctrl+Z 替代方案）
          const redoBtn = document.querySelector('[title="重做"] button');
          if (redoBtn) {
            (redoBtn as HTMLButtonElement).click();
          }
        },
        '重做操作（替代快捷键）',
        '图谱操作',
      );

      keyboardNavigationManager.registerShortcut(
        'graph-toggle-right-panel',
        { key: KeyCode.R, ctrlKey: true },
        () => {
          // 查找并触发右侧面板切换按钮
          const toggleBtn = document.querySelector('[title*="右侧面板"] button');
          if (toggleBtn) {
            (toggleBtn as HTMLButtonElement).click();
          }
        },
        '切换右侧面板显示',
        '图谱操作',
      );

      keyboardNavigationManager.registerShortcut(
        'graph-show-shortcuts',
        { key: KeyCode.SLASH, ctrlKey: true },
        () => {
          // 查找并触发快捷键按钮
          const shortcutBtn = document.querySelector('button[aria-label="显示键盘快捷键"]');
          if (shortcutBtn) {
            (shortcutBtn as HTMLButtonElement).click();
          }
        },
        '显示键盘快捷键',
        '图谱操作',
      );
    };

    // 注册快捷键
    registerGlobalShortcuts();

    // 清理函数
    return () => {
      // 注销所有快捷键 - 由于KeyboardNavigationManager没有clearShortcuts方法，我们不做任何清理
      // 因为这是单例模式，快捷键会在整个应用生命周期中保持
    };
  }, []);
};