import React, { useCallback, useMemo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

export interface FootnoteData {
  id: string;
  content: string;
  index: number;
}

export const FootnoteView: React.FC<NodeViewProps> = ({ node, editor }) => {
  const footnoteId = node.attrs.id as string;
  const footnoteContent = node.attrs.content as string;

  const getFootnoteIndex = useCallback((): number => {
    if (!editor) {
      return 0;
    }

    const doc = editor.state.doc;
    let index = 0;
    let found = false;

    doc.descendants((descendantNode) => {
      if (descendantNode.type.name === 'footnote') {
        index += 1;
        if (descendantNode.attrs.id === footnoteId) {
          found = true;
          return false;
        }
      }
      return !found;
    });

    return index;
  }, [editor, footnoteId]);

  const index = useMemo(() => getFootnoteIndex(), [getFootnoteIndex]);

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
