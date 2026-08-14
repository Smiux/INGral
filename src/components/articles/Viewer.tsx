import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trash2, Edit3, Download, X,
  Image as ImageIcon, CalendarDays, MessageCircle, Plus, Tag
} from 'lucide-react';
import {
  getArticleBySlug,
  deleteArticle,
  createArticle,
  updateArticle,
  type Article
} from '../../services/articleService';
import { ConfirmDialog } from '../ui/generic/ConfirmDialog';
import { TiptapEditor, type CollaborationProvider } from './core/TipTap';
import { EditorToolbar, HoverToolbar } from './core/Toolbar';
import { FootnotePanel } from './panels/Footnote';
import { TocItem, TableOfContentsPanel } from './panels/TableOfContents';
import { useTocUtils } from './utils/ToC';
import { CoverManager } from './managers/Cover';
import { LatexEditor } from './managers/Latex';
import { useCollaboration } from '../collaboration';
import { useArticleMetadata } from '../collaboration/internal/useArticleMetadata';
import type { Editor } from '@tiptap/react';

interface CoverBlockProps {
  coverImage: string | null;
  title: string;
  editable: boolean;
  onEditClick: () => void;
}

const CoverBlock: React.FC<CoverBlockProps> = ({
  coverImage,
  title,
  editable,
  onEditClick
}) => {
  if (editable) {
    if (coverImage) {
      return (
        <button
          onClick={onEditClick}
          className="mb-6 w-full rounded overflow-hidden bg-slate-100/40 dark:bg-slate-800/40 hover:opacity-90 transition-opacity"
        >
          <img
            src={coverImage}
            alt={title}
            className="w-full h-auto object-cover max-h-[70vh]"
          />
        </button>
      );
    }

    return (
      <button
        onClick={onEditClick}
        className="mb-6 w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded flex flex-col items-center justify-center py-10 gap-2 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-900/10 transition-colors"
      >
        <ImageIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
      </button>
    );
  }

  if (!coverImage) {
    return null;
  }

  return (
    <div className="mb-6 rounded overflow-hidden bg-slate-100/40 dark:bg-slate-800/40">
      <img
        src={coverImage}
        alt={title}
        className="w-full h-auto object-cover max-h-[70vh]"
      />
    </div>
  );
};

interface TitleBlockProps {
  title: string;
  editable: boolean;
  onChange: (title: string) => void;
}

const TitleBlock: React.FC<TitleBlockProps> = ({
  title,
  editable,
  onChange
}) => {
  if (editable) {
    return (
      <input
        type="text"
        placeholder="请输入文章标题..."
        value={title}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-3xl md:text-4xl font-bold text-slate-700 dark:text-slate-300 bg-transparent outline-none placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 min-w-0"
      />
    );
  }

  return (
    <h1 className="text-3xl md:text-4xl font-bold text-slate-700 dark:text-slate-300 min-w-0">{title}</h1>
  );
};

interface MetaBlockProps {
  createdAt: string | null;
  updatedAt: string | null;
  editable: boolean;
  characterCount: number;
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) {
    return '未知';
  }
  return new Date(dateStr).toLocaleString('zh-CN', {
    'year': 'numeric',
    'month': 'long',
    'day': 'numeric',
    'hour': '2-digit',
    'minute': '2-digit',
    'second': '2-digit'
  });
};

const MetaBlock: React.FC<MetaBlockProps> = ({
  createdAt,
  updatedAt,
  editable,
  characterCount
}) => (
  <div className="flex flex-wrap gap-6 text-sm text-slate-500 dark:text-slate-400 mt-4">
    {createdAt && (
      <div className="flex items-center gap-1">
        <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        创建于 {formatDate(createdAt)}
      </div>
    )}
    {updatedAt && (
      <div className="flex items-center gap-1">
        <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        更新于 {formatDate(updatedAt)}
      </div>
    )}
    {editable && (
      <div className="flex items-center gap-1">
        <MessageCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <span>{characterCount} 个字符</span>
      </div>
    )}
  </div>
);

interface TagsBlockProps {
  tags: string[];
  editable: boolean;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}

