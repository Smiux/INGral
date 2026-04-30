import { createContext, type Dispatch } from 'react';
import type { NavigateFunction } from 'react-router-dom';

interface Tab {
  'id': string;
  'title': string;
  'path': string;
  'icon': string;
  'createdAt': number;
}

interface HistoryEntry {
  'path': string;
  'title': string;
  'icon': string;
  'visitedAt': number;
}

interface NavigatorState {
  'isOpen': boolean;
  'tabs': Tab[];
  'activeTabId': string;
  'history': HistoryEntry[];
  'loadedTabs': Set<string>;
}

type NavigatorAction =
  | { 'type': 'OPEN_SIDEBAR' }
  | { 'type': 'CLOSE_SIDEBAR' }
  | { 'type': 'TOGGLE_SIDEBAR' }
  | { 'type': 'NAVIGATE'; 'pathname': string }
  | { 'type': 'CLOSE_TAB'; 'id': string }
  | { 'type': 'CLOSE_OTHER_TABS'; 'id': string }
  | { 'type': 'CLOSE_ALL_TABS' }
  | { 'type': 'REORDER_TABS'; 'fromIndex': number; 'toIndex': number }
  | { 'type': 'CLEAR_HISTORY' }
  | { 'type': 'MARK_TAB_LOADED'; 'id': string }
  | { 'type': 'UPDATE_TAB_TITLE'; 'id': string; 'title': string };

interface NavigatorContextType {
  'isOpen': boolean;
  'setIsOpen': (open: boolean) => void;
  'toggleSidebar': () => void;
  'tabs': Tab[];
  'activeTabId': string;
  'closeTab': (id: string) => void;
  'closeOtherTabs': (id: string) => void;
  'closeAllTabs': () => void;
  'reorderTabs': (fromIndex: number, toIndex: number) => void;
  'history': HistoryEntry[];
  'clearHistory': () => void;
  'loadedTabs': Set<string>;
  'markTabAsLoaded': (id: string) => void;
  'updateTabTitle': (id: string, title: string) => void;
  'state': NavigatorState;
  'dispatch': Dispatch<NavigatorAction>;
  'navigate': NavigateFunction;
}

const NavigatorContext = createContext<NavigatorContextType | null>(null);

export type { Tab, HistoryEntry, NavigatorState, NavigatorAction, NavigatorContextType };
export { NavigatorContext };
