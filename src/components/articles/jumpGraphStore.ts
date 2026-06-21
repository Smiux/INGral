import { useSyncExternalStore } from 'react';
import { addJumpToGraph, type JumpGraph } from './jumpTypes';

export type ArrangementMode = 'circular' | 'linear';

export interface JumpGraphState {
  jumpGraph: JumpGraph;
  recording: boolean;
  dockCollapsed: boolean;
  arrangementMode: ArrangementMode;
  jumpPathCollapsed: boolean;
}

const JUMP_GRAPH_STORAGE_KEY = 'relation_navigator_jump_graph';
const DOCK_UI_STATE_KEY = 'relation_navigator_dock_ui';

function loadJumpGraphFromStorage (): JumpGraph {
  try {
    const raw = localStorage.getItem(JUMP_GRAPH_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as JumpGraph;
    }
  } catch {
    // ignore
  }
  return { 'nodes': [], 'edges': [] };
}

function saveJumpGraphToStorage (graph: JumpGraph): void {
  try {
    localStorage.setItem(JUMP_GRAPH_STORAGE_KEY, JSON.stringify(graph));
  } catch {
    // ignore
  }
}

function loadDockUIState (): Partial<Omit<JumpGraphState, 'jumpGraph'>> {
  try {
    const raw = localStorage.getItem(DOCK_UI_STATE_KEY);
    if (raw) {
      return JSON.parse(raw) as Partial<Omit<JumpGraphState, 'jumpGraph'>>;
    }
  } catch {
    // ignore
  }
  return {};
}

function saveDockUIState (state: Omit<JumpGraphState, 'jumpGraph'>): void {
  try {
    localStorage.setItem(DOCK_UI_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const dockUI = loadDockUIState();

let state: JumpGraphState = {
  'jumpGraph': loadJumpGraphFromStorage(),
  'recording': dockUI.recording ?? true,
  'dockCollapsed': dockUI.dockCollapsed ?? true,
  'arrangementMode': dockUI.arrangementMode ?? 'circular',
  'jumpPathCollapsed': dockUI.jumpPathCollapsed ?? false
};

const listeners = new Set<() => void>();

function notify (): void {
  for (const listener of listeners) {
    listener();
  }
}

function setState (partial: Partial<JumpGraphState>): void {
  state = { ...state, ...partial };
  if (partial.jumpGraph !== undefined) {
    saveJumpGraphToStorage(state.jumpGraph);
  }
  if (partial.recording !== undefined ||
      partial.dockCollapsed !== undefined ||
      partial.arrangementMode !== undefined ||
      partial.jumpPathCollapsed !== undefined) {
    saveDockUIState({
      'recording': state.recording,
      'dockCollapsed': state.dockCollapsed,
      'arrangementMode': state.arrangementMode,
      'jumpPathCollapsed': state.jumpPathCollapsed
    });
  }
  notify();
}

function subscribe (callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot (): JumpGraphState {
  return state;
}

export interface AddJumpParams {
  sourceArticleId: string;
  targetArticleId: string;
  sourceArticleTitle: string;
  targetArticleTitle: string;
  connectionLabel?: string | undefined;
}

export function addJump (params: AddJumpParams): void {
  if (!state.recording) {
    return;
  }
  setState({
    'jumpGraph': addJumpToGraph({ 'graph': state.jumpGraph, ...params })
  });
}

export function clearJumps (): void {
  setState({ 'jumpGraph': { 'nodes': [], 'edges': [] } });
}

export function setRecording (recording: boolean): void {
  setState({ recording });
}

export function setDockCollapsed (dockCollapsed: boolean): void {
  setState({ dockCollapsed });
}

export function setArrangementMode (arrangementMode: ArrangementMode): void {
  setState({ arrangementMode });
}

export function setJumpPathCollapsed (jumpPathCollapsed: boolean): void {
  setState({ jumpPathCollapsed });
}

export function useJumpGraphStore (): JumpGraphState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
