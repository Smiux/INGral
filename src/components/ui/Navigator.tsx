import {
  useState, useCallback, useEffect, useLayoutEffect, useRef,
  useReducer, useMemo, type ReactNode
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAliveController } from 'react-activation';
import {
  Network, Calculator, Layers, BookOpen, Home, X, GripVertical,
  Clock, Compass, Users, Wifi, RefreshCw, Loader2
} from 'lucide-react';
import { useCollaboration } from '../collaboration';
import {
  NavigatorContext,
  type Tab, type HistoryEntry, type NavigatorState, type NavigatorAction
} from './NavigatorContext';
import { useNavigator } from './useNavigator';
import { getArticleBySlug } from '@/services/articleService';
import { getGalleryById } from '@/services/galleryService';

const MAX_TABS = 20;
const MAX_HISTORY = 50;

const STORAGE_KEY_TABS = 'navigator-tabs';
const STORAGE_KEY_ACTIVE_TAB = 'navigator-active-tab';
const STORAGE_KEY_HISTORY = 'navigator-history';

function getTabInfo (pathname: string): { 'title': string; 'icon': string } {
  if (pathname === '/') {
    return { 'title': '首页', 'icon': 'home' };
  }
  if (pathname === '/articles') {
    return { 'title': '文章列表', 'icon': 'article' };
  }
  if (pathname === '/gallerys') {
    return { 'title': '地图列表', 'icon': 'gallery' };
  }
  if (pathname === '/graphs/create') {
    return { 'title': '图编辑器', 'icon': 'graph' };
  }
  if (pathname.startsWith('/graphs/subject-visualization')) {
    const subjectMatch = pathname.match(/^\/graphs\/subject-visualization\/(.+)$/);
    const subjectName = subjectMatch && subjectMatch[1]
      ? decodeURIComponent(subjectMatch[1])
      : '';
    return {
      'title': subjectName ? `分类 - ${subjectName}` : '分类可视化',
      'icon': 'subject'
    };
  }
  if (pathname === '/articles/create') {
    return { 'title': '创建文章', 'icon': 'article' };
  }
  if (pathname.match(/^\/articles\/[^/]+\/edit$/)) {
    return { 'title': '编辑文章', 'icon': 'article' };
  }
  if (pathname.match(/^\/articles\/[^/]+$/)) {
    return { 'title': '文章', 'icon': 'article' };
  }
  if (pathname.match(/^\/gallerys\/[^/]+\/explore$/)) {
    return { 'title': '地图探索', 'icon': 'gallery' };
  }
  if (pathname.match(/^\/gallerys\/[^/]+$/)) {
    return { 'title': '地图编辑', 'icon': 'gallery' };
  }
  return { 'title': '页面', 'icon': 'default' };
}

function getTabIcon (icon: string, className?: string) {
  const cn = className ?? 'w-4 h-4';
  switch (icon) {
    case 'home': return <Home className={cn} />;
    case 'graph': return <Network className={cn} />;
    case 'subject': return <Calculator className={cn} />;
    case 'gallery': return <Layers className={cn} />;
    case 'article': return <BookOpen className={cn} />;
    default: return <Compass className={cn} />;
  }
}

