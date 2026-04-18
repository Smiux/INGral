import React, { useEffect, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

export interface FootnoteData {
  id: string;
  content: string;
  index: number;
}

export const FootnoteView: React.FC<NodeViewProps> = ({ node, editor }) => {
  const footnoteId = node.attrs.id as string;
  const footnoteContent = node.attrs.content as string;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!editor) {
      return () => {
        // noop
      };
    }

    const updateIndex = (): void => {
      const doc = editor.state.doc;
      let currentIndex = 0;

      doc.descendants((descendantNode): boolean | void => {
        if (descendantNode.type.name === 'footnote') {
          currentIndex += 1;
          if (descendantNode.attrs.id === footnoteId) {
            setIndex(currentIndex);
            return false;
          }
        }
        return true;
      });
    };

    updateIndex();

    const listener = () => {
      updateIndex();
    };

    editor.on('transaction', listener);

    return () => {
      editor.off('transaction', listener);
    };
  }, [editor, footnoteId]);

  return (
    <NodeViewWrapper
      as="span"
      className="footnote-marker inline-block align-top text-[10px] font-medium text-sky-600 dark:text-sky-400 cursor-pointer hover:text-sky-700 dark:hover:text-sky-300 transition-colors select-none relative -top-1"
      contentEditable={false}
      data-footnote-id={footnoteId}
      data-footnote-content={footnoteContent}
    >
      [{index}]
    </NodeViewWrapper>
  );
};
