import React, { useState, useEffect, useRef } from 'react';
import { keyboardNavigationManager, KeyCode, ShortcutRegistration } from '../../utils/keyboardNavigation';
import { screenReaderAnnouncer } from '../../utils/accessibility';
import { X, HelpCircle, ChevronsDown, ChevronsUp } from 'lucide-react';

// 快捷键信息模态框组件
export const KeyboardShortcuts: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const modalRef = useRef<HTMLDivElement>(null);

  // 注册显示快捷键帮助的快捷键
  useEffect(() => {
    const toggleShortcutsHelp = () => setIsOpen(prev => {
      const newValue = !prev;
      if (newValue) {
        screenReaderAnnouncer.announce('键盘快捷键帮助已打开。使用Tab键导航，Escape键关闭。', false);
      } else {
        screenReaderAnnouncer.announce('键盘快捷键帮助已关闭。', false);
      }
      return newValue;
    });
    
    // 注册快捷键Alt+K用于打开/关闭快捷键帮助
    keyboardNavigationManager.registerShortcut(
      'toggle-shortcuts-help',
      { key: KeyCode.K, altKey: true },
      toggleShortcutsHelp,
      '打开/关闭快捷键帮助',
      '界面导航'
    );

    // 为ESC键添加关闭模态框的功能
    const closeModal = (event: KeyboardEvent) => {
      if (event.key === KeyCode.ESCAPE && isOpen) {
        setIsOpen(false);
        screenReaderAnnouncer.announce('键盘快捷键帮助已关闭。', false);
      }
    };

    window.addEventListener('keydown', closeModal);

    // 清理
    return () => {
      keyboardNavigationManager.unregisterShortcut('toggle-shortcuts-help');
      window.removeEventListener('keydown', closeModal);
    };
  }, [isOpen]);

  // 获取所有快捷键并按组分类
  const getGroupedShortcuts = () => {
    const shortcuts = keyboardNavigationManager.getAllShortcuts();
    const grouped: Record<string, ShortcutRegistration[]> = {};
    
    // 按组对快捷键进行分组
    shortcuts.forEach(shortcut => {
      if (shortcut.group) {
        const groupKey = shortcut.group;
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        // 这里grouped[groupKey]肯定存在，因为上面已经检查并初始化了
        grouped[groupKey].push(shortcut);
      }
    });
    
    return grouped;
  };

  // 切换组的展开状态
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // 渲染快捷键组合
  const renderKeyBinding = (shortcut: ShortcutRegistration) => {
    const { binding } = shortcut;
    const keys: string[] = [];

    if (binding.ctrlKey) keys.push('Ctrl');
    if (binding.metaKey) keys.push('Cmd');
    if (binding.altKey) keys.push('Alt');
    if (binding.shiftKey) keys.push('Shift');
    keys.push(binding.key.toUpperCase());

    return (
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <kbd
            key={index}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-medium"
          >
            {key}
          </kbd>
        ))}
      </div>
    );
  };

  const groupedShortcuts = getGroupedShortcuts();

  // 如果模态框未打开，渲染一个帮助按钮
  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          screenReaderAnnouncer.announce('键盘快捷键帮助已打开。使用Tab键导航，Escape键关闭。', false);
        }}
        aria-label="查看键盘快捷键"
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <HelpCircle size={20} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setIsOpen(false)}>
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
      >
        {/* 模态框标题 */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 id="keyboard-shortcuts-title" className="text-xl font-semibold">键盘快捷键</h2>
          <button 
            onClick={() => {
              setIsOpen(false);
              screenReaderAnnouncer.announce('键盘快捷键帮助已关闭。', false);
            }}
            aria-label="关闭"
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* 快捷键列表 */}
        <div className="overflow-y-auto p-4 flex-grow">
          {Object.entries(groupedShortcuts).map(([group, shortcuts]) => (
            <div key={group} className="mb-6">
              <button 
                onClick={() => toggleGroup(group)}
                className="flex items-center justify-between w-full text-left mb-2 font-medium"
              >
                <span className="capitalize">{group}</span>
                {expandedGroups[group] ? 
                  <ChevronsUp size={16} /> : 
                  <ChevronsDown size={16} />
                }
              </button>
              
              {(expandedGroups[group] ?? true) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                  {shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                      <span className="text-sm">{shortcut.description}</span>
                      {renderKeyBinding(shortcut)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 提示信息 */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
          按 Alt+K 键快速打开/关闭此帮助窗口
        </div>
      </div>
    </div>
  );
};

// 注册应用全局快捷键的Hook
export const useGlobalKeyboardShortcuts = () => {
  useEffect(() => {
    // 注册常用的导航快捷键
    const registerGlobalShortcuts = () => {
      // 页面导航快捷键
      keyboardNavigationManager.registerShortcut(
        'navigate-home',
        { key: KeyCode.H, altKey: true },
        () => window.location.href = '/',
        '导航到首页',
        '页面导航'
      );

      keyboardNavigationManager.registerShortcut(
        'navigate-articles',
        { key: KeyCode.A, altKey: true },
        () => window.location.href = '/articles',
        '导航到文章列表',
        '页面导航'
      );

      keyboardNavigationManager.registerShortcut(
        'navigate-search',
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
        'navigate-dashboard',
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

      // 焦点管理快捷键
      keyboardNavigationManager.registerShortcut(
        'focus-main-content',
        { key: KeyCode.SPACE, altKey: true },
        () => {
          const mainContent = document.querySelector('main');
          if (mainContent) {
            const firstFocusable = mainContent.querySelector(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])' 
            );
            if (firstFocusable) {
              (firstFocusable as HTMLElement).focus();
            } else {
              // 如果没有可聚焦元素，将main元素设为可聚焦并聚焦
              if (mainContent.getAttribute('tabindex') === null) {
                mainContent.setAttribute('tabindex', '-1');
              }
              (mainContent as HTMLElement).focus();
            }
          }
        },
        '聚焦到主内容区域',
        '焦点管理'
      );
    };

    // 注册快捷键
    registerGlobalShortcuts();

    // 添加全局键盘事件监听器
    window.addEventListener('keydown', keyboardNavigationManager.handleKeyboardEvent);

    // 清理
    return () => {
      // 移除所有注册的快捷键
      ['navigate-home', 'navigate-articles', 'navigate-search', 'navigate-dashboard', 
       'create-article', 'focus-main-content'].forEach(id => {
        keyboardNavigationManager.unregisterShortcut(id);
      });

      // 移除事件监听器
      window.removeEventListener('keydown', keyboardNavigationManager.handleKeyboardEvent);
    };
  }, []);
};
