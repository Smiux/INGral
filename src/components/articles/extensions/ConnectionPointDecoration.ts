import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { ConnectionPoint } from '../connection/types';

export const ConnectionPointPluginKey = new PluginKey('connectionPoints');

interface ConnectionPointMeta {
  points: ConnectionPoint[];
}

function createMarkerWidget (pointId: string, color: string): HTMLElement {
  const marker = document.createElement('span');
  marker.className = 'connection-point-marker';
  marker.setAttribute('data-connection-point-id', pointId);
  marker.style.cssText = `
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 6px;
    margin-left: 2px;
    background: ${color};
    border: 2px solid ${color};
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    pointer-events: auto;
    user-select: none;
    -webkit-user-select: none;
    flex-shrink: 0;
  `;

  const handleMouseEnter = () => {
    marker.style.transform = 'scale(1.2)';
    marker.style.boxShadow = `0 2px 6px ${color}66`;
  };
  const handleMouseLeave = () => {
    marker.style.transform = 'scale(1)';
    marker.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
  };

  marker.addEventListener('mouseenter', handleMouseEnter);
  marker.addEventListener('mouseleave', handleMouseLeave);

  return marker;
}

function createStartMarkWidget (pointId: string, color: string): HTMLElement {
  const mark = document.createElement('span');
  mark.setAttribute('data-start-mark', pointId);
  mark.style.cssText = `
    display: inline-block;
    width: 3px;
    height: 1.2em;
    vertical-align: -0.25em;
    background: ${color};
    border-radius: 2px 0 0 2px;
    margin-right: 3px;
    margin-left: 4px;
    pointer-events: none;
  `;
  return mark;
}

function createEndMarkWidget (pointId: string, color: string): HTMLElement {
  const mark = document.createElement('span');
  mark.setAttribute('data-end-mark', pointId);
  mark.style.cssText = `
    display: inline-block;
    width: 3px;
    height: 1.2em;
    vertical-align: -0.25em;
    background: ${color};
    border-radius: 0 2px 2px 0;
    margin-left: 3px;
    pointer-events: none;
  `;
  return mark;
}

function buildDecorations (doc: ProseMirrorNode, points: ConnectionPoint[]): DecorationSet {
  const decorations: Decoration[] = [];

  for (const point of points) {
    const from = point.documentPos;
    const to = point.to;
    const color = point.color;

    if (from >= 1 && to <= doc.content.size && from < to) {
      try {
        decorations.push(
          Decoration.widget(from, () => createMarkerWidget(point.id, color), {
            'side': -1,
            'key': `marker-${point.id}`
          })
        );

        decorations.push(
          Decoration.widget(from, () => createStartMarkWidget(point.id, color), {
            'side': -1,
            'key': `start-mark-${point.id}`
          })
        );

        decorations.push(
          Decoration.widget(to, () => createEndMarkWidget(point.id, color), {
            'side': 1,
            'key': `end-mark-${point.id}`
          })
        );

        decorations.push(
          Decoration.inline(from, to, {
            'class': 'connection-point-highlight',
            'data-highlight-for': point.id,
            'style': `background: ${color}15; pointer-events: none;`
          }, {
            'key': `highlight-${point.id}`
          })
        );
      } catch {
        // ignore invalid positions
      }
    }
  }

  return DecorationSet.create(doc, decorations);
}

export const ConnectionPointDecoration = Extension.create({
  'name': 'connectionPointDecoration',

  addProseMirrorPlugins () {
    return [
      new Plugin({
        'key': ConnectionPointPluginKey,
        'state': {
          'init': () => DecorationSet.empty,
          'apply' (tr, prevState) {
            const meta = tr.getMeta(ConnectionPointPluginKey) as ConnectionPointMeta | undefined;
            if (meta && meta.points) {
              return buildDecorations(tr.doc, meta.points);
            }

            if (tr.docChanged) {
              return prevState.map(tr.mapping, tr.doc);
            }

            return prevState;
          }
        },
        'props': {
          'decorations' (state) {
            return ConnectionPointPluginKey.getState(state) || DecorationSet.empty;
          }
        }
      })
    ];
  }
});

export function updateConnectionPointDecorations (editor: import('@tiptap/react').Editor, points: ConnectionPoint[]): void {
  const { tr } = editor.state;
  tr.setMeta(ConnectionPointPluginKey, { points });
  editor.view.dispatch(tr);
}
