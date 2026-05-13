import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';

export interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: Editor) => void;
  category: 'block' | 'text' | 'insert';
  isActive?: (editor: Editor) => boolean;
}

interface CommandMenuProps {
  editor: Editor;
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

const CommandMenuInner: React.FC<CommandMenuProps> = ({
  editor,
  items,
  command
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filteredItems = items;

  const selectItem = useCallback((index: number) => {
    if (filteredItems[index]) {
      command(filteredItems[index]);
    }
  }, [filteredItems, command]);

  const handleArrowUp = useCallback(() => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
  }, [filteredItems.length]);

  const handleArrowDown = useCallback(() => {
    setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
  }, [filteredItems.length]);

  const handleEnter = useCallback(() => {
    selectItem(selectedIndex);
  }, [selectItem, selectedIndex]);

  const handleEscape = useCallback(() => {
    editor.chain().focus()
      .run();
  }, [editor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        handleArrowUp();
        return true;
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        handleArrowDown();
        return true;
      } else if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        handleEnter();
        return true;
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleEscape();
        return true;
      }
      return false;
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleArrowUp, handleArrowDown, handleEnter, handleEscape]);

  useEffect(() => {
    if (menuRef.current && itemRefs.current[selectedIndex]) {
      const selectedElement = itemRefs.current[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ 'block': 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (filteredItems.length === 0) {
    return (
      <div className="bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-700/60 rounded p-3 text-sm text-slate-500 dark:text-slate-400">
        没有找到匹配的命令
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-700/60 rounded max-h-80 w-72 overflow-y-auto"
    >
      <div className="p-2">
        {filteredItems.map((item, index) => {
          const isItemActive = item.isActive ? item.isActive(editor) : false;

          let buttonClass = 'w-full flex items-center gap-3 px-3 py-2 text-left rounded transition-colors ';

          if (index === selectedIndex) {
            buttonClass += 'bg-sky-100/80 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400';
          } else if (isItemActive) {
            buttonClass += 'bg-sky-100/40 dark:bg-sky-500/8 text-sky-600 dark:text-sky-400 hover:bg-sky-100/80 dark:hover:bg-sky-500/15';
          } else {
            buttonClass += 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/40 dark:hover:bg-slate-800/40';
          }

          return (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              onClick={() => selectItem(index)}
              className={buttonClass}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {item.description}
                </div>
              </div>
              {isItemActive && (
                <div className="flex-shrink-0 text-xs text-sky-500 dark:text-sky-400">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const CommandMenu: React.FC<CommandMenuProps> = (props) => {
  return <CommandMenuInner key={props.items.length} {...props} />;
};
