/**
 * 文章编辑器组件
 * 支持Markdown编辑、LaTeX公式、实时预览和自动保存功能
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, Globe, Lock, Users, Share2, Calendar, BookOpen, Bold, Italic, List, ListOrdered, Link2, Heading1, Heading2, Heading3, Quote, Code, Image, Table, Strikethrough, FileText, Calculator } from 'lucide-react';
import type { Article } from '../../types';
import { fetchArticleBySlug, createArticle, updateArticle } from '../../utils/article';
import { renderMarkdown } from '../../utils/markdown';
import { LatexEditor } from '../editors/LatexEditor';

export function ArticleEditor() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!slug);
  const [error, setError] = useState('');
  // 社区和分享功能相关状态
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [allowContributions, setAllowContributions] = useState(true);
  // 作者信息状态
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorUrl, setAuthorUrl] = useState('');
  const [lastEdited, setLastEdited] = useState<Date | null>(null);
  // 编辑视图状态
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [isMobile, setIsMobile] = useState(false);
  // LaTeX编辑器状态
  const [latexEditorOpen, setLatexEditorOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * 加载文章内容
   * @async
   */
  const loadArticle = useCallback(async () => {
    if (!slug) {return;}

    try {
      const data = await fetchArticleBySlug(slug);
      if (!data) {
        setError('Article not found');
        setIsLoading(false);
        return;
      }

      setArticle(data);
      setTitle(data.title);
      setContent(data.content);
      // 直接设置visibility，因为类型已经是'public'或'private'
      setVisibility(data.visibility || 'public');
      setAllowContributions(data.allow_contributions ?? true);
      // 加载作者信息
      setAuthorName(data.author_name || '');
      setAuthorEmail(data.author_email || '');
      setAuthorUrl(data.author_url || '');
      setLastEdited(data.updated_at ? new Date(data.updated_at) : null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load article';
      console.error('Error loading article:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  /**
   * 检测屏幕尺寸以确定是否为移动设备
   */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /**
   * 在移动设备上默认显示编辑视图
   */
  useEffect(() => {
    if (isMobile) {
      setViewMode('editor');
    } else {
      setViewMode('split');
    }
  }, [isMobile]);

  /**
   * 处理文章加载
   */
  useEffect(() => {
    if (slug) {
      loadArticle();
    } else {
      setIsLoading(false);
    }
  }, [slug, loadArticle]);

  /**
   * 自动保存功能
   * 每3秒自动保存草稿到本地存储
   */
  useEffect(() => {
    if (!title && !content) {return;}

    const timer = setTimeout(() => {
      // 只有在非保存状态下才进行自动保存
      if (!isSaving) {
        // 创建自动保存的草稿到本地存储
        try {
          const draftKey = `draft_anonymous_${slug || 'new'}`;
          const draft = {
            title,
            content,
            visibility,
            allowContributions,
            lastSaved: new Date().toISOString(),
          };
          localStorage.setItem(draftKey, JSON.stringify(draft));
        } catch (err) {
          console.warn('自动保存草稿失败:', err);
        }
      }
    }, 3000); // 3秒自动保存

    return () => clearTimeout(timer);
  }, [title, content, visibility, allowContributions, isSaving, slug]);

  /**
   * 加载自动保存的草稿
   */
  useEffect(() => {
    if (article) {return;} // 已有文章时不加载草稿

    try {
      const draftKey = `draft_anonymous_${slug || 'new'}`;
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        // 如果用户确认，可以加载草稿
        if (window.confirm('检测到未完成的草稿，是否恢复？')) {
          setTitle(draft.title || '');
          setContent(draft.content || '');
          setVisibility(draft.visibility || 'public');
          setAllowContributions(draft.allowContributions ?? true);
          localStorage.removeItem(draftKey); // 加载后清除草稿
        }
      }
    } catch (err) {
      console.warn('加载草稿失败:', err);
    }
  }, [article, slug]);

  /**
   * 保存文章
   * @param e - 表单提交事件
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (!title.trim()) {
        setError('文章标题不能为空');
        return;
      }

      if (!content.trim()) {
        setError('文章内容不能为空');
        return;
      }

      let result: Article | null | undefined;
      try {
        if (article) {
          result = await updateArticle(article.id, title, content, visibility, allowContributions, authorName, authorEmail, authorUrl);
        } else {
          // 支持匿名提交
          result = await createArticle(title, content, visibility, allowContributions, authorName, authorEmail, authorUrl);
        }

        if (!result) {
          throw new Error('保存文章时返回空结果');
        }

        setArticle(result);
        setLastEdited(new Date());

        // 检查文章是否为临时ID文章
        const isOfflineArticle = result.id?.toString().startsWith('temp_') ?? false;

        if (isOfflineArticle) {
          // 对于离线文章，显示提示但不重定向
          setError('文章已保存（离线模式），将在网络恢复时自动同步');
          // 5秒后清除错误提示
          setTimeout(() => setError(''), 5000);
        } else {
          // 对于成功保存到数据库的文章，重定向到文章页面
          const newSlug = result.slug;
          navigate(`/article/${newSlug}`, { replace: true });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '保存文章失败';
        console.error('Error saving article:', errorMessage);

        // 根据不同错误类型显示更友好的错误信息
        let userFriendlyError = '保存文章失败，请稍后重试';
        if (errorMessage.includes('network') || errorMessage.includes('Network')) {
          userFriendlyError = '网络连接问题，文章已保存到本地，将在网络恢复时同步';
        } else if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
          userFriendlyError = '权限不足，您没有权限修改此文章';
        } else if (errorMessage.includes('validation') || errorMessage.includes('Validation')) {
          userFriendlyError = '文章内容验证失败，请检查输入内容';
        }

        setError(userFriendlyError);
      }
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 分享文章功能
   */
  const handleShare = () => {
    const articleUrl = `${window.location.origin}/article/${article?.slug || ''}`;
    navigator.clipboard.writeText(articleUrl).then(() => {
      // 可以添加一个toast通知表示链接已复制
      console.log('Share link copied to clipboard');
    });
  };

  /**
   * 切换视图模式
   */
  const toggleViewMode = () => {
    if (viewMode === 'split') {
      setViewMode('editor');
    } else if (viewMode === 'editor') {
      setViewMode('preview');
    } else {
      setViewMode('split');
    }
  };

  /**
   * 打开LaTeX编辑器
   */
  const openLatexEditor = () => {
    // 获取当前选中的文本作为初始公式
    const textarea = textareaRef.current;
    if (textarea) {
      const selectedText = textarea.value.substring(
        textarea.selectionStart,
        textarea.selectionEnd,
      );
      setSelectedText(selectedText);
    }
    setLatexEditorOpen(true);
  };

  /**
   * 插入LaTeX公式到编辑器
   * @param formula - LaTeX公式
   */
  const insertLatexFormula = (formula: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // 智能判断是否需要添加 $$ 包装（如果公式已经有包装则不重复添加）
      let formattedFormula = formula;
      const trimmedFormula = formula.trim();
      if (!trimmedFormula.startsWith('$') && !trimmedFormula.startsWith('\\')) {
        formattedFormula = `$$${formula}$$`;
      }

      const newValue = content.substring(0, start) + formattedFormula + content.substring(end);
      setContent(newValue);

      // 重新聚焦并设置光标位置
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + formattedFormula.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      setContent(content + `$$${formula}$$`);
    }
  };

  /**
   * 插入SymPy计算单元格到编辑器
   */
  const insertSymPyCell = () => {
    const textarea = textareaRef.current;
    const sympyCellMarkup = `\n\n[sympy-cell]\n# SymPy计算单元格\n# 示例: integrate(x**2, x)\n\n[/sympy-cell]\n\n`;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = content.substring(0, start) + sympyCellMarkup + content.substring(end);
      setContent(newValue);

      // 重新聚焦并设置光标位置
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + sympyCellMarkup.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      setContent(content + sympyCellMarkup);
    }
  };

  /**
   * 处理文本格式化
   * @param format - 格式化字符串
   * @param formatType - 格式化类型
   */
  const formatText = (format: string, formatType?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {return;}

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let newText = '';

    // 根据不同的格式化类型处理
    switch (formatType) {
    case 'link':
      // 特殊处理链接格式
      if (selectedText) {
        newText = `[${selectedText}](url)`;
      } else {
        newText = '[Link text](url)';
      }
      break;
    case 'bold':
      // 检查是否已经是加粗格式
      if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
        newText = selectedText.substring(2, selectedText.length - 2);
      } else {
        newText = `**${selectedText || 'Bold text'}**`;
      }
      break;
    case 'italic':
      // 检查是否已经是斜体格式
      if (selectedText.startsWith('*') && selectedText.endsWith('*')) {
        newText = selectedText.substring(1, selectedText.length - 1);
      } else {
        newText = `*${selectedText || 'Italic text'}*`;
      }
      break;
    case 'h1':
    case 'h2':
    case 'h3':
      // 处理标题格式，确保行首添加格式
      if (start === 0 || content[start - 1] === '\n') {
        // 在行首，直接添加格式
        newText = format + selectedText;
      } else {
        // 不在行首，需要找到当前行的开始位置
        let lineStart = start;
        while (lineStart > 0 && content[lineStart - 1] !== '\n') {
          lineStart--;
        }
        const currentLine = content.substring(lineStart, end);
        const prefixRegex = /^#{1,6}\s*/;
        const hasPrefix = prefixRegex.test(currentLine);

        if (hasPrefix) {
          // 如果已经有标题前缀，则替换
          newText = currentLine.replace(prefixRegex, format);
        } else {
          // 否则添加前缀
          newText = format + currentLine;
        }

        // 更新起始位置
        textarea.selectionStart = lineStart;
      }
      break;
    default:
      // 默认处理：包围选中的文本
      if (selectedText) {
        if (format.startsWith('```')) {
          // 特殊处理代码块
          newText = format;
        } else if (format.includes('\n')) {
          // 多行格式直接使用
          newText = format;
        } else {
          // 检查是否已经有相同格式
          if (selectedText.startsWith(format) && selectedText.endsWith(format)) {
            newText = selectedText.substring(format.length, selectedText.length - format.length);
          } else {
            newText = format + selectedText + format;
          }
        }
      } else {
        // 没有选中文本时的默认值
        newText = format;
      }
    }

    // 更新内容
    const newValue = content.substring(0, textarea.selectionStart) + newText + content.substring(end);
    setContent(newValue);

    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = textarea.selectionStart + newText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);

      // 如果是链接格式，选中URL部分
      if (formatType === 'link' && !selectedText) {
        const urlStart = textarea.selectionStart - 5;
        textarea.setSelectionRange(urlStart, urlStart + 3);
      }
    }, 0);
  };

  /**
   * 处理键盘快捷键
   * @param e - 键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'k' && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      openLatexEditor();
    } else if (e.ctrlKey) {
      switch (e.key) {
      case 'b':
        e.preventDefault();
        formatText('**', 'bold');
        break;
      case 'i':
        e.preventDefault();
        formatText('*', 'italic');
        break;
      case 'k':
        e.preventDefault();
        formatText('[', 'link');
        break;
      case '1':
        e.preventDefault();
        formatText('# ', 'h1');
        break;
      case '2':
        e.preventDefault();
        formatText('## ', 'h2');
        break;
      case '3':
        e.preventDefault();
        formatText('### ', 'h3');
        break;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {article ? 'Edit Article' : 'Create New Article'}
            </h1>
            {article && (
              <div className="mt-1 flex items-center text-sm text-gray-600 gap-4">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                By: {article.author_name || 'Anonymous'}
                </span>
                {lastEdited && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                  Last edited: {lastEdited.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {article && (
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-gray-700 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Article Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter article title..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
        </div>

        {/* 作者信息设置 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Author Information (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Author Name (leave blank for Anonymous)
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={authorUrl}
                onChange={(e) => setAuthorUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* 社区分享和可见性设置 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Community & Sharing Settings</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Article Visibility
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === 'public'}
                    onChange={(e) => setVisibility(e.target.value as 'public')}
                    className="mr-2"
                  />
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-green-600" />
                    <span>Public</span>
                  </div>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={(e) => setVisibility(e.target.value as 'private')}
                    className="mr-2"
                  />
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-600" />
                    <span>Private</span>
                  </div>
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {visibility === 'public' && 'Anyone can view this article'}
                {visibility === 'private' && 'Only you can view this article'}
              </p>
            </div>

            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="block text-sm font-medium text-gray-700">
                  Allow Community Contributions
                </span>
                <input
                  type="checkbox"
                  checked={allowContributions}
                  onChange={(e) => setAllowContributions(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                />
              </label>
              <p className="mt-2 text-xs text-gray-500">
                When enabled, anyone can contribute to and improve your article
              </p>
            </div>
          </div>
        </div>

        {/* 编辑区域 - 类似VS Code的界面 */}
        <div className="relative border border-gray-300 rounded-lg overflow-hidden">
          {/* 主工具栏 */}
          <div className="bg-gray-100 border-b border-gray-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Editor</span>
              <span className="text-xs text-gray-500">Markdown</span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {/* 视图模式切换按钮 */}
              <button
                onClick={toggleViewMode}
                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                title={`Switch to ${viewMode === 'split' ? 'editor' : viewMode === 'editor' ? 'preview' : 'split'} view`}
              >
                <BookOpen className="w-4 h-4 text-gray-600" />
              </button>

              <div className="h-4 w-px bg-gray-300 mx-1"></div>

              {/* LaTeX编辑器按钮 */}
              <button
                onClick={openLatexEditor}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md hover:bg-gray-200 transition-colors text-gray-700"
                title="Open LaTeX Editor (Ctrl+Shift+K)"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">LaTeX</span>
              </button>
            </div>
          </div>

          {/* 文本编辑工具栏 */}
          <div className="bg-white border-b border-gray-200 px-3 py-1 flex flex-wrap items-center gap-0.5">
            {/* 标题 */}
            <button onClick={() => formatText('# ', 'h1')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Heading 1 (Ctrl+1)">
              <Heading1 className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => formatText('## ', 'h2')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Heading 2 (Ctrl+2)">
              <Heading2 className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => formatText('### ', 'h3')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Heading 3 (Ctrl+3)">
              <Heading3 className="w-4 h-4 text-gray-600" />
            </button>

            <div className="h-4 w-px bg-gray-300 mx-1"></div>

            {/* 文本样式 */}
            <button onClick={() => formatText('**', 'bold')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Bold (Ctrl+B)">
              <Bold className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => formatText('*', 'italic')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Italic (Ctrl+I)">
              <Italic className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => formatText('~~')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Strikethrough">
              <Strikethrough className="w-4 h-4 text-gray-600" />
            </button>

            <div className="h-4 w-px bg-gray-300 mx-1"></div>

            {/* 列表 */}
            <button onClick={() => formatText('- ')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Unordered List">
              <List className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => formatText('1. ')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Ordered List">
              <ListOrdered className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => formatText('> ')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Blockquote">
              <Quote className="w-4 h-4 text-gray-600" />
            </button>

            <div className="h-4 w-px bg-gray-300 mx-1"></div>

            {/* 链接和媒体 */}
            <button onClick={() => formatText('[', 'link')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Link (Ctrl+K)">
              <Link2 className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => formatText('![Alt text](image.jpg)')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Image">
              <Image className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => formatText('```\ncode here\n```')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Code Block">
              <Code className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => formatText('`')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Inline Code">
              <FileText className="w-4 h-4 text-gray-600" />
            </button>

            <div className="h-4 w-px bg-gray-300 mx-1"></div>

            {/* 表格和对齐 */}
            <button onClick={() => formatText('| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1 | Cell 2 |')} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Table">
              <Table className="w-4 h-4 text-gray-600" />
            </button>
            
            {/* 计算单元格 */}
            <button onClick={insertSymPyCell} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Insert SymPy Calculation Cell">
              <Calculator className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* 编辑区域主体 */}
          <div className="flex flex-col sm:flex-row h-[calc(100vh-480px)] min-h-[400px] max-h-[600px]">
            {/* 左侧编辑器 */}
            {(viewMode === 'split' || viewMode === 'editor') && (
              <div className={`flex-1 overflow-hidden ${viewMode === 'split' ? 'border-r border-gray-300' : ''}`}>
                <div className="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-300">
                  <div className="text-xs text-gray-600 mb-1 space-y-1">
                    <p className="flex flex-wrap gap-x-4">
                      <span>• [[Title]] for internal links</span>
                      <span>• $...$ for LaTeX</span>
                      <span>• $$...$$ for display math</span>
                    </p>
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your content in markdown format..."
                  className="w-full h-full p-4 border-0 focus:ring-0 focus:outline-none font-mono text-sm resize-none bg-white"
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                />
              </div>
            )}

            {/* 右侧预览 */}
            {(viewMode === 'split' || viewMode === 'preview') && (
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-300">
                  <span className="text-sm font-medium text-gray-700">Preview</span>
                </div>
                <div className="w-full h-full overflow-y-auto p-6 bg-white">
                  <div
                    className="prose max-w-none wiki-link-styling"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Article'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* LaTeX编辑器组件 */}
      <LatexEditor
        isOpen={latexEditorOpen}
        onClose={() => setLatexEditorOpen(false)}
        onInsert={insertLatexFormula}
        initialFormula={selectedText}
      />
    </div>
  );
}
