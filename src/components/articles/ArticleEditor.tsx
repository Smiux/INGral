import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createArticle, getArticleBySlug, updateArticle } from '../../services/articleService';
import { LatexEditor } from './LatexEditor';
import { TiptapEditor, TiptapEditorRef } from './TipTapEditor';
import { EditorToolbar } from './EditorToolbar';
import { DraftManager } from './DraftManager';
import { CoverManager } from './CoverManager';

import { createDraft, updateDraft, getDraftById, type ArticleDraft } from './draftUtils';
import type { Editor } from '@tiptap/react';
import {
  Save,
  MessageCircle,
  FileText, ListTree, FolderOpen, Image, ChevronDown, ChevronUp
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
}

const TOC_LEVEL_STYLES: Record<number, { fontSize: string; fontWeight: string; numberColor: string }> = {
  '1': { 'fontSize': 'text-base', 'fontWeight': 'font-semibold', 'numberColor': 'font-semibold text-sky-500' },
  '2': { 'fontSize': 'text-sm', 'fontWeight': 'font-medium', 'numberColor': 'text-sm font-medium text-green-500' },
  '3': { 'fontSize': 'text-xs', 'fontWeight': 'font-medium', 'numberColor': 'text-xs font-medium text-neutral-500 dark:text-neutral-400' }
};

const TocItem: React.FC<TocItemProps> = React.memo(({ item, onClick }) => {
  const style = TOC_LEVEL_STYLES[item.level] ?? TOC_LEVEL_STYLES[3]!;

  return (
    <div
      className={`cursor-pointer px-3 py-2.5 rounded-lg transition-all duration-250 ease-in-out hover:translate-x-1 ${item.isScrolledOver ? 'text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-300' : 'text-neutral-700 dark:text-neutral-200'}`}
      style={{ 'paddingLeft': `${(item.level - 1) * 12}px` }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-h-[26px]">
        <span className={`${style.numberColor} flex-shrink-0 mr-2`}>
          {item.itemIndex}
        </span>
        <span className={`truncate transition-all duration-300 max-w-[calc(100%-1rem)] ${style.fontSize} ${style.fontWeight} text-left flex-1`}>
          {item.textContent}
        </span>
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
          'summary': summary.trim() || undefined
        });

        if (updatedArticle) {
          navigate(`/articles/${updatedArticle.slug}`);
        }
      } else {
        const savedArticle = await createArticle({
          'title': state.title,
          'content': editor.getHTML(),
          coverImage,
          'summary': summary.trim() || undefined
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
        'top': element.getBoundingClientRect().top + window.scrollY - 100,
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
    const draft = createDraft({ 'title': state.title, 'content': editor?.getHTML() || '' });
    setCurrentDraftId(draft.id);
    setShowDraftManager(false);
  }, [state.title, editor]);

  const handleLoadDraft = useCallback((draft: ArticleDraft) => {
    setState(prev => ({ ...prev, 'title': draft.title }));
    setSummary(draft.summary || '');
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
  }, [currentDraftId, state.title, editor, summary, coverImage]);

  const handleOpenCoverManager = useCallback(() => {
    setShowCoverManager(true);
  }, []);

  const handleCoverChange = useCallback((file: File | Blob | null) => {
    if (file) {
      const newCoverUrl = URL.createObjectURL(file);
      setCoverImagePath(newCoverUrl);
    } else {
      setCoverImagePath(null);
    }
    setCoverImage(file);
    setCoverImageModified(true);
    if (file === null && originalCoverImagePath) {
      setCoverImage(null);
    }
  }, [originalCoverImagePath]);

  return (
    <div className="min-h-screen">
      {isLoadingArticle && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
        </div>
      )}

      {!isLoadingArticle && showLinkDialog && (
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
              <nav className="p-3 pt-0 space-y-1">
                {tableOfContentsItems.map((item) => (
                  <TocItem
                    key={item.id}
                    item={item}
                    onClick={() => handleTocClick(item.id)}
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
                  onChange={(e) => setSummary(e.target.value)}
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
              editorRef={editorRef}
              onCharacterCountChange={handleCharacterCountChange}
              onTableOfContentsChange={handleTableOfContentsChange}
              onEditorReady={handleEditorReady}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
