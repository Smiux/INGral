import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CollapsibleNodeView } from './CollapsibleNodeView';

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
        'default': true,
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
    const isOpen = HTMLAttributes['data-open'] !== 'false';
    const title = HTMLAttributes['data-title'] || '折叠标题';
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-collapsible': '',
        'class': 'collapsible-node'
      }),
      [
        'div',
        { 'class': 'collapsible-header', 'data-collapsible-header': '' },
        [
          'span',
          { 'class': `collapsible-icon ${isOpen ? 'open' : ''}` },
          isOpen ? '▼' : '▶'
        ],
        [
          'span',
          { 'class': 'collapsible-title' },
          title
        ]
      ],
      [
        'div',
        { 'class': `collapsible-content ${isOpen ? 'open' : ''}`, 'data-collapsible-content': '' },
        0
      ]
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
                'open': true,
                'title': '折叠标题'
              },
              'content': [
                {
                  'type': 'paragraph',
                  'content': [{ 'type': 'text', 'text': '折叠内容...' }]
                }
              ]
            });
          }
    };
  }
});
