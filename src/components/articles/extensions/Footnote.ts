import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FootnoteView } from './FootnoteView';

export interface FootnoteOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      insertFootnote: (options?: { content?: string }) => ReturnType;
    };
  }
}

export const FootnoteExtension = Node.create<FootnoteOptions>({
  'name': 'footnote',

  'group': 'inline',

  'inline': true,

  'atom': true,

  addOptions () {
    return {
      'HTMLAttributes': {}
    };
  },

  addAttributes () {
    return {
      'id': {
        'default': null,
        'parseHTML': (element) => element.getAttribute('data-footnote-id'),
        'renderHTML': (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-footnote-id': attributes.id
          };
        }
      },
      'content': {
        'default': '',
        'parseHTML': (element) => element.getAttribute('data-footnote-content') || '',
        'renderHTML': (attributes) => {
          if (!attributes.content) {
            return {};
          }
          return {
            'data-footnote-content': attributes.content
          };
        }
      }
    };
  },

  parseHTML () {
    return [
      {
        'tag': 'span[data-footnote-id]'
      }
    ];
  },

  renderHTML ({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-footnote-id': node.attrs.id,
        'data-footnote-content': node.attrs.content
      })
    ];
  },

  addNodeView () {
    return (
      // eslint-disable-next-line new-cap
      ReactNodeViewRenderer(FootnoteView)
    );
  },

  addCommands () {
    return {
      'insertFootnote':
        (options = {}) =>
          ({ chain }) => {
            const id = `fn_${Date.now()}_${Math.random().toString(36)
              .substr(2, 9)}`;
            return chain()
              .focus()
              .insertContent({
                'type': this.name,
                'attrs': {
                  id,
                  'content': options.content || ''
                }
              })
              .run();
          }
    };
  }
});
