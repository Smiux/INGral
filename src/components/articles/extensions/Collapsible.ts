import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CollapsibleNodeView } from './CollapsibleView';

export interface CollapsibleNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collapsible: {
      insertCollapsible: () => ReturnType;
    };
  }
}

export const CollapsibleNode = Node.create<CollapsibleNodeOptions>({
  'name': 'collapsible',

  'group': 'block',

  'content': 'block+',

  'defining': true,

  'isolating': true,

  addOptions () {
    return {
      'HTMLAttributes': {}
    };
  },

  addAttributes () {
    return {
      'open': {
        'default': false,
        'parseHTML': (element) => element.getAttribute('data-open') === 'true',
        'renderHTML': (attributes) => {
          return {
            'data-open': attributes.open ? 'true' : 'false'
          };
        }
      },
      'title': {
        'default': '折叠标题',
        'parseHTML': (element) => element.getAttribute('data-title') || '折叠标题',
        'renderHTML': (attributes) => {
          return {
            'data-title': attributes.title || '折叠标题'
          };
        }
      }
    };
  },

  parseHTML () {
    return [
      {
        'tag': 'div[data-collapsible]'
      }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-collapsible': '',
        'class': 'collapsible-node'
      }),
      0
    ];
  },

  addNodeView () {
    // eslint-disable-next-line new-cap
    return ReactNodeViewRenderer(CollapsibleNodeView);
  },

  addCommands () {
    return {
      'insertCollapsible':
        () =>
          ({ commands }) => {
            return commands.insertContent({
              'type': this.name,
              'attrs': {
                'open': false,
                'title': '折叠标题'
              },
              'content': [
                {
                  'type': 'paragraph'
                }
              ]
            });
          }
    };
  },

  addKeyboardShortcuts () {
    return {
      'Backspace': () => {
        const { state } = this.editor.view;
        const { selection } = state;
        const { $from } = selection;

        if (!selection.empty) {
          return false;
        }

        if ($from.parentOffset !== 0) {
          return false;
        }

        for (let d = $from.depth; d > 0; d -= 1) {
          const node = $from.node(d);
          if (node.type.name === 'collapsible') {
            if (node.content.size <= 4) {
              return this.editor.commands.deleteNode('collapsible');
            }
            break;
          }
        }

        return false;
      }
    };
  }
});