function loadFromStorage<T> (key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function saveToStorage (key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function generateId (): string {
  return Date.now().toString(36) +
    Math.random().toString(36)
      .slice(2, 8);
}

function navigatorReducer (state: NavigatorState, action: NavigatorAction): NavigatorState {
  switch (action.type) {
    case 'OPEN_SIDEBAR':
      return { ...state, 'isOpen': true };
    case 'CLOSE_SIDEBAR':
      return { ...state, 'isOpen': false };
    case 'TOGGLE_SIDEBAR':
      return { ...state, 'isOpen': !state.isOpen };
    case 'NAVIGATE': {
      const pathname = action.pathname;
      const info = getTabInfo(pathname);

      const filteredHistory = state.history.filter(h => h.path !== pathname);
      const newHistoryEntry: HistoryEntry = {
        'path': pathname,
        'title': info.title,
        'icon': info.icon,
        'visitedAt': Date.now()
      };
      const newHistory = [newHistoryEntry, ...filteredHistory]
        .slice(0, MAX_HISTORY);

      const existingTab = state.tabs.find(t => t.path === pathname);
      if (existingTab) {
        return {
          ...state,
          'activeTabId': existingTab.id,
          'history': newHistory
        };
      }

      const newTab: Tab = {
        'id': generateId(),
        'title': info.title,
        'path': pathname,
        'icon': info.icon,
        'createdAt': Date.now()
      };

      const newTabs = state.tabs.length >= MAX_TABS
        ? [...state.tabs.slice(1), newTab]
        : [...state.tabs, newTab];

      return {
        ...state,
        'tabs': newTabs,
        'activeTabId': newTab.id,
        'history': newHistory
      };
    }
    case 'CLOSE_TAB': {
      const tabIndex = state.tabs.findIndex(t => t.id === action.id);
      if (tabIndex === -1) {
        return state;
      }
      const closedTab = state.tabs[tabIndex];
      const newTabs = state.tabs.filter(t => t.id !== action.id);
      const newLoadedTabs = new Set(state.loadedTabs);
      if (closedTab) {
        newLoadedTabs.delete(closedTab.id);
      }
      let newActiveTabId = state.activeTabId;
      if (action.id === state.activeTabId) {
        if (newTabs.length > 0) {
          const newIndex = Math.min(tabIndex, newTabs.length - 1);
          const targetTab = newTabs[newIndex];
          if (targetTab) {
            newActiveTabId = targetTab.id;
          }
        } else {
          newActiveTabId = '';
        }
      }
      return {
        ...state,
        'tabs': newTabs,
        'activeTabId': newActiveTabId,
        'loadedTabs': newLoadedTabs
      };
    }
    case 'CLOSE_OTHER_TABS': {
      const target = state.tabs.find(t => t.id === action.id);
      if (!target) {
        return state;
      }
      const newLoadedTabs = new Set<string>();
      if (state.loadedTabs.has(action.id)) {
        newLoadedTabs.add(action.id);
      }
      return {
        ...state,
        'tabs': [target],
        'activeTabId': action.id,
        'loadedTabs': newLoadedTabs
      };
    }
    case 'CLOSE_ALL_TABS':
      return {
        ...state,
        'tabs': [],
        'activeTabId': '',
        'loadedTabs': new Set()
      };
    case 'REORDER_TABS': {
      const newTabs = [...state.tabs];
      const moved = newTabs.splice(action.fromIndex, 1)[0];
      if (moved) {
        newTabs.splice(action.toIndex, 0, moved);
      }
      return { ...state, 'tabs': newTabs };
    }
    case 'CLEAR_HISTORY':
      return { ...state, 'history': [] };
    case 'MARK_TAB_LOADED': {
      const newLoadedTabs = new Set(state.loadedTabs);
      newLoadedTabs.add(action.id);
      return { ...state, 'loadedTabs': newLoadedTabs };
    }
    case 'UPDATE_TAB_TITLE': {
      const newTabs = state.tabs.map(tab =>
        tab.id === action.id ? { ...tab, 'title': action.title } : tab
      );
      return { ...state, 'tabs': newTabs };
    }
    default:
      return state;
  }
}

export function NavigatorProvider ({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(navigatorReducer, {
    'isOpen': false,
    'tabs': loadFromStorage<Tab[]>(STORAGE_KEY_TABS, []),
    'activeTabId': loadFromStorage<string>(STORAGE_KEY_ACTIVE_TAB, ''),
    'history': loadFromStorage<HistoryEntry[]>(STORAGE_KEY_HISTORY, []),
    'loadedTabs': new Set<string>()
  });

  const location = useLocation();
  const navigate = useNavigate();
  const prevPathRef = useRef('');

  useEffect(() => {
    saveToStorage(STORAGE_KEY_TABS, state.tabs);
  }, [state.tabs]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_ACTIVE_TAB, state.activeTabId);
  }, [state.activeTabId]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_HISTORY, state.history);
  }, [state.history]);

  useLayoutEffect(() => {
    const pathname = location.pathname;
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      dispatch({ 'type': 'NAVIGATE', pathname });
    }
  }, [location.pathname]);

  const setIsOpen = useCallback((open: boolean) => {
    dispatch(open ? { 'type': 'OPEN_SIDEBAR' } : { 'type': 'CLOSE_SIDEBAR' });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ 'type': 'TOGGLE_SIDEBAR' });
  }, []);

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ 'type': 'REORDER_TABS', fromIndex, toIndex });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ 'type': 'CLEAR_HISTORY' });
  }, []);

  const markTabAsLoaded = useCallback((id: string) => {
    dispatch({ 'type': 'MARK_TAB_LOADED', id });
  }, []);

  const updateTabTitle = useCallback((id: string, title: string) => {
    dispatch({ 'type': 'UPDATE_TAB_TITLE', id, title });
  }, []);

  const fetchAndUpdateTitle = useCallback(async (tabId: string, pathname: string) => {
    const articleMatch = pathname.match(/^\/articles\/([^/]+)$/);
    if (articleMatch && articleMatch[1]) {
      const article = await getArticleBySlug(articleMatch[1]);
      if (article) {
        updateTabTitle(tabId, article.title);
      }
      return;
    }

    const articleEditMatch = pathname.match(/^\/articles\/([^/]+)\/edit$/);
    if (articleEditMatch && articleEditMatch[1]) {
      const article = await getArticleBySlug(articleEditMatch[1]);
      if (article) {
        updateTabTitle(tabId, `编辑: ${article.title}`);
      }
      return;
    }

    const galleryMatch = pathname.match(/^\/gallerys\/([^/]+)$/);
    if (galleryMatch && galleryMatch[1]) {
      const gallery = await getGalleryById(galleryMatch[1]);
      if (gallery) {
        updateTabTitle(tabId, gallery.title);
      }
      return;
    }

    const galleryExploreMatch = pathname.match(/^\/gallerys\/([^/]+)\/explore$/);
    if (galleryExploreMatch && galleryExploreMatch[1]) {
      const gallery = await getGalleryById(galleryExploreMatch[1]);
      if (gallery) {
        updateTabTitle(tabId, `探索: ${gallery.title}`);
      }
    }
  }, [updateTabTitle]);

  useEffect(() => {
    if (!state.activeTabId) {
      return;
    }
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (activeTab) {
      fetchAndUpdateTitle(state.activeTabId, activeTab.path);
    }
  }, [state.activeTabId, state.tabs, fetchAndUpdateTitle]);

  const closeTab = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent('navigator-cache-action', {
      'detail': { 'action': 'closeTab', id }
    }));
  }, []);

  const closeOtherTabs = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent('navigator-cache-action', {
      'detail': { 'action': 'closeOtherTabs', id }
    }));
  }, []);

  const closeAllTabs = useCallback(() => {
    window.dispatchEvent(new CustomEvent('navigator-cache-action', {
      'detail': { 'action': 'closeAllTabs' }
    }));
  }, []);

  const contextValue = useMemo(() => ({
    'isOpen': state.isOpen,
    setIsOpen,
    toggleSidebar,
    'tabs': state.tabs,
    'activeTabId': state.activeTabId,
    state,
    dispatch,
    navigate,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    reorderTabs,
    'history': state.history,
    clearHistory,
    'loadedTabs': state.loadedTabs,
    markTabAsLoaded,
    updateTabTitle
  }), [
    state, setIsOpen, toggleSidebar, closeTab, closeOtherTabs, closeAllTabs,
    reorderTabs, clearHistory, markTabAsLoaded, updateTabTitle, dispatch, navigate
  ]);

  return (
    <NavigatorContext.Provider value={contextValue}>
      {children}
    </NavigatorContext.Provider>
  );
}

