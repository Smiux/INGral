import React, { useState, useEffect, useRef } from 'react';
import type { ShortcutRegistration } from '../../utils/keyboardNavigation';
import { keyboardNavigationManager, KeyCode } from '../../utils/keyboardNavigation';
import { screenReaderAnnouncer } from '../../utils/accessibility';
import { X, ChevronsDown, ChevronsUp } from 'lucide-react';

// 快捷键信息模态框组件 - 支持自定义按钮
interface KeyboardShortcutsProps {
  renderButton?: () => React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ renderButton, isOpen: propIsOpen, onOpenChange }) => {
  // 使用外部控制的isOpen状态或内部状态
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  
  // 当外部isOpen变化时，更新内部状态
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setInternalIsOpen(propIsOpen);
    }
  }, [propIsOpen]);
  
  // 更新isOpen状态的函数
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalIsOpen(value);
    }
  };
  
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
      setIsOpen(newValue);
    };

    // 注册快捷键Alt+K用于打开/关闭快捷键帮助
    keyboardNavigationManager.registerShortcut(
      'toggle-shortcuts-help',
      { key: KeyCode.K, altKey: true },
      toggleShortcutsHelp,
      '打开/关闭快捷键帮助',
      '界面导航',
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
      [group]: !prev[group],
    }));
  };

  // 渲染快捷键组合
  const renderKeyBinding = (shortcut: ShortcutRegistration) => {
    const { binding } = shortcut;
    const keys: string[] = [];

    if (binding.ctrlKey) {keys.push('Ctrl');}
    if (binding.metaKey) {keys.push('Cmd');}
    if (binding.altKey) {keys.push('Alt');}
    if (binding.shiftKey) {keys.push('Shift');}
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

  // 打开快捷键帮助
  const openShortcutsHelp = () => {
    setIsOpen(true);
    screenReaderAnnouncer.announce('键盘快捷键帮助已打开。使用Tab键导航，Escape键关闭。', false);
  };

  // 渲染键盘快捷键帮助按钮和模态框
  return (
    <>
      {/* 自定义按钮或默认按钮 */}
      {!isOpen && (
        renderButton ? (
          renderButton()
        ) : (
          // 左下角的帮助按钮（默认位置）
          <button
            onClick={openShortcutsHelp}
            aria-label="打开键盘快捷键帮助"
            className="fixed bottom-4 left-4 z-40 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
          >
            <span className="text-lg font-bold">?</span>
          </button>
        )
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl m-4 max-h-[80vh] overflow-hidden flex flex-col"
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
              {/* 使用说明部分 */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">使用说明</h3>
                <p className="text-blue-700 dark:text-blue-200">按下以下键盘组合可快速访问功能。点击模态框外部或再次按下 Alt+K 键可关闭。</p>
              </div>

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
      )}
    </>
  );
};

// useGlobalKeyboardShortcuts hook 已移至 keyboardUtils.ts 文件中
// 请从 './keyboardUtils' 导入使用
