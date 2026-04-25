import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Trash2, Plus, Save, Undo2, Redo2, Archive } from 'lucide-react';
import { getGalleryById, createGallery, updateGallery, deleteGallery } from '@/services/galleryService';
import { Visualization, ArticleSelector, ArticlePreviewPanel, GalleryInfoPanel } from '@/components/gallerys';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { GraphData, ArticleNodeData } from '@/components/gallerys/gallery';

interface VisualizationState {
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  isSaving: boolean;
}

interface VisualizationActions {
  undo: () => void;
  redo: () => void;
  delete: () => void;
  save: () => void;
  addNode: (node: GraphData['nodes'][0]) => void;
}

export function GallerysEditPage () {
  const { galleryId } = useParams<{ galleryId: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(galleryId && galleryId !== 'create');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [graphData, setGraphData] = useState<GraphData>({ 'nodes': [], 'edges': [] });
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [showArticleSelector, setShowArticleSelector] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<ArticleNodeData | null>(null);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [vizState, setVizState] = useState<VisualizationState>({
    'canUndo': false,
    'canRedo': false,
    'hasSelection': false,
    'isSaving': false
  });

  const vizActionsRef = useRef<VisualizationActions | null>(null);

  const loadGallery = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const gallery = await getGalleryById(id);
      if (gallery) {
        setTitle(gallery.title);
        setDescription(gallery.description || '');
        setGraphData(gallery.graphData);
      } else {
        navigate('/gallerys');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (isEditMode && galleryId) {
      loadGallery(galleryId);
    }
  }, [galleryId, isEditMode, loadGallery]);

  const handleSave = useCallback(async (data: GraphData) => {
    if (!title.trim()) {
      return;
    }

    if (isEditMode && galleryId) {
      await updateGallery(galleryId, {
        title,
        description,
        'graphData': data
      });
    } else {
      const newId = await createGallery({
        title,
        description,
        'graphData': data
      });
      navigate(`/gallerys/${newId}/edit`, { 'replace': true });
    }
  }, [title, description, isEditMode, galleryId, navigate]);

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
    const existingSlugs = graphData.nodes.map(n => n.data.articleSlug);
    if (existingSlugs.includes(article.slug)) {
      return;
    }

    const newNode: GraphData['nodes'][0] = {
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
        'tags': article.tags,
        'handleCount': 4,
        'shape': 'rectangle'
      }
    };

    vizActionsRef.current?.addNode(newNode);
    setGraphData((prev) => ({
      ...prev,
      'nodes': [...prev.nodes, newNode]
    }));
  }, [graphData.nodes]);

  const handleNodeClick = useCallback((_nodeId: string, data: ArticleNodeData) => {
    setPreviewArticle(data);
    setShowPreviewPanel(true);
  }, []);

  const handleEdgeClick = useCallback(() => {
  }, []);

  const handleExplore = useCallback(() => {
    if (previewArticle && galleryId) {
      navigate(`/articles/${previewArticle.articleSlug}?galleryId=${galleryId}&explorationMode=true`);
    }
  }, [previewArticle, galleryId, navigate]);

  const handleBack = useCallback(() => {
    navigate('/gallerys');
  }, [navigate]);

  const handleStateChange = useCallback((state: VisualizationState) => {
    setVizState(state);
  }, []);

  const handleActionsReady = useCallback((actions: VisualizationActions) => {
    vizActionsRef.current = actions;
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mb-4" />
        <p className="text-neutral-600 dark:text-neutral-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs">返回</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowArticleSelector(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">添加节点</span>
            </button>

            <button
              onClick={() => vizActionsRef.current?.delete()}
              disabled={!vizState.hasSelection}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-xs">删除所选</span>
            </button>

            <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700 mx-1" />

            <button
              onClick={() => vizActionsRef.current?.undo()}
              disabled={!vizState.canUndo}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-5 h-5" />
              <span className="text-xs">撤销</span>
            </button>

            <button
              onClick={() => vizActionsRef.current?.redo()}
              disabled={!vizState.canRedo}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-5 h-5" />
              <span className="text-xs">重做</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => vizActionsRef.current?.save()}
              disabled={vizState.isSaving}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span className="text-xs">{vizState.isSaving ? '保存中' : '保存'}</span>
            </button>

            {isEditMode && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
              >
                <Archive className="w-5 h-5" />
                <span className="text-xs">删除合集</span>
              </button>
            )}

            <button
              onClick={() => setShowInfoPanel(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <Info className="w-5 h-5" />
              <span className="text-xs">文章集信息</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <Visualization
          initialData={graphData}
          onSave={handleSave}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onStateChange={handleStateChange}
          onActionsReady={handleActionsReady}
        />
      </div>

      <ArticleSelector
        isOpen={showArticleSelector}
        onClose={() => setShowArticleSelector(false)}
        onSelect={handleAddArticle}
        excludeSlugs={graphData.nodes.map(n => n.data.articleSlug)}
      />

      <ArticlePreviewPanel
        isOpen={showPreviewPanel}
        onClose={() => setShowPreviewPanel(false)}
        articleData={previewArticle}
        galleryId={galleryId || ''}
        onExplore={handleExplore}
        showExplore={isEditMode}
      />

      <GalleryInfoPanel
        isOpen={showInfoPanel}
        onClose={() => setShowInfoPanel(false)}
        title={title}
        description={description}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="删除文章集"
        message={`确定要删除文章集"${title}"吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