export function NavigatorCacheManager () {
  const { state, dispatch, navigate } = useNavigator();
  const aliveController = useAliveController();

  const closeTab = useCallback((id: string) => {
    const tabToClose = state.tabs.find(t => t.id === id);
    dispatch({ 'type': 'CLOSE_TAB', id });
    if (tabToClose) {
      aliveController.drop(tabToClose.path);
    }
    const tabIndex = state.tabs.findIndex(t => t.id === id);
    if (id === state.activeTabId) {
      const newTabs = state.tabs.filter(t => t.id !== id);
      if (newTabs.length === 0) {
        navigate('/');
      } else {
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        const targetTab = newTabs[newIndex];
        if (targetTab) {
          navigate(targetTab.path);
        }
      }
    }
  }, [state.tabs, state.activeTabId, navigate, aliveController, dispatch]);

  const closeOtherTabs = useCallback((id: string) => {
    state.tabs.forEach(tab => {
      if (tab.id !== id && state.loadedTabs.has(tab.id)) {
        aliveController.drop(tab.path);
      }
    });
    dispatch({ 'type': 'CLOSE_OTHER_TABS', id });
  }, [state.tabs, state.loadedTabs, aliveController, dispatch]);

  const closeAllTabs = useCallback(() => {
    state.tabs.forEach(tab => {
      if (state.loadedTabs.has(tab.id)) {
        aliveController.drop(tab.path);
      }
    });
    dispatch({ 'type': 'CLOSE_ALL_TABS' });
    navigate('/');
  }, [state.tabs, state.loadedTabs, aliveController, dispatch, navigate]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { action, id } = e.detail;
      if (action === 'closeTab') {
        closeTab(id);
      } else if (action === 'closeOtherTabs') {
        closeOtherTabs(id);
      } else if (action === 'closeAllTabs') {
        closeAllTabs();
      }
    };
    window.addEventListener('navigator-cache-action', handler as EventListener);
    return () => {
      window.removeEventListener('navigator-cache-action', handler as EventListener);
    };
  }, [closeTab, closeOtherTabs, closeAllTabs]);

  return null;
}

