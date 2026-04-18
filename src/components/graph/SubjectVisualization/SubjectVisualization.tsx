import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { X, Hash, FileText, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Code, Layers, GitBranch, Link2, Folder, Settings, Info, Star, List, type LucideIcon } from 'lucide-react';
import { getAvailableSubjects, getSubject } from './register';
import type { SubjectNode, SelectedNode, SubjectUIConfig } from './types';
import {
  ForceGraph3DRenderer,
  ForceGraph2DRenderer,
  CosmosGLRenderer,
  DeckGLRenderer,
  RendererSettingsPanel,
  RENDERER_CONFIGS,
  type RendererType,
  type ForceGraphSettings,
  type CosmosGLSettings,
  type DeckGLSettings,
  DEFAULT_FORCE_GRAPH_SETTINGS,
  DEFAULT_COSMOS_GL_SETTINGS,
  DEFAULT_DECK_GL_SETTINGS
} from './renderers';
import './msc2020';
import './physh';
import './mesh';
import './chebi';

const iconMap: Record<string, LucideIcon> = {
  Hash,
  FileText,
  ChevronDown,
  ChevronUp,
  Code,
  Layers,
  GitBranch,
  Link2,
  Folder,
  Info,
  Star,
  List
};

const formatIdToName = (id: string, getIdName?: (id: string) => string): string => {
  if (getIdName) {
    return getIdName(id);
  }
  const parts = id.split('/');
  return parts[parts.length - 1] || id;
};

interface ScrollableButtonGroupProps<T extends string> {
  items: Array<{ key: T; label: string; description?: string }>;
  selectedKey: T;
  onSelect: (key: T) => void;
  maxVisible?: number;
  size?: 'sm' | 'md';
  activeColor?: string;
}

