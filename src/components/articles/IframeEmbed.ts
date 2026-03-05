import { Node, mergeAttributes } from '@tiptap/core';

export interface IframeEmbedOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframeEmbed: {
      setIframeEmbed: (options: { src: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

export const IframeEmbed = Node.create<IframeEmbedOptions>({
  'name': 'iframeEmbed',

  'group': 'block',

  'atom': true,

  addOptions () {
    return {
      'HTMLAttributes': {}
    };
  },

  addAttributes () {
    return {
      'src': {
        'default': null,
        'parseHTML': (element) => element.getAttribute('src'),
        'renderHTML': (attributes) => {
          if (!attributes.src) {
            return {};
          }
          return { 'src': attributes.src };
        }
      },
      'width': {
        'default': 640,
        'parseHTML': (element) => {
          const width = element.getAttribute('width');
          return width ? parseInt(width, 10) : 640;
        },
        'renderHTML': (attributes) => {
          if (!attributes.width) {
            return {};
          }
          return { 'width': attributes.width };
        }
      },
      'height': {
        'default': 360,
        'parseHTML': (element) => {
          const height = element.getAttribute('height');
          return height ? parseInt(height, 10) : 360;
        },
        'renderHTML': (attributes) => {
          if (!attributes.height) {
            return {};
          }
          return { 'height': attributes.height };
        }
      }
    };
  },

  parseHTML () {
    return [
      {
        'tag': 'iframe[data-iframe-embed]'
      }
    ];
  },

  renderHTML ({ HTMLAttributes }) {
    return [
      'div',
      { 'class': 'iframe-embed-wrapper my-4' },
      [
        'iframe',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          'data-iframe-embed': '',
          'frameborder': '0',
          'allowfullscreen': 'true',
          'class': 'rounded-lg'
        })
      ]
    ];
  },

  addCommands () {
    return {
      'setIframeEmbed':
        (options) =>
          ({ commands }) => {
            return commands.insertContent({
              'type': this.name,
              'attrs': options
            });
          }
    };
  }
});
