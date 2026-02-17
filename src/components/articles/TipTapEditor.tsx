import React, { useCallback } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
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
import {
  Bold, Italic, Code, Underline as UnderlineIcon, Highlighter,
  Strikethrough, Link as LinkIcon, GripVertical
} from 'lucide-react';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import html from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import typescript from 'highlight.js/lib/languages/typescript';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import java from 'highlight.js/lib/languages/java';
import csharp from 'highlight.js/lib/languages/csharp';
import php from 'highlight.js/lib/languages/php';

const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('python', python);
lowlight.register('html', html);
lowlight.register('css', css);
lowlight.register('json', json);
lowlight.register('typescript', typescript);
lowlight.register('bash', bash);
lowlight.register('sql', sql);
lowlight.register('markdown', markdown);
lowlight.register('java', java);
lowlight.register('csharp', csharp);
lowlight.register('php', php);

const CustomCodeBlock = CodeBlockLowlight.extend({
  'renderHTML': () => {
    return [
      'pre',
      { 'class': 'rounded-lg overflow-hidden relative' },
      ['code', { 'class': 'hljs' }, 0]
    ];
  }
});

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
    isActive: boolean;
    isScrolledOver: boolean;
  }>) => void;
  onLinkClick?: () => void;
  editorRef?: React.RefObject<TiptapEditorRef | null>;
}

const TiptapEditorInner: React.FC<TiptapEditorProps> = ({
  onCharacterCountChange,
  onTableOfContentsChange,
  onLinkClick,
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
      FileHandler.configure({
        'onDrop': (_, files) => {
          files.forEach((file) => {
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const uploadedImageUrl = e.target?.result as string;
                editor?.chain().focus()
                  .setImage({ 'src': uploadedImageUrl })
                  .run();
              };
              reader.readAsDataURL(file);
            }
          });
        },
        'onPaste': (_, files) => {
          files.forEach((file) => {
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const uploadedImageUrl = e.target?.result as string;
                editor?.chain().focus()
                  .setImage({ 'src': uploadedImageUrl })
                  .run();
              };
              reader.readAsDataURL(file);
            }
          });
        },
        'allowedMimeTypes': ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
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
      CharacterCount
    ],
    'onUpdate': ({ 'editor': editorInstance }) => {
      onCharacterCountChange?.(editorInstance.storage.characterCount.characters());
    },
    'editorProps': {
      'attributes': {
        'class': 'prose prose-lg max-w-none mx-auto p-6 md:p-8 focus:outline-none'
      }
    }
  });

  const toggleHighlight = useCallback(() => {
    if (!editor) {
      return;
    }
    const hasHighlight = editor.getAttributes('textStyle').backgroundColor === '#ffff00';
    if (hasHighlight) {
      editor.chain().focus()
        .unsetBackgroundColor()
        .run();
    } else {
      editor.chain().focus()
        .setBackgroundColor('#ffff00')
        .run();
    }
  }, [editor]);

  const handleLink = useCallback(() => {
    onLinkClick?.();
  }, [onLinkClick]);

  React.useImperativeHandle(editorRef, () => ({
    'getEditor': () => editor
  }), [editor]);

  const editorState = useEditorState({
    editor,
    'selector': useCallback((ctx: { editor: Editor | null }) => {
      if (!ctx.editor) {
        return {
          'isBold': false,
          'isItalic': false,
          'isStrike': false,
          'isUnderline': false,
          'isCode': false,
          'isSubscript': false,
          'isSuperscript': false,
          'isLink': false,
          'isHighlight': false,
          'hasSelection': false
        };
      }
      return {
        'isBold': ctx.editor.isActive('bold'),
        'isItalic': ctx.editor.isActive('italic'),
        'isStrike': ctx.editor.isActive('strike'),
        'isUnderline': ctx.editor.isActive('underline'),
        'isCode': ctx.editor.isActive('code'),
        'isSubscript': ctx.editor.isActive('subscript'),
        'isSuperscript': ctx.editor.isActive('superscript'),
        'isLink': ctx.editor.isActive('link'),
        'isHighlight': ctx.editor.getAttributes('textStyle').backgroundColor === '#ffff00',
        'hasSelection': !ctx.editor.state.selection.empty
      };
    }, [])
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="bg-white rounded-b-lg border border-neutral-200">
      <BubbleMenu
        editor={editor}
        shouldShow={({ 'state': bubbleState }) => !bubbleState.selection.empty}
        className="transition-all duration-200"
      >
        <div className="flex flex-wrap items-center gap-1 p-1 bg-white rounded-lg border border-neutral-200">
          {[
            { 'icon': <Bold size={16} />, 'action': () => editor.chain().focus()
              .toggleBold()
              .run(), 'active': editorState.isBold },
            { 'icon': <Italic size={16} />, 'action': () => editor.chain().focus()
              .toggleItalic()
              .run(), 'active': editorState.isItalic },
            { 'icon': <UnderlineIcon size={16} />, 'action': () => editor.chain().focus()
              .toggleUnderline()
              .run(), 'active': editorState.isUnderline },
            { 'icon': <Strikethrough size={16} />, 'action': () => editor.chain().focus()
              .toggleStrike()
              .run(), 'active': editorState.isStrike },
            { 'icon': <Code size={16} />, 'action': () => editor.chain().focus()
              .toggleCode()
              .run(), 'active': editorState.isCode },
            { 'icon': <Highlighter size={16} />, 'action': toggleHighlight, 'active': editorState.isHighlight },
            { 'icon': <LinkIcon size={16} />, 'action': handleLink, 'active': editorState.isLink }
          ].map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.action}
              className={`flex items-center justify-center p-2 rounded hover:bg-neutral-100 transition-colors ${btn.active ? 'bg-primary-50 text-primary-700' : ''}`}
            >
              <div className="text-neutral-600">{btn.icon}</div>
            </button>
          ))}
        </div>
      </BubbleMenu>

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
        <div className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 cursor-move transition-colors">
          <GripVertical size={16} />
        </div>
      </DragHandleReact>

      <EditorContent
        editor={editor}
        className="prose prose-lg max-w-none mx-auto p-6 md:p-8"
      />
    </div>
  );
};

export const TiptapEditor = React.memo(TiptapEditorInner);
