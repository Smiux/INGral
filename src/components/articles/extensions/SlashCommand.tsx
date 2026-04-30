import { Extension } from '@tiptap/core';
import { ReactRenderer, type Editor } from '@tiptap/react';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import {
  CommandMenu,
  type CommandItem
} from './SlashCommandMenu';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Minus, CodeSquare, Table, Link,
  FunctionSquare, ChevronRightSquare, CodeXml
} from 'lucide-react';

export interface SlashCommandOptions {
  suggestion: Omit<SuggestionOptions<CommandItem>, 'editor' | 'render'>;
  onLinkClick: () => void;
  onMathClick: (type: 'inline' | 'block') => void;
  onIframeClick: () => void;
}

const getCommandItems = (
  onLinkClick: () => void,
  onMathClick: (type: 'inline' | 'block') => void,
  onIframeClick: () => void
): CommandItem[] => {
  return [
    {
      'id': 'heading1',
      'label': '一级标题',
      'description': '大标题',
      'icon': <Heading1 size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'block',
      'isActive': (editor: Editor) => editor.isActive('heading', { 'level': 1 }),
      'action': (editor: Editor) => editor.chain().focus()
        .toggleHeading({ 'level': 1 })
        .run()
    },
    {
      'id': 'heading2',
      'label': '二级标题',
      'description': '中等标题',
      'icon': <Heading2 size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'block',
      'isActive': (editor: Editor) => editor.isActive('heading', { 'level': 2 }),
      'action': (editor: Editor) => editor.chain().focus()
        .toggleHeading({ 'level': 2 })
        .run()
    },
    {
      'id': 'heading3',
      'label': '三级标题',
      'description': '小标题',
      'icon': <Heading3 size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'block',
      'isActive': (editor: Editor) => editor.isActive('heading', { 'level': 3 }),
      'action': (editor: Editor) => editor.chain().focus()
        .toggleHeading({ 'level': 3 })
        .run()
    },
    {
      'id': 'bulletList',
      'label': '无序列表',
      'description': '无序列表',
      'icon': <List size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'block',
      'isActive': (editor: Editor) => editor.isActive('bulletList'),
      'action': (editor: Editor) => editor.chain().focus()
        .toggleBulletList()
        .run()
    },
    {
      'id': 'orderedList',
      'label': '有序列表',
      'description': '有序列表',
      'icon': <ListOrdered size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'block',
      'isActive': (editor: Editor) => editor.isActive('orderedList'),
      'action': (editor: Editor) => editor.chain().focus()
        .toggleOrderedList()
        .run()
    },
    {
      'id': 'blockquote',
      'label': '引用',
      'description': '引用块',
      'icon': <Quote size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'block',
      'isActive': (editor: Editor) => editor.isActive('blockquote'),
      'action': (editor: Editor) => editor.chain().focus()
        .toggleBlockquote()
        .run()
    },
    {
      'id': 'codeBlock',
      'label': '代码块',
      'description': '代码块',
      'icon': <CodeSquare size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'block',
      'isActive': (editor: Editor) => editor.isActive('codeBlock'),
      'action': (editor: Editor) => editor.chain().focus()
        .toggleCodeBlock()
        .run()
    },
    {
      'id': 'horizontalRule',
      'label': '水平线',
      'description': '水平分割线',
      'icon': <Minus size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'block',
      'action': (editor: Editor) => editor.chain().focus()
        .setHorizontalRule()
        .run()
    },
    {
      'id': 'table',
      'label': '表格',
      'description': '插入表格',
      'icon': <Table size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'insert',
      'action': (editor: Editor) => editor.chain().focus()
        .insertTable({ 'rows': 3, 'cols': 3, 'withHeaderRow': true })
        .run()
    },
    {
      'id': 'link',
      'label': '链接',
      'description': '插入链接',
      'icon': <Link size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'insert',
      'action': () => onLinkClick()
    },
    {
      'id': 'inlineMath',
      'label': '行内公式',
      'description': '行内数学公式',
      'icon': <FunctionSquare size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'insert',
      'action': () => onMathClick('inline')
    },
    {
      'id': 'blockMath',
      'label': '公式块',
      'description': '数学公式块',
      'icon': <FunctionSquare size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'insert',
      'action': () => onMathClick('block')
    },
    {
      'id': 'collapsible',
      'label': '折叠块',
      'description': '可折叠内容块',
      'icon': <ChevronRightSquare size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'block',
      'action': (editor: Editor) => editor.chain().focus()
        .insertCollapsible()
        .run()
    },
    {
      'id': 'iframe',
      'label': '嵌入',
      'description': '嵌入外部内容',
      'icon': <CodeXml size={18} className="text-neutral-600 dark:text-neutral-400" />,
      'category': 'insert',
      'action': () => onIframeClick()
    }
  ];
};

export const SlashCommand = Extension.create<SlashCommandOptions>({
  'name': 'slashCommand',

  addOptions () {
    return {
      'suggestion': {
        'char': '/',
        'startOfLine': false,
        'allowSpaces': false
      },
      'onLinkClick': () => {},
      'onMathClick': () => {},
      'onIframeClick': () => {}
    };
  },

  addProseMirrorPlugins () {
    const { onLinkClick, onMathClick, onIframeClick } = this.options;

    return [
      // eslint-disable-next-line new-cap
      Suggestion({
        'editor': this.editor,
        ...this.options.suggestion,
        'items': ({ query }) => {
          const items = getCommandItems(onLinkClick, onMathClick, onIframeClick);
          return items.filter((item) =>
            item.label.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase())
          );
        },
        'render': () => {
          let reactRenderer: ReactRenderer<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }> | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            'onStart': (props) => {
              reactRenderer = new ReactRenderer(CommandMenu, {
                'props': {
                  ...props,
                  'items': props.items
                },
                'editor': props.editor
              });

              popup = tippy('body', {
                'getReferenceClientRect': props.clientRect as () => DOMRect,
                'appendTo': () => document.body,
                'content': reactRenderer.element,
                'showOnCreate': true,
                'interactive': true,
                'trigger': 'manual',
                'placement': 'bottom-start'
              });
            },

            'onUpdate': (props) => {
              if (reactRenderer) {
                reactRenderer.updateProps({
                  ...props,
                  'items': props.items
                });
              }

              if (popup && popup[0]) {
                popup[0].setProps({
                  'getReferenceClientRect': props.clientRect as () => DOMRect
                });
              }
            },

            'onKeyDown': (props) => {
              if (props.event.key === 'ArrowUp' || props.event.key === 'ArrowDown' || props.event.key === 'Enter') {
                return true;
              }
              if (props.event.key === 'Escape') {
                if (popup && popup[0]) {
                  popup[0].hide();
                }
                return true;
              }

              return reactRenderer?.ref?.onKeyDown(props) ?? false;
            },

            'onExit': () => {
              if (popup && popup[0]) {
                popup[0].destroy();
              }
              if (reactRenderer) {
                reactRenderer.destroy();
              }
            }
          };
        },
        'command': ({ editor, range, props }) => {
          const item = props as CommandItem;
          item.action(editor);

          editor.chain().focus()
            .deleteRange(range)
            .run();
        }
      })
    ];
  }
});
