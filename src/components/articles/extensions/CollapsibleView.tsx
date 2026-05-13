import React, { useCallback, useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { ChevronRight, ChevronDown } from 'lucide-react';

const DEFAULT_TITLE = '折叠标题';

export const CollapsibleNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes
}) => {
  const isOpen = node.attrs.open ?? false;
  const title = node.attrs.title ?? DEFAULT_TITLE;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isDefaultTitle = title === DEFAULT_TITLE || !title;

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
      className="collapsible-node-wrapper my-4 rounded border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/90 dark:bg-slate-900/90 overflow-hidden"
      data-open={isOpen}
    >
      <div
        className="collapsible-header flex items-center gap-2 px-4 py-3 cursor-pointer select-none bg-slate-50/90 dark:bg-slate-900/90 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors"
        onClick={handleToggle}
        contentEditable={false}
      >
        <span className="flex-shrink-0 text-slate-500 dark:text-slate-400 transition-transform duration-200">
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
            placeholder={DEFAULT_TITLE}
            className="flex-1 px-2 py-1 text-sm font-medium bg-slate-200/50 dark:bg-slate-800/80 border border-sky-400 rounded outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        ) : (
          <span
            className={`flex-1 text-sm font-medium transition-colors ${
              isDefaultTitle
                ? 'text-slate-400 dark:text-slate-500 italic'
                : 'text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400'
            }`}
            onClick={handleTitleClick}
          >
            {title || DEFAULT_TITLE}
          </span>
        )}
      </div>

      <div
        className={`collapsible-content-wrapper overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="collapsible-content px-4 py-3 border-t border-slate-200/60 dark:border-slate-700/60 relative">
          <NodeViewContent
            as="div"
            className="collapsible-body-content min-h-[1.5em] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:dark:text-slate-500 empty:before:pointer-events-none"
            data-placeholder="输入内容..."
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
};
