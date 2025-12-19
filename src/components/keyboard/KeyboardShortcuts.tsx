import React, { useState, useEffect, useRef, useCallback } from 'react';
import { keyboardNavigationManager, KeyCode, type ShortcutRegistration } from '../../utils/keyboardNavigation';
import { screenReaderAnnouncer } from '../../utils/accessibility';
import { X, ChevronsDown, ChevronsUp } from 'lucide-react';

// 快捷键信息模态框组件 - 支持自定义按钮
interface KeyboardShortcutsProps {
   renderButton?: () => React.ReactNode;
  onOpenChange?: () => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ renderButton, onOpenChange }) => {
  // 使用内部状态控制模态框开关
  const [isOpen, setIsOpen] = useState(false);

  // 更新isOpen状态的函数
  const handleIsOpenChange = useCallback((value: boolean) => {
    setIsOpen(value);
    if (onOpenChange) {
      onOpenChange();
    }
  }, [onOpenChange]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const modalRef = useRef<HTMLDivElement>(null);

  // 注册显示快捷键帮助的快捷键
  useEffect(() => {
    const toggleShortcutsHelp = () => {
      const newValue = !isOpen;
      if (newValue) {
        screenReaderAnnouncer.announce('键盘快捷键帮助已打开。使用Tab键导航，Escape键关闭。', false);
      } else {
        screenReaderAnnouncer.announce('键盘快捷键帮助已关闭。', false);
      }
      handleIsOpenChange(newValue);
    };


    // 注册快捷键Alt+K用于打开/关闭快捷键帮助
    keyboardNavigationManager.registerShortcut(
      'toggle-shortcuts-help',
      { 'key': KeyCode.K, 'altKey': true },
      toggleShortcutsHelp,
      '显示或隐藏键盘快捷键帮助',
      '通用'
    );

    // 关闭模态框的快捷键
    const closeModal = (event: KeyboardEvent) => {
      if (event.key === KeyCode.ESCAPE && isOpen) {
        handleIsOpenChange(false);
        screenReaderAnnouncer.announce('键盘快捷键帮助已关闭。', false);
      }
    };

    window.addEventListener('keydown', closeModal);

    // 清理
    return () => {
      keyboardNavigationManager.unregisterShortcut('toggle-shortcuts-help');
      window.removeEventListener('keydown', closeModal);
    };
  }, [isOpen, handleIsOpenChange]);

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

  // 渲染快捷键分组
  const renderShortcutGroups = () => {
    const groupedShortcuts = getGroupedShortcuts();
    const groupKeys = Object.keys(groupedShortcuts);

    return groupKeys.map(groupKey => {
      const shortcuts = groupedShortcuts[groupKey] || [];
      // 默认展开
      const isExpanded = expandedGroups[groupKey] !== false;

      return (
        <div key={groupKey} className="mb-6">
          <div
            className="flex items-center justify-between cursor-pointer mb-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => toggleGroup(groupKey)}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {groupKey}
            </h3>
            {isExpanded
              ? <ChevronsUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              : <ChevronsDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            }
          </div>

          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-2">
              {shortcuts.map((shortcut, index) => {
                const { binding, description } = shortcut;
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-1 min-w-[100px]">
                      {binding.altKey && (
                        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-sm font-medium">
                          Alt
                        </kbd>
                      )}
                      {binding.ctrlKey && (
                        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-sm font-medium">
                          Ctrl
                        </kbd>
                      )}
                      {binding.shiftKey && (
                        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-sm font-medium">
                          Shift
                        </kbd>
                      )}
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-sm font-medium">
                        {binding.key}
                      </kbd>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 flex-1">
                      {description}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  // 渲染默认的快捷键按钮
  const renderDefaultButton = () => {
    return (
      <button
        onClick={() => handleIsOpenChange(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label="显示键盘快捷键"
      >
        <span>?</span>
        <span>快捷键</span>
      </button>
    );
  };

  return (
    <>
      {/* 渲染按钮 */}
      {renderButton ? renderButton() : renderDefaultButton()}

      {/* 快捷键信息模态框 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-title"
          >
            {/* 模态框头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h2
                id="keyboard-shortcuts-title"
                className="text-2xl font-bold text-gray-800 dark:text-gray-200"
              >
                键盘快捷键
              </h2>
              <button
                onClick={() => handleIsOpenChange(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="关闭"
              >
                <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* 模态框内容 */}
            <div className="p-6">
              {renderShortcutGroups()}
            </div>

            {/* 模态框底部 */}
            <div className="flex items-center justify-center p-6 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                按 <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-xs font-medium">
                  Escape
                </kbd> 关闭
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
