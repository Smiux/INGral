import { Audio as BaseAudio } from '@tiptap/extension-audio';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AudioView } from './AudioView';

export const Audio = BaseAudio.extend({
  'addNodeView': () =>
    // eslint-disable-next-line new-cap
    ReactNodeViewRenderer(AudioView)
});
