import React, { useState, useRef, useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useNavigate } from 'react-router-dom';
import { articleService } from '../../services/articleService';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import FileHandler from '@tiptap/extension-file-handler';
import { TableKit } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import InvisibleCharacters from '@tiptap/extension-invisible-characters';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import 'katex/dist/katex.min.css';
import NodeRange from '@tiptap/extension-node-range';
import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents';
import { DragHandle as DragHandleReact } from '@tiptap/extension-drag-handle-react';
import { LatexEditor } from './LatexEditor';
import {
  Bold, Italic, Code, List, Heading1,
  Undo, Redo, Save, Globe, User, Lock, Link as LinkIcon,
  Strikethrough, Underline as UnderlineIcon, Highlighter,
  ArrowDownToLine, ArrowUpToLine, Quote, Minus, CodeSquare,
  AlignLeft,
  Plus, Calculator, GripVertical
} from 'lucide-react';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import html from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import typescript from 'highlight.js/lib/languages/typescript';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import java from 'highlight.js/lib/languages/java';
import csharp from 'highlight.js/lib/languages/csharp';
import php from 'highlight.js/lib/languages/php';

// lowlight实例创建和语言注册
const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('python', python);
lowlight.register('html', html);
lowlight.register('css', css);
lowlight.register('json', json);
lowlight.register('typescript', typescript);
lowlight.register('bash', bash);
lowlight.register('sql', sql);
lowlight.register('markdown', markdown);
lowlight.register('java', java);
lowlight.register('csharp', csharp);
lowlight.register('php', php);

// 状态类型定义
interface EditorState {
  title: string;
  visibility: 'public' | 'unlisted';
  authorName: string;
  isSaving: boolean;
}

// 常量定义
const VisibilityOptions = [
  { 'value': 'public', 'label': '公开', 'icon': Globe },
  { 'value': 'unlisted', 'label': '仅分享', 'icon': Lock }
] as const;

const FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Trebuchet MS', 'Comic Sans MS'];
const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
const LINE_HEIGHTS = ['1.0', '1.2', '1.4', '1.6', '1.8', '2.0', '2.4'];

// 自定义代码块扩展
const CustomCodeBlock = CodeBlockLowlight.extend({
  'renderHTML': () => {
    return [
      'pre',
      { 'class': 'rounded-lg overflow-hidden relative' },
      ['code', { 'class': 'hljs' }, 0]
    ];
  }
});

// 工具栏按钮组件
interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  showMenu?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, label, isActive, onClick, showMenu }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all duration-200 w-16 ${
      isActive ? 'bg-primary-50 text-primary-700' : ''
    }`}
  >
    <div className="flex items-center gap-1">
      {icon}
      {showMenu !== undefined && (
        <svg
          className={`w-4 h-4 text-neutral-600 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </div>
    <span className="text-xs text-neutral-600 mt-1">{label}</span>
  </button>
);

// 菜单下拉组件
interface DropdownMenuProps {
  isOpen: boolean;
  children: React.ReactNode;
  width?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ isOpen, children, width = 'w-32' }) => (
  <div
    className={`absolute left-0 mt-1 ${width} bg-white rounded-md shadow-lg py-1 z-10 transition-all duration-200 border border-neutral-200 ${
      isOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'
    }`}
    style={{ 'top': '100%' }}
  >
    {children}
  </div>
);

// 颜色选择器组件
const ColorPicker: React.FC<{
  color: string;
  onChange: (color: string) => void;
  label: string;
}> = ({ color, onChange, label }) => (
  <div className="mb-3">
    <h3 className="text-sm font-semibold text-gray-700 mb-2">{label}</h3>
    <div className="flex items-center gap-3 h-10 rounded-lg border border-gray-300 overflow-hidden">
      <div className="relative w-8 h-8 ml-1 flex-shrink-0">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-300 bg-transparent opacity-0 absolute inset-0"
        />
        <div className="w-8 h-8 rounded border border-gray-300" style={{ 'backgroundColor': color }} />
      </div>
      <input
        type="text"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-sm px-2 py-0 bg-gray-50 text-gray-700 border-0 focus:outline-none h-full"
      />
    </div>
  </div>
);

