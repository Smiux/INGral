import { Extension } from '@tiptap/core';

export const TabIndent = Extension.create({
  'name': 'tabIndent',

  addKeyboardShortcuts () {
    return {
      'Tab': ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          return false;
        }
        return editor
          .chain()
          .focus()
          .insertContent('  ')
          .run();
      },
      'Shift-Tab': ({ editor }) => {
        if (editor.isActive('codeBlock')) {
          return false;
        }
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        if (!$from.parent.type.isTextblock) {
          return false;
        }

        const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, undefined, '\u00A0');
        const trimmedTextBefore = textBeforeCursor.replace(/\s+$/, '');
        const spacesToRemove = Math.min(2, textBeforeCursor.length - trimmedTextBefore.length);

        if (spacesToRemove > 0) {
          const fromPos = $from.pos - spacesToRemove;
          return editor
            .chain()
            .focus()
            .setTextSelection({ 'from': fromPos, 'to': $from.pos })
            .deleteSelection()
            .run();
        }

        return false;
      }
    };
  }
});
