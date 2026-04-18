import React, { useCallback, useState, useEffect } from 'react';
import { BookOpen, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Editor } from '@tiptap/react';

export interface FootnoteItem {
  id: string;
  content: string;
  index: number;
}

interface FootnotePanelProps {
  editor: Editor | null;
  editable?: boolean;
  containerClassName?: string;
  collapsedButtonClassName?: string;
  position?: 'left' | 'right';
}

export const FootnotePanel: React.FC<FootnotePanelProps> = ({ editor, editable = true, containerClassName = 'hidden xl:block fixed right-4 top-[5rem] w-48 z-10 print:hidden', collapsedButtonClassName = 'hidden xl:block fixed right-4 top-[5rem] z-10 print:hidden', position = 'right' }) => {
  const [footnotes, setFootnotes] = useState<FootnoteItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const collectFootnotes = useCallback((): FootnoteItem[] => {
    if (!editor) {
      return [];
    }

    const doc = editor.state.doc;
    const items: FootnoteItem[] = [];
    let index = 0;

    doc.descendants((node) => {
      if (node.type.name === 'footnote') {
        index += 1;
        items.push({
          'id': node.attrs.id as string,
          'content': node.attrs.content as string,
          index
        });
      }
    });

    return items;
  }, [editor]);

  const updateFootnoteInEditor = useCallback((id: string, newContent: string) => {
    if (!editor) {
      return;
    }

    const { tr } = editor.state;
    let found = false;

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'footnote' && node.attrs.id === id) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          'content': newContent
        });
        found = true;
        return false;
      }
      return !found;
    });

    if (found) {
      editor.view.dispatch(tr);
    }
  }, [editor]);

  const deleteFootnoteFromEditor = useCallback((id: string) => {
    if (!editor) {
      return;
    }

    const { tr } = editor.state;
    const positions: number[] = [];

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'footnote' && node.attrs.id === id) {
        positions.push(pos);
      }
    });

    positions.reverse().forEach((pos) => {
      tr.delete(pos, pos + 1);
    });

    if (positions.length > 0) {
      editor.view.dispatch(tr);
    }
  }, [editor]);

  const scrollToFootnote = useCallback((id: string) => {
    if (!editor) {
      return;
    }

    let targetPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'footnote' && node.attrs.id === id) {
        targetPos = pos;
        return false;
      }
      return targetPos === null;
    });

    if (targetPos !== null) {
      const coords = editor.view.coordsAtPos(targetPos);
      window.scrollTo({
        'top': coords.top - 120,
        'behavior': 'smooth'
      });
    }
  }, [editor]);

  const refreshFootnotes = useCallback(() => {
    setFootnotes(collectFootnotes());
  }, [collectFootnotes]);

  useEffect(() => {
    if (!editor) {
      return undefined;
    }

    queueMicrotask(() => {
      refreshFootnotes();
    });

    const listener = () => {
      refreshFootnotes();
    };

    editor.on('transaction', listener);

    return () => {
      editor.off('transaction', listener);
    };
  }, [editor, refreshFootnotes]);

  const handleStartEdit = useCallback((item: FootnoteItem) => {
    setEditingId(item.id);
    setEditingContent(item.content);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingId) {
      updateFootnoteInEditor(editingId, editingContent);
      setEditingId(null);
    }
  }, [editingId, editingContent, updateFootnoteInEditor]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleBlur = useCallback(() => {
    handleSaveEdit();
  }, [handleSaveEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleCancelEdit]);

  if (isCollapsed) {
    return (
      <div className={collapsedButtonClassName}>
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm px-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
        >
          {position === 'left'
            ? <ChevronRight className="w-4 h-4 text-sky-400" />
            : <ChevronLeft className="w-4 h-4 text-sky-400" />
          }
          注释
        </button>
      </div>
    );
  }

  if (footnotes.length === 0) {
    return null;
  }

  return (
    <aside className={containerClassName}>
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            注释
          </h3>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            title="收起"
          >
            {position === 'left'
              ? <ChevronLeft className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            }
          </button>
        </div>
        <div className="overflow-y-auto max-h-[50vh]">
          <nav className="p-3">
            {footnotes.map((item) => (
              <div key={item.id} className="mb-3 last:mb-0 pt-0.5">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => scrollToFootnote(item.id)}
                      className="text-[10px] font-medium text-sky-600 dark:text-sky-400 cursor-pointer hover:text-sky-700 dark:hover:text-sky-300 transition-colors select-none"
                    >
                      [{item.index}]
                    </button>
                    {editable && (
                      <button
                        onClick={() => deleteFootnoteFromEditor(item.id)}
                        className="p-0.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {editingId === item.id ? (
                    <div className="flex-1">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        autoFocus
                        className="w-full px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent resize-y min-h-[60px]"
                        placeholder="输入注释内容..."
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-1 text-xs text-white bg-sky-500 hover:bg-sky-600 rounded transition-colors"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      {editable ? (
                        <div
                          onClick={() => handleStartEdit(item)}
                          className="w-full text-left cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded p-0.5 -m-0.5"
                        >
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed break-words" style={{ 'whiteSpace': 'pre-wrap', 'wordBreak': 'break-word', 'overflowWrap': 'break-word' }}>
                            {item.content || (
                              <span className="text-neutral-400 dark:text-neutral-500 italic">
                                点击编辑
                              </span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed break-words" style={{ 'whiteSpace': 'pre-wrap', 'wordBreak': 'break-word', 'overflowWrap': 'break-word' }}>
                          {item.content}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
};
