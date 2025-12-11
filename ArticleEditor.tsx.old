/**
 * 文章编辑器组件
 * 支持Markdown编辑、LaTeX公式、实时预览和自动保存功能
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, Globe, Lock, Users, Share2, Calendar, BookOpen, Bold, Italic, List, ListOrdered, Link2, Heading1, Heading2, Heading3, Quote, Code, Image, Video, Table, Strikethrough, FileText, Calculator, Settings, HelpCircle, Info, AlertCircle, Youtube, BookMarked } from 'lucide-react';
import { TemplateManager } from './TemplateManager';
import type { ContentTemplate } from '../../types/template';
import type { Article } from '../../types';
import { articleService } from '../../services/articleService';
import { renderMarkdown } from '../../utils/markdown';
import { LatexEditor } from '../editors/LatexEditor';
import { Notification } from '../common/Notification';
import mermaid from 'mermaid';
import Chart from 'chart.js/auto';

// 快捷键定义接口
interface ShortcutDefinition {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  category: string;
}

// 目录项类型定义
interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
  children: TableOfContentsItem[];
}

// 快捷键定义数组
const SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'bold',
    name: '加粗',
    description: '将选中的文本加粗',
    defaultKey: 'Ctrl+B',
    category: '文本格式'
  },
  {
    id: 'italic',
    name: '斜体',
    description: '将选中的文本变为斜体',
    defaultKey: 'Ctrl+I',
    category: '文本格式'
  },
  {
    id: 'heading1',
    name: '一级标题',
    description: '将选中的文本设为一级标题',
    defaultKey: 'Ctrl+1',
    category: '标题'
  },
  {
    id: 'heading2',
    name: '二级标题',
    description: '将选中的文本设为二级标题',
    defaultKey: 'Ctrl+2',
    category: '标题'
  },
  {
    id: 'heading3',
    name: '三级标题',
    description: '将选中的文本设为三级标题',
    defaultKey: 'Ctrl+3',
    category: '标题'
  },
  {
    id: 'ul',
    name: '无序列表',
    description: '将选中的文本设为无序列表',
    defaultKey: 'Ctrl+Shift+U',
    category: '列表'
  },
  {
    id: 'ol',
    name: '有序列表',
    description: '将选中的文本设为有序列表',
    defaultKey: 'Ctrl+Shift+O',
    category: '列表'
  },
  {
    id: 'quote',
    name: '引用',
    description: '将选中的文本设为引用',
    defaultKey: 'Ctrl+Shift+Q',
    category: '文本格式'
  },
  {
    id: 'code',
    name: '代码块',
    description: '将选中的文本设为代码块',
    defaultKey: 'Ctrl+Shift+K',
    category: '代码'
  },
  {
    id: 'save',
    name: '保存',
    description: '保存当前文章',
    defaultKey: 'Ctrl+S',
    category: '编辑操作'
  },
  {
    id: 'undo',
    name: '撤销',
    description: '撤销上一步操作',
    defaultKey: 'Ctrl+Z',
    category: '编辑操作'
  },
  {
    id: 'redo',
    name: '重做',
    description: '重做上一步操作',
    defaultKey: 'Ctrl+Y',
    category: '编辑操作'
  },
  {
    id: 'preview',
    name: '切换预览',
    description: '切换编辑/预览模式',
    defaultKey: 'Ctrl+P',
    category: '视图'
  },
  {
    id: 'shortcuts',
    name: '显示快捷键',
    description: '显示所有快捷键',
    defaultKey: 'Ctrl+/',
    category: '视图'
  }
];

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
  const [visibility, setVisibility] = useState<'public' | 'unlisted'>('public');
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
  // 文章设置面板状态
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  // 帮助文档状态
  const [showHelp, setShowHelp] = useState(false);
  // 未保存更改状态
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // 行号显示状态
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  // 光标位置状态
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  // 实时预览状态
  const [livePreview, setLivePreview] = useState(true);
  // 预览内容状态
  const [previewContent, setPreviewContent] = useState<string>(renderMarkdown('').html);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 预览区域ref
  const previewRef = useRef<HTMLDivElement>(null);
  // 滚动同步标志，防止递归调用
  const isSyncingRef = useRef(false);
  // 通知状态
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  // 编辑历史状态
  const [editingHistory, setEditingHistory] = useState<{ title: string; content: string; timestamp: Date }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const MAX_HISTORY_SIZE = 50;
  // 快捷键提示面板状态
  const [showShortcuts, setShowShortcuts] = useState(false);
  // 自定义快捷键配置
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string>>({});
  // 快捷键配置面板状态
  const [showShortcutSettings, setShowShortcutSettings] = useState(false);
  // 格式刷状态
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [isFormatBrushActive, setIsFormatBrushActive] = useState(false);
  // 模板管理状态
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  // 代码块语法选择状态
  const [showCodeLanguageDropdown, setShowCodeLanguageDropdown] = useState(false);
  // 目录状态管理
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [expandedTocItems, setExpandedTocItems] = useState<Set<string>>(new Set());
  const [activeTocItem, setActiveTocItem] = useState<string>('');
  // 工具栏折叠状态
  const [showToolbar, setShowToolbar] = useState(true);
  // 行号显示优化相关
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const lineHeight = 24; // 行高固定为24px

  /**
   * 渲染行号，只渲染可见区域的行号
   */
  const renderLineNumbers = useCallback(() => {
    const lineCount = content.split('\n').length;
    // 简单优化：只渲染可见区域的行号，最多渲染200行
    const maxVisibleLines = 200;
    const startLine = Math.max(0, Math.floor((textareaRef.current?.scrollTop || 0) / lineHeight) - 10);
    const endLine = Math.min(lineCount, startLine + maxVisibleLines);
    
    // 生成可见行号数组
    const lines = [];
    for (let i = startLine; i < endLine; i++) {
      lines.push(i + 1);
    }
    
    return lines.map((lineNumber) => (
      <div
        key={lineNumber}
        style={{
          height: '24px',
          lineHeight: '24px',
        }}
      >
        {lineNumber}
      </div>
    ));
  }, [content]);

  /**
   * 更新目录激活项
   */
  const updateActiveTocItem = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || tableOfContents.length === 0) return;
    
    const scrollTop = textarea.scrollTop;
    const viewportHeight = textarea.clientHeight;
    
    // 找到当前可见区域的中间位置
    const middlePosition = scrollTop + viewportHeight / 2;
    
    // 计算每一行的位置
    const lines = content.split('\n');
    let currentHeadingId = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch && headingMatch[2]) {
        const text = headingMatch[2].trim();
        const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        // 计算当前标题位置
        const linePosition = i * lineHeight;
        
        // 如果当前标题位置在中间位置以下，更新当前激活标题
        if (linePosition <= middlePosition) {
          currentHeadingId = id;
        } else {
          break;
        }
      }
    }
    
    setActiveTocItem(currentHeadingId);
  }, [content, tableOfContents, lineHeight]);

  /**
   * 处理编辑器滚动事件，同步行号显示和预览滚动
   */
  const handleEditorScrollMain = useCallback((e?: React.UIEvent<HTMLTextAreaElement>) => {
    // 触发行号重新渲染
    renderLineNumbers();
    
    // 滚动同步逻辑
    const textarea = e?.currentTarget || textareaRef.current;
    const preview = previewRef.current;
    if (!textarea || !preview || isSyncingRef.current) return;

    isSyncingRef.current = true;
    
    // 计算滚动比例并同步到预览区域
    const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
    const previewScrollPosition = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
    preview.scrollTop = previewScrollPosition;
    
    // 更新目录激活项
    updateActiveTocItem();
    
    isSyncingRef.current = false;
  }, [renderLineNumbers, updateActiveTocItem]);

  /**
   * 加载文章内容
   * @async
   */
  const loadArticle = useCallback(async () => {
    if (!slug) {return;}

    try {
      const data = await articleService.getArticleBySlug(slug);
      if (!data) {
        setError('Article not found');
        setIsLoading(false);
        return;
      }

      setArticle(data);
      setTitle(data.title);
      setContent(data.content);
      // 直接设置visibility，因为类型已经是'public'或'unlisted'
      setVisibility(data.visibility || 'public');
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
   * 跟踪未保存的更改
   */
  useEffect(() => {
    // 只有在文章加载完成后才跟踪更改
    if (!isLoading) {
      // 检查是否有实际更改
      const initialTitle = article?.title || '';
      const initialContent = article?.content || '';
      const initialVisibility = article?.visibility || 'public';
      
      setHasUnsavedChanges(
        title !== initialTitle || 
        content !== initialContent || 
        visibility !== initialVisibility
      );
    }
  }, [title, content, visibility, article, isLoading]);

  /**
   * 添加离开确认功能
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // 显示浏览器默认的确认对话框
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      return;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  /**
   * 自动保存功能
   * 每5秒自动保存草稿到本地存储（防抖处理，减少保存频率）
   */
  useEffect(() => {
    if (!title && !content) {return;}

    // 延长自动保存间隔到5秒
    const timer = setTimeout(() => {
      // 只有在非保存状态下才进行自动保存
      if (!isSaving) {
        // 创建自动保存的草稿到本地存储
        try {
          const draftKey = `draft_anonymous_${slug || 'new'}`;
          const currentDate = new Date();
          const draft = {
            title,
            content,
            visibility,
            lastSaved: currentDate.toISOString(),
          };
          localStorage.setItem(draftKey, JSON.stringify(draft));
        } catch (err) {
          console.warn('自动保存草稿失败:', err);
        }
      }
    }, 5000); // 5秒自动保存，减少保存频率

    return () => clearTimeout(timer);
  }, [title, content, visibility, isSaving, slug]);

  /**
   * 添加到编辑历史记录
   */
  const addToHistory = useCallback(() => {
    setEditingHistory(prev => {
      // 如果当前不是在历史记录的最后，截断历史记录
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({
        title,
        content,
        timestamp: new Date()
      });
      
      // 限制历史记录的最大长度
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
      }
      
      return newHistory;
    });
    setHistoryIndex(prev => {
      const newIndex = prev + 1;
      return newIndex;
    });
  }, [title, content, historyIndex]);

  /**
   * 优化编辑历史记录，减少内存占用
   */
  useEffect(() => {
    if (!isLoading && (title || content)) {
      // 防抖处理，避免过于频繁保存历史记录
      const timer = setTimeout(() => {
        addToHistory();
      }, 2000); // 2秒保存一次历史记录
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [isLoading, title, content, addToHistory]);

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
        }
        // 无论用户选择与否，都清除草稿，避免下次编辑时再次提示
        localStorage.removeItem(draftKey);
      }
    } catch (err) {
      console.warn('加载草稿失败:', err);
    }
  }, [article, slug]);

  /**
   * 处理确认离开
   */
  const handleConfirmLeave = () => {
    // 清除草稿
    const draftKey = `draft_anonymous_${slug || 'new'}`;
    localStorage.removeItem(draftKey);
    
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('您有未保存的更改，确定要离开吗？');
      if (!confirmed) {
        return; // 用户取消，不离开
      }
    }
    
    // 根据文章状态导航到正确页面
    if (article && article.slug) {
      // 如果是编辑已有文章，导航到该文章页面
      navigate(`/article/${article.slug}`, { replace: true });
    } else {
      // 如果是创建新文章，导航到首页
      navigate('/', { replace: true });
    }
  };

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
          result = await articleService.updateArticle(article.id, title, content, visibility, authorName, authorEmail, authorUrl);
        } else {
          // 支持匿名提交
          result = await articleService.createArticle(title, content, visibility, authorName, authorEmail, authorUrl);
        }

        if (!result) {
          throw new Error('保存文章时返回空结果');
        }

        setArticle(result);
        setLastEdited(new Date());

        // 文章成功提交后，清除对应的草稿
        const draftKey = `draft_anonymous_${slug || 'new'}`;
        localStorage.removeItem(draftKey);

        // 重置未保存更改状态
        setHasUnsavedChanges(false);

        // 检查文章是否为临时ID文章
        const isOfflineArticle = result.id?.toString().startsWith('temp_') ?? false;

        if (isOfflineArticle) {
          // 对于离线文章，显示提示但不重定向
          showNotification('文章已保存（离线模式），将在网络恢复时自动同步', 'info');
        } else {
          // 对于成功保存到数据库的文章，重定向到文章页面
          if (result && result.slug) {
            showNotification('文章保存成功', 'success');
            const newSlug = result.slug;
            // 稍微延迟一下，让用户看到通知
            setTimeout(() => {
              navigate(`/article/${newSlug}`, { replace: true });
            }, 500);
          } else {
            console.error('Failed to get article slug after save');
            showNotification('保存成功，但无法获取文章链接，请手动返回首页', 'info');
          }
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
   * 显示通知
   */
  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error') => {
    setNotification({ message, type });
    // 3秒后自动关闭通知
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  /**
   * 关闭通知
   */
// 关闭通知
  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // 处理模板选择
  const handleSelectTemplate = useCallback((template: ContentTemplate) => {
    // 更新编辑器内容为模板内容
    setContent(template.content);
    // 如果是新文章，可以设置一个默认标题
    if (!article && !title.trim()) {
      setTitle(template.name);
    }
    setNotification({ message: `已应用模板: ${template.name}`, type: 'success' });
    setShowTemplateManager(false);
  }, [article, title]);

  /**
   * 分享文章功能
   */
  const handleShare = () => {
    const articleUrl = `${window.location.origin}/article/${article?.slug || ''}`;
    navigator.clipboard.writeText(articleUrl).then(() => {
      showNotification('文章链接已复制到剪贴板', 'success');
    }).catch((err) => {
      console.error('Failed to copy link:', err);
      showNotification('复制链接失败，请手动复制', 'error');
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
    case 'table':
      // 表格操作处理
      const tableInfo = getCurrentTable();
      if (tableInfo) {
        const { tableStart, tableEnd } = tableInfo;
        let updatedTable = '';
        
        switch (format) {
          case 'add-row':
            updatedTable = addTableRow();
            break;
          case 'add-column':
            updatedTable = addTableColumn();
            break;
          case 'delete-row':
            updatedTable = deleteTableRow();
            break;
          case 'delete-column':
            updatedTable = deleteTableColumn();
            break;
          case 'merge-cells':
            updatedTable = mergeTableCells();
            break;
          default:
            // 默认表格模板
            updatedTable = format;
        }
        
        if (updatedTable) {
          // 更新表格内容
          const newValue = content.substring(0, tableStart) + updatedTable + content.substring(tableEnd);
          setContent(newValue);
        }
        return; // 直接返回，避免重复更新
      } else {
        // 如果不在表格中，插入新表格
        newText = format;
      }
      break;
    case 'image':
      // 图片操作处理
      const imageInfo = getCurrentImage();
      if (imageInfo) {
        const { imageStart, imageEnd } = imageInfo;
        let updatedImage = '';
        
        switch (format) {
          case 'edit-alt':
            updatedImage = editImageAlt();
            break;
          case 'align-left':
            updatedImage = alignImage('left');
            break;
          case 'align-center':
            updatedImage = alignImage('center');
            break;
          case 'align-right':
            updatedImage = alignImage('right');
            break;
          case 'resize-small':
            updatedImage = resizeImage(200);
            break;
          case 'resize-medium':
            updatedImage = resizeImage(400);
            break;
          case 'resize-large':
            updatedImage = resizeImage(600);
            break;
          case 'resize-custom':
            updatedImage = resizeImageCustom();
            break;
          default:
            // 默认图片模板
            updatedImage = format;
        }
        
        if (updatedImage) {
          // 更新图片内容
          const newValue = content.substring(0, imageStart) + updatedImage + content.substring(imageEnd);
          setContent(newValue);
        }
        return; // 直接返回，避免重复更新
      } else {
        // 如果不在图片中，插入新图片
        newText = format;
      }
      break;
    case 'video':
      // 视频操作处理
      const videoInfo = getCurrentVideo();
      if (videoInfo) {
        const { videoStart, videoEnd } = videoInfo;
        let updatedVideo = '';
        
        switch (format) {
          case 'align-left':
            updatedVideo = alignVideo('left');
            break;
          case 'align-center':
            updatedVideo = alignVideo('center');
            break;
          case 'align-right':
            updatedVideo = alignVideo('right');
            break;
          case 'resize-small':
            updatedVideo = resizeVideo(400);
            break;
          case 'resize-medium':
            updatedVideo = resizeVideo(600);
            break;
          case 'resize-large':
            updatedVideo = resizeVideo(800);
            break;
          case 'resize-custom':
            updatedVideo = resizeVideoCustom();
            break;
          default:
            // 默认视频模板
            updatedVideo = format;
        }
        
        if (updatedVideo) {
          // 更新视频内容
          const newValue = content.substring(0, videoStart) + updatedVideo + content.substring(videoEnd);
          setContent(newValue);
        }
        return; // 直接返回，避免重复更新
      } else {
        // 如果不在视频中，插入新视频
        newText = format;
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
   * 获取当前光标所在的表格
   * @returns 表格的起始和结束位置，以及表格内容
   */
  const getCurrentTable = () => {
    const textarea = textareaRef.current;
    if (!textarea) return null;

    const cursorPos = textarea.selectionStart;
    const text = content;
    
    // 查找当前行
    let currentLineStart = cursorPos;
    while (currentLineStart > 0 && text[currentLineStart - 1] !== '\n') {
      currentLineStart--;
    }
    
    let currentLineEnd = cursorPos;
    while (currentLineEnd < text.length && text[currentLineEnd] !== '\n') {
      currentLineEnd++;
    }
    
    // 检查当前行是否是表格行
    const currentLine = text.substring(currentLineStart, currentLineEnd);
    const isTableRow = /^\|.*\|$/.test(currentLine);
    if (!isTableRow) return null;
    
    // 查找表格的起始位置
    let tableStart = currentLineStart;
    while (tableStart > 0) {
      let prevLineStart = tableStart - 1;
      while (prevLineStart > 0 && text[prevLineStart - 1] !== '\n') {
        prevLineStart--;
      }
      
      // 处理边界条件，当tableStart为0时
      const prevLine = tableStart > 0 ? text.substring(prevLineStart, tableStart - 1) : '';
      const isPrevLineTableRow = tableStart > 0 && (/^\|.*\|$/.test(prevLine) || /^\|[-:]*\|[-:]*\|$/.test(prevLine));
      
      if (!isPrevLineTableRow) {
        break;
      }
      tableStart = prevLineStart;
    }
    
    // 查找表格的结束位置
    let tableEnd = currentLineEnd + 1;
    while (tableEnd < text.length) {
      let nextLineEnd = tableEnd;
      while (nextLineEnd < text.length && text[nextLineEnd] !== '\n') {
        nextLineEnd++;
      }
      
      const nextLine = text.substring(tableEnd, nextLineEnd);
      if (!/^\|.*\|$/.test(nextLine) && !/^\|[-:]*\|[-:]*\|$/.test(nextLine)) {
        break;
      }
      tableEnd = nextLineEnd + 1;
    }
    
    const tableContent = text.substring(tableStart, tableEnd);
    return { tableStart, tableEnd, tableContent };
  };

  /**
   * 添加表格行
   * @returns 更新后的表格内容
   */
  const addTableRow = () => {
    const tableInfo = getCurrentTable();
    if (!tableInfo) return '';
    
    const { tableContent } = tableInfo;
    const lines = tableContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return '';
    
    // 找到分隔线位置
    const separatorIndex = lines.findIndex(line => /^\|[-:]*\|[-:]*\|$/.test(line));
    if (separatorIndex === -1 || lines.length === 0 || !lines[0]) return '';
    
    // 获取列数
    const columns = lines[0].split('|').filter(col => col.trim() !== '').length;
    
    // 创建新行
    const newRow = `| ${'Cell '.repeat(columns).trim().replace(/ /g, ' | ')} |`;
    
    // 插入新行（在分隔线后）
    const newLines = [...lines];
    newLines.splice(separatorIndex + 1, 0, newRow);
    
    return newLines.join('\n');
  };

  /**
   * 添加表格列
   * @returns 更新后的表格内容
   */
  const addTableColumn = () => {
    const tableInfo = getCurrentTable();
    if (!tableInfo) return '';
    
    const { tableContent } = tableInfo;
    const lines = tableContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return '';
    
    // 更新每一行，添加新列
    const newLines = lines.map(line => {
      if (/^\|[-:]*\|[-:]*\|$/.test(line)) {
        // 分隔线行
        return line.replace(/\|$/, '|-|');
      } else {
        // 数据行
        return line.replace(/\|$/, '| Cell |');
      }
    });
    
    return newLines.join('\n');
  };

  /**
   * 删除表格行
   * @returns 更新后的表格内容
   */
  const deleteTableRow = () => {
    const tableInfo = getCurrentTable();
    if (!tableInfo) return '';
    
    const textarea = textareaRef.current;
    if (!textarea) return '';
    
    const { tableContent, tableStart } = tableInfo;
    const lines = tableContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 3) return ''; // 至少保留标题、分隔线和一行数据
    
    const selectionStart = textarea.selectionStart;
    const cursorPos = selectionStart - tableStart;
    if (cursorPos < 0) return '';
    
    const currentLine = tableContent.substring(0, cursorPos).split('\n').length - 1;
    if (currentLine < 0 || currentLine >= lines.length) return '';
    
    // 不能删除分隔线
    const separatorIndex = lines.findIndex(line => /^\|[-:]*\|[-:]*\|$/.test(line));
    if (separatorIndex === -1 || currentLine === separatorIndex) return '';
    
    const newLines = [...lines];
    newLines.splice(currentLine, 1);
    
    return newLines.join('\n');
  };

  /**
   * 删除表格列
   * @returns 更新后的表格内容
   */
  const deleteTableColumn = () => {
    const tableInfo = getCurrentTable();
    if (!tableInfo) return '';
    
    const { tableContent } = tableInfo;
    const lines = tableContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2 || !lines[0]) return '';
    
    // 获取列数
    const columns = lines[0].split('|').filter(col => col.trim() !== '').length;
    if (columns <= 1) return ''; // 至少保留一列
    
    // 更新每一行，删除最后一列
    const newLines = lines.map(line => {
      const parts = line.split('|').filter(col => col.trim() !== '');
      parts.pop();
      return `| ${parts.join(' | ')} |`;
    });
    
    return newLines.join('\n');
  };

  /**
   * 合并表格单元格
   * @returns 更新后的表格内容
   */
  const mergeTableCells = () => {
    const tableInfo = getCurrentTable();
    if (!tableInfo) return '';
    
    // 简单实现：在选中的单元格中添加合并标记
    // 实际Markdown不支持合并单元格，这里使用HTML表格实现
    const { tableContent } = tableInfo;
    
    // 替换为HTML表格（简化实现）
    const lines = tableContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2 || !lines[0]) return tableContent;
    
    // 解析表格数据
    const separatorIndex = lines.findIndex(line => /^\|[-:]*\|[-:]*\|$/.test(line));
    if (separatorIndex === -1) return tableContent;
    
    const headers = lines[0].split('|').filter(col => col.trim() !== '').map(col => col.trim());
    const dataRows = lines.slice(separatorIndex + 1).map(row => 
      row.split('|').filter(col => col.trim() !== '').map(col => col.trim())
    );
    
    // 生成HTML表格
    let htmlTable = '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse;">\n';
    htmlTable += '  <thead>\n    <tr>\n';
    headers.forEach(header => {
      htmlTable += `      <th>${header}</th>\n`;
    });
    htmlTable += '    </tr>\n  </thead>\n  <tbody>\n';
    
    dataRows.forEach(row => {
      htmlTable += '    <tr>\n';
      row.forEach(cell => {
        htmlTable += `      <td>${cell}</td>\n`;
      });
      htmlTable += '    </tr>\n';
    });
    
    htmlTable += '  </tbody>\n</table>';
    
    return htmlTable;
  };

  /**
   * 获取当前光标所在的图片
   * @returns 图片的起始和结束位置，以及图片内容
   */
  const getCurrentImage = () => {
    const textarea = textareaRef.current;
    if (!textarea) return null;

    const cursorPos = textarea.selectionStart;
    const text = content;
    
    // 查找当前行
    let currentLineStart = cursorPos;
    while (currentLineStart > 0 && text[currentLineStart - 1] !== '\n') {
      currentLineStart--;
    }
    
    let currentLineEnd = cursorPos;
    while (currentLineEnd < text.length && text[currentLineEnd] !== '\n') {
      currentLineEnd++;
    }
    
    const currentLine = text.substring(currentLineStart, currentLineEnd);
    
    // 查找图片 markdown 语法
    const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
    let match;
    let imageStart = -1;
    let imageEnd = -1;
    let imageContent = '';
    
    while ((match = imageRegex.exec(currentLine)) !== null) {
      const start = currentLineStart + match.index;
      const end = start + match[0].length;
      
      if (start <= cursorPos && end >= cursorPos) {
        imageStart = start;
        imageEnd = end;
        imageContent = match[0];
        break;
      }
    }
    
    if (imageStart === -1) return null;
    
    return { imageStart, imageEnd, imageContent };
  };

  /**
   * 编辑图片alt文本
   * @returns 更新后的图片内容
   */
  const editImageAlt = () => {
    const imageInfo = getCurrentImage();
    if (!imageInfo) return '';
    
    const { imageContent } = imageInfo;
    const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
    if (!match) return imageContent;
    
    const currentAlt = match[1];
    const newAlt = prompt('Enter new alt text:', currentAlt) || currentAlt;
    
    return `![${newAlt}](${match[2]})`;
  };

  /**
   * 对齐图片
   * @param alignment - 对齐方式
   * @returns 更新后的图片内容
   */
  const alignImage = (alignment: 'left' | 'center' | 'right') => {
    const imageInfo = getCurrentImage();
    if (!imageInfo) return '';
    
    const { imageContent } = imageInfo;
    
    // 使用HTML img标签实现对齐
    const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
    if (!match) return imageContent;
    
    const alt = match[1];
    const src = match[2];
    
    const alignClass = {
      left: 'float-left mr-4',
      center: 'mx-auto block',
      right: 'float-right ml-4'
    };
    
    return `<img src="${src}" alt="${alt}" class="${alignClass[alignment]}" />`;
  };

  /**
   * 调整图片大小
   * @param width - 图片宽度
   * @returns 更新后的图片内容
   */
  const resizeImage = (width: number) => {
    const imageInfo = getCurrentImage();
    if (!imageInfo) return '';
    
    const { imageContent } = imageInfo;
    
    // 使用HTML img标签实现大小调整
    const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
    if (!match) return imageContent;
    
    const alt = match[1];
    const src = match[2];
    
    return `<img src="${src}" alt="${alt}" width="${width}" />`;
  };

  /**
   * 自定义调整图片大小
   * @returns 更新后的图片内容
   */
  const resizeImageCustom = () => {
    const imageInfo = getCurrentImage();
    if (!imageInfo) return '';
    
    const { imageContent } = imageInfo;
    const match = imageContent.match(/!\[(.*?)\]\((.*?)\)/);
    if (!match) return imageContent;
    
    const alt = match[1];
    const src = match[2];
    
    const widthStr = prompt('Enter image width (px):', '400');
    if (!widthStr) return imageContent;
    
    const width = parseInt(widthStr, 10);
    if (isNaN(width) || width <= 0) return imageContent;
    
    return `<img src="${src}" alt="${alt}" width="${width}" />`;
  };
  
  /**
   * 获取当前光标所在的视频
   * @returns 视频的起始和结束位置，以及视频内容
   */
  const getCurrentVideo = () => {
    const textarea = textareaRef.current;
    if (!textarea) return null;
    
    const cursorPos = textarea.selectionStart;
    const text = content;
    
    // 查找当前行
    let currentLineStart = cursorPos;
    while (currentLineStart > 0 && text[currentLineStart - 1] !== '\n') {
      currentLineStart--;
    }
    
    let currentLineEnd = cursorPos;
    while (currentLineEnd < text.length && text[currentLineEnd] !== '\n') {
      currentLineEnd++;
    }
    
    // 查找视频标签或iframe
    const videoRegex = /<video[^>]*>.*?<\/video>|<iframe[^>]*>|<embed[^>]*>/gs;
    let videoStart = -1;
    let videoEnd = -1;
    let videoContent = '';
    
    // 检查当前行及上下行是否包含视频
    const extendedText = text.substring(Math.max(0, cursorPos - 200), Math.min(text.length, cursorPos + 200));
    const extendedMatch = videoRegex.exec(extendedText);
    
    if (extendedMatch) {
      // 在扩展文本中找到视频，计算在完整文本中的位置
      const extendedStart = cursorPos - 200;
      videoStart = extendedStart + extendedMatch.index;
      videoEnd = videoStart + extendedMatch[0].length;
      videoContent = extendedMatch[0];
    }
    
    if (videoStart === -1) return null;
    
    return { videoStart, videoEnd, videoContent };
  };
  
  /**
   * 对齐视频
   * @param alignment - 对齐方式
   * @returns 更新后的视频内容
   */
  const alignVideo = (alignment: 'left' | 'center' | 'right') => {
    const videoInfo = getCurrentVideo();
    if (!videoInfo) return '';
    
    const { videoContent } = videoInfo;
    
    const alignClass = {
      left: 'float-left mr-4',
      center: 'mx-auto block',
      right: 'float-right ml-4'
    };
    
    // 添加对齐类到视频标签
    const alignClassValue = alignClass[alignment as keyof typeof alignClass] || '';
    const updatedVideo = videoContent.replace(/class="([^"]*)"/gi, (_match, existingClass) => {
      return `class="${existingClass} ${alignClassValue}"`;
    }).replace(/<video([^>]*)>/gi, (_match, attributes) => {
      if (!/class="[^"]*"/i.test(attributes)) {
        return `<video class="${alignClassValue}"${attributes}>`;
      }
      return _match;
    }).replace(/<iframe([^>]*)>/gi, (_match, attributes) => {
      if (!/class="[^"]*"/i.test(attributes)) {
        return `<iframe class="${alignClassValue}"${attributes}>`;
      }
      return _match;
    });
    
    return updatedVideo;
  };
  
  /**
   * 调整视频大小
   * @param width - 视频宽度
   * @returns 更新后的视频内容
   */
  const resizeVideo = (width: number) => {
    const videoInfo = getCurrentVideo();
    if (!videoInfo) return '';
    
    const { videoContent } = videoInfo;
    
    // 更新视频宽度
    const updatedVideo = videoContent.replace(/width="([^"]*)"/gi, `width="${width}"`)
      .replace(/style="([^"]*)"/gi, (_match, style) => {
        // 更新或添加width样式
        if (/width:[^;]*;/i.test(style)) {
          return `style="${style.replace(/width:[^;]*;/gi, `width: ${width}px;`)}`;
        } else {
          return `style="${style} width: ${width}px;"`;
        }
      }).replace(/<video([^>]*)>/gi, (_match, attributes) => {
        if (!/width="[^"]*"/i.test(attributes)) {
          return `<video width="${width}"${attributes}>`;
        }
        return _match;
      }).replace(/<iframe([^>]*)>/gi, (_match, attributes) => {
        if (!/width="[^"]*"/i.test(attributes)) {
          return `<iframe width="${width}"${attributes}>`;
        }
        return _match;
      });
    
    return updatedVideo;
  };
  
  /**
   * 自定义调整视频大小
   * @returns 更新后的视频内容
   */
  const resizeVideoCustom = () => {
    const videoInfo = getCurrentVideo();
    if (!videoInfo) return '';
    
    const { videoContent } = videoInfo;
    
    const widthStr = prompt('Enter video width (px):', '600');
    if (!widthStr) return videoContent;
    
    const width = parseInt(widthStr, 10);
    if (isNaN(width) || width <= 0) return videoContent;
    
    return resizeVideo(width);
  };

  /**
   * 插入引用到编辑器
   * @param citation - 引用标识
   */
  const insertCitation = (citation: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);

      let formattedCitation = citation;
      if (selectedText) {
        // 如果有选中文本，将其作为引用的锚点文本
        formattedCitation = `[${selectedText}][${citation}]`;
      } else {
        formattedCitation = `[^${citation}]`;
      }

      const newValue = content.substring(0, start) + formattedCitation + content.substring(end);
      setContent(newValue);

      // 重新聚焦并设置光标位置
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + formattedCitation.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      setContent(content + `[^${citation}]`);
    }
  };

  /**
   * 生成参考文献列表
   */
  const generateBibliography = () => {
    // 简单的参考文献生成逻辑，实际应用中可以根据引用格式规则生成
    const citations = content.match(/\[\^(.*?)\]/g) || [];
    const uniqueCitations = [...new Set(citations.map(c => c.replace(/\[\^|\]/g, '')))];
    
    if (uniqueCitations.length === 0) {
      showNotification('没有检测到引用', 'info');
      return;
    }

    let bibliography = '\n## 参考文献\n\n';
    uniqueCitations.forEach((citation, index) => {
      bibliography += `${index + 1}. [${citation}]() - 引用来源\n`;
    });

    const textarea = textareaRef.current;
    if (textarea) {
      const end = content.length;
      const newValue = content + bibliography;
      setContent(newValue);

      // 重新聚焦并设置光标位置到末尾
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(end, end);
      }, 0);
    } else {
      setContent(content + bibliography);
    }

    showNotification('参考文献已生成', 'success');
  };

  /**
   * 生成文章目录
   * 优化：添加防抖机制，提高性能
   */
  const generateTableOfContents = useCallback(() => {
    // 从内容中提取标题
    const headings = content.split('\n').filter(line => /^#{1,6}\s+/.test(line));
    
    const tocItems: TableOfContentsItem[] = [];
    const headingStack: TableOfContentsItem[] = [];
    
    headings.forEach(line => {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match && match[1] && match[2]) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        const tocItem: TableOfContentsItem = {
          id,
          text,
          level,
          children: []
        };
        
        // 构建嵌套目录结构
        if (level === 1) {
          tocItems.push(tocItem);
          headingStack.length = 0;
          headingStack.push(tocItem);
        } else {
          while (headingStack.length > 0) {
            const lastItem = headingStack[headingStack.length - 1];
            if (lastItem && lastItem.level < level) {
              lastItem.children.push(tocItem);
              headingStack.push(tocItem);
              break;
            } else {
              headingStack.pop();
            }
          }
          
          if (headingStack.length === 0) {
            tocItems.push(tocItem);
            headingStack.push(tocItem);
          }
        }
      }
    });
    
    setTableOfContents(tocItems);
    return tocItems;
  }, [content]);

  /**
   * 插入目录到文章
   */
  const insertTableOfContents = () => {
    const tocItems = generateTableOfContents();
    
    if (tocItems.length === 0) {
      showNotification('没有检测到标题，无法生成目录', 'info');
      return;
    }
    
    // 生成Markdown格式的目录
    const generateTocMarkdown = (items: TableOfContentsItem[], indent: string = ''): string => {
      return items.map(item => {
        const itemMarkdown = `${indent}- [${item.text}](#${item.id})\n`;
        const childrenMarkdown = item.children.length > 0 ? generateTocMarkdown(item.children, indent + '  ') : '';
        return itemMarkdown + childrenMarkdown;
      }).join('');
    };
    
    const tocMarkdown = `## Table of Contents\n\n${generateTocMarkdown(tocItems)}`;
    
    const textarea = textareaRef.current;
    if (textarea) {
      const newValue = tocMarkdown + '\n\n' + content;
      setContent(newValue);
      
      // 重新聚焦并设置光标位置到目录末尾
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(tocMarkdown.length + 2, tocMarkdown.length + 2);
      }, 0);
    } else {
      setContent(tocMarkdown + '\n\n' + content);
    }
    
    showNotification('目录已生成', 'success');
  };

  /**
   * 切换目录展开/折叠状态
   */
  const toggleTocItemExpanded = (id: string) => {
    const newExpandedItems = new Set(expandedTocItems);
    if (newExpandedItems.has(id)) {
      newExpandedItems.delete(id);
    } else {
      newExpandedItems.add(id);
    }
    setExpandedTocItems(newExpandedItems);
  };

  /**
   * 滚动到指定标题位置
   */
  const scrollToHeading = (id: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // 查找标题在内容中的位置
    const headingRegex = new RegExp(`^#{1,6}\s+.*?${id.replace(/-/g, '\\s+')}`, 'mi');
    const match = content.match(headingRegex);
    
    if (match) {
      // 计算行号
      const linesBeforeMatch = content.substring(0, match.index).split('\n').length;
      const lineHeight = 24; // 假设行高为24px
      const scrollPosition = (linesBeforeMatch - 1) * lineHeight;
      
      textarea.scrollTop = scrollPosition;
      setActiveTocItem(id);
    }
  };

  /**
   * 渲染目录项
   */
  const renderTocItem = (item: TableOfContentsItem, level: number = 0) => {
    const isExpanded = expandedTocItems.has(item.id) || level < 2; // 前两级默认展开
    
    return (
      <li key={item.id} className="mb-1">
        <div className="flex items-center gap-1">
          {item.children.length > 0 && (
            <button
              onClick={() => toggleTocItemExpanded(item.id)}
              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center transition-colors"
              style={{ width: '16px', height: '16px' }}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          )}
          {item.children.length === 0 && <div className="w-4"></div>}
          <button
            onClick={() => scrollToHeading(item.id)}
            className={`text-left text-sm transition-colors hover:text-primary-600 dark:hover:text-primary-400 ${activeTocItem === item.id ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
            style={{ paddingLeft: `${level * 8}px` }}
          >
            {item.text}
          </button>
        </div>
        {isExpanded && item.children.length > 0 && (
          <ul className="mt-1 pl-4">
            {item.children.map(child => renderTocItem(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  /**
   * 自动更新目录 - 添加防抖机制，提高性能
   */
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      generateTableOfContents();
    }, 500); // 500ms防抖

    return () => clearTimeout(debounceTimer);
  }, [content, generateTableOfContents]);

  /**
   * 加载自定义快捷键配置
   */
  useEffect(() => {
    try {
      const savedShortcuts = localStorage.getItem('customShortcuts');
      if (savedShortcuts) {
        setCustomShortcuts(JSON.parse(savedShortcuts));
      }
    } catch (error) {
      console.error('Failed to load custom shortcuts:', error);
    }
  }, []);

  /**
   * 处理键盘快捷键
   * @param e - 键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'k' && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      openLatexEditor();
    } else if (e.ctrlKey || e.metaKey) {
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
      case '/':
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
        break;
      case '2':
        e.preventDefault();
        formatText('## ', 'h2');
        break;
      case '3':
        e.preventDefault();
        formatText('### ', 'h3');
        break;
      case 'z':
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        break;
      case 'y':
        e.preventDefault();
        handleRedo();
        break;
      case 'c':
        if (e.shiftKey) {
          e.preventDefault();
          copyFormat();
        }
        break;
      case 'v':
        if (e.shiftKey) {
          e.preventDefault();
          pasteFormat();
        }
        break;
      }
    }
  };

  /**
   * 更新光标位置
   */
  const updateCursorPosition = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const text = textarea.value;
      const line = text.substring(0, cursorPos).split('\n').length;
      const column = cursorPos - (text.substring(0, cursorPos).lastIndexOf('\n') + 1);
      setCursorPosition({ line, column: column + 1 });
    }
  };

  /**
   * 自动调整textarea高度
   */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 重置高度，以便正确计算新高度
      textarea.style.height = 'auto';
      // 设置新高度，最小为100px，最大为可用空间
      textarea.style.height = `${Math.max(100, textarea.scrollHeight)}px`;
    }
  }, [content]);

  /**
   * 实时保存编辑历史记录，当内容或标题变化时立即保存
   */
  useEffect(() => {
    if (!isLoading && (title || content)) {
      // 防抖处理，避免过于频繁保存历史记录
      const timer = setTimeout(() => {
        addToHistory();
      }, 1000);
      return () => clearTimeout(timer);
    }
    // 确保总是返回一个清理函数
    return () => {};
  }, [isLoading, title, content, addToHistory]);

  /**
   * 撤销操作
   */
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const historyItem = editingHistory[newIndex];
      if (historyItem) {
        setTitle(historyItem.title);
        setContent(historyItem.content);
        setHistoryIndex(newIndex);
        showNotification('已撤销操作', 'info');
      }
    }
  };

  /**
   * 重做操作
   */
  const handleRedo = () => {
    if (historyIndex < editingHistory.length - 1) {
      const newIndex = historyIndex + 1;
      const historyItem = editingHistory[newIndex];
      if (historyItem) {
        setTitle(historyItem.title);
        setContent(historyItem.content);
        setHistoryIndex(newIndex);
        showNotification('已重做操作', 'info');
      }
    }
  };

  /**
   * 复制选中文本的格式
   */
  const copyFormat = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    if (!selectedText) {
      showNotification('请先选择要复制格式的文本', 'info');
      return;
    }

    // 简单的格式检测逻辑，实际应用中可以更复杂
    if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
      setCopiedFormat('**');
      showNotification('已复制粗体格式', 'success');
    } else if (selectedText.startsWith('*') && selectedText.endsWith('*')) {
      setCopiedFormat('*');
      showNotification('已复制斜体格式', 'success');
    } else if (selectedText.startsWith('~~') && selectedText.endsWith('~~')) {
      setCopiedFormat('~~');
      showNotification('已复制删除线格式', 'success');
    } else if (selectedText.startsWith('`') && selectedText.endsWith('`')) {
      setCopiedFormat('`');
      showNotification('已复制行内代码格式', 'success');
    } else {
      showNotification('未检测到可复制的格式', 'info');
      return;
    }

    setIsFormatBrushActive(true);
  };

  /**
   * 粘贴复制的格式到选中文本
   */
  const pasteFormat = () => {
    if (!copiedFormat) {
      showNotification('请先复制格式', 'info');
      return;
    }

    formatText(copiedFormat);
  };

  /**
   * 切换格式刷状态
   */
  const toggleFormatBrush = () => {
    if (isFormatBrushActive) {
      setIsFormatBrushActive(false);
      setCopiedFormat(null);
      showNotification('格式刷已关闭', 'info');
    } else {
      copyFormat();
    }
  };

  /**
 * 实时预览效果，当content变化且livePreview为true时更新previewContent
 */
  useEffect(() => {
    if (livePreview) {
      // 添加防抖机制，减少不必要的渲染
      const debounceTimer = setTimeout(() => {
        setPreviewContent(renderMarkdown(content).html);
      }, 300); // 300ms防抖
      
      return () => clearTimeout(debounceTimer);
    }
    return () => {};
  }, [content, livePreview]);

  /**
   * 初始化Mermaid和渲染图表
   */
  useEffect(() => {
    // 配置Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true
      }
    });
    
    // 渲染Mermaid图表
    const renderMermaidDiagrams = async () => {
      const mermaidElements = document.querySelectorAll('.mermaid');
      if (mermaidElements.length > 0) {
        for (const element of mermaidElements) {
          try {
            const chartCode = (element as HTMLElement).textContent || '';
            const svgCode = await mermaid.render(element.id, chartCode);
            (element as HTMLElement).innerHTML = svgCode.svg;
          } catch (error) {
            console.error('Error rendering Mermaid diagram:', error);
            (element as HTMLElement).innerHTML = `<div class="text-red-500">Error rendering Mermaid diagram: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
          }
        }
      }
    };
    
    // 渲染Chart.js图表
    const renderChartJsCharts = () => {
      const chartElements = document.querySelectorAll('.chartjs-placeholder');
      if (chartElements.length > 0) {
        chartElements.forEach((element) => {
          try {
            const configStr = (element as HTMLCanvasElement).getAttribute('data-chart-config');
            if (configStr) {
              const config = JSON.parse(decodeURIComponent(configStr));
              const canvas = element as HTMLCanvasElement;
              new Chart(canvas, config);
            }
          } catch (error) {
            console.error('Error rendering Chart.js chart:', error);
            const canvas = element as HTMLCanvasElement;
            const container = canvas.parentElement;
            if (container) {
              container.innerHTML = `<div class="text-red-500">Error rendering Chart.js chart: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
            }
          }
        });
      }
    };
    
    // 当previewContent更新时，重新渲染图表
    const renderAllCharts = async () => {
      await renderMermaidDiagrams();
      renderChartJsCharts();
    };
    
    renderAllCharts();
    
    // 清理Chart.js实例
    return () => {
      // Chart.js会自动清理，无需手动处理
    };
  }, [previewContent]);

  /**
   * 手动刷新预览内容
   */
  const refreshPreview = () => {
    setPreviewContent(renderMarkdown(content).html);
  };

  /**
   * 处理预览区域滚动事件
   * @param e - 滚动事件对象
   */
  const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingRef.current || !textareaRef.current) return;
    isSyncingRef.current = true;

    const previewElement = e.currentTarget;
    const editorElement = textareaRef.current;

    // 计算预览区域的滚动比例
    const previewScrollPercentage = previewElement.scrollTop / (previewElement.scrollHeight - previewElement.clientHeight);
    
    // 应用到编辑器
    const editorScrollTop = previewScrollPercentage * (editorElement.scrollHeight - editorElement.clientHeight);
    editorElement.scrollTop = editorScrollTop;

    isSyncingRef.current = false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 dark:bg-neutral-900">
      {/* 主内容区域 - 清晰的视觉层次，充分利用宽度 */}
      <div className="w-full px-2 sm:px-4 py-3 flex-grow flex flex-col overflow-hidden">
        <form onSubmit={handleSave} className="space-y-4 flex flex-col flex-grow">
          {/* 面包屑导航 */}
          <nav className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
            <ol className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <li>
                <a href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</a>
              </li>
              <li className="text-gray-400 dark:text-gray-600">
                /
              </li>
              <li>
                <span className="font-medium text-gray-900 dark:text-white">{article ? 'Edit Article' : 'Create New Article'}</span>
              </li>
              {article && article.title && (
                <>
                  <li className="text-gray-400 dark:text-gray-600">
                    /
                  </li>
                  <li className="truncate max-w-[200px]">
                    <span className="text-gray-700 dark:text-gray-300">{article.title}</span>
                  </li>
                </>
              )}
            </ol>
          </nav>
          
          {/* 页面标题和操作区 - 建立清晰的视觉层次 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                {article ? 'Edit Article' : 'Create New Article'}
              </h1>
              {article && (
                <div className="mt-2 flex flex-wrap items-center text-sm text-gray-600 dark:text-gray-400 gap-4">
                  <span className="flex items-center gap-2 bg-gray-50 dark:bg-neutral-700 px-3 py-1 rounded-full">
                    <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  By: {article.author_name || 'Anonymous'}
                  </span>
                  {lastEdited && (
                    <span className="flex items-center gap-2 bg-gray-50 dark:bg-neutral-700 px-3 py-1 rounded-full">
                      <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  Last edited: {lastEdited.toLocaleString()}
                  </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 dark:bg-neutral-800" style={{backgroundColor: 'transparent'}}>
              {article && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-white border border-transparent hover:bg-blue-50 hover:border-blue-200 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-transparent hover:bg-gray-50 hover:border-gray-200 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Help</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Cancel</span>
              </button>
            </div>
          </div>

          {/* 编辑限制状态提示 */}
          {article && (
            <div className="space-y-3">
              {/* 慢速模式提示 */}
              {article.is_slow_mode && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 dark:border-amber-700 rounded-lg shadow-sm">
                  <h3 className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    <Calendar className="w-5 h-5" />
                    文章已进入慢速模式
                  </h3>
                  <p className="text-amber-700 dark:text-amber-400 text-sm leading-relaxed">
                    该文章在过去24小时内已被修改超过3次，将进入24小时的慢速模式。
                    {article.slow_mode_until && (
                      <span className="block mt-2 font-medium">
                        下次可编辑时间：{new Date(article.slow_mode_until).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* 更改公示提示 */}
              {article.is_change_public && !article.is_slow_mode && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-700 rounded-lg shadow-sm">
                  <h3 className="flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-300 mb-1">
                    <Info className="w-5 h-5" />
                    文章已进入更改公示模式
                  </h3>
                  <p className="text-blue-700 dark:text-blue-400 text-sm leading-relaxed">
                    该文章在过去24小时内已被修改超过3次，所有更改将被公示。
                  </p>
                </div>
              )}

              {/* 不稳定内容提示 */}
              {article.is_unstable && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-700 rounded-lg shadow-sm">
                  <h3 className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-300 mb-1">
                    <AlertCircle className="w-5 h-5" />
                    警告：不稳定内容
                  </h3>
                  <p className="text-red-700 dark:text-red-400 text-sm leading-relaxed">
                    该文章在过去一周内已被修改超过10次，内容可能不稳定。
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 text-red-500 dark:text-red-400 flex-shrink-0" />
                <p className="leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">
                  Article Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter article title..."
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition shadow-sm hover:shadow-md"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className="flex items-center gap-2 text-sm px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 active:bg-gray-300 transition-all duration-200 whitespace-nowrap font-medium shadow-sm hover:shadow-md"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>

          {/* 文章设置面板 - 可折叠 */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out transform ${showSettingsPanel ? 'max-h-[100vh] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4'}`}>
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-md p-5 mb-6 max-h-[80vh] overflow-y-auto transition-all duration-300 ease-in-out">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-5 sticky top-0 bg-white dark:bg-neutral-800 z-10 py-2">Article Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 作者信息设置 */}
                <div className="bg-gray-50 dark:bg-neutral-700 p-5 rounded-lg border border-neutral-100 dark:border-neutral-600">
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    Author Information (Optional)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Author Name (leave blank for Anonymous)
                      </label>
                      <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="Your name..."
                        className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={authorEmail}
                        onChange={(e) => setAuthorEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={authorUrl}
                        onChange={(e) => setAuthorUrl(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>
                </div>

                {/* 文章可见性设置 */}
                <div className="bg-gray-50 dark:bg-neutral-700 p-5 rounded-lg border border-neutral-100 dark:border-neutral-600">
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    Article Visibility
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${visibility === 'public' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700'}`}>
                        <input
                          type="radio"
                          name="visibility"
                          value="public"
                          checked={visibility === 'public'}
                          onChange={(e) => setVisibility(e.target.value as 'public')}
                          className="mr-3 w-5 h-5 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-neutral-600 rounded-full"
                        />
                        <div className="flex items-center gap-3">
                          <Globe className="w-6 h-6 text-green-600 dark:text-green-500" />
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">Public</div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-400">Anyone can view and search this article</div>
                          </div>
                        </div>
                      </label>
                      <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${visibility === 'unlisted' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700'}`}>
                        <input
                          type="radio"
                          name="visibility"
                          value="unlisted"
                          checked={visibility === 'unlisted'}
                          onChange={(e) => setVisibility(e.target.value as 'unlisted')}
                          className="mr-3 w-5 h-5 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-neutral-600 rounded-full"
                        />
                        <div className="flex items-center gap-3">
                          <Lock className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">Unlisted</div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-400">Only accessible via direct link</div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 编辑区域 - 充分利用空间，类似VS Code的界面 */}
          <div className="relative border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden shadow-md flex flex-col flex-grow bg-white dark:bg-neutral-900">
            {/* 主工具栏 - 清晰的视觉层次 */}
            <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-2 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Editor</span>
                <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-xs font-medium text-primary-700 dark:text-primary-400 rounded-full">Markdown</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* 视图模式切换按钮 */}
                <button
                  onClick={toggleViewMode}
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300"
                  title={`Switch to ${viewMode === 'split' ? 'editor' : viewMode === 'editor' ? 'preview' : 'split'} view`}
                >
                  <BookOpen className="w-5 h-5" />
                </button>

                {/* 行号显示切换按钮 */}
                <button
                  onClick={() => setShowLineNumbers(!showLineNumbers)}
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${showLineNumbers ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                  title={showLineNumbers ? 'Hide Line Numbers' : 'Show Line Numbers'}
                >
                  <FileText className="w-5 h-5" />
                </button>

                <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>

                {/* 光标位置显示 */}
                <div className="text-sm font-mono bg-neutral-50 dark:bg-neutral-800 px-3 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
                  <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
                </div>

                <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>

                {/* LaTeX编辑器按钮 */}
                <button
                  onClick={openLatexEditor}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-700 dark:text-primary-400 transition-all duration-200 transform hover:scale-105 border border-primary-200 dark:border-primary-800"
                  title="Open LaTeX Editor (Ctrl+Shift+K)"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">LaTeX Editor</span>
                </button>
              </div>
            </div>

            {/* 工具栏折叠/展开控制 */}
            <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-4 py-1 flex items-center justify-between">
              <button
                onClick={() => setShowToolbar(!showToolbar)}
                className="flex items-center gap-1 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${showToolbar ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                {showToolbar ? '收起工具栏' : '展开工具栏'}
              </button>
            </div>

            {/* 文本编辑工具栏 - 功能分组 */}
            <div className={`bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-3 py-2 flex flex-wrap items-center gap-1 shadow-sm overflow-x-auto transition-all duration-300 ease-in-out ${showToolbar ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0 py-0'}`} style={{ overflow: showToolbar ? 'visible' : 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              {/* 撤销/重做组 */}
              <div className="flex items-center gap-1">
                <button onClick={handleUndo} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="撤销 (Ctrl+Z)">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 7 9-4 9 4v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
                    <path d="M3 7v10a2 2 0 0 0 2 2h14" />
                  </svg>
                </button>
                <button onClick={handleRedo} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="重做 (Ctrl+Y 或 Ctrl+Shift+Z)">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 7v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2" />
                    <path d="M21 7 12 11 3 7" />
                    <path d="m15 20-6-4 6-4" />
                  </svg>
                </button>
              </div>
              
              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1 my-1"></div>
              
              {/* 标题组 */}
              <div className="flex items-center gap-1">
                <button onClick={() => formatText('# ', 'h1')} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Heading 1 (Ctrl+1)">
                  <Heading1 className="w-5 h-5" />
                </button>
                <button onClick={() => formatText('## ', 'h2')} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Heading 2 (Ctrl+2)">
                  <Heading2 className="w-5 h-5" />
                </button>
                <button onClick={() => formatText('### ', 'h3')} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Heading 3 (Ctrl+3)">
                  <Heading3 className="w-5 h-5" />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-300 mx-1"></div>

              {/* 文本样式组 */}
              <div className="flex items-center gap-1">
                <button onClick={() => formatText('**', 'bold')} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Bold (Ctrl+B)">
                  <Bold className="w-5 h-5" />
                </button>
                <button onClick={() => formatText('*', 'italic')} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Italic (Ctrl+I)">
                  <Italic className="w-5 h-5" />
                </button>
                <button onClick={() => formatText('~~')} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Strikethrough">
                  <Strikethrough className="w-5 h-5" />
                </button>
                <button 
                  onClick={toggleFormatBrush} 
                  className={`p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 ${isFormatBrushActive ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-300 dark:border-primary-700' : 'text-neutral-700 dark:text-neutral-300'}`} 
                  title={isFormatBrushActive ? '格式刷已激活，点击关闭' : '格式刷 (Ctrl+Shift+C/Ctrl+Shift+V)'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
                  </svg>
                </button>
              </div>

              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>

              {/* 列表和引用组 */}
              <div className="flex items-center gap-1">
                <button onClick={() => formatText('- ')} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Unordered List">
                  <List className="w-5 h-5" />
                </button>
                <button onClick={() => formatText('1. ')} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Ordered List">
                  <ListOrdered className="w-5 h-5" />
                </button>
                <button onClick={() => formatText('> ')} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Blockquote">
                  <Quote className="w-5 h-5" />
                </button>
              </div>

              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>

              {/* 链接和媒体组 */}
              <div className="flex items-center gap-1">
                <button onClick={() => formatText('[', 'link')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Link (Ctrl+K)">
                  <Link2 className="w-5 h-5 text-gray-700" />
                </button>
                
                {/* 图片功能组 */}
                <div className="flex items-center gap-1">
                  {/* 主图片按钮 */}
                  <button onClick={() => formatText('![Alt text](image.jpg)')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Insert Image">
                    <Image className="w-5 h-5 text-gray-700" />
                  </button>
                  {/* 编辑Alt文本 */}
                  <button onClick={() => formatText('edit-alt', 'image')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Edit Image Alt Text">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  {/* 图片对齐 */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => formatText('align-left', 'image')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Align Image Left">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="15" y2="12" />
                        <line x1="3" y1="18" x2="18" y2="18" />
                      </svg>
                    </button>
                    <button onClick={() => formatText('align-center', 'image')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Align Image Center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="6" y1="6" x2="18" y2="6" />
                        <line x1="6" y1="12" x2="18" y2="12" />
                        <line x1="6" y1="18" x2="18" y2="18" />
                      </svg>
                    </button>
                    <button onClick={() => formatText('align-right', 'image')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Align Image Right">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="9" y1="12" x2="21" y2="12" />
                        <line x1="6" y1="18" x2="21" y2="18" />
                      </svg>
                    </button>
                  </div>
                  {/* 图片大小调整 */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => formatText('resize-small', 'image')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Small Image (200px)">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" ry="1" />
                      </svg>
                    </button>
                    <button onClick={() => formatText('resize-medium', 'image')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Medium Image (400px)">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="10" height="10" rx="1" ry="1" />
                      </svg>
                    </button>
                    <button onClick={() => formatText('resize-large', 'image')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Large Image (600px)">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="15" height="15" rx="1" ry="1" />
                      </svg>
                    </button>
                    <button onClick={() => formatText('resize-custom', 'image')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Custom Image Size">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <button onClick={() => formatText('![Video](video-url.mp4)')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Video">
                  <Video className="w-5 h-5 text-gray-700" />
                </button>
                <button onClick={() => formatText('<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Embed YouTube Video">
                  <Youtube className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>

              {/* 代码组 */}
              <div className="flex items-center gap-1">
                <div className="relative">
                  <button 
                    onClick={() => setShowCodeLanguageDropdown(!showCodeLanguageDropdown)} 
                    className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" 
                    title="Code Block"
                  >
                    <Code className="w-5 h-5" />
                  </button>
                  {/* 语法选择下拉菜单 */}
                  {showCodeLanguageDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 min-w-[180px] py-2">
                      <div className="px-3 py-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">选择编程语言:</div>
                      {[
                        'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'html', 'css', 'json',
                        'xml', 'yaml', 'sql', 'bash', 'markdown', 'plaintext'
                      ].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            formatText(`\`\`\`${lang}\ncode here\n\`\`\``);
                            setShowCodeLanguageDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors rounded-md"
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => formatText('`')} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Inline Code">
                  <FileText className="w-5 h-5" />
                </button>
              </div>

              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>

              {/* 思维导图功能组 */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => formatText('```mermaid\ngraph TD\n  A[中心主题]\n  A --> B[分支1]\n  A --> C[分支2]\n  A --> D[分支3]\n  B --> E[子分支1.1]\n  B --> F[子分支1.2]\n  C --> G[子分支2.1]\n  C --> H[子分支2.2]\n  D --> I[子分支3.1]\n  D --> J[子分支3.2]\n```')} 
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300"
                  title="Insert Mind Map"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                    <line x1="22" y1="20" x2="18" y2="20" />
                    <line x1="18" y1="20" x2="14" y2="20" />
                    <line x1="10" y1="20" x2="6" y2="20" />
                    <line x1="6" y1="20" x2="2" y2="20" />
                  </svg>
                </button>
              </div>

              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>

              {/* 表格功能组 */}
              <div className="flex items-center gap-1">
                {/* 主表格按钮 */}
                <button onClick={() => formatText('| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1 | Cell 2 |')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Insert Table">
                  <Table className="w-5 h-5 text-gray-700" />
                </button>
                {/* 添加行 */}
                <button onClick={() => formatText('add-row', 'table')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Add Table Row">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                {/* 添加列 */}
                <button onClick={() => formatText('add-column', 'table')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Add Table Column">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <line x1="12" y1="5" x2="12" y2="19" />
                  </svg>
                </button>
                {/* 删除行 */}
                <button onClick={() => formatText('delete-row', 'table')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Delete Table Row">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                {/* 删除列 */}
                <button onClick={() => formatText('delete-column', 'table')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Delete Table Column">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
                {/* 合并单元格 */}
                <button onClick={() => formatText('merge-cells', 'table')} className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 transform hover:scale-105" title="Merge Table Cells">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                  </svg>
                </button>
              </div>
              
              <div className="h-6 w-px bg-gray-300 mx-1"></div>
              
              {/* 高级功能组 */}
              <div className="flex items-center gap-1">
                <button onClick={openLatexEditor} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Open LaTeX Editor (Ctrl+Shift+K)">
                  <FileText className="w-5 h-5 text-blue-700" />
                </button>
                {/* 计算单元格 */}
                <button onClick={insertSymPyCell} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Insert SymPy Calculation Cell">
                  <Calculator className="w-5 h-5" />
                </button>
                {/* 模板选择 */}
                <button onClick={() => setShowTemplateManager(true)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Select Template">
                  <BookMarked className="w-5 h-5 text-orange-700" />
                </button>
                {/* 目录生成 */}
                <button onClick={() => {
                  const tocMarkdown = `## Table of Contents\n\n${content.split('\n').filter(line => /^#{1,6}\s+/.test(line)).map(line => {
                    const match = line.match(/^#+/);
                    if (!match) return '';
                    const level = match[0].length;
                    const text = line.replace(/^#{1,6}\s+/, '');
                    const indent = '  '.repeat(level - 1);
                    return `${indent}- [${text}](#${text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')})`;
                  }).join('\n')}`;
                  setContent(prev => tocMarkdown + '\n\n' + prev);
                  showNotification('目录已生成', 'success');
                }} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Generate Table of Contents">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="21" y1="10" x2="7" y2="10" />
                    <line x1="21" y1="6" x2="3" y2="6" />
                    <line x1="21" y1="14" x2="3" y2="14" />
                    <line x1="21" y1="18" x2="7" y2="18" />
                  </svg>
                </button>
                {/* 引用管理 */}
                <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1"></div>
                <button onClick={() => insertCitation('reference')} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Insert Citation">
                  <FileText className="w-5 h-5 text-purple-700" />
                </button>
                <button onClick={generateBibliography} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 transform hover:scale-105 text-neutral-700 dark:text-neutral-300" title="Generate Bibliography">
                  <BookOpen className="w-5 h-5 text-green-700" />
                </button>
              </div>
            </div>

            {/* 编辑区域主体 - 充分利用可用高度 */}
            <div className="flex flex-col sm:flex-row flex-grow overflow-hidden">
              {/* 目录显示区域 */}
              {showToc && (viewMode === 'split' || viewMode === 'editor') && (
                <div className="w-64 bg-gray-50 dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 overflow-y-auto transition-all duration-500 ease-in-out transform">
                  <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Table of Contents</h3>
                    <button
                      onClick={() => insertTableOfContents()}
                      className="w-full px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 rounded-md hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors mb-4"
                    >
                      Insert TOC into Article
                    </button>
                  </div>
                  <div className="p-4">
                    {tableOfContents.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No headings found. Add some headings to generate a table of contents.</p>
                    ) : (
                      <ul>
                        {tableOfContents.map(item => renderTocItem(item))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {/* 左侧编辑器 */}
              {(viewMode === 'split' || viewMode === 'editor') && (
                <div className={`flex-1 overflow-hidden transition-all duration-500 ease-in-out transform ${viewMode === 'split' ? 'border-r border-gray-200' : ''}`}>
                  <div className="flex items-center px-4 py-2 bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 shadow-sm overflow-x-auto">
                    <div className="flex items-center gap-3 mr-4">
                      <button
                        onClick={() => setShowToc(!showToc)}
                        className={`p-1.5 rounded-md transition-colors ${showToc ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-600 dark:text-gray-400'}`}
                        title={showToc ? 'Hide Table of Contents' : 'Show Table of Contents'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <line x1="21" y1="10" x2="7" y2="10"></line>
                          <line x1="21" y1="6" x2="3" y2="6"></line>
                          <line x1="21" y1="14" x2="3" y2="14"></line>
                          <line x1="21" y1="18" x2="7" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      <p className="flex flex-nowrap gap-x-6">
                        <span className="flex items-center gap-1">
                          <span className="text-blue-600 dark:text-blue-400">•</span> [[Title]] for internal links
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-blue-600 dark:text-blue-400">•</span> $...$ or \(...\) for inline LaTeX
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-blue-600 dark:text-blue-400">•</span> $$...$$ or \[...\] for display math
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="h-[calc(100%-48px)] overflow-hidden flex">
                    {/* 行号显示区域 - 优化性能，使用CSS Grid和scroll-sync */}
                    <div className={`bg-gray-50 dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 px-3 text-right select-none overflow-hidden transition-all duration-300 ease-in-out transform ${showLineNumbers ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 px-0'}`} style={{ width: showLineNumbers ? '60px' : '0px' }}>
                      {/* 行号显示 - 优化实现，使用更高效的渲染方式 */}
                      {showLineNumbers && (
                        <div 
                          className="text-right font-mono text-xs text-gray-500 dark:text-gray-400"
                          style={{
                            height: '100%',
                            lineHeight: '24px',
                            paddingRight: '8px',
                            overflow: 'hidden',
                            userSelect: 'none',
                            pointerEvents: 'none'
                          }}
                          ref={lineNumbersRef}
                        >
                          {/* 动态生成行号，只渲染可见区域 */}
                          {renderLineNumbers()}
                        </div>
                      )}
                    </div>
                    {/* 编辑器区域 */}
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => {
                      setContent(e.target.value);
                      updateCursorPosition();
                      // 自动更新目录将通过防抖useEffect处理
                    }}
                    onKeyDown={handleKeyDown}
                    onKeyUp={updateCursorPosition}
                    onClick={updateCursorPosition}
                    onMouseUp={updateCursorPosition}
                    onPaste={updateCursorPosition}
                    onCut={updateCursorPosition}
                      onScroll={handleEditorScrollMain}
                      placeholder="Enter your content in markdown format..."
                      className={`flex-1 h-full p-4 border-0 focus:ring-0 focus:outline-none font-mono text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 resize-none overflow-y-auto scroll-smooth ${showLineNumbers ? 'pl-0' : ''}`}
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect="off"
                    />
                  </div>
                </div>
              )}

              {/* 右侧预览 */}
              {(viewMode === 'split' || viewMode === 'preview') && (
                <div className="flex-1 overflow-hidden transition-all duration-500 ease-in-out transform">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 shadow-sm">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Preview</span>
                    <div className="flex items-center gap-2">
                      {/* 实时预览开关 */}
                      <button
                        onClick={() => setLivePreview(!livePreview)}
                        className={`p-1.5 rounded-md transition-colors ${livePreview ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'}`}
                        title={livePreview ? 'Disable Live Preview' : 'Enable Live Preview'}
                      >
                        <span className="text-xs font-medium">{livePreview ? 'Live' : 'Manual'}</span>
                      </button>
                      {/* 手动刷新按钮 */}
                      <button
                        onClick={refreshPreview}
                        disabled={livePreview}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                        title="Refresh Preview"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div
                          ref={previewRef}
                          className="h-[calc(100%-48px)] overflow-y-auto p-6 bg-gray-50 dark:bg-neutral-900"
                          onScroll={handlePreviewScroll}
                        >
                          <div
                            className="prose prose-lg max-w-none wiki-link-styling prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-800 dark:prose-p:text-gray-300 prose-a:text-blue-700 dark:prose-a:text-blue-400 hover:prose-a:text-blue-900 dark:hover:prose-a:text-blue-300"
                            dangerouslySetInnerHTML={{ __html: previewContent }}
                          />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSaving || (article?.is_slow_mode)}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : article?.is_slow_mode ? 'Slow Mode - Save Disabled' : 'Save Article'}
            </button>
            <button
              type="button"
              onClick={handleConfirmLeave}
              className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <X className="w-4 h-4" />
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
        
        {/* 模板管理器组件 */}
        {showTemplateManager && (
          <TemplateManager
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setShowTemplateManager(false)}
          />
        )}

        {/* 通知组件 */}
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={closeNotification}
          />
        )}

        {/* 帮助模态框 */}
        {showHelp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">编辑器帮助</h2>
                <button onClick={() => setShowHelp(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">Markdown语法指南</h3>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li># 一级标题</li>
                  <li>## 二级标题</li>
                  <li>### 三级标题</li>
                  <li>**粗体文本**</li>
                  <li>*斜体文本*</li>
                  <li>~~删除线~~</li>
                  <li>- 无序列表</li>
                  <li>1. 有序列表</li>
                  <li>{'>'} 引用文本</li>
                  <li>`行内代码`</li>
                  <li>```代码块```</li>
                  <li>[链接文本](url)</li>
                  <li>![图片描述](image-url)</li>
                </ul>

                <h3 className="text-lg font-semibold mb-2">数学公式</h3>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>行内公式：$E = mc^2$</li>
                  <li>块级公式：$$E = mc^2$$</li>
                  <li>支持LaTeX语法，如{`\\text{Spec}`}、{`\\mathcal{O}`}等</li>
                  <li>点击工具栏中的LaTeX按钮打开公式编辑器</li>
                </ul>

                <h3 className="text-lg font-semibold mb-2">编辑器功能</h3>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>自动保存：每3秒自动保存草稿到本地存储</li>
                  <li>实时预览：支持编辑和预览模式切换</li>
                  <li>键盘快捷键：Ctrl+B (粗体), Ctrl+I (斜体), Ctrl+K (链接), Ctrl+Shift+K (LaTeX编辑器)</li>
                  <li>插入SymPy计算单元格：用于数学计算</li>
                </ul>

                <h3 className="text-lg font-semibold mb-2">草稿管理</h3>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>打开编辑器时会检测未完成的草稿</li>
                  <li>选择恢复会加载草稿内容</li>
                  <li>选择不恢复会清除草稿</li>
                  <li>文章成功保存后会自动清除草稿</li>
                </ul>

                <h3 className="text-lg font-semibold mb-2">提交文章</h3>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>只有点击"Save Article"按钮才会提交文章</li>
                  <li>提交前会验证标题和内容不能为空</li>
                  <li>支持公开和未列出两种可见性</li>
                  <li>可以选择匿名提交</li>
                </ul>

                <div className="text-right mt-6">
                  <button
                    onClick={() => setShowHelp(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 快捷键提示面板 */}
        {showShortcuts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
              <div className="bg-gray-100 p-4 rounded-t-lg border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">快捷键列表</h2>
                  <button
                    onClick={() => setShowShortcuts(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  按下相应快捷键即可执行操作。可以在设置中自定义快捷键。
                </p>
              </div>
              
              <div className="p-4">
                {/* 按分类分组显示快捷键 */}
                {Array.from(new Set(SHORTCUTS.map(shortcut => shortcut.category))).map(category => (
                  <div key={category} className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {SHORTCUTS.filter(shortcut => shortcut.category === category).map(shortcut => (
                        <div key={shortcut.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{shortcut.name}</div>
                              <div className="text-sm text-gray-600 mt-1">{shortcut.description}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <kbd className="px-3 py-1 bg-gray-200 border border-gray-300 rounded-md text-sm font-medium text-gray-800 shadow-sm">
                                {customShortcuts[shortcut.id] || shortcut.defaultKey}
                              </kbd>
                              <button
                                onClick={() => setShowShortcutSettings(true)}
                                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                                title="自定义快捷键"
                              >
                                自定义
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 自定义快捷键设置面板 */}
        {showShortcutSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
              <div className="bg-gray-100 p-4 rounded-t-lg border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">自定义快捷键</h2>
                  <button
                    onClick={() => setShowShortcutSettings(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  {SHORTCUTS.map(shortcut => (
                    <div key={shortcut.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{shortcut.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{shortcut.description}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <kbd className="px-3 py-1 bg-gray-200 border border-gray-300 rounded-md text-sm font-medium text-gray-800 shadow-sm">
                              {customShortcuts[shortcut.id] || shortcut.defaultKey}
                            </kbd>
                          </div>
                          <button
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                            onClick={() => {
                              // 这里可以实现快捷键录制功能
                              showNotification('快捷键录制功能将在后续版本中实现', 'info');
                            }}
                          >
                            录制
                          </button>
                          <button
                            className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                            onClick={() => {
                              setCustomShortcuts(prev => {
                                const newShortcuts = { ...prev };
                                delete newShortcuts[shortcut.id];
                                return newShortcuts;
                              });
                            }}
                          >
                            恢复默认
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowShortcutSettings(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      // 保存自定义快捷键到localStorage
                      localStorage.setItem('customShortcuts', JSON.stringify(customShortcuts));
                      setShowShortcutSettings(false);
                      showNotification('快捷键设置已保存', 'success');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    保存设置
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}