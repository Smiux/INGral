import React, { useCallback, useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export const CollapsibleNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes
}) => {
  const isOpen = node.attrs.open ?? true;
  const title = node.attrs.title ?? '折叠标题';
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleToggle = useCallback(() => {
    updateAttributes({ 'open': !isOpen });
  }, [isOpen, updateAttributes]);

  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
  }, []);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
    if (editTitle.trim()) {
      updateAttributes({ 'title': editTitle.trim() });
    } else {
      setEditTitle(title);
    }
  }, [editTitle, title, updateAttributes]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setEditTitle(title);
      setIsEditingTitle(false);
    }
  }, [handleTitleBlur, title]);

  return (
    <NodeViewWrapper
      className="collapsible-node-wrapper my-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden"
      data-open={isOpen}
    >
      <div
        className="collapsible-header flex items-center gap-2 px-4 py-3 cursor-pointer select-none bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
        onClick={handleToggle}
        contentEditable={false}
      >
        <span className="flex-shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform duration-200">
          {isOpen ? (
            <ChevronDown size={18} strokeWidth={2} />
          ) : (
            <ChevronRight size={18} strokeWidth={2} />
          )}
        </span>
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-sm font-medium bg-white dark:bg-neutral-700 border border-sky-400 rounded outline-none text-neutral-800 dark:text-neutral-200"
          />
        ) : (
          <span
            className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            onClick={handleTitleClick}
          >
            {title}
          </span>
        )}
      </div>

      <div
        className={`collapsible-content-wrapper overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="collapsible-content px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
          <NodeViewContent as="div" className="collapsible-body-content" />
        </div>
      </div>
    </NodeViewWrapper>
  );
};
