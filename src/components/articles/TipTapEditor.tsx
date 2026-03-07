import React from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Audio from '@tiptap/extension-audio';
import FileHandler from '@tiptap/extension-file-handler';
import { TableKit } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import SubscriptTiptap from '@tiptap/extension-subscript';
import SuperscriptTiptap from '@tiptap/extension-superscript';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import InvisibleCharacters from '@tiptap/extension-invisible-characters';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import 'katex/dist/katex.min.css';
import NodeRange from '@tiptap/extension-node-range';
import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents';
import { DragHandle as DragHandleReact } from '@tiptap/extension-drag-handle-react';
import { GripVertical } from 'lucide-react';
import { all, createLowlight } from 'lowlight';
import { IframeEmbed } from './IframeEmbed';

const lowlight = createLowlight(all);

const CustomCodeBlock = CodeBlockLowlight.extend({
  'renderHTML': () => {
    return [
      'pre',
      { 'class': 'rounded-lg overflow-hidden relative' },
      ['code', { 'class': 'hljs' }, 0]
    ];
  }
});

const handleFileInsert = (editor: Editor | null, file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const url = e.target?.result as string;
    if (file.type.startsWith('image/')) {
      editor?.chain().focus()
        .setImage({ 'src': url })
        .run();
    } else if (file.type.startsWith('audio/')) {
      editor?.chain().focus()
        .setAudio({ 'src': url })
        .run();
    }
  };
  reader.readAsDataURL(file);
};

export interface TiptapEditorRef {
  getEditor: () => Editor | null;
}

interface TiptapEditorProps {
  onCharacterCountChange?: (count: number) => void;
  onTableOfContentsChange?: (items: Array<{
    id: string;
    textContent: string;
    level: number;
    itemIndex: number;
    isScrolledOver: boolean;
  }>) => void;
  onEditorReady?: (editor: Editor) => void;
  editorRef?: React.RefObject<TiptapEditorRef | null>;
}

const TiptapEditorInner: React.FC<TiptapEditorProps> = ({
  onCharacterCountChange,
  onTableOfContentsChange,
  onEditorReady,
  editorRef
}) => {
  const editor = useEditor({
    'shouldRerenderOnTransaction': false,
    'immediatelyRender': true,
    'extensions': [
      StarterKit.configure({
        'codeBlock': false,
        'link': { 'openOnClick': false }
      }),
      TextStyleKit.configure({
        'backgroundColor': { 'types': ['textStyle'] },
        'color': { 'types': ['textStyle'] },
        'fontFamily': { 'types': ['textStyle'] },
        'fontSize': { 'types': ['textStyle', 'heading'] },
        'lineHeight': { 'types': ['textStyle', 'heading'] }
      }),
      SubscriptTiptap,
      SuperscriptTiptap,
      CustomCodeBlock.configure({
        lowlight,
        'enableTabIndentation': true,
        'tabSize': 2
      }),
      Image,
      Audio.configure({
        'allowBase64': true
      }),
      FileHandler.configure({
        'onDrop': (editorInstance, files) => {
          files.forEach((file) => handleFileInsert(editorInstance, file));
        },
        'onPaste': (editorInstance, files) => {
          files.forEach((file) => handleFileInsert(editorInstance, file));
        },
        'allowedMimeTypes': [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/aac', 'audio/flac'
        ]
      }),
      TableKit.configure({
        'table': {
          'resizable': true
        }
      }),
      TextAlign.configure({ 'types': ['heading', 'paragraph'] }),
      Typography,
      InvisibleCharacters.configure({ 'visible': true, 'injectCSS': true }),
      InlineMath,
      BlockMath,
      NodeRange,
      ...(onTableOfContentsChange ? [TableOfContents.configure({
        'getIndex': getHierarchicalIndexes,
        'onUpdate': onTableOfContentsChange
      })] : []),
      CharacterCount,
      IframeEmbed
    ],
    'onUpdate': ({ 'editor': editorInstance }) => {
      onCharacterCountChange?.(editorInstance.storage.characterCount.characters());
    },
    'editorProps': {
      'attributes': {
        'class': 'prose prose-lg max-w-none mx-auto p-12 md:p-16 focus:outline-none'
      }
    }
  });

  React.useImperativeHandle(editorRef, () => ({
    'getEditor': () => editor
  }), [editor]);

  React.useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  if (!editor) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-b-lg border border-neutral-200 dark:border-neutral-700">
      <DragHandleReact
        editor={editor}
        computePositionConfig={{
          'placement': 'left',
          'strategy': 'absolute',
          'middleware': [{
            'name': 'offset',
            'fn': ({ x, y }) => ({ 'x': x - 20, y })
          }]
        }}
      >
        <div className="flex items-center justify-center w-5 h-5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-move transition-colors">
          <GripVertical size={16} />
        </div>
      </DragHandleReact>

      <EditorContent
        editor={editor}
      />
    </div>
  );
};

export const TiptapEditor = React.memo(TiptapEditorInner);