const TagsBlock: React.FC<TagsBlockProps> = ({
  tags,
  editable,
  onAdd,
  onRemove
}) => {
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      onAdd(tagInput.trim());
      setTagInput('');
    }
  };

  if (!editable) {
    if (tags.length === 0) {
      return null;
    }
    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {tags.map((tag, index) => (
          <span
            key={index}
            title={tag}
            className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-sm"
          >
            <Tag className="w-3 h-3" />
            <span className="truncate max-w-[200px]">{tag}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      {tags.map((tag, index) => (
        <span
          key={index}
          title={tag}
          className="inline-flex items-center gap-1 px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-sm max-w-full"
        >
          <span className="truncate max-w-[150px]">{tag}</span>
          <button
            onClick={() => onRemove(tag)}
            className="ml-1 hover:text-sky-900 dark:hover:text-sky-100 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {showTagInput ? (
        <input
          type="text"
          placeholder="输入后 Enter 添加"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          onBlur={() => {
            setShowTagInput(false);
            setTagInput('');
          }}
          className="w-40 px-3 py-1 text-sm border border-slate-300/80 dark:border-slate-600/80 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-sky-400"
          autoFocus
        />
      ) : (
        <button
          onClick={() => setShowTagInput(true)}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-400 dark:hover:border-sky-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export function ArticleViewer () {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isCreate = !slug;

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(!isCreate);
  const [isEditing, setIsEditing] = useState(isCreate);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tableOfContentsItems, setTableOfContentsItems] = useState<TocItem[]>([]);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  const { toggleCollapsed, getChildIds, isItemCollapsed, shouldShowItem } = useTocUtils();

  const handleToggleCollapsed = useCallback((itemId: string) => {
    setCollapsedItems((prev) => toggleCollapsed(prev, itemId));
  }, [toggleCollapsed]);

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [fontColor, setFontColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [quoteBgColor, setQuoteBgColor] = useState('#f1f5f9');
  const [quoteBorderColor, setQuoteBorderColor] = useState('#64748b');

  const [showIframeDialog, setShowIframeDialog] = useState(false);
  const [iframeSrc, setIframeSrc] = useState('');
  const [iframeWidthInput, setIframeWidthInput] = useState('640');
  const [iframeHeightInput, setIframeHeightInput] = useState('360');

  const [characterCount, setCharacterCount] = useState(0);

  const [showCoverManager, setShowCoverManager] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [originalCoverImage, setOriginalCoverImage] = useState<string | null>(null);
  const [coverImageModified, setCoverImageModified] = useState(false);

  const collaboration = useCollaboration();

  const [articleMetadata, articleMetadataActions] = useArticleMetadata(
    collaboration.articleMetadata,
    collaboration.provider,
    {
      'title': '',
      'tags': [],
      'coverImage': null
    }
  );

  const [showLatexEditor, setShowLatexEditor] = useState(false);
  const [mathType, setMathType] = useState<'inline' | 'block'>('inline');

  const collaborationConfig = useMemo(() => {
    if (collaboration.isConnected && collaboration.doc && collaboration.provider && collaboration.articleMetadata) {
      return {
        'provider': collaboration.provider as CollaborationProvider,
        'document': collaboration.doc,
        'userName': collaboration.userName,
        'userColor': collaboration.userColor,
        'roomId': collaboration.roomId,
        'metadata': collaboration.articleMetadata
      };
    }
    return undefined;
  }, [collaboration.isConnected, collaboration.doc, collaboration.provider, collaboration.userName, collaboration.userColor, collaboration.roomId, collaboration.articleMetadata]);

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    const loadArticle = async () => {
      setIsLoading(true);
      try {
        const data = await getArticleBySlug(slug);
        setArticle(data);
        if (data) {
          setOriginalCoverImage(data.cover_image);
          setCoverImageModified(false);
          setCoverImage(data.cover_image);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [slug]);

  const syncMetadataFromArticle = useCallback((targetArticle: Article) => {
    articleMetadataActions.setTitle(targetArticle.title);
    targetArticle.tags?.forEach(tag => articleMetadataActions.addTag(tag));
    articleMetadataActions.setCoverImage(targetArticle.cover_image);
    setOriginalCoverImage(targetArticle.cover_image);
    setCoverImageModified(false);
    setCoverImage(targetArticle.cover_image);
  }, [articleMetadataActions]);

  useEffect(() => {
    if (!isEditing || !article) {
      return;
    }

    syncMetadataFromArticle(article);
  }, [isEditing, article, syncMetadataFromArticle]);

  useEffect(() => {
    if (isEditing && editor) {
      editor.commands.focus('end', { 'scrollIntoView': false });
    }
  }, [isEditing, editor]);

  const handleEditorReady = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);
  }, []);

  const handleTableOfContentsChange = useCallback((items: TocItem[]) => {
    setTableOfContentsItems(items);
  }, []);

  useEffect(() => {
    if (!editor || !contentRef.current || isEditing) {
      return;
    }

    const highlightSearchMatches = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q');
      const matchIndex = parseInt(urlParams.get('match') || '0', 10);

      if (!query) {
        return;
      }

      const editorContainer = contentRef.current?.querySelector('.ProseMirror');
      const targetContainer = editorContainer || contentRef.current;
      if (!targetContainer) {
        return;
      }

      const highlightRegex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const walker = document.createTreeWalker(
        targetContainer,
        NodeFilter.SHOW_TEXT,
        null
      );
      const textNodes: Text[] = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode as Text);
      }

      let currentMatchIndex = 0;

      textNodes.forEach((textNode) => {
        if (!textNode.textContent?.match(highlightRegex)) {
          return;
        }
        const parent2 = textNode.parentNode as HTMLElement | null;
        if (!parent2 || parent2.tagName === 'MARK') {
          return;
        }
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        const text = textNode.textContent || '';
        let match: RegExpExecArray | null;
        const regex = new RegExp(highlightRegex.source, 'gi');

        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
          }
          const mark = document.createElement('mark');
          mark.className = 'bg-yellow-200 dark:bg-yellow-600 text-inherit rounded px-0.5';
          mark.textContent = match[0];
          mark.setAttribute('data-match-index', currentMatchIndex.toString());
          fragment.appendChild(mark);
          currentMatchIndex += 1;
          lastIndex = regex.lastIndex;
        }
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        parent2.replaceChild(fragment, textNode);
      });

      setTimeout(() => {
        const marks = targetContainer.querySelectorAll('mark[data-match-index]');
        const targetMark = marks?.[matchIndex];
        if (targetMark) {
          targetMark.scrollIntoView({ 'behavior': 'smooth', 'block': 'center' });
        }
      }, 100);
    };

    highlightSearchMatches();
  }, [editor, isEditing]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash !== '#content-match') {
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const matchIndex = parseInt(urlParams.get('match') || '0', 10);

      setTimeout(() => {
        const editorContainer = contentRef.current?.querySelector('.ProseMirror');
        const targetContainer = editorContainer || contentRef.current;
        if (!targetContainer) {
          return;
        }
        const marks = targetContainer.querySelectorAll('mark[data-match-index]');
        const targetMark = marks?.[matchIndex];
        if (targetMark) {
          targetMark.scrollIntoView({ 'behavior': 'smooth', 'block': 'center' });
        }
      }, 100);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-container')) {
      setActiveMenu(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleTocClick = useCallback((itemId: string) => {
    const element = document.querySelector(`[data-toc-id="${itemId}"]`);
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({
        'top': offsetTop,
        'behavior': 'smooth'
      });
    }
  }, []);

  const handleDelete = async () => {
    if (!article || isDeleting) {
      return;
    }

    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!article || isDeleting) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteArticle(article.id);
      if (success) {
        navigate('/articles');
      } else {
        setShowDeleteDialog(false);
        setShowErrorDialog(true);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportHtml = () => {
    if (!article) {
      return;
    }

    const formatDateForExport = (dateStr: string | null | undefined): string => {
      if (!dateStr) {
        return '未知';
      }
      return new Date(dateStr).toLocaleString('zh-CN', {
        'year': 'numeric',
        'month': 'long',
        'day': 'numeric',
        'hour': '2-digit',
        'minute': '2-digit',
        'second': '2-digit'
      });
    };

    const exportArticle = article;
    const exportCreatedDate = formatDateForExport(exportArticle.created_at);
    const exportUpdatedDate = formatDateForExport(exportArticle.updated_at);

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${exportArticle.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .cover-image {
      width: 100%;
      max-height: 70vh;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 1.5em;
    }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; margin-top: 1.5em; }
    h3 { font-size: 1.25em; margin-top: 1.25em; }
    blockquote {
      border-left: 4px solid #0ea5e9;
      padding-left: 1em;
      margin-left: 0;
      color: #666;
      background: #f0f9ff;
      padding: 0.5em 1em;
      border-radius: 0 4px 4px 0;
    }
    .meta {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 1em;
    }
    .tags {
      margin: 1em 0;
    }
    .tag {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.85em;
      margin-right: 4px;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;
    }
    code {
      background: #f1f5f9;
      padding: 2px 4px;
      border-radius: 4px;
    }
    pre code {
      background: transparent;
      padding: 0;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f8fafc;
    }
  </style>
</head>
<body>
  ${exportArticle.cover_image ? `<img src="${exportArticle.cover_image}" alt="${exportArticle.title}" class="cover-image">` : ''}
  <h1>${exportArticle.title}</h1>
  <div class="meta">
    <div>创建时间: ${exportCreatedDate}</div>
    <div>更新时间: ${exportUpdatedDate}</div>
  </div>
  ${exportArticle.tags && exportArticle.tags.length > 0 ? `
  <div class="tags">
    ${exportArticle.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
  </div>
  ` : ''}
  <article>
    ${exportArticle.content || ''}
  </article>
</body>
</html>`;

    const blob = new Blob([htmlContent], { 'type': 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportArticle.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const handleFootnoteClick = useCallback(() => {
    if (!editor) {
      return;
    }
    editor.chain().focus()
      .insertFootnote()
      .run();
  }, [editor]);

  const handleCharacterCountChange = useCallback((count: number) => {
    setCharacterCount(count);
  }, []);

  const handleOpenCoverManager = useCallback(() => {
    setShowCoverManager(true);
  }, []);

  const handleCoverChange = useCallback((base64Image: string | null) => {
    setCoverImage(base64Image);
    articleMetadataActions.setCoverImage(base64Image);
    setCoverImageModified(true);
  }, [articleMetadataActions]);

  const handleAddTag = useCallback((tag: string) => {
    articleMetadataActions.addTag(tag);
  }, [articleMetadataActions]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    articleMetadataActions.removeTag(tagToRemove);
  }, [articleMetadataActions]);

  const handleSave = async () => {
    if (!editor || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      if (!isCreate && article) {
        const updatedArticle = await updateArticle({
          'articleId': article.id,
          'title': articleMetadata.title,
          'content': editor.getHTML(),
          coverImage,
          coverImageModified,
          'tags': articleMetadata.tags.length > 0 ? articleMetadata.tags : undefined
        });

        if (updatedArticle) {
          setArticle(updatedArticle);
          setIsEditing(false);
        }
      } else {
        const savedArticle = await createArticle({
          'title': articleMetadata.title,
          'content': editor.getHTML(),
          coverImage,
          'tags': articleMetadata.tags.length > 0 ? articleMetadata.tags : undefined
        });

        if (savedArticle) {
          navigate(`/articles/${savedArticle.slug}`);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExitEdit = useCallback(() => {
    setIsEditing(false);
    if (editor && article) {
      editor.commands.setContent(article.content, {
        'parseOptions': {
          'preserveWhitespace': 'full'
        }
      });
      setOriginalCoverImage(article.cover_image);
      setCoverImageModified(false);
      setCoverImage(article.cover_image);
    }
  }, [editor, article]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400" />
      </div>
    );
  }

  if (!isCreate && !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-300 mb-4">文章未找到</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">您访问的文章不存在。</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-sky-500 text-white px-6 py-2 rounded hover:bg-sky-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>
      </div>
    );
  }

  const displayTitle = article?.title ?? '';
  const displayCoverImage = coverImageModified ? coverImage : originalCoverImage;

  const renderActionButtons = () => {
    const actionButtonBaseClass = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded transition-all duration-200 border border-slate-200/60 dark:border-slate-700/60 bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed';

    const actionButtonHoverClass = (color: 'sky' | 'emerald' | 'red' | 'slate'): string => {
      const hoverClassMap = {
        'sky': 'hover:bg-sky-100/80 hover:border-sky-300 hover:text-sky-600 dark:hover:bg-sky-900/30 dark:hover:border-sky-700 dark:hover:text-sky-400',
        'emerald': 'hover:bg-emerald-100/80 hover:border-emerald-300 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:border-emerald-700 dark:hover:text-emerald-400',
        'red': 'hover:bg-red-100/80 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:border-red-700 dark:hover:text-red-400',
        'slate': 'hover:bg-slate-200/70 hover:border-slate-300 hover:text-slate-600 dark:hover:bg-slate-700/50 dark:hover:border-slate-600 dark:hover:text-slate-300'
      };
      return hoverClassMap[color];
    };

    const actionButtonClass = (color: 'sky' | 'emerald' | 'red' | 'slate'): string => `${actionButtonBaseClass} ${actionButtonHoverClass(color)}`;

    const renderSavingSpinner = () => (
      <span className="inline-block w-4 h-4 border-2 border-slate-400 dark:border-slate-500 border-t-transparent rounded-full animate-spin" />
    );

    if (isCreate) {
      return (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={actionButtonClass('sky')}
        >
          {isSaving ? renderSavingSpinner() : '保存'}
        </button>
      );
    }

    if (isEditing) {
      return (
        <>
          <button
            onClick={handleExportHtml}
            className={actionButtonClass('emerald')}
          >
            <Download className="w-4 h-4" />
            导出HTML
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={actionButtonClass('sky')}
          >
            {isSaving ? renderSavingSpinner() : '保存'}
          </button>
          <button
            onClick={handleExitEdit}
            className={actionButtonClass('slate')}
          >
            <X className="w-4 h-4" />
            退出编辑
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={actionButtonClass('red')}
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? '删除中...' : '删除文章'}
          </button>
        </>
      );
    }

    return (
      <>
        <button
          onClick={handleExportHtml}
          className={actionButtonClass('emerald')}
        >
          <Download className="w-4 h-4" />
          导出HTML
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className={actionButtonClass('sky')}
        >
          <Edit3 className="w-4 h-4" />
          编辑文章
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={actionButtonClass('red')}
        >
          <Trash2 className="w-4 h-4" />
          {isDeleting ? '删除中...' : '删除文章'}
        </button>
      </>
    );
  };

  return (
    <>
      <div className="flex gap-4 max-w-7xl mx-auto px-4 py-8">
        <div className="flex-1 min-w-0">
          <article>
            <CoverBlock
              coverImage={displayCoverImage}
              title={displayTitle}
              editable={isEditing}
              onEditClick={handleOpenCoverManager}
            />

            <div className="mb-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <TitleBlock
                  title={isEditing ? articleMetadata.title : article?.title ?? ''}
                  editable={isEditing}
                  onChange={articleMetadataActions.setTitle}
                />
                <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
                  {renderActionButtons()}
                </div>
              </div>

              <MetaBlock
                createdAt={article?.created_at ?? null}
                updatedAt={article?.updated_at ?? null}
                editable={isEditing}
                characterCount={characterCount}
              />

              <TagsBlock
                tags={isEditing ? articleMetadata.tags : (article?.tags ?? [])}
                editable={isEditing}
                onAdd={handleAddTag}
                onRemove={handleRemoveTag}
              />
            </div>

            <TableOfContentsPanel
              items={tableOfContentsItems}
              collapsedItems={collapsedItems}
              onTocItemClick={handleTocClick}
              onToggleCollapsed={handleToggleCollapsed}
              getChildIds={getChildIds}
              isItemCollapsed={isItemCollapsed}
              shouldShowItem={shouldShowItem}
              containerClassName={isEditing
                ? 'fixed left-4 top-20 w-48 z-20'
                : 'hidden xl:block fixed left-4 top-[11rem] w-48 z-10 print:hidden'}
              collapsedButtonClassName={isEditing
                ? 'fixed left-4 top-20 z-20'
                : 'hidden xl:block fixed left-4 top-[11rem] z-10 print:hidden'}
            />

            <FootnotePanel
              editor={editor}
              editable={isEditing}
              containerClassName={isEditing
                ? 'fixed right-4 top-20 w-48 z-20'
                : 'hidden xl:block fixed right-4 top-[11rem] w-48 z-10 print:hidden'}
              collapsedButtonClassName={isEditing
                ? 'fixed right-4 top-20 z-20'
                : 'hidden xl:block fixed right-4 top-[11rem] z-10 print:hidden'}
            />

            <div className="flex-1 min-w-0" ref={contentRef}>
              <main className="bg-white dark:bg-slate-800 relative">
                {isEditing && (
                  <div className="sticky top-0 z-40 bg-slate-100 dark:bg-slate-800 border-b border-slate-200/60 dark:border-slate-700/60">
                    <HoverToolbar>
                      <EditorToolbar
                        editor={editor ?? null}
                        activeMenu={activeMenu}
                        setActiveMenu={setActiveMenu}
                        fontColor={fontColor}
                        setFontColor={setFontColor}
                        backgroundColor={backgroundColor}
                        setBackgroundColor={setBackgroundColor}
                        quoteBgColor={quoteBgColor}
                        setQuoteBgColor={setQuoteBgColor}
                        quoteBorderColor={quoteBorderColor}
                        setQuoteBorderColor={setQuoteBorderColor}
                        onMathClick={handleMathClick}
                        onIframeClick={handleIframe}
                        onFootnoteClick={handleFootnoteClick}
                      />
                    </HoverToolbar>
                  </div>
                )}
                {(isEditing || article?.content) && (
                  <TiptapEditor
                    key={collaborationConfig ? `collab-${collaboration.roomId}` : 'article-editor'}
                    editable={isEditing}
                    {...(article?.content ? { 'content': article.content } : {})}
                    onEditorReady={handleEditorReady}
                    onTableOfContentsChange={handleTableOfContentsChange}
                    onCharacterCountChange={handleCharacterCountChange}
                    collaboration={isEditing ? collaborationConfig : undefined}
                    onMathClick={handleMathClick}
                    onIframeClick={handleIframe}
                    onFootnoteClick={handleFootnoteClick}
                  />
                )}
              </main>
            </div>
          </article>
        </div>
      </div>

      <CoverManager
        isOpen={showCoverManager}
        onClose={() => setShowCoverManager(false)}
        currentCoverImage={coverImageModified ? coverImage : originalCoverImage}
        onCoverChange={handleCoverChange}
      />

      <LatexEditor
        isOpen={showLatexEditor}
        onClose={() => setShowLatexEditor(false)}
        onInsert={handleInsertMath}
      />

      {showIframeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowIframeDialog(false)} />
          <div className="bg-slate-50/90 dark:bg-slate-900/90 rounded border border-slate-200/60 dark:border-slate-700/60 p-4 relative z-10 min-w-[450px] max-w-lg">
            <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">嵌入内容</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">嵌入地址</label>
                <input
                  type="text"
                  value={iframeSrc}
                  onChange={(e) => setIframeSrc(e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full px-3 py-2 border border-slate-300/80 dark:border-slate-600/80 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">支持 YouTube、Bilibili 等视频平台的嵌入链接</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">比例预设</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('640'); setIframeHeightInput('360');
                    }}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300/80 dark:border-slate-600/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    16:9 小
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('854'); setIframeHeightInput('480');
                    }}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300/80 dark:border-slate-600/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    16:9 中
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('1280'); setIframeHeightInput('720');
                    }}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300/80 dark:border-slate-600/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    16:9 大
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('640'); setIframeHeightInput('480');
                    }}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300/80 dark:border-slate-600/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    4:3
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('500'); setIframeHeightInput('500');
                    }}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300/80 dark:border-slate-600/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    1:1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIframeWidthInput('640'); setIframeHeightInput('274');
                    }}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300/80 dark:border-slate-600/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    21:9
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">宽度</label>
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
                    className="w-full px-3 py-2 border border-slate-300/80 dark:border-slate-600/80 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">高度</label>
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
                    className="w-full px-3 py-2 border border-slate-300/80 dark:border-slate-600/80 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowIframeDialog(false)}
                  className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800/80 hover:bg-slate-300/80 dark:hover:bg-slate-700/80 rounded transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleIframeSubmit}
                  disabled={!iframeSrc.trim()}
                  className="px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="删除文章"
        message="确定要删除这篇文章吗？此操作不可撤销，文章将被永久删除。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isLoading={isDeleting}
        className="print:hidden"
      />

      <ConfirmDialog
        isOpen={showErrorDialog}
        title="删除失败"
        message="删除文章失败，请稍后重试。"
        confirmText="确定"
        onConfirm={() => setShowErrorDialog(false)}
        onCancel={() => setShowErrorDialog(false)}
        className="print:hidden"
      />
    </>
  );
}