interface NavigatorTriggerProps {
  'dark'?: boolean;
  'className'?: string;
}

export function NavigatorTrigger ({ dark = false, className = '' }: NavigatorTriggerProps) {
  const { toggleSidebar } = useNavigator();

  return (
    <button
      onClick={toggleSidebar}
      className={`flex items-center gap-2 hover:opacity-80 transition-opacity px-2 py-1 rounded-lg focus:outline-none ${
        dark ? 'text-neutral-100' : 'text-neutral-800 dark:text-neutral-200'
      } ${className}`}
    >
      <span className="font-bold tracking-tight">IN Gral</span>
    </button>
  );
}

function CollaborationButton () {
  const { isConnected, isConnecting, connectionStatus, collaborators, setPanelOpen } = useCollaboration();

  const getStatusIcon = () => {
    if (connectionStatus === 'reconnecting') {
      return <RefreshCw size={16} className="animate-spin text-orange-500" />;
    }
    if (isConnecting) {
      return <Loader2 size={16} className="animate-spin text-sky-400" />;
    }
    if (isConnected) {
      return <Wifi size={16} className="text-green-500" />;
    }
    return <Users size={16} className="text-sky-400" />;
  };

  return (
    <button
      onClick={() => setPanelOpen(true)}
      className="w-full font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none text-neutral-600 dark:text-neutral-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all duration-200"
    >
      {getStatusIcon()}
      <span className="text-sm">协作</span>
      {isConnected && collaborators.length > 0 && (
        <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-green-500 rounded-full">
          {collaborators.length + 1}
        </span>
      )}
    </button>
  );
}

