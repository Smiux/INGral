import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStore,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  NodeChange,
  EdgeChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Info, Trash2, Plus, Save, Undo2, Redo2, Archive, FileText, FilePlus, ChevronDown, LayoutGrid, Eye } from 'lucide-react';
import { getGalleryById, createGallery, updateGallery, deleteGallery } from '@/services/galleryService';
import { getArticleBySlug } from '@/services/articleService';
import { ArticleSelector, ArticlePreviewPanel, GalleryInfoPanel, GalleryLayoutPanel, SimpleEditor } from '@/components/gallerys';
import { ConfirmDialog } from '@/components/ui/generic/ConfirmDialog';
import { NavigatorTrigger } from '@/components/ui/navigator/Navigator';
import { ArticleNode as ArticleNodeComponent } from '@/components/gallerys/Node';
import { ArticleEdge as ArticleEdgeComponent } from '@/components/gallerys/Edge';
import { useUndoRedo } from '@/components/graph/GraphVisualization/utils/useUndoRedo';
import { useRightClickConnect } from '@/components/graph/GraphVisualization/utils/useRightClickConnect';
import type { ArticleNodeData, EmbeddedArticle, ArticleNode, ArticleEdge } from '@/components/gallerys/gallery';

function countWords (text: string): number {
  let plainText = text;

  plainText = plainText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  plainText = plainText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  plainText = plainText.replace(/<[^>]+>/g, ' ');
  plainText = plainText.replace(/&nbsp;/g, ' ');
  plainText = plainText.replace(/&lt;/g, '<');
  plainText = plainText.replace(/&gt;/g, '>');
  plainText = plainText.replace(/&amp;/g, '&');
  plainText = plainText.replace(/&quot;/g, '"');
  plainText = plainText.replace(/&#\d+;/g, ' ');
  plainText = plainText.replace(/&[a-zA-Z]+;/g, ' ');

  const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/gu) || []).length;
  const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
}

const nodeTypes = {
  'articleNode': ArticleNodeComponent
} as const as NodeTypes;

const edgeTypes = {
  'articleEdge': ArticleEdgeComponent
} as const as EdgeTypes;

