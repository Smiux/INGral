import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createArticle, getArticleBySlug, updateArticle } from '../../services/articleService';
import { LatexEditor } from './LatexEditor';
import { TiptapEditor, TiptapEditorRef, type CollaborationProvider } from './TipTapEditor';
import { EditorToolbar } from './EditorToolbar';
import { DraftManager } from './DraftManager';
import { CoverManager } from './CoverManager';
import {
  useCollaboration,
  CollaborationPanel
} from '../collaboration';

import { createDraft, updateDraft, getDraftById, type ArticleDraft } from './draftUtils';
import type { Editor } from '@tiptap/react';
import {
  Save,
  MessageCircle,
  FileText, ListTree, FolderOpen, Image, ChevronDown, ChevronUp, Plus, X, Tag, Users, Wifi, Loader2, AlertTriangle, RefreshCw, ChevronRight
} from 'lucide-react';

interface EditorState {
  title: string;
  isSaving: boolean;
}

interface TocItem {
  id: string;
  textContent: string;
  level: number;
  itemIndex: number;
  isScrolledOver: boolean;
}

interface TocItemProps {
  item: TocItem;
  onClick: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  hasChildren: boolean;
  isHidden: boolean;
}

const TOC_LEVEL_STYLES: Record<number, { fontSize: string; fontWeight: string; numberColor: string }> = {
  '1': { 'fontSize': 'text-base', 'fontWeight': 'font-semibold', 'numberColor': 'font-semibold text-sky-500' },
  '2': { 'fontSize': 'text-sm', 'fontWeight': 'font-medium', 'numberColor': 'text-sm font-medium text-green-500' },
  '3': { 'fontSize': 'text-xs', 'fontWeight': 'font-medium', 'numberColor': 'text-xs font-medium text-neutral-500 dark:text-neutral-400' }
};

