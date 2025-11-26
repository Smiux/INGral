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
          '页面导航'
        );

        keyboardNavigationManager.registerShortcut(
          'nav-articles',
          { key: KeyCode.A, altKey: true },
          () => window.location.href = '/articles',
          '导航到文章列表',
          '页面导航'
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
          '页面导航'
        );

        keyboardNavigationManager.registerShortcut(
          'nav-dashboard',
          { key: KeyCode.D, altKey: true },
          () => window.location.href = '/dashboard',
          '导航到仪表板',
          '页面导航'
        );

        // 内容创建快捷键
        keyboardNavigationManager.registerShortcut(
          'create-article',
          { key: KeyCode.N, altKey: true },
          () => window.location.href = '/create',
          '创建新文章',
          '内容操作'
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
