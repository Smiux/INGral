import { Audio as BaseAudio } from '@tiptap/extension-audio';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AudioNodeView } from './AudioNodeView';

export const CustomAudio = BaseAudio.extend({
  // eslint-disable-next-line new-cap
  'addNodeView': () => ReactNodeViewRenderer(AudioNodeView)
});