const TocItem: React.FC<TocItemProps> = React.memo(({ item, onClick, isCollapsed, onToggleCollapse, hasChildren, isHidden }) => {
  const style = TOC_LEVEL_STYLES[item.level] ?? TOC_LEVEL_STYLES[3]!;

  return (
    <div
      className={`overflow-hidden transition-all duration-200 ease-in-out ${isHidden ? 'max-h-0 opacity-0 py-0' : 'max-h-20 opacity-100'}`}
      style={{ 'paddingLeft': `${(item.level - 1) * 12}px` }}
    >
      <div
        className={`cursor-pointer px-3 py-2.5 rounded-lg transition-all duration-250 ease-in-out hover:translate-x-1 ${item.isScrolledOver ? 'text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-300' : 'text-neutral-700 dark:text-neutral-200'}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-2 min-h-[26px]">
          {item.level < 3 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="flex-shrink-0 p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              {hasChildren && isCollapsed && <ChevronRight className="w-3 h-3 transition-transform duration-200" />}
              {hasChildren && !isCollapsed && <ChevronDown className="w-3 h-3 transition-transform duration-200" />}
              {!hasChildren && <span className="w-3 h-3" />}
            </button>
          )}
          <span className={`${style.numberColor} flex-shrink-0 mr-2`}>
            {item.itemIndex}
          </span>
          <span className={`truncate transition-all duration-300 max-w-[calc(100%-1rem)] ${style.fontSize} ${style.fontWeight} text-left flex-1`}>
            {item.textContent}
          </span>
        </div>
      </div>
    </div>
  );
});

export const ArticleEditor: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const isEditing = Boolean(slug);

  const [state, setState] = useState<EditorState>({
    'title': '',
    'isSaving': false
  });

  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [existingArticleId, setExistingArticleId] = useState<string | null>(null);

  const [showLatexEditor, setShowLatexEditor] = useState(false);
  const [mathType, setMathType] = useState<'inline' | 'block'>('inline');

  const [tableOfContentsItems, setTableOfContentsItems] = useState<TocItem[]>([]);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  const toggleCollapsed = useCallback((itemId: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const getChildIds = useCallback((parentId: string, items: TocItem[]): string[] => {
    const parentIndex = items.findIndex((item) => item.id === parentId);
    if (parentIndex === -1) {
      return [];
    }

    const parentLevel = items[parentIndex]!.level;
    const childIds: string[] = [];

    for (let i = parentIndex + 1; i < items.length; i += 1) {
      const item = items[i]!;
      if (item.level <= parentLevel) {
        break;
      }
      childIds.push(item.id);
    }
    return childIds;
  }, []);

  const isItemCollapsed = useCallback((itemId: string): boolean => {
    return collapsedItems.has(itemId);
  }, [collapsedItems]);

  const shouldShowItem = useCallback((itemId: string, items: TocItem[]): boolean => {
    for (const collapsedId of collapsedItems) {
      const childIds = getChildIds(collapsedId, items);
      if (childIds.includes(itemId)) {
        return false;
      }
    }
    return true;
  }, [collapsedItems, getChildIds]);

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [fontColor, setFontColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const [showIframeDialog, setShowIframeDialog] = useState(false);
  const [iframeSrc, setIframeSrc] = useState('');
  const [iframeWidthInput, setIframeWidthInput] = useState('640');
  const [iframeHeightInput, setIframeHeightInput] = useState('360');

  const [characterCount, setCharacterCount] = useState(0);

  const [showDraftManager, setShowDraftManager] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const editorRef = useRef<TiptapEditorRef | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  const [isToolbarSticky, setIsToolbarSticky] = useState(false);

  const [showCoverManager, setShowCoverManager] = useState(false);
  const [coverImage, setCoverImage] = useState<File | Blob | null>(null);
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);
  const [originalCoverImagePath, setOriginalCoverImagePath] = useState<string | null>(null);
  const [coverImageModified, setCoverImageModified] = useState(false);

  const [showSummaryInput, setShowSummaryInput] = useState(false);
  const [summary, setSummary] = useState('');

  const collaboration = useCollaboration();

  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showCollabPanel, setShowCollabPanel] = useState(false);

  useEffect(() => {
    if (!collaboration.isConnected || !collaboration.meta) {
      return;
    }
    if (collaboration.meta.title !== undefined && collaboration.meta.title !== state.title) {
      setState(prev => ({ ...prev, 'title': collaboration.meta.title || '' }));
    }
    if (collaboration.meta.summary !== undefined && collaboration.meta.summary !== summary) {
      setSummary(collaboration.meta.summary || '');
    }
    if (collaboration.meta.tags !== undefined) {
      const newTags = collaboration.meta.tags || [];
      if (JSON.stringify(newTags) !== JSON.stringify(tags)) {
        setTags(newTags);
      }
    }
    if (collaboration.meta.coverImage !== undefined && collaboration.meta.coverImage !== coverImagePath) {
      setCoverImagePath(collaboration.meta.coverImage);
      setCoverImageModified(true);
      if (collaboration.meta.coverImage) {
        const byteString = atob(collaboration.meta.coverImage.split(',')[1] || '');
        const mimeType = collaboration.meta.coverImage.split(',')[0]?.match(/:(.*?);/)?.[1] || 'image/png';
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i += 1) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { 'type': mimeType });
        setCoverImage(blob);
      } else {
        setCoverImage(null);
      }
    }
  }, [collaboration.meta, collaboration.isConnected, state.title, summary, tags, coverImagePath]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-container')) {
      setActiveMenu(null);
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  React.useEffect(() => {
    const headerHeight = 64;
    const handleScroll = () => {
      if (!toolbarRef.current) {
        return;
      }
      const toolbarRect = toolbarRef.current.getBoundingClientRect();
      const shouldBeSticky = toolbarRect.top <= headerHeight;
      setIsToolbarSticky(shouldBeSticky);
    };

    window.addEventListener('scroll', handleScroll, { 'passive': true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!slug) {
      return;
    }

    const loadArticle = async () => {
      setIsLoadingArticle(true);
      try {
        const article = await getArticleBySlug(slug);
        if (article) {
          setState(prev => ({ ...prev, 'title': article.title }));
          setSummary(article.summary || '');
          setTags(article.tags || []);
          setExistingArticleId(article.id);
          setOriginalCoverImagePath(article.cover_image_path);
          setCoverImageModified(false);
          if (editor) {
            editor.commands.setContent(article.content);
          }
        }
      } finally {
        setIsLoadingArticle(false);
      }
    };

    loadArticle();
  }, [slug, editor]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, 'title': e.target.value }));
    collaboration.updateMeta({ 'title': e.target.value });
  };

  const handleSave = async () => {
    if (!editor) {
      return;
    }

    setState(prev => ({ ...prev, 'isSaving': true }));

    try {
      if (isEditing && existingArticleId) {
        const updatedArticle = await updateArticle({
          'articleId': existingArticleId,
          'title': state.title,
          'content': editor.getHTML(),
          coverImage,
          coverImageModified,
          'summary': summary.trim() || undefined,
          'tags': tags.length > 0 ? tags : undefined
        });

        if (updatedArticle) {
          navigate(`/articles/${updatedArticle.slug}`);
        }
      } else {
        const savedArticle = await createArticle({
          'title': state.title,
          'content': editor.getHTML(),
          coverImage,
          'summary': summary.trim() || undefined,
          'tags': tags.length > 0 ? tags : undefined
        });

        if (savedArticle) {
          navigate(`/articles/${savedArticle.slug}`);
        }
      }
    } finally {
      setState(prev => ({ ...prev, 'isSaving': false }));
    }
  };

  const handleInsertMath = useCallback((formula: string) => {
    if (!editor) {
      return;
    }

    editor.chain().focus()
      .command(({ commands }) => {
        return mathType === 'inline'
          ? commands.insertInlineMath({ 'latex': formula })
          : commands.insertBlockMath({ 'latex': formula });
      })
      .run();
    setShowLatexEditor(false);
  }, [mathType, editor]);

  const handleLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkDialog(true);
  }, [editor]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor) {
      return;
    }

    if (linkUrl) {
      editor.chain().focus()
        .setLink({ 'href': linkUrl })
        .run();
    } else {
      editor.chain().focus()
        .unsetLink()
        .run();
    }
    setShowLinkDialog(false);
  }, [linkUrl, editor]);

  const handleTocClick = (itemId: string) => {
    const element = editor?.view.dom.querySelector(`[data-toc-id="${itemId}"]`);
    if (element) {
      window.scrollTo({
        'top': element.getBoundingClientRect().top + window.scrollY - 240,
        'behavior': 'smooth'
      });
    }
  };

  const handleMathClick = useCallback((type: 'inline' | 'block') => {
    setMathType(type);
    setShowLatexEditor(true);
  }, []);

  const handleIframe = useCallback(() => {
    setIframeSrc('');
    setIframeWidthInput('640');
    setIframeHeightInput('360');
    setShowIframeDialog(true);
  }, []);

  const handleIframeSubmit = useCallback(() => {
    if (!editor || !iframeSrc) {
      return;
    }

    const width = parseInt(iframeWidthInput, 10) || 640;
    const height = parseInt(iframeHeightInput, 10) || 360;

    editor.chain().focus()
      .setIframeEmbed({
        'src': iframeSrc,
        width,
        height
      })
      .run();
    setShowIframeDialog(false);
    setIframeSrc('');
  }, [editor, iframeSrc, iframeWidthInput, iframeHeightInput]);

  const handleCharacterCountChange = useCallback((count: number) => {
    setCharacterCount(count);
  }, []);

  const handleTableOfContentsChange = useCallback((items: typeof tableOfContentsItems) => {
    setTableOfContentsItems(items);
  }, []);

  const handleEditorReady = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);
  }, []);

  const handleCreateNewDraft = useCallback(() => {
    const draft = createDraft({ 'title': state.title, 'content': editor?.getHTML() || '', summary, tags });
    setCurrentDraftId(draft.id);
    setShowDraftManager(false);
  }, [state.title, editor, summary, tags]);

  const handleLoadDraft = useCallback((draft: ArticleDraft) => {
    setState(prev => ({ ...prev, 'title': draft.title }));
    setSummary(draft.summary || '');
    setTags(draft.tags || []);
    setCurrentDraftId(draft.id);
    if (draft.coverImageDataUrl) {
      fetch(draft.coverImageDataUrl)
        .then(res => res.blob())
        .then(blob => {
          const fileName = (draft as ArticleDraft & { coverImageName?: string }).coverImageName || 'cover.png';
          const file = new File([blob], fileName, { 'type': blob.type });
          setCoverImage(file);
          setCoverImagePath(draft.coverImageDataUrl || null);
          setCoverImageModified(true);
        })
        .catch(() => {
          setCoverImageModified(false);
        });
    } else {
      setCoverImage(null);
      setCoverImagePath(null);
      setCoverImageModified(false);
    }
    if (editor) {
      editor.commands.setContent(draft.content);
    }
  }, [editor]);

  const handleOpenDraftManager = useCallback(() => {
    setShowDraftManager(true);
  }, []);

  const handleSaveDraft = useCallback(() => {
    const saveDraftWithCover = (summaryText: string, coverDataUrl: string | null, coverName: string | undefined) => {
      if (currentDraftId) {
        const existingDraft = getDraftById(currentDraftId);
        const draft: ArticleDraft = {
          'id': currentDraftId,
          'title': state.title,
          'content': editor?.getHTML() || '',
          'createdAt': existingDraft?.createdAt || new Date().toISOString(),
          'lastSaved': new Date().toISOString()
        };
        if (summaryText) {
          draft.summary = summaryText;
        }
        if (tags.length > 0) {
          draft.tags = tags;
        }
        if (coverDataUrl) {
          draft.coverImageDataUrl = coverDataUrl;
          if (coverName) {
            draft.coverImageName = coverName;
          }
        }
        updateDraft(draft);
      } else {
        const draft = createDraft({
          'title': state.title,
          'content': editor?.getHTML() || '',
          ...(summaryText ? { 'summary': summaryText } : {}),
          ...(tags.length > 0 ? { tags } : {}),
          ...(coverDataUrl ? { 'coverImageDataUrl': coverDataUrl, ...(coverName ? { 'coverImageName': coverName } : {}) } : {})
        });
        setCurrentDraftId(draft.id);
      }
    };

    if (coverImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const coverName = (coverImage as File).name || 'cover.png';
        saveDraftWithCover(summary, reader.result as string, coverName);
      };
      reader.readAsDataURL(coverImage);
    } else {
      saveDraftWithCover(summary, null, undefined);
    }
  }, [currentDraftId, state.title, editor, summary, tags, coverImage]);

  const handleOpenCoverManager = useCallback(() => {
    setShowCoverManager(true);
  }, []);

  const handleCoverChange = useCallback((file: File | Blob | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setCoverImagePath(base64Data);
        collaboration.updateMeta({ 'coverImage': base64Data });
      };
      reader.readAsDataURL(file);
    } else {
      setCoverImagePath(null);
      collaboration.updateMeta({ 'coverImage': null });
    }
    setCoverImage(file);
    setCoverImageModified(true);
    if (file === null && originalCoverImagePath) {
      setCoverImage(null);
    }
  }, [originalCoverImagePath, collaboration]);

  const handleAddTag = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const trimmedTag = tagInput.trim();
      if (!tags.includes(trimmedTag)) {
        const newTags = [...tags, trimmedTag];
        setTags(newTags);
        collaboration.updateMeta({ 'tags': newTags });
      }
      setTagInput('');
    }
  }, [tagInput, tags, collaboration]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    collaboration.updateMeta({ 'tags': newTags });
  }, [tags, collaboration]);

  const collaborationConfig = useMemo(() => {
    if (collaboration.isConnected && collaboration.doc && collaboration.provider) {
      return {
        'provider': collaboration.provider as CollaborationProvider,
        'document': collaboration.doc,
        'userName': collaboration.userName,
        'userColor': collaboration.userColor,
        'roomId': collaboration.roomId
      };
    }
    return undefined;
  }, [collaboration.isConnected, collaboration.doc, collaboration.provider, collaboration.userName, collaboration.userColor, collaboration.roomId]);

  const getCollabStatusIcon = useCallback(() => {
    if (collaboration.connectionStatus === 'reconnecting') {
      return <RefreshCw size={16} className="mr-2 text-orange-500 animate-spin" />;
    }
    if (collaboration.connectionStatus === 'error') {
      return <AlertTriangle size={16} className="mr-2 text-red-500" />;
    }
    if (collaboration.isConnecting) {
      return <Loader2 size={16} className="mr-2 text-sky-400 animate-spin" />;
    }
    if (collaboration.isConnected) {
      return <Wifi size={16} className="mr-2 text-green-500" />;
    }
    return <Users size={16} className="mr-2 text-sky-400" />;
  }, [collaboration.connectionStatus, collaboration.isConnecting, collaboration.isConnected]);

  return (
    <div className="min-h-screen">
      {isLoadingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
        </div>
      )}

      {showLinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLinkDialog(false)} />
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 relative z-10 min-w-[400px] max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-neutral-200">添加链接</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">链接地址</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowLinkDialog(false)}
                  className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleLinkSubmit}
                  className="px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded-md transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showIframeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowIframeDialog(false)} />
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 relative z-10 min-w-[450px] max-w-lg">
            <h3 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-neutral-200">嵌入内容</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">嵌入地址</label>
                <input
                  type="text"
                  value={iframeSrc}
                  onChange={(e) => setIframeSrc(e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">支持 YouTube、Bilibili 等视频平台的嵌入链接</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">比例预设</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('640'); setIframeHeightInput('360');
                    }}
                    className="px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    16:9 小
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('854'); setIframeHeightInput('480');
                    }}
                    className="px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    16:9 中
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('1280'); setIframeHeightInput('720');
                    }}
                    className="px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    16:9 大
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('640'); setIframeHeightInput('480');
                    }}
                    className="px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    4:3
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('500'); setIframeHeightInput('500');
                    }}
                    className="px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    1:1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('640'); setIframeHeightInput('274');
                    }}
                    className="px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    21:9
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">宽度</label>
                  <input
                    type="number"
                    value={iframeWidthInput}
                    onChange={(e) => setIframeWidthInput(e.target.value)}
                    onBlur={() => {
                      if (!iframeWidthInput.trim()) {
                        setIframeWidthInput('640');
                      }
                    }}
                    min={200}
                    max={1920}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">高度</label>
                  <input
                    type="number"
                    value={iframeHeightInput}
                    onChange={(e) => setIframeHeightInput(e.target.value)}
                    onBlur={() => {
                      if (!iframeHeightInput.trim()) {
                        setIframeHeightInput('360');
                      }
                    }}
                    min={150}
                    max={1080}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowIframeDialog(false)}
                  className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleIframeSubmit}
                  disabled={!iframeSrc.trim()}
                  className="px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DraftManager
        key={showDraftManager ? 'open' : 'closed'}
        isOpen={showDraftManager}
        onClose={() => setShowDraftManager(false)}
        onLoadDraft={handleLoadDraft}
        onCreateNewDraft={handleCreateNewDraft}
      />

      <CoverManager
        isOpen={showCoverManager}
        onClose={() => setShowCoverManager(false)}
        currentCoverPath={coverImageModified ? coverImagePath : originalCoverImagePath}
        onCoverChange={handleCoverChange}
      />

      <LatexEditor
        isOpen={showLatexEditor}
        onClose={() => setShowLatexEditor(false)}
        onInsert={handleInsertMath}
      />

      <header className="sticky top-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <span className="font-bold text-xl tracking-tight text-neutral-800 dark:text-neutral-200">IN Gral</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCollabPanel(true)}
                className="inline-flex items-center px-3 py-2 border border-neutral-200 dark:border-neutral-700 text-sm font-medium rounded-md text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 transition-all duration-200"
              >
                {getCollabStatusIcon()}
                协作
              </button>
              <button
                onClick={handleOpenCoverManager}
                className="inline-flex items-center px-3 py-2 border border-neutral-200 dark:border-neutral-700 text-sm font-medium rounded-md text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 transition-all duration-200"
              >
                <Image size={16} className="mr-2 text-neutral-600 dark:text-neutral-400" />
                封面
              </button>
              <button
                onClick={handleOpenDraftManager}
                className="inline-flex items-center px-3 py-2 border border-neutral-200 dark:border-neutral-700 text-sm font-medium rounded-md text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 transition-all duration-200"
              >
                <FolderOpen size={16} className="mr-2 text-neutral-600 dark:text-neutral-400" />
                草稿
              </button>
              <button
                onClick={handleSaveDraft}
                className="inline-flex items-center px-3 py-2 border border-neutral-200 dark:border-neutral-700 text-sm font-medium rounded-md text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 transition-all duration-200"
              >
                <FileText size={16} className="mr-2 text-neutral-600 dark:text-neutral-400" />
                保存草稿
              </button>
              <button
                onClick={handleSave}
                disabled={state.isSaving}
                className="inline-flex items-center px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-sm font-medium rounded-md text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-200 dark:hover:border-sky-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isSaving ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-2" />
                    {isEditing ? '更新中...' : '发布中...'}
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2 text-neutral-600 dark:text-neutral-400" />
                    {isEditing ? '更新文章' : '发布文章'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative">
        <div className="sticky top-20 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg z-20 ml-4 flex flex-col float-left mb-4">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <ListTree className="w-4 h-4 text-sky-400" />
              目录
            </h3>
          </div>
          <div className="overflow-y-auto max-h-[50vh]">
            {tableOfContentsItems.length > 0 ? (
              <nav className="p-3 pt-0">
                {tableOfContentsItems.map((item) => (
                  <TocItem
                    key={item.id}
                    item={item}
                    onClick={() => handleTocClick(item.id)}
                    isCollapsed={isItemCollapsed(item.id)}
                    onToggleCollapse={() => toggleCollapsed(item.id)}
                    hasChildren={getChildIds(item.id, tableOfContentsItems).length > 0}
                    isHidden={!shouldShowItem(item.id, tableOfContentsItems)}
                  />
                ))}
              </nav>
            ) : (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-700 mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium">暂无标题</p>
                <p className="text-xs mt-2 opacity-75">添加标题后将自动生成目录</p>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <input
              type="text"
              placeholder="请输入文章标题..."
              value={state.title}
              onChange={handleTitleChange}
              className="w-full text-4xl font-bold text-neutral-800 dark:text-neutral-200 bg-transparent border-none outline-none placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-0"
              autoFocus
            />

            <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{characterCount} 个字符</span>
              </div>
              <button
                onClick={() => setShowSummaryInput(!showSummaryInput)}
                className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              >
                <span>文章简介</span>
                {showSummaryInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setShowTagInput(!showTagInput);
                  if (!showTagInput) {
                    setTagInput('');
                  }
                }}
                className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              >
                <Tag className="w-4 h-4" />
                <span>添加标签</span>
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showSummaryInput ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  文章简介
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    collaboration.updateMeta({ 'summary': e.target.value });
                  }}
                  placeholder="输入文章简介，用于在文章列表和卡片中展示..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent resize-none text-sm"
                />
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 text-right">
                  {summary.length}/200
                </div>
              </div>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showTagInput ? 'max-h-20 opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="输入标签后按 Enter 确认..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-sky-400"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => {
                    setShowTagInput(false);
                    setTagInput('');
                  }}
                  className="px-4 py-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    title={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-sm max-w-full"
                  >
                    <span className="truncate max-w-[150px]">{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-sky-900 dark:hover:text-sky-100 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div
              ref={toolbarRef}
              className={`transition-all duration-300 ${
                isToolbarSticky
                  ? 'sticky top-[64px] z-40 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700'
                  : ''
              }`}
            >
              <EditorToolbar
                editor={editor ?? null}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                fontColor={fontColor}
                setFontColor={setFontColor}
                backgroundColor={backgroundColor}
                setBackgroundColor={setBackgroundColor}
                onLinkClick={handleLink}
                onMathClick={handleMathClick}
                onIframeClick={handleIframe}
              />
            </div>
            <TiptapEditor
              key={collaborationConfig ? `collab-${collaboration.roomId}` : 'solo'}
              editorRef={editorRef}
              onCharacterCountChange={handleCharacterCountChange}
              onTableOfContentsChange={handleTableOfContentsChange}
              onEditorReady={handleEditorReady}
              collaboration={collaborationConfig}
            />
          </div>
        </div>
      </div>

      <CollaborationPanel isOpen={showCollabPanel} onClose={() => setShowCollabPanel(false)} />
    </div>
  );
};