// 目录项组件
interface TocItemProps {
  item: {
    id: string;
    textContent: string;
    level: number;
    itemIndex: number;
    isActive: boolean;
    isScrolledOver: boolean;
  };
  onClick: () => void;
}

const TocItem: React.FC<TocItemProps> = ({ item, onClick }) => {
  const levelStyles: Record<number, { fontSize: string; fontWeight: string; color: string; numberColor: string }> = {
    '1': { 'fontSize': 'text-base', 'fontWeight': 'font-semibold', 'color': 'text-primary-600', 'numberColor': 'font-semibold text-primary-600' },
    '2': { 'fontSize': 'text-sm', 'fontWeight': 'font-medium', 'color': 'text-secondary-500', 'numberColor': 'text-sm font-medium text-secondary-500' },
    '3': { 'fontSize': 'text-xs', 'fontWeight': 'font-medium', 'color': 'text-neutral-500', 'numberColor': 'text-xs font-medium text-neutral-500' }
  };

  const style = (levelStyles[item.level] ?? levelStyles[3])!;
  const isActiveStatus = item.isActive && !item.isScrolledOver;

  const getTocItemClass = (isActiveFlag: boolean, isScrolledOverFlag: boolean) => {
    if (isActiveFlag) {
      return 'bg-primary-50 border-l-4 border-primary-500 text-primary-700 shadow-sm';
    }
    if (isScrolledOverFlag) {
      return 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600';
    }
    return 'hover:bg-neutral-50 text-neutral-700 hover:shadow-sm';
  };

  return (
    <div
      className={`cursor-pointer px-3 py-2.5 rounded-lg transition-all duration-250 ease-in-out hover:translate-x-1 ${getTocItemClass(isActiveStatus, item.isScrolledOver)}`}
      style={{ 'paddingLeft': `${(item.level - 1) * 12}px` }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-h-[26px]">
        <span className={`${style.numberColor} flex-shrink-0 mr-2`}>
          {item.itemIndex}{item.level === 1 ? '.' : ''}
        </span>
        <span className={`truncate transition-all duration-300 max-w-[calc(100%-1rem)] ${style.fontSize} ${style.fontWeight} text-left flex-1`}>
          {item.textContent}
        </span>
        {isActiveStatus && (
          <svg className="w-4 h-4 text-primary-500 ml-auto flex-shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )}
      </div>
    </div>
  );
};

export const ArticleEditor: React.FC = () => {
  const navigate = useNavigate();

  // 编辑器状态
  const [state, setState] = useState<EditorState>({
    'title': '',
    'visibility': 'public',
    'authorName': '',
    'isSaving': false
  });

  // 编辑模式状态
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [tempAuthorName, setTempAuthorName] = useState('');

  // LaTeX编辑器状态
  const [showLatexEditor, setShowLatexEditor] = useState(false);
  const [mathType, setMathType] = useState<'inline' | 'block'>('inline');

  // 目录状态
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const [tableOfContentsItems, setTableOfContentsItems] = useState<Array<{
    id: string;
    textContent: string;
    level: number;
    itemIndex: number;
    isActive: boolean;
    isScrolledOver: boolean;
  }>>([]);

  // 菜单状态管理 - 使用单一状态
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [fontColor, setFontColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  // 链接输入状态
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // 字数统计
  const [characterCount, setCharacterCount] = useState(0);

  // 目录容器引用
  const tocRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
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

  // 目录滚动位置更新
  React.useEffect(() => {
    if (!showTableOfContents || !tocRef.current) {
      return;
    }

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (tocRef.current) {
          tocRef.current.style.top = `${window.scrollY + 16}px`;
        }
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { 'passive': true });
    // eslint-disable-next-line consistent-return
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [showTableOfContents]);

  // 初始化Tiptap编辑器
  const editor = useEditor({
    'extensions': [
      StarterKit.configure({
        'codeBlock': false,
        'link': { 'openOnClick': false }
      }),
      TextStyleKit.configure({
        'backgroundColor': { 'types': ['textStyle'] },
        'color': { 'types': ['textStyle'] },
        'fontFamily': { 'types': ['textStyle'] },
        'fontSize': { 'types': ['textStyle', 'heading'] },
        'lineHeight': { 'types': ['textStyle', 'heading'] }
      }),
      Subscript,
      Superscript,
      CustomCodeBlock.configure({
        lowlight,
        'enableTabIndentation': true,
        'tabSize': 2
      }),
      Image,
      FileHandler.configure({
        'onDrop': (_, files) => {
          files.forEach((file) => {
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const uploadedImageUrl = e.target?.result as string;
                editor?.chain().focus()
                  .setImage({ 'src': uploadedImageUrl })
                  .run();
              };
              reader.readAsDataURL(file);
            }
          });
        },
        'onPaste': (_, files) => {
          files.forEach((file) => {
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const uploadedImageUrl = e.target?.result as string;
                editor?.chain().focus()
                  .setImage({ 'src': uploadedImageUrl })
                  .run();
              };
              reader.readAsDataURL(file);
            }
          });
        },
        'allowedMimeTypes': ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      }),
      TableKit.configure({
        'table': {
          'resizable': true
        }
      }),
      TextAlign.configure({ 'types': ['heading', 'paragraph'] }),
      Typography,
      InvisibleCharacters.configure({ 'visible': true, 'injectCSS': true }),
      InlineMath,
      BlockMath,
      NodeRange,
      TableOfContents.configure({
        'getIndex': getHierarchicalIndexes,
        'onUpdate': setTableOfContentsItems
      }),
      CharacterCount
    ],
    'onUpdate': ({ 'editor': editorInstance }) => {
      setCharacterCount(editorInstance.storage.characterCount.characters());
    },
    'editorProps': {
      'attributes': {
        'class': 'prose prose-lg max-w-none mx-auto p-6 md:p-8 focus:outline-none'
      }
    }
  });

  // 处理函数
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, 'title': e.target.value }));
  };

  const handleVisibilityChange = (visibility: 'public' | 'unlisted') => {
    setState(prev => ({ ...prev, visibility }));
  };

  const toggleAuthorEdit = () => {
    if (isEditingAuthor) {
      setState(prev => ({ ...prev, 'authorName': tempAuthorName }));
    } else {
      setTempAuthorName(state.authorName);
    }
    setIsEditingAuthor(prev => !prev);
  };

  const handleSave = async () => {
    if (!editor) {
      return;
    }

    setState(prev => ({ ...prev, 'isSaving': true }));

    try {
      const savedArticle = await articleService.createArticle({
        'title': state.title,
        'content': editor.getHTML(),
        'visibility': state.visibility,
        'authorName': state.authorName
      });

      if (savedArticle) {
        navigate(`/articles/${savedArticle.slug}`);
      }
    } catch (error) {
      console.error('Failed to save article:', error);
    } finally {
      setState(prev => ({ ...prev, 'isSaving': false }));
    }
  };

  const toggleInlineMath = () => {
    setMathType('inline');
    setShowLatexEditor(true);
    setActiveMenu(null);
  };

  const toggleBlockMath = () => {
    setMathType('block');
    setShowLatexEditor(true);
    setActiveMenu(null);
  };

  const handleInsertMath = (formula: string) => {
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
  };

  const handleLink = () => {
    const previousUrl = editor?.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkDialog(true);
  };

  const handleLinkSubmit = () => {
    if (linkUrl) {
      editor?.chain().focus()
        .setLink({ 'href': linkUrl })
        .run();
    } else {
      editor?.chain().focus()
        .unsetLink()
        .run();
    }
    setShowLinkDialog(false);
  };

  const toggleHighlight = () => {
    if (!editor) {
      return;
    }
    const hasHighlight = editor.getAttributes('textStyle').backgroundColor === '#ffff00';
    if (hasHighlight) {
      editor.chain().focus()
        .unsetBackgroundColor()
        .run();
    } else {
      editor.chain().focus()
        .setBackgroundColor('#ffff00')
        .run();
    }
  };

  const handleTocClick = (itemId: string) => {
    const element = editor?.view.dom.querySelector(`[data-toc-id="${itemId}"]`);
    if (element) {
      window.scrollTo({
        'top': element.getBoundingClientRect().top + window.scrollY - 100,
        'behavior': 'smooth'
      });
    }
  };


  const getHeadingLabel = (level: number) => {
    switch (level) {
      case 1:
        return '一级标题';
      case 2:
        return '二级标题';
      case 3:
        return '三级标题';
      default:
        return '标题';
    }
  };

  return (
    <div className="min-h-screen">
      {/* 链接输入弹窗 */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowLinkDialog(false)} />
          <div className="bg-white rounded-lg shadow-md border border-neutral-200 p-4 relative z-10 min-w-[400px] max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-neutral-800">添加链接</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">链接地址</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowLinkDialog(false)}
                  className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleLinkSubmit}
                  className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LaTeX编辑器 */}
      <LatexEditor
        isOpen={showLatexEditor}
        onClose={() => setShowLatexEditor(false)}
        onInsert={handleInsertMath}
      />

      {/* 顶部栏 */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 p-2 rounded hover:bg-neutral-100 transition-colors">
              <span className="font-bold text-xl tracking-tight text-neutral-800">MyWiki</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleSave}
                disabled={state.isSaving}
                className="inline-flex items-center px-4 py-2 border border-neutral-200 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isSaving ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2 text-neutral-600" />
                    保存
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="relative">
        {/* 左侧目录栏 */}
        {showTableOfContents && editor && (
          <div ref={tocRef} className="absolute left-0 top-4 w-48 bg-white border border-neutral-200 rounded-lg shadow-sm overflow-y-auto max-h-[calc(100vh-120px)] z-20 ml-4 transition-all duration-300 ease-in-out transform hover:shadow-md flex flex-col">
            <div className="p-3">
              <h3 className="text-lg font-semibold text-neutral-800 flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <line x1="4" y1="9" x2="20" y2="9" />
                  <line x1="4" y1="15" x2="20" y2="15" />
                  <line x1="10" y1="3" x2="10" y2="9" />
                  <line x1="10" y1="15" x2="10" y2="21" />
                </svg>
                目录
              </h3>

              {tableOfContentsItems.length > 0 ? (
                <nav className="space-y-1">
                  {tableOfContentsItems.map((item) => (
                    <TocItem
                      key={item.id}
                      item={item}
                      onClick={() => handleTocClick(item.id)}
                    />
                  ))}
                </nav>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <line x1="4" y1="7" x2="20" y2="7" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="4" y1="17" x2="20" y2="17" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium">暂无标题</p>
                  <p className="text-xs mt-2 opacity-75">添加标题后将自动生成目录</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 编辑区域 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 文章标题区域 */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="请输入文章标题..."
              value={state.title}
              onChange={handleTitleChange}
              className="w-full text-4xl font-bold text-neutral-800 bg-transparent border-none outline-none placeholder-gray-400 focus:ring-0"
              autoFocus
            />

            <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-neutral-600">
              {/* 可见性设置 */}
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">可见性：</span>
                <div className="flex items-center gap-1">
                  {VisibilityOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleVisibilityChange(option.value)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                          state.visibility === option.value
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'hover:bg-neutral-100 border border-neutral-200'
                        }`}
                      >
                        <Icon size={14} />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 作者信息 */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-neutral-500" />
                {isEditingAuthor ? (
                  <input
                    type="text"
                    placeholder="作者名称"
                    value={tempAuthorName}
                    onChange={(e) => setTempAuthorName(e.target.value)}
                    className="px-3 py-1 border border-neutral-200 rounded-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                    autoFocus
                    onBlur={toggleAuthorEdit}
                    onKeyPress={(e) => e.key === 'Enter' && toggleAuthorEdit()}
                  />
                ) : (
                  <button
                    onClick={toggleAuthorEdit}
                    className="flex items-center gap-1 px-3 py-1 rounded-full hover:bg-neutral-100 border border-neutral-200"
                  >
                    <span>{state.authorName || '匿名作者'}</span>
                  </button>
                )}
              </div>

              {/* 字数统计 */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-sm text-neutral-600">{characterCount} 字</span>
              </div>
            </div>
          </div>

          {/* 编辑器区域 */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
            {/* 编辑器工具栏 */}
            <div className="mb-2 p-2 bg-white rounded-t-lg border border-neutral-200 border-b-0">
              <div className="flex flex-wrap items-center gap-1">
                {/* 标题下拉菜单 */}
                <div className="relative menu-container">
                  <ToolbarButton
                    icon={<Heading1 size={16} className="text-neutral-600" />}
                    label="标题"
                    showMenu={activeMenu === 'heading'}
                    onClick={() => setActiveMenu(activeMenu === 'heading' ? null : 'heading')}
                  />
                  <DropdownMenu isOpen={activeMenu === 'heading'}>
                    {[1, 2, 3].map((level) => (
                      <button
                        key={level}
                        onClick={() => {
                          editor?.chain().focus()
                            .toggleHeading({ 'level': level as 1 | 2 | 3 })
                            .run();
                          setActiveMenu(null);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                      >
                        {getHeadingLabel(level)}
                      </button>
                    ))}
                  </DropdownMenu>
                </div>

                <span className="w-px h-12 bg-neutral-300 mx-1" />

                {/* 文本格式按钮 */}
                {[
                  { 'icon': <Bold size={16} />, 'label': '粗体', 'action': () => editor?.chain().focus()
                    .toggleBold()
                    .run() },
                  { 'icon': <Italic size={16} />, 'label': '斜体', 'action': () => editor?.chain().focus()
                    .toggleItalic()
                    .run() },
                  { 'icon': <Strikethrough size={16} />, 'label': '删除线', 'action': () => editor?.chain().focus()
                    .toggleStrike()
                    .run() },
                  { 'icon': <UnderlineIcon size={16} />, 'label': '下划线', 'action': () => editor?.chain().focus()
                    .toggleUnderline()
                    .run() },
                  { 'icon': <Highlighter size={16} />, 'label': '高亮', 'action': toggleHighlight },
                  { 'icon': <Code size={16} />, 'label': '行内代码', 'action': () => editor?.chain().focus()
                    .toggleCode()
                    .run() },
                  { 'icon': <ArrowDownToLine size={16} />, 'label': '下标', 'action': () => editor?.chain().focus()
                    .toggleSubscript()
                    .run() },
                  { 'icon': <ArrowUpToLine size={16} />, 'label': '上标', 'action': () => editor?.chain().focus()
                    .toggleSuperscript()
                    .run() }
                ].map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={btn.action}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all duration-200 w-16"
                  >
                    <div className="text-neutral-600">{btn.icon}</div>
                    <span className="text-xs text-neutral-600 mt-1">{btn.label}</span>
                  </button>
                ))}

                {/* 对齐方式 */}
                <div className="relative menu-container">
                  <ToolbarButton
                    icon={<AlignLeft size={16} className="text-neutral-600" />}
                    label="对齐"
                    showMenu={activeMenu === 'align'}
                    onClick={() => setActiveMenu(activeMenu === 'align' ? null : 'align')}
                  />
                  <DropdownMenu isOpen={activeMenu === 'align'} width="w-32">
                    {[
                      { 'label': '左对齐', 'action': () => editor?.chain().focus()
                        .setTextAlign('left')
                        .run() },
                      { 'label': '居中对齐', 'action': () => editor?.chain().focus()
                        .setTextAlign('center')
                        .run() },
                      { 'label': '右对齐', 'action': () => editor?.chain().focus()
                        .setTextAlign('right')
                        .run() },
                      { 'label': '两端对齐', 'action': () => editor?.chain().focus()
                        .setTextAlign('justify')
                        .run() }
                    ].map((item, idx) => (
                      <button key={idx} onClick={() => {
                        item.action(); setActiveMenu(null);
                      }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
                        {item.label}
                      </button>
                    ))}
                  </DropdownMenu>
                </div>

                <span className="w-px h-12 bg-neutral-300 mx-1" />

                {/* 颜色选择 */}
                <div className="relative menu-container">
                  <button
                    onClick={() => {
                      if (editor) {
                        setFontColor(editor.getAttributes('textStyle').color || '#000000');
                        setBackgroundColor(editor.getAttributes('textStyle').backgroundColor || '#ffffff');
                      }
                      setActiveMenu(activeMenu === 'color' ? null : 'color');
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all duration-200 transform hover:scale-105 w-16"
                  >
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-neutral-600 transition-transform duration-200 ${activeMenu === 'color' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    <span className="text-xs text-neutral-600 mt-1">颜色</span>
                  </button>
                  <div className={`absolute left-0 mt-1 w-[280px] bg-white rounded-md shadow-lg py-4 px-3 z-10 transition-all duration-200 border border-neutral-200 ${activeMenu === 'color' ? 'opacity-100 visible' : 'opacity-0 invisible'}`} style={{ 'top': '100%' }}>
                    <ColorPicker color={fontColor} onChange={(color) => {
                      setFontColor(color); editor?.chain().focus()
                        .setColor(color)
                        .run();
                    }} label="字体颜色" />
                    <ColorPicker color={backgroundColor} onChange={(color) => {
                      setBackgroundColor(color); editor?.chain().focus()
                        .setBackgroundColor(color)
                        .run();
                    }} label="背景颜色" />
                    <div className="border-t border-gray-200 my-3" />
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setFontColor('#000000'); editor?.chain().focus()
                          .unsetColor()
                          .run();
                      }} className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">清除颜色</button>
                      <button onClick={() => {
                        setBackgroundColor('#ffffff'); editor?.chain().focus()
                          .unsetBackgroundColor()
                          .run();
                      }} className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">清除背景</button>
                    </div>
                  </div>
                </div>

                {/* 字体选择 */}
                <div className="relative menu-container">
                  <ToolbarButton
                    icon={<span className="text-sm text-neutral-600">Aa</span>}
                    label="字体"
                    showMenu={activeMenu === 'font'}
                    onClick={() => setActiveMenu(activeMenu === 'font' ? null : 'font')}
                  />
                  <DropdownMenu isOpen={activeMenu === 'font'} width="w-48">
                    {FONTS.map((font) => (
                      <button key={font} onClick={() => {
                        editor?.chain().focus()
                          .setFontFamily(font)
                          .run(); setActiveMenu(null);
                      }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100" style={{ 'fontFamily': font }}>{font}</button>
                    ))}
                    <div className="border-t border-gray-200 my-1" />
                    <button onClick={() => {
                      editor?.chain().focus()
                        .unsetFontFamily()
                        .run(); setActiveMenu(null);
                    }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">清除字体</button>
                  </DropdownMenu>
                </div>

                {/* 字号 */}
                <div className="relative menu-container">
                  <ToolbarButton
                    icon={<span className="text-sm text-neutral-600">12px</span>}
                    label="字号"
                    showMenu={activeMenu === 'fontSize'}
                    onClick={() => setActiveMenu(activeMenu === 'fontSize' ? null : 'fontSize')}
                  />
                  <DropdownMenu isOpen={activeMenu === 'fontSize'} width="w-32">
                    {FONT_SIZES.map((size) => (
                      <button key={size} onClick={() => {
                        editor?.chain().focus()
                          .setFontSize(size)
                          .run(); setActiveMenu(null);
                      }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100" style={{ 'fontSize': size }}>{size}</button>
                    ))}
                    <div className="border-t border-gray-200 my-1" />
                    <button onClick={() => {
                      editor?.chain().focus()
                        .unsetFontSize()
                        .run(); setActiveMenu(null);
                    }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">清除字号</button>
                  </DropdownMenu>
                </div>

                {/* 行高 */}
                <div className="relative menu-container">
                  <ToolbarButton
                    icon={<span className="text-sm text-neutral-600">Aa</span>}
                    label="行高"
                    showMenu={activeMenu === 'lineHeight'}
                    onClick={() => setActiveMenu(activeMenu === 'lineHeight' ? null : 'lineHeight')}
                  />
                  <DropdownMenu isOpen={activeMenu === 'lineHeight'} width="w-32">
                    {LINE_HEIGHTS.map((height) => (
                      <button key={height} onClick={() => {
                        editor?.chain().focus()
                          .setLineHeight(height)
                          .run(); setActiveMenu(null);
                      }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100" style={{ 'lineHeight': height }}>{height}</button>
                    ))}
                    <div className="border-t border-gray-200 my-1" />
                    <button onClick={() => {
                      editor?.chain().focus()
                        .unsetLineHeight()
                        .run(); setActiveMenu(null);
                    }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">清除行高</button>
                  </DropdownMenu>
                </div>

                {/* 列表 */}
                <div className="relative menu-container">
                  <ToolbarButton
                    icon={<List size={16} className="text-neutral-600" />}
                    label="列表"
                    showMenu={activeMenu === 'list'}
                    onClick={() => setActiveMenu(activeMenu === 'list' ? null : 'list')}
                  />
                  <DropdownMenu isOpen={activeMenu === 'list'}>
                    <button onClick={() => {
                      editor?.chain().focus()
                        .toggleBulletList()
                        .run(); setActiveMenu(null);
                    }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">无序列表</button>
                    <button onClick={() => {
                      editor?.chain().focus()
                        .toggleOrderedList()
                        .run(); setActiveMenu(null);
                    }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">有序列表</button>
                  </DropdownMenu>
                </div>

                {/* 数学公式 */}
                <div className="relative menu-container">
                  <ToolbarButton
                    icon={<Calculator size={16} className="text-neutral-600" />}
                    label="公式"
                    showMenu={activeMenu === 'math'}
                    onClick={() => setActiveMenu(activeMenu === 'math' ? null : 'math')}
                  />
                  <DropdownMenu isOpen={activeMenu === 'math'}>
                    <button onClick={toggleInlineMath} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">行内公式 ($...$)</button>
                    <button onClick={toggleBlockMath} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">公式块 ($$...$$)</button>
                  </DropdownMenu>
                </div>

                {/* 结构按钮 */}
                {[
                  { 'icon': <Quote size={16} />, 'label': '引用', 'action': () => editor?.chain().focus()
                    .toggleBlockquote()
                    .run() },
                  { 'icon': <Minus size={16} />, 'label': '水平线', 'action': () => editor?.chain().focus()
                    .setHorizontalRule()
                    .run() },
                  { 'icon': <CodeSquare size={16} />, 'label': '代码块', 'action': () => editor?.chain().focus()
                    .toggleCodeBlock()
                    .run() }
                ].map((btn, idx) => (
                  <button key={idx} onClick={btn.action} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16">
                    <div className="text-neutral-600">{btn.icon}</div>
                    <span className="text-xs text-neutral-600 mt-1">{btn.label}</span>
                  </button>
                ))}

                {/* 插入按钮 */}
                <button onClick={handleLink} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16">
                  <LinkIcon size={16} className="text-neutral-600" />
                  <span className="text-xs text-neutral-600 mt-1">链接</span>
                </button>
                <button onClick={() => editor?.chain().focus()
                  .insertTable({ 'rows': 3, 'cols': 3, 'withHeaderRow': true })
                  .run()} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16">
                  <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                  <span className="text-xs text-neutral-600 mt-1">表格</span>
                </button>

                {/* 表格操作 */}
                <div className="relative menu-container">
                  <ToolbarButton
                    icon={<Plus size={16} className="text-neutral-600" />}
                    label="表格操作"
                    showMenu={activeMenu === 'table'}
                    onClick={() => setActiveMenu(activeMenu === 'table' ? null : 'table')}
                  />
                  <DropdownMenu isOpen={activeMenu === 'table'} width="w-48">
                    {[
                      { 'label': '添加列 (左)', 'action': () => editor?.chain().focus()
                        .addColumnBefore()
                        .run() },
                      { 'label': '添加列 (右)', 'action': () => editor?.chain().focus()
                        .addColumnAfter()
                        .run() },
                      { 'label': '删除列', 'action': () => editor?.chain().focus()
                        .deleteColumn()
                        .run() },
                      { 'label': '添加行 (上)', 'action': () => editor?.chain().focus()
                        .addRowBefore()
                        .run() },
                      { 'label': '添加行 (下)', 'action': () => editor?.chain().focus()
                        .addRowAfter()
                        .run() },
                      { 'label': '删除行', 'action': () => editor?.chain().focus()
                        .deleteRow()
                        .run() },
                      { 'label': '删除表格', 'action': () => editor?.chain().focus()
                        .deleteTable()
                        .run() }
                    ].map((item, idx) => (
                      <button key={idx} onClick={() => {
                        item.action(); setActiveMenu(null);
                      }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">{item.label}</button>
                    ))}
                  </DropdownMenu>
                </div>

                <span className="w-px h-12 bg-neutral-300 mx-1" />

                {/* 目录开关 */}
                <button
                  onClick={() => setShowTableOfContents(!showTableOfContents)}
                  className={`flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16 ${showTableOfContents ? 'bg-primary-50 text-primary-700' : ''}`}
                >
                  <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <line x1="4" y1="9" x2="20" y2="9" />
                    <line x1="4" y1="15" x2="20" y2="15" />
                    <line x1="10" y1="3" x2="10" y2="9" />
                    <line x1="10" y1="15" x2="10" y2="21" />
                  </svg>
                  <span className="text-xs text-neutral-600 mt-1">目录</span>
                </button>

                {/* 撤销/重做 */}
                <button onClick={() => editor?.chain().focus()
                  .undo()
                  .run()} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16">
                  <Undo size={16} className="text-neutral-600" />
                  <span className="text-xs text-neutral-600 mt-1">撤销</span>
                </button>
                <button onClick={() => editor?.chain().focus()
                  .redo()
                  .run()} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16">
                  <Redo size={16} className="text-neutral-600" />
                  <span className="text-xs text-neutral-600 mt-1">重做</span>
                </button>
              </div>
            </div>

            {/* 编辑器主容器 */}
            <div className="bg-white rounded-b-lg shadow-sm border border-neutral-200">
              {editor && (
                <>
                  {/* Bubble Menu */}
                  <BubbleMenu
                    editor={editor}
                    shouldShow={({ 'state': editorState }) => !editorState.selection.empty}
                    className="transition-all duration-200"
                  >
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-white rounded-lg shadow-md border border-neutral-200">
                      {[
                        { 'icon': <Bold size={16} />, 'action': () => editor.chain().focus()
                          .toggleBold()
                          .run(), 'active': editor.isActive('bold'), 'label': '粗体' },
                        { 'icon': <Italic size={16} />, 'action': () => editor.chain().focus()
                          .toggleItalic()
                          .run(), 'active': editor.isActive('italic'), 'label': '斜体' },
                        { 'icon': <UnderlineIcon size={16} />, 'action': () => editor.chain().focus()
                          .toggleUnderline()
                          .run(), 'active': editor.isActive('underline'), 'label': '下划线' },
                        { 'icon': <Strikethrough size={16} />, 'action': () => editor.chain().focus()
                          .toggleStrike()
                          .run(), 'active': editor.isActive('strike'), 'label': '删除线' },
                        { 'icon': <Code size={16} />, 'action': () => editor.chain().focus()
                          .toggleCode()
                          .run(), 'active': editor.isActive('code'), 'label': '行内代码' },
                        { 'icon': <Highlighter size={16} />, 'action': toggleHighlight, 'active': editor.getAttributes('textStyle').backgroundColor === '#ffff00', 'label': '高亮' },
                        { 'icon': <LinkIcon size={16} />, 'action': handleLink, 'active': editor.isActive('link'), 'label': '链接' }
                      ].map((btn, idx) => (
                        <button key={idx} onClick={btn.action} className={`flex items-center justify-center p-2 rounded hover:bg-neutral-100 transition-colors ${btn.active ? 'bg-primary-50 text-primary-700' : ''}`}>
                          <div className="text-neutral-600">{btn.icon}</div>
                        </button>
                      ))}
                    </div>
                  </BubbleMenu>

                  {/* 拖拽手柄 */}
                  <DragHandleReact
                    editor={editor}
                    computePositionConfig={{
                      'placement': 'left',
                      'strategy': 'absolute',
                      'middleware': [{
                        'name': 'offset',
                        'fn': ({ x, y }) => ({ 'x': x - 20, y })
                      }]
                    }}
                  >
                    <div className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 cursor-move transition-colors">
                      <GripVertical size={16} />
                    </div>
                  </DragHandleReact>

                  {/* 编辑器内容 */}
                  <EditorContent
                    editor={editor}
                    className="prose prose-lg max-w-none mx-auto p-6 md:p-8"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