function ScrollableButtonGroup<T extends string> ({
  items,
  selectedKey,
  onSelect,
  maxVisible = 3,
  size = 'md',
  activeColor = 'bg-sky-600'
}: ScrollableButtonGroupProps<T>) {
  const [startIndex, setStartIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const needsScroll = items.length > maxVisible;

  const clampedStartIndex = useMemo(() => {
    return Math.min(startIndex, Math.max(0, items.length - maxVisible));
  }, [startIndex, items, maxVisible]);

  const canScrollLeft = clampedStartIndex > 0;
  const canScrollRight = clampedStartIndex + maxVisible < items.length;

  useLayoutEffect(() => {
    if (!trackRef.current) {
      return;
    }
    const buttons = Array.from(trackRef.current.children) as HTMLElement[];
    if (buttons.length === 0) {
      return;
    }
    const gap = 8;

    let newOffset = 0;
    for (let i = 0; i < clampedStartIndex; i += 1) {
      const btn = buttons[i];
      if (btn) {
        newOffset += btn.offsetWidth + gap;
      }
    }
    trackRef.current.style.transform = `translateX(-${newOffset}px)`;

    let vpWidth = 0;
    const end = Math.min(clampedStartIndex + maxVisible, buttons.length);
    for (let i = clampedStartIndex; i < end; i += 1) {
      const btn = buttons[i];
      if (btn) {
        if (i > clampedStartIndex) {
          vpWidth += gap;
        }
        vpWidth += btn.offsetWidth;
      }
    }
    if (viewportRef.current) {
      viewportRef.current.style.width = `${vpWidth}px`;
    }
  }, [clampedStartIndex, maxVisible, items]);

  const handleScrollLeft = () => {
    if (canScrollLeft) {
      setStartIndex(clampedStartIndex - 1);
    }
  };

  const handleScrollRight = () => {
    if (canScrollRight) {
      setStartIndex(clampedStartIndex + 1);
    }
  };

  const handleSelect = (key: T) => {
    onSelect(key);
    const selectedIndex = items.findIndex((item) => item.key === key);
    if (selectedIndex < 0) {
      return;
    }
    if (selectedIndex < clampedStartIndex) {
      setStartIndex(selectedIndex);
    } else if (selectedIndex >= clampedStartIndex + maxVisible) {
      setStartIndex(Math.min(selectedIndex, items.length - maxVisible));
    }
  };

  const buttonClass = size === 'sm'
    ? 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0'
    : 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0';

  return (
    <div className="flex items-center">
      <button
        onClick={handleScrollLeft}
        className={`shrink-0 p-1 rounded-lg transition-all duration-300 ease-in-out ${
          canScrollLeft && needsScroll
            ? 'opacity-100 bg-neutral-700 text-neutral-300 hover:bg-neutral-600 mr-1 w-7'
            : 'opacity-0 pointer-events-none w-0 mr-0 overflow-hidden p-0'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div
        ref={viewportRef}
        className="overflow-hidden"
      >
        <div
          ref={trackRef}
          className="flex items-center gap-2"
          style={{
            'transform': 'translateX(0px)',
            'transition': 'transform 300ms ease-in-out'
          }}
        >
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => handleSelect(item.key)}
              className={`${buttonClass} ${
                selectedKey === item.key
                  ? `${activeColor} text-white`
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              }`}
              title={item.description}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={handleScrollRight}
        className={`shrink-0 p-1 rounded-lg transition-all duration-300 ease-in-out ${
          canScrollRight && needsScroll
            ? 'opacity-100 bg-neutral-700 text-neutral-300 hover:bg-neutral-600 ml-1 w-7'
            : 'opacity-0 pointer-events-none w-0 ml-0 overflow-hidden p-0'
        }`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function SubjectVisualization () {
  const { subject } = useParams<{ subject?: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ 'width': window.innerWidth, 'height': window.innerHeight - 64 });
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SubjectNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ 'x': 0, 'y': 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<string>(() => subject || 'msc2020');
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [currentRenderer, setCurrentRenderer] = useState<RendererType>('cosmos-gl');
  const [showSettings, setShowSettings] = useState(false);
  const [forceGraphSettings, setForceGraphSettings] = useState<ForceGraphSettings>(DEFAULT_FORCE_GRAPH_SETTINGS);
  const [cosmosGLSettings, setCosmosGLSettings] = useState<CosmosGLSettings>(DEFAULT_COSMOS_GL_SETTINGS);
  const [deckGLSettings, setDeckGLSettings] = useState<DeckGLSettings>(DEFAULT_DECK_GL_SETTINGS);

  const availableSubjects = useMemo(() => getAvailableSubjects(), []);

  const transformer = useMemo(() => getSubject(currentSubject), [currentSubject]);

  useEffect(() => {
    const loadDataAsync = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        if (transformer?.loadData) {
          await transformer.loadData();
          setDataVersion((v) => v + 1);
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : '加载数据失败');
      } finally {
        setIsLoading(false);
      }
    };
    loadDataAsync();
  }, [transformer]);

  const graphData = useMemo(() => {
    return transformer ? transformer.transformData() : { 'nodes': [], 'links': [] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformer, dataVersion]);

  const subjectInfo = useMemo(() => {
    return transformer ? transformer.getSubjectInfo() : null;
  }, [transformer]);

  const uiConfig = useMemo((): SubjectUIConfig => {
    return transformer ? transformer.getUIConfig() : {
      'showCodeField': true,
      'codeFieldLabel': '代码',
      'tooltipFields': [],
      'panelFields': [],
      'levelLabels': {}
    };
  }, [transformer]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ 'width': rect.width, 'height': rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleNodeHover = useCallback((node: SubjectNode | null) => {
    if (node) {
      setHoveredNode(node);
      setShowTooltip(true);
    } else {
      setHoveredNode(null);
      setShowTooltip(false);
    }
  }, []);

  const handleNodeRightClick = useCallback((node: SubjectNode, event: MouseEvent) => {
    event.preventDefault();
    setExpandedLists(new Set());
    const extraInfo = transformer?.getNodeExtraInfo?.(node);

    const selectedData: SelectedNode = {
      'code': node.originalData.code as string,
      'title': node.originalData.title as string,
      'level': node.level
    };

    if (node.parentId) {
      selectedData.parentId = node.parentId;
    }

    if (extraInfo) {
      selectedData.extraInfo = extraInfo as Record<string, unknown>;
    }

    setSelectedNode(selectedData);
  }, [transformer]);

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNodeClick = useCallback((_node: SubjectNode, _event: MouseEvent) => {
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setTooltipPosition({ 'x': event.clientX, 'y': event.clientY });
  }, []);

  const handleSubjectChange = useCallback((subjectKey: string) => {
    setCurrentSubject(subjectKey);
    setSelectedNode(null);
  }, []);

  const getLevelLabel = useCallback((level: string): string => {
    if (level === 'root') {
      return '根节点';
    }
    const match = level.match(/level_(\d+)/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      return `${num}级节点`;
    }
    return uiConfig.levelLabels[level] || level;
  }, [uiConfig.levelLabels]);

  const toggleListExpand = useCallback((fieldKey: string) => {
    setExpandedLists((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fieldKey)) {
        newSet.delete(fieldKey);
      } else {
        newSet.add(fieldKey);
      }
      return newSet;
    });
  }, []);

  const renderGraph = () => {
    const props = {
      graphData,
      dimensions,
      'onNodeHover': handleNodeHover,
      'onNodeClick': handleNodeClick,
      'onNodeRightClick': handleNodeRightClick,
      'backgroundColor': '#171717'
    };

    switch (currentRenderer) {
      case 'force-graph-2d':
        return <ForceGraph2DRenderer {...props} settings={forceGraphSettings} />;
      case 'cosmos-gl':
        return <CosmosGLRenderer {...props} settings={cosmosGLSettings} />;
      case 'deck-gl':
        return <DeckGLRenderer {...props} settings={deckGLSettings} />;
      case 'force-graph-3d':
      default:
        return <ForceGraph3DRenderer {...props} settings={forceGraphSettings} />;
    }
  };

  const renderTooltip = () => {
    if (!showTooltip || !hoveredNode) {
      return null;
    }

    return (
      <div
        className="fixed z-50 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl pointer-events-none max-w-xs"
        style={{
          'left': tooltipPosition.x + 15,
          'top': tooltipPosition.y + 15
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ 'backgroundColor': hoveredNode.color }}
          />
          {uiConfig.tooltipFields.map((field) => {
            const value = hoveredNode.originalData[field.key];
            if (field.type === 'code') {
              return (
                <span key={field.key} className="font-mono text-sm text-sky-400">
                  {typeof value === 'string' ? formatIdToName(value, transformer?.getIdName) : ''}
                </span>
              );
            }
            if (field.type === 'text') {
              return (
                <span key={field.key} className="text-sm text-neutral-200">
                  {typeof value === 'string' ? (
                    <span dangerouslySetInnerHTML={{ '__html': value }} />
                  ) : ''}
                </span>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  const renderPanelField = (field: { key: string; label: string; type: string; icon?: string }, data: Record<string, unknown>) => {
    const value = data[field.key];
    const IconComponent = field.icon ? iconMap[field.icon] : null;

    if (value === undefined || value === null) {
      return null;
    }

    if (field.type === 'text' && typeof value === 'string' && value.trim() === '') {
      return null;
    }

    if (field.type === 'list' && Array.isArray(value) && value.length === 0) {
      return null;
    }

    if (field.type === 'badge') {
      return (
        <div key={field.key}>
          <div className="flex items-center gap-2 mb-2">
            {IconComponent && <IconComponent className="w-4 h-4 text-amber-400" />}
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{field.label}</span>
          </div>
          <div className="bg-neutral-900 rounded-lg p-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-sky-900/50 text-sky-300 border border-sky-700">
              {field.key === 'level' ? getLevelLabel(value as string) : String(value)}
            </span>
          </div>
        </div>
      );
    }

    if (field.type === 'code') {
      return (
        <div key={field.key}>
          <div className="flex items-center gap-2 mb-2">
            {IconComponent && <IconComponent className="w-4 h-4 text-sky-400" />}
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{field.label}</span>
          </div>
          <div className="bg-neutral-900 rounded-lg p-3">
            <code className="text-lg font-mono text-sky-400 break-all">
              {typeof value === 'string' ? formatIdToName(value, transformer?.getIdName) : String(value)}
            </code>
          </div>
        </div>
      );
    }

    if (field.type === 'text') {
      return (
        <div key={field.key}>
          <div className="flex items-center gap-2 mb-2">
            {IconComponent && <IconComponent className="w-4 h-4 text-green-400" />}
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{field.label}</span>
          </div>
          <div className="bg-neutral-900 rounded-lg p-3">
            <p
              className="text-neutral-200 html-content"
              dangerouslySetInnerHTML={{ '__html': String(value) }}
            />
          </div>
        </div>
      );
    }

    if (field.type === 'list' && Array.isArray(value)) {
      const isExpanded = expandedLists.has(field.key);
      const displayItems = isExpanded ? value : value.slice(0, 5);
      const hasMore = value.length > 5;

      return (
        <div key={field.key}>
          <div className="flex items-center gap-2 mb-2">
            {IconComponent && <IconComponent className="w-4 h-4 text-purple-400" />}
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{field.label}</span>
            <span className="text-xs text-neutral-500">({value.length})</span>
          </div>
          <div className="bg-neutral-900 rounded-lg p-3">
            <ul className="text-xs text-neutral-300 space-y-1">
              {displayItems.map((id, i) => (
                <li key={i} className="truncate">{formatIdToName(id, transformer?.getIdName)}</li>
              ))}
            </ul>
            {hasMore && (
              <button
                onClick={() => toggleListExpand(field.key)}
                className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors py-1"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>收起</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>+{value.length - 5} 更多</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderPanel = () => {
    if (!selectedNode) {
      return null;
    }

    const panelData: Record<string, unknown> = {
      'code': selectedNode.code,
      'title': selectedNode.title,
      'level': selectedNode.level,
      'parentId': selectedNode.parentId,
      ...selectedNode.extraInfo
    };

    return (
      <div className="fixed right-0 top-0 h-full w-96 bg-neutral-800 border-l border-neutral-700 shadow-2xl z-50 flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <h2 className="text-lg font-medium text-neutral-100">节点详情</h2>
          <button
            onClick={handleClosePanel}
            className="p-1 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {uiConfig.panelFields.map((field) => renderPanelField(field, panelData))}
          </div>
        </div>

        <div className="p-4 border-t border-neutral-700">
          <button
            onClick={handleClosePanel}
            className="w-full py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors text-sm font-medium"
          >
            关闭面板
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex flex-col bg-neutral-900">
      <div className="bg-neutral-800 border-b border-neutral-700 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="font-bold text-lg text-neutral-100">IN Gral</span>
          </Link>
          <div className="h-6 w-px bg-neutral-600" />
          <ScrollableButtonGroup
            items={availableSubjects.map((s) => ({ 'key': s.key, 'label': s.name }))}
            selectedKey={currentSubject}
            onSelect={handleSubjectChange}
            maxVisible={3}
            size="md"
            activeColor="bg-sky-600"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {RENDERER_CONFIGS.map((config) => (
              <button
                key={config.type}
                onClick={() => setCurrentRenderer(config.type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentRenderer === config.type
                    ? 'bg-purple-600 text-white'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                }`}
                title={config.description}
              >
                {config.label}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-neutral-600" />
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <span>节点: {graphData.nodes.length}</span>
            <span className="text-neutral-600">|</span>
            <span>连接: {graphData.links.length}</span>
          </div>
          <div className="h-6 w-px bg-neutral-600" />
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings
                ? 'bg-sky-600 text-white'
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            }`}
            title="渲染器设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative"
        onMouseMove={handleMouseMove}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mx-auto mb-4" />
              <p className="text-neutral-400">正在加载数据...</p>
            </div>
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
            <div className="text-center">
              <p className="text-red-400 mb-4">{loadError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500"
              >
                重新加载
              </button>
            </div>
          </div>
        )}
        {!isLoading && !loadError && renderGraph()}

        {renderTooltip()}

        <div className="absolute bottom-4 left-4 bg-neutral-800/90 backdrop-blur-sm border border-neutral-700 rounded-lg p-4 max-w-xs">
          <h3 className="text-sm font-medium text-neutral-200 mb-3">操作说明</h3>
          <ul className="text-xs text-neutral-400 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-sky-400">→</span>
              <span>左键拖拽节点：移动节点位置</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-sky-400">→</span>
              <span>右键点击节点：查看详细信息</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-sky-400">→</span>
              <span>鼠标悬停：显示节点名称</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-sky-400">→</span>
              <span>左键拖拽空白：旋转/平移视图</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-sky-400">→</span>
              <span>滚轮：缩放视图</span>
            </li>
          </ul>
        </div>

        <div className="absolute top-4 left-4 bg-neutral-800/90 backdrop-blur-sm border border-neutral-700 rounded-lg p-3">
          <h3 className="text-xs font-medium text-neutral-300 mb-2">颜色图例</h3>
          <div className="space-y-1 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-white" />
              <span>根节点: {subjectInfo?.rootName}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500" />
              <span>一级分类：各不相同</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-400 to-pink-400" />
              <span>下级分类：色相偏移+更亮</span>
            </div>
          </div>
        </div>
      </div>

      <RendererSettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentRenderer={currentRenderer}
        forceGraphSettings={forceGraphSettings}
        cosmosGLSettings={cosmosGLSettings}
        deckGLSettings={deckGLSettings}
        onForceGraphSettingsChange={setForceGraphSettings}
        onCosmosGLSettingsChange={setCosmosGLSettings}
        onDeckGLSettingsChange={setDeckGLSettings}
      />

      {renderPanel()}

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