function NavigationSection () {
  const navigate = useNavigate();
  const { setIsOpen } = useNavigator();

  const navItems = [
    {
      'icon': <Network className="w-4 h-4 text-sky-300" />,
      'label': '图',
      'path': '/graphs/create',
      'hoverBg': 'hover:bg-sky-50 dark:hover:bg-sky-900/20',
      'hoverText': 'hover:text-sky-500 dark:hover:text-sky-400'
    },
    {
      'icon': <Calculator className="w-4 h-4 text-purple-300" />,
      'label': '分类',
      'path': '/graphs/subject-visualization',
      'hoverBg': 'hover:bg-purple-50 dark:hover:bg-purple-900/20',
      'hoverText': 'hover:text-purple-500 dark:hover:text-purple-400'
    },
    {
      'icon': <Layers className="w-4 h-4 text-orange-300" />,
      'label': '地图',
      'path': '/gallerys',
      'hoverBg': 'hover:bg-orange-50 dark:hover:bg-orange-900/20',
      'hoverText': 'hover:text-orange-500 dark:hover:text-orange-400'
    },
    {
      'icon': <BookOpen className="w-4 h-4 text-green-300" />,
      'label': '文章',
      'path': '/articles',
      'hoverBg': 'hover:bg-green-50 dark:hover:bg-green-900/20',
      'hoverText': 'hover:text-green-500 dark:hover:text-green-400'
    }
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="space-y-1">
      {navItems.map(item => (
        <button
          key={item.label}
          onClick={() => handleNavigate(item.path)}
          className={`w-full font-medium flex items-center gap-3 px-3 py-2.5 rounded-lg focus:outline-none text-neutral-600 dark:text-neutral-300 ${
            item.hoverBg
          } ${item.hoverText} transition-all duration-200`}
        >
          {item.icon}
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
      <div>
        <CollaborationButton />
      </div>
    </div>
  );
}

function HistorySection () {
  const navigate = useNavigate();
  const { history, clearHistory, setIsOpen } = useNavigator();

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const [now] = useState(() => Date.now());
  const groups = useMemo(() => {
    const oneDayMs = 86400000;
    const today: HistoryEntry[] = [];
    const yesterday: HistoryEntry[] = [];
    const earlier: HistoryEntry[] = [];

    history.forEach(entry => {
      const diff = now - entry.visitedAt;
      if (diff < oneDayMs) {
        today.push(entry);
      } else if (diff < oneDayMs * 2) {
        yesterday.push(entry);
      } else {
        earlier.push(entry);
      }
    });

    const result: { 'label': string; 'entries': HistoryEntry[] }[] = [];
    if (today.length > 0) {
      result.push({ 'label': '今天', 'entries': today });
    }
    if (yesterday.length > 0) {
      result.push({ 'label': '昨天', 'entries': yesterday });
    }
    if (earlier.length > 0) {
      result.push({ 'label': '更早', 'entries': earlier });
    }
    return result;
  }, [history, now]);

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-400 dark:text-neutral-500 text-sm">
        暂无浏览记录
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <div key={group.label}>
          <div className="text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-2 px-1">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.entries.map(entry => (
              <button
                key={`${entry.path}-${entry.visitedAt}`}
                onClick={() => handleNavigate(entry.path)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors text-sm"
              >
                {getTabIcon(entry.icon)}
                <span className="truncate flex-1 text-left">{entry.title}</span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">
                  {new Date(entry.visitedAt).toLocaleTimeString('zh-CN', {
                    'hour': '2-digit',
                    'minute': '2-digit'
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={clearHistory}
        className="w-full text-center text-xs text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 py-2 transition-colors"
      >
        清除浏览记录
      </button>
    </div>
  );
}

function TabItem ({
  tab, isActive, isLoaded, index, onActivate, onClose, onDragStart, onDragOver, onDrop, onDragEnd
}: {
  'tab': Tab;
  'isActive': boolean;
  'isLoaded': boolean;
  'index': number;
  'onActivate': () => void;
  'onClose': (e: React.MouseEvent) => void;
  'onDragStart': (e: React.DragEvent) => void;
  'onDragOver': (e: React.DragEvent) => void;
  'onDrop': (e: React.DragEvent, targetIndex: number) => void;
  'onDragEnd': (e: React.DragEvent) => void;
}) {
  const dragOverRef = useRef(false);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragOverRef.current) {
          dragOverRef.current = true;
          setIsDragOver(true);
        }
        onDragOver(e);
      }}
      onDragLeave={() => {
        dragOverRef.current = false;
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        dragOverRef.current = false;
        setIsDragOver(false);
        onDrop(e, index);
      }}
      onDragEnd={onDragEnd}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
        isActive
          ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
      } ${isDragOver ? 'ring-2 ring-sky-400 ring-offset-1' : ''} ${
        !isLoaded ? 'opacity-50' : ''
      }`}
      onClick={onActivate}
    >
      <GripVertical className="w-3 h-3 text-neutral-300 dark:text-neutral-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="shrink-0">{getTabIcon(tab.icon, 'w-3.5 h-3.5')}</span>
      <span className="text-sm truncate flex-1">{tab.title}</span>
      <button
        onClick={onClose}
        className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function TabsSection () {
  const {
    tabs, activeTabId, closeTab, closeOtherTabs, closeAllTabs, reorderTabs, setIsOpen,
    loadedTabs
  } = useNavigator();
  const navigate = useNavigate();
  const dragIndexRef = useRef<number | null>(null);

  const handleActivate = (tab: Tab) => {
    navigate(tab.path);
    setIsOpen(false);
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    dragIndexRef.current = null;
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
  };

  const handleDrop = (_e: React.DragEvent, toIndex: number) => {
    if (dragIndexRef.current !== null && dragIndexRef.current !== toIndex) {
      reorderTabs(dragIndexRef.current, toIndex);
    }
    dragIndexRef.current = null;
  };

  if (tabs.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-400 dark:text-neutral-500 text-sm">
        暂无打开的标签页
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tabs.map((tab, index) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          isLoaded={loadedTabs.has(tab.id)}
          index={index}
          onActivate={() => handleActivate(tab)}
          onClose={(e) => {
            e.stopPropagation();
            closeTab(tab.id);
          }}
          onDragStart={handleDragStart(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        />
      ))}
      {tabs.length > 1 && (
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
          <button
            onClick={() => {
              const activeTab = tabs.find(t => t.id === activeTabId);
              if (activeTab) {
                closeOtherTabs(activeTab.id);
              }
            }}
            className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            关闭其他
          </button>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          <button
            onClick={closeAllTabs}
            className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            关闭全部
          </button>
        </div>
      )}
    </div>
  );
}

export function NavigatorSidebar () {
  const { isOpen, setIsOpen } = useNavigator();
  const [activeSection, setActiveSection] = useState<'nav' | 'history'>('nav');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ 'opacity': 0 }}
            animate={{ 'opacity': 1 }}
            exit={{ 'opacity': 0 }}
            transition={{ 'duration': 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ 'x': -320 }}
            animate={{ 'x': 0 }}
            exit={{ 'x': -320 }}
            transition={{ 'type': 'spring', 'damping': 25, 'stiffness': 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 z-50 flex flex-col shadow-xl print:hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-700/50">
              <span className="font-bold text-lg tracking-tight text-neutral-800 dark:text-neutral-200">
                IN Gral
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-3">
                <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg mb-3">
                  <button
                    onClick={() => setActiveSection('nav')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      activeSection === 'nav'
                        ? 'bg-white dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100 shadow-sm'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    导航
                  </button>
                  <button
                    onClick={() => setActiveSection('history')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      activeSection === 'history'
                        ? 'bg-white dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100 shadow-sm'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    历史
                  </button>
                </div>

                {activeSection === 'nav' ? <NavigationSection /> : <HistorySection />}
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-700/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    标签页
                  </span>
                </div>
                <TabsSection />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
