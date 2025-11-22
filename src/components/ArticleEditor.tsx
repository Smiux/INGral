import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, Globe, Lock, Users, Share2, Calendar, BookOpen, Bold, Italic, List, ListOrdered, Link2, Heading1, Heading2, Heading3, Quote, Code, Image, Table, Strikethrough, FileText } from 'lucide-react';
import { Article } from '../types';
import { fetchArticleBySlug, createArticle, updateArticle } from '../utils/article';
import { renderMarkdown } from '../utils/markdown';
import { useAuth } from '../hooks/useAuth';
import { ArticleDrawer } from './ArticleDrawer';
import { LatexEditor } from './LatexEditor';

export function ArticleEditor() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authIsLoading } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!slug);
  const [error, setError] = useState('');
  // 社区和分享功能相关状态
  const [visibility, setVisibility] = useState<'public' | 'private' | 'community'>('public');
  const [allowContributions, setAllowContributions] = useState(true);
  const [lastEdited, setLastEdited] = useState<Date | null>(null);
  // 文章列表抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 编辑视图状态
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [isMobile, setIsMobile] = useState(false);
  // LaTeX编辑器状态
  const [latexEditorOpen, setLatexEditorOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  const loadArticle = useCallback(async () => {
    if (!slug) return;
    const data = await fetchArticleBySlug(slug);
    if (!data) {
      setError('Article not found');
      setIsLoading(false);
      return;
    }

    // 检查编辑权限
    // 作者可以编辑自己的文章
    // 对于允许社区贡献的文章，其他用户也可以编辑
    if (data.author_id !== user?.id && (!data.allow_contributions || !user)) {
      setError('You do not have permission to edit this article');
      setIsLoading(false);
      return;
    }

    setArticle(data);
    setTitle(data.title);
    setContent(data.content);
    setVisibility(data.visibility || 'public');
    setAllowContributions(data.allow_contributions ?? true);
    setLastEdited(data.updated_at ? new Date(data.updated_at) : null);
    setIsLoading(false);
  }, [slug, user]);

  // 检测屏幕尺寸以确定是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 在移动设备上默认显示编辑视图
  useEffect(() => {
    if (isMobile) {
      setViewMode('editor');
    } else {
      setViewMode('split');
    }
  }, [isMobile]);
  
  useEffect(() => {
    // 只有在认证完成加载且用户未登录时才重定向
    if (!authIsLoading && !user) {
      navigate('/auth');
      return;
    }

    if (slug) {
      loadArticle();
    } else {
      setIsLoading(false);
    }
  }, [slug, user, authIsLoading, loadArticle, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (!title.trim()) {
        setError('文章标题不能为空');
        setIsSaving(false);
        return;
      }

      if (!content.trim()) {
        setError('文章内容不能为空');
        setIsSaving(false);
        return;
      }

      // 贡献模式会在文章保存时自动处理

      if (!user?.id) {
        setError('用户未登录，请先登录再保存文章');
        setIsSaving(false);
        return;
      }
      
      let result;
      try {
        if (article) {
          result = await updateArticle(article.id, title, content, visibility, allowContributions);
        } else {
          // 假设从用户状态获取userId，这里使用默认值或从上下文中获取
          const userId = 'current-user-id'; // 实际应用中应从用户认证状态获取
          result = await createArticle(title, content, userId, visibility, allowContributions);
        }
        
        if (!result) {
          throw new Error('保存文章时返回空结果');
        }
        
        setArticle(result);
        
        if (result) {
          const newSlug = result.slug;
          navigate(`/article/${newSlug}`, { replace: true });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '保存文章失败';
        console.error('Error saving article:', errorMessage);
        
        // 根据不同错误类型显示更友好的错误信息
        let userFriendlyError = '保存文章失败，请稍后重试';
        if (errorMessage.includes('network') || errorMessage.includes('Network')) {
          userFriendlyError = '网络连接问题，请检查您的网络连接';
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

  // 分享文章功能
  const handleShare = () => {
    const articleUrl = `${window.location.origin}/article/${article?.slug || ''}`;
    navigator.clipboard.writeText(articleUrl).then(() => {
      // 可以添加一个toast通知表示链接已复制
      console.log('Share link copied to clipboard');
    });
  };

  // 打开文章列表抽屉
  const openArticleDrawer = () => {
    setDrawerOpen(true);
  };

  // 关闭文章列表抽屉
  const closeArticleDrawer = () => {
    setDrawerOpen(false);
  };
  
  // 切换视图模式
  const toggleViewMode = () => {
    if (viewMode === 'split') {
      setViewMode('editor');
    } else if (viewMode === 'editor') {
      setViewMode('preview');
    } else {
      setViewMode('split');
    }
  };
  
  // 打开LaTeX编辑器
  const openLatexEditor = () => {
    // 获取当前选中的文本作为初始公式
    const textarea = textareaRef.current;
    if (textarea) {
      const selectedText = textarea.value.substring(
        textarea.selectionStart, 
        textarea.selectionEnd
      );
      setSelectedText(selectedText);
    }
    setLatexEditorOpen(true);
  };
  
  // 插入LaTeX公式到编辑器
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
  
  // 处理文本格式化
  const formatText = (format: string, formatType?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
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
  
  // 处理键盘快捷键
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
            {article && user && (
              <div className="mt-1 flex items-center text-sm text-gray-600 gap-4">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  By: {user.email}
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
              onClick={openArticleDrawer}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition"
              title="View your articles"
            >
              <BookOpen className="w-5 h-5" />
              <span className="hidden sm:inline">My Articles</span>
            </button>
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

        {/* 社区分享和可见性设置 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Community & Sharing Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Article Visibility
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    value="community"
                    checked={visibility === 'community'}
                    onChange={(e) => setVisibility(e.target.value as 'community')}
                    className="mr-2"
                  />
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Community</span>
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
                {visibility === 'community' && 'Only registered users can view this article'}
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
                When enabled, other registered users can contribute to and improve your article
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

      {/* 文章抽屉组件 */}
      <ArticleDrawer 
        isOpen={drawerOpen} 
        onClose={closeArticleDrawer}
      />
      
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