const GallerysEditContent = () => {
  const { galleryId } = useParams<{ galleryId: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(galleryId && galleryId !== 'create');

  const [title, setTitle] = useState('');
  const [embeddedArticles, setEmbeddedArticles] = useState<EmbeddedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [showArticleSelector, setShowArticleSelector] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<ArticleNodeData | null>(null);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSimpleEditor, setShowSimpleEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingArticle, setEditingArticle] = useState<EmbeddedArticle | null>(null);
  const [excludeSlugs, setExcludeSlugs] = useState<string[]>([]);
  const [showLayoutPanel, setShowLayoutPanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [articleWordCountMap, setArticleWordCountMap] = useState<Record<string, number>>({});

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { undo, redo, canUndo, canRedo, saveState } = useUndoRedo();
  const isDraggingRef = useRef(false);
  const lastSavedStateRef = useRef<string>('');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const reactFlowInstance = useReactFlow();
  const nodeLookup = useStore((state) => state.nodeLookup);
  const transform = useStore((state) => state.transform);

  const { handleCanvasMouseDown, renderConnectionLine } = useRightClickConnect({
    reactFlowInstance,
    edges,
    'setEdges': setEdges as React.Dispatch<React.SetStateAction<Edge[]>>,
    nodeLookup,
    transform,
    'lineColor': '#0ea5e9',
    'createEdge': (sourceId, targetId) => ({
      'id': `edge-${sourceId}-${targetId}-${Date.now()}`,
      'source': sourceId,
      'target': targetId,
      'sourceHandle': 'source',
      'targetHandle': 'target',
      'type': 'articleEdge',
      'data': {
        'relationshipType': '默认'
      },
      'markerEnd': {
        'type': 'arrowclosed',
        'color': '#4ECDC4'
      }
    })
  });

  const hasSelection = useStore(
    (state) => {
      const hasSelectedNode = state.nodes.some(node => node.selected);
      const hasSelectedEdge = state.edges.some(edge => edge.selected);
      return hasSelectedNode || hasSelectedEdge;
    },
    (prev, next) => prev === next
  );

  const selectedNodeIds = useMemo(() => {
    if (!showOnlySelected) {
      return null;
    }
    const selected = nodes.filter(n => n.selected).map(n => n.id);
    return selected.length > 0 ? new Set(selected) : null;
  }, [showOnlySelected, nodes]);

  const displayedNodes = useMemo(() => {
    if (!selectedNodeIds) {
      return nodes;
    }
    return nodes.filter(n => selectedNodeIds.has(n.id));
  }, [nodes, selectedNodeIds]);

  const displayedEdges = useMemo(() => {
    if (!selectedNodeIds) {
      return edges;
    }
    return edges.filter(e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target));
  }, [edges, selectedNodeIds]);

  const loadGallery = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const gallery = await getGalleryById(id);
      if (gallery) {
        setTitle(gallery.title);
        const initialNodes = (gallery.nodes || []).map(n => ({
          ...n,
          'type': 'articleNode'
        })) as Node[];
        const initialEdges = (gallery.edges || []).map(e => ({
          ...e,
          'type': 'articleEdge',
          'sourceHandle': e.sourceHandle ?? 'source',
          'targetHandle': e.targetHandle ?? 'target',
          'markerEnd': e.markerEnd || {
            'type': 'arrowclosed',
            'color': '#4ECDC4'
          }
        })) as Edge[];
        setNodes(initialNodes);
        setEdges(initialEdges);
        setEmbeddedArticles(gallery.embeddedArticles || []);
        setExcludeSlugs(initialNodes.map(n => (n.data as ArticleNodeData).articleSlug));

        const existingSlugs = initialNodes
          .filter(n => !(n.data as ArticleNodeData).isEmbedded)
          .map(n => (n.data as ArticleNodeData).articleSlug);

        if (existingSlugs.length > 0) {
          const wordCountMap: Record<string, number> = {};
          await Promise.all(existingSlugs.map(async slug => {
            try {
              const articleData = await getArticleBySlug(slug);
              if (articleData?.content) {
                wordCountMap[slug] = countWords(articleData.content);
              }
            } catch {
              // 忽略错误
            }
          }));
          setArticleWordCountMap(wordCountMap);
        }
      } else {
        navigate('/gallerys');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, setNodes, setEdges]);

  useEffect(() => {
    if (isEditMode && galleryId) {
      loadGallery(galleryId);
    }
  }, [galleryId, isEditMode, loadGallery]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const savedNodes: ArticleNode[] = nodes.map(n => ({
        'id': n.id,
        'type': n.type,
        'position': n.position,
        'data': n.data as ArticleNodeData,
        ...(n.selected !== undefined && { 'selected': n.selected })
      }));

      const savedEdges: ArticleEdge[] = edges.map(e => ({
        'id': e.id,
        'source': e.source,
        'target': e.target,
        'type': e.type,
        'sourceHandle': e.sourceHandle ?? 'source',
        'targetHandle': e.targetHandle ?? 'target',
        'data': e.data || { 'relationshipType': '默认' },
        'markerEnd': e.markerEnd || { 'type': 'arrowclosed', 'color': '#4ECDC4' },
        ...(e.selected !== undefined && { 'selected': e.selected })
      }));

      let totalWordCount = 0;
      embeddedArticles.forEach(article => {
        totalWordCount += countWords(article.content || '');
      });
      savedNodes.forEach(node => {
        if (node.data?.articleSlug && !node.data?.isEmbedded) {
          totalWordCount += articleWordCountMap[node.data.articleSlug] || 0;
        }
      });

      if (isEditMode && galleryId) {
        await updateGallery(galleryId, {
          title,
          'nodes': savedNodes,
          'edges': savedEdges,
          embeddedArticles,
          totalWordCount
        });
      } else {
        const newId = await createGallery({
          title,
          'nodes': savedNodes,
          'edges': savedEdges,
          embeddedArticles,
          totalWordCount
        });
        navigate(`/gallerys/${newId}/edit`, { 'replace': true });
      }
    } finally {
      setIsSaving(false);
    }
  }, [title, nodes, edges, embeddedArticles, articleWordCountMap, isEditMode, galleryId, navigate]);

  const handleDelete = useCallback(async () => {
    if (!galleryId || !isEditMode) {
      return;
    }

    try {
      await deleteGallery(galleryId);
      navigate('/gallerys');
    } finally {
      setShowDeleteConfirm(false);
    }
  }, [galleryId, isEditMode, navigate]);

  const handleAddArticle = useCallback((article: {
    id: string;
    title: string;
    slug: string;
    cover_image: string | null;
    summary: string | null;
    tags: string[] | null;
  }) => {
    if (excludeSlugs.includes(article.slug)) {
      return;
    }

    const newNode: Node = {
      'id': article.slug,
      'type': 'articleNode',
      'position': {
        'x': Math.random() * 400 + 100,
        'y': Math.random() * 400 + 100
      },
      'data': {
        'articleSlug': article.slug,
        'articleTitle': article.title,
        'articleSummary': article.summary ?? undefined,
        'coverImage': article.cover_image,
        'tags': article.tags
      }
    };

    setNodes((nds) => [...nds, newNode]);
    setExcludeSlugs(prev => [...prev, article.slug]);
    setShowAddMenu(false);

    getArticleBySlug(article.slug).then((articleData) => {
      if (articleData?.content) {
        setArticleWordCountMap(prev => ({
          ...prev,
          [article.slug]: countWords(articleData.content)
        }));
      }
    });
  }, [excludeSlugs, setNodes]);

  const handleCreateEmbeddedArticle = useCallback((article: Omit<EmbeddedArticle, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `embedded-${Date.now()}`;
    const now = new Date().toISOString();
    const newArticle: EmbeddedArticle = {
      ...article,
      id,
      'createdAt': now,
      'updatedAt': now
    };

    setEmbeddedArticles((prev) => [...prev, newArticle]);

    const newNode: Node = {
      id,
      'type': 'articleNode',
      'position': {
        'x': Math.random() * 400 + 100,
        'y': Math.random() * 400 + 100
      },
      'data': {
        'articleSlug': id,
        'articleTitle': article.title,
        'articleSummary': article.summary,
        'coverImage': article.coverImage,
        'tags': article.tags,
        'isEmbedded': true,
        'embeddedArticleId': id
      }
    };

    setNodes((nds) => [...nds, newNode]);
    setShowSimpleEditor(false);
  }, [setNodes]);

  const handleEditEmbeddedArticle = useCallback((article: Omit<EmbeddedArticle, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingArticle) {
      return;
    }

    const now = new Date().toISOString();
    setEmbeddedArticles((prev) => prev.map(a =>
      a.id === editingArticle.id
        ? { ...a, ...article, 'updatedAt': now }
        : a
    ));

    setNodes((nds) => nds.map((node) => {
      if (node.id === editingArticle.id) {
        return {
          ...node,
          'data': {
            ...node.data,
            'articleTitle': article.title,
            'articleSummary': article.summary,
            'coverImage': article.coverImage,
            'tags': article.tags
          } as ArticleNodeData
        };
      }
      return node;
    }));

    setShowSimpleEditor(false);
    setEditingArticle(null);
  }, [editingArticle, setNodes]);

  const handleOpenCreateEditor = useCallback(() => {
    setEditorMode('create');
    setEditingArticle(null);
    setShowSimpleEditor(true);
    setShowAddMenu(false);
  }, []);

  const handleOpenEditEditor = useCallback(() => {
    if (!previewArticle?.embeddedArticleId) {
      return;
    }
    const article = embeddedArticles.find(a => a.id === previewArticle.embeddedArticleId);
    if (article) {
      setEditorMode('edit');
      setEditingArticle(article);
      setShowSimpleEditor(true);
      setShowPreviewPanel(false);
    }
  }, [previewArticle, embeddedArticles]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setPreviewArticle(node.data as ArticleNodeData);
    setShowPreviewPanel(true);
  }, []);

  const triggerSaveState = useCallback(() => {
    if (!isDraggingRef.current) {
      const stateKey = JSON.stringify({
        'nodes': nodes.map(n => ({ 'id': n.id, 'position': n.position })),
        'edges': edges.map(e => ({ 'id': e.id, 'source': e.source, 'target': e.target }))
      });
      if (lastSavedStateRef.current !== stateKey) {
        lastSavedStateRef.current = stateKey;
        saveState(nodes, edges);
      }
    }
  }, [nodes, edges, saveState]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    const isDragging = changes.some(change => change.type === 'position' && change.dragging);
    isDraggingRef.current = isDragging;
    if (!isDragging) {
      triggerSaveState();
    }
  }, [onNodesChange, triggerSaveState]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    if (!isDraggingRef.current) {
      triggerSaveState();
    }
  }, [onEdgesChange, triggerSaveState]);

  const handleUndo = useCallback(() => {
    const state = undo();
    if (state.nodes.length > 0 || state.edges.length > 0) {
      setNodes(state.nodes.map(n => ({ ...n, 'type': 'articleNode' })));
      setEdges(state.edges.map(e => ({ ...e, 'type': 'articleEdge' })));
    }
  }, [undo, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const state = redo();
    if (state.nodes.length > 0 || state.edges.length > 0) {
      setNodes(state.nodes.map(n => ({ ...n, 'type': 'articleNode' })));
      setEdges(state.edges.map(e => ({ ...e, 'type': 'articleEdge' })));
    }
  }, [redo, setNodes, setEdges]);

  const applyLayout = useCallback((layoutedNodes: ArticleNode[], layoutedEdges: ArticleEdge[]) => {
    isDraggingRef.current = false;
    lastSavedStateRef.current = '';
    triggerSaveState();
    setNodes(layoutedNodes.map(n => ({
      ...n,
      'type': 'articleNode'
    })) as Node[]);
    setEdges(layoutedEdges.map(e => ({
      ...e,
      'type': 'articleEdge',
      'sourceHandle': e.sourceHandle ?? 'source',
      'targetHandle': e.targetHandle ?? 'target',
      'markerEnd': e.markerEnd || {
        'type': 'arrowclosed',
        'color': '#4ECDC4'
      }
    })) as Edge[]);
  }, [triggerSaveState, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mb-4" />
        <p className="text-slate-500 dark:text-slate-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200/60 dark:border-slate-700/60 px-4 py-2">
        <div className="flex items-center justify-between">
          <NavigatorTrigger />

          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-sky-100/80 dark:hover:bg-sky-900/30 rounded transition-colors"
              >
                <div className="flex items-center gap-1">
                  <Plus className="w-5 h-5" />
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
                </div>
                <span className="text-xs">添加节点</span>
              </button>

              {showAddMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowAddMenu(false)}
                  />
                  <div className="absolute left-0 mt-1 w-48 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded z-20 overflow-hidden">
                    <button
                      onClick={() => {
                        setExcludeSlugs(nodes.map(n => (n.data as ArticleNodeData).articleSlug));
                        setShowArticleSelector(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>从已有文章选择</span>
                    </button>
                    <button
                      onClick={handleOpenCreateEditor}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors border-t border-slate-200/60 dark:border-slate-700/60"
                    >
                      <FilePlus className="w-4 h-4" />
                      <span>创建文章</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => {
                setNodes((nds) => nds.filter((node) => !node.selected));
                setEdges((eds) => eds.filter((edge) => !edge.selected));
              }}
              disabled={!hasSelection}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-red-50/80 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-xs">删除所选</span>
            </button>

            <div className="w-px h-8 bg-slate-200/60 dark:bg-slate-700/60 mx-1" />

            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-sky-100/80 dark:hover:bg-sky-900/30 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-5 h-5" />
              <span className="text-xs">撤销</span>
            </button>

            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-sky-100/80 dark:hover:bg-sky-900/30 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-5 h-5" />
              <span className="text-xs">重做</span>
            </button>

            <div className="w-px h-8 bg-slate-200/60 dark:bg-slate-700/60 mx-1" />

            <button
              onClick={() => setShowLayoutPanel(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/30 rounded transition-colors"
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="text-xs">布局</span>
            </button>

            <button
              onClick={() => setShowOnlySelected(prev => !prev)}
              disabled={!hasSelection}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded transition-colors ${
                showOnlySelected
                  ? 'bg-sky-100/80 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-sky-100/80 dark:hover:bg-sky-900/30'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Eye className="w-5 h-5" />
              <span className="text-xs">{showOnlySelected ? '显示全部' : '只看所选'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span className="text-xs">{isSaving ? '保存中' : '保存'}</span>
            </button>

            {isEditMode && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-red-50/80 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
              >
                <Archive className="w-5 h-5" />
                <span className="text-xs">删除地图</span>
              </button>
            )}

            <button
              onClick={() => setShowInfoPanel(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded transition-colors"
            >
              <Info className="w-5 h-5" />
              <span className="text-xs">地图信息</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div
          ref={reactFlowWrapper}
          className="w-full h-full"
          onMouseDown={handleCanvasMouseDown}
          onContextMenu={(e) => e.preventDefault()}
        >
          <ReactFlow
            nodes={displayedNodes}
            edges={displayedEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            minZoom={0.01}
            maxZoom={10}
            panOnDrag
            proOptions={{ 'hideAttribution': true }}
          >
            <MiniMap
              nodeColor={(node) => {
                return node.selected ? '#0ea5e9' : '#4ECDC4';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
              className="!bg-slate-50 dark:!bg-slate-900 !border-slate-200/60 dark:!border-slate-700/60"
            />
          </ReactFlow>
          {renderConnectionLine()}
        </div>
      </div>

      <ArticleSelector
        isOpen={showArticleSelector}
        onClose={() => setShowArticleSelector(false)}
        onSelect={handleAddArticle}
        excludeSlugs={excludeSlugs}
      />

      <ArticlePreviewPanel
        isOpen={showPreviewPanel}
        onClose={() => setShowPreviewPanel(false)}
        articleData={previewArticle}
        galleryId={galleryId || ''}
        showExplore={isEditMode}
        onEdit={previewArticle?.isEmbedded ? handleOpenEditEditor : undefined}
        embeddedArticles={embeddedArticles}
      />

      <GalleryInfoPanel
        isOpen={showInfoPanel}
        onClose={() => setShowInfoPanel(false)}
        title={title}
        onTitleChange={setTitle}
        nodes={nodes as ArticleNode[]}
        edges={edges as ArticleEdge[]}
      />

      <GalleryLayoutPanel
        isOpen={showLayoutPanel}
        onClose={() => setShowLayoutPanel(false)}
        onLayout={applyLayout}
        nodes={nodes as ArticleNode[]}
        edges={edges as ArticleEdge[]}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="删除地图"
        message={`确定要删除地图"${title}"吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <SimpleEditor
        isOpen={showSimpleEditor}
        onClose={() => {
          setShowSimpleEditor(false);
          setEditingArticle(null);
        }}
        onSave={editorMode === 'create' ? handleCreateEmbeddedArticle : handleEditEmbeddedArticle}
        initialData={editingArticle}
        mode={editorMode}
      />
    </div>
  );
};

export const GallerysEditPage = (props: Record<string, unknown>) => {
  return (
    <ReactFlowProvider>
      <GallerysEditContent {...props} />
    </ReactFlowProvider>
  );
};

export default GallerysEditPage;
