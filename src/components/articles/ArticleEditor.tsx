import React, { useState, useCallback, useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { BulletList, OrderedList, TaskList, TaskItem, ListItem } from '@tiptap/extension-list';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import InvisibleCharacters from '@tiptap/extension-invisible-characters';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import NodeRange from '@tiptap/extension-node-range';
import { DragHandle as DragHandleReact } from '@tiptap/extension-drag-handle-react';
import { LatexEditor } from './LatexEditor';
import { Bold, Italic, Code, List, ListOrdered, Heading1, Heading2, Heading3, Undo, Redo, Save, Settings, Globe, User, Lock, Link as LinkIcon, Brain, Strikethrough, Underline as UnderlineIcon, Highlighter, ArrowDownToLine, ArrowUpToLine, Quote, Minus, CheckSquare, CodeSquare, AlignLeft, AlignCenter, AlignRight, AlignJustify, Image as ImageIcon, Plus, Calculator, GripVertical } from 'lucide-react';
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

// 创建lowlight实例
const lowlight = createLowlight();

// 注册常用语言支持
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

// 定义编辑器状态类型
interface EditorState {
  title: string;
  content: string;
  visibility: 'public' | 'unlisted';
  authorName: string;
  isSaving: boolean;
}

// 定义可见性选项
const VisibilityOptions = [
  { 'value': 'public', 'label': '公开', 'icon': Globe },
  { 'value': 'unlisted', 'label': '仅分享', 'icon': Lock }
] as const;

/**
 * 新的文章编辑器组件
 * 基于Tiptap实现所见即所得的编辑体验
 */
export const NewArticleEditor: React.FC = () => {
  // 编辑器状态
  const [state, setState] = useState<EditorState>({
    'title': '',
    'content': '',
    'visibility': 'public',
    'authorName': '',
    'isSaving': false
  });

  // 设置状态
  const [settings, setSettings] = useState({
    'showInvisibleCharacters': false
  });

  // 设置面板状态
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // 编辑模式状态
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [tempAuthorName, setTempAuthorName] = useState(state.authorName);

  // LaTeX编辑器状态
  const [showLatexEditor, setShowLatexEditor] = useState(false);
  const [mathType, setMathType] = useState<'inline' | 'block'>('inline');



  // 初始化Tiptap编辑器
  const editor = useEditor({
    'extensions': [
      StarterKit.configure({
        'codeBlock': false,
        'link': {
          'openOnClick': false
        },
        'bulletList': false,
        'orderedList': false,
        'listItem': false
      }),
      // 使用TextStyleKit整合文本样式扩展
      TextStyleKit.configure({
        // 启用背景色扩展（替换独立的Highlight扩展）
        'backgroundColor': {
          'types': ['textStyle']
        },
        'color': {
          'types': ['textStyle']
        },
        'fontFamily': {
          'types': ['textStyle']
        },
        // 启用字体大小扩展
        'fontSize': {
          'types': ['textStyle', 'heading']
        },
        // 启用行高扩展
        'lineHeight': {
          'types': ['textStyle', 'heading']
        }
      }),
      Subscript,
      Superscript,
      // 使用 @tiptap/extension-list 提供的列表组件
      BulletList,
      OrderedList,
      TaskList,
      ListItem,
      TaskItem.configure({
        'nested': true
      }),
      CodeBlockLowlight.configure({
        lowlight
      }),
      Image,
      Table,
      TableCell,
      TableHeader,
      TableRow,
      TextAlign.configure({
        'types': ['heading', 'paragraph']
      }),
      Typography,
      CharacterCount,
      InvisibleCharacters.configure({
        'visible': settings.showInvisibleCharacters,
        'injectCSS': true
      }),
      // 添加行内数学公式扩展
      InlineMath.configure({
        'katexOptions': {
          // KaTeX配置选项
        }
      }),
      // 添加公式块扩展
      BlockMath.configure({
        'katexOptions': {
          // KaTeX配置选项
        }
      }),
      // NodeRange扩展 - 支持节点范围选择，是DragHandle的依赖
      NodeRange
    ],
    'content': state.content,
    'onUpdate': ({ 'editor': editorInstance }) => {
      setState(prev => ({
        ...prev,
        'content': editorInstance.getHTML()
      }));
    },
    'editorProps': {
      'attributes': {
        'class': 'prose prose-lg max-w-none mx-auto p-6 md:p-8 focus:outline-none',
        'style': 'outline: none !important; box-shadow: none !important;'
      },
      'handleDOMEvents': {
        'click': () => {
          // 可以在这里添加点击事件处理
        }
      }
    }
  });

  // 监听设置变化，更新不可见字符显示
  useEffect(() => {
    if (editor) {
      editor.commands.showInvisibleCharacters(settings.showInvisibleCharacters);
    }
  }, [settings.showInvisibleCharacters, editor]);

  // 处理标题变化
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({
      ...prev,
      'title': e.target.value
    }));
  }, []);

  // 处理可见性变化
  const handleVisibilityChange = useCallback((visibility: 'public' | 'unlisted') => {
    setState(prev => ({
      ...prev,
      visibility
    }));
  }, []);

  // 切换作者编辑模式
  const toggleAuthorEdit = useCallback(() => {
    if (isEditingAuthor) {
      // 保存作者名称
      setState(prev => ({
        ...prev,
        'authorName': tempAuthorName
      }));
    } else {
      // 进入编辑模式，保存当前值作为临时值
      setTempAuthorName(state.authorName);
    }
    setIsEditingAuthor(prev => !prev);
  }, [isEditingAuthor, state.authorName, tempAuthorName]);

  // 处理保存
  const handleSave = useCallback(async () => {
    setState(prev => ({ ...prev, 'isSaving': true }));

    try {
      // 这里实现保存逻辑
      console.log('Saving article:', {
        'title': state.title,
        'content': state.content,
        'visibility': state.visibility,
        'authorName': state.authorName
      });

      // 模拟保存延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 保存成功
      console.log('Article saved successfully');
    } catch (error) {
      console.error('Failed to save article:', error);
    } finally {
      setState(prev => ({ ...prev, 'isSaving': false }));
    }
  }, [state.title, state.content, state.visibility, state.authorName]);

  // 编辑器命令处理函数
  const toggleBold = useCallback(() => {
    editor?.chain().focus()
      .toggleBold()
      .run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus()
      .toggleItalic()
      .run();
  }, [editor]);

  const toggleCode = useCallback(() => {
    editor?.chain().focus()
      .toggleCode()
      .run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus()
      .toggleBulletList()
      .run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus()
      .toggleOrderedList()
      .run();
  }, [editor]);

  const toggleTaskList = useCallback(() => {
    editor?.chain().focus()
      .toggleTaskList()
      .run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus()
      .toggleBlockquote()
      .run();
  }, [editor]);

  const insertHorizontalRule = useCallback(() => {
    editor?.chain().focus()
      .setHorizontalRule()
      .run();
  }, [editor]);

  const toggleStrike = useCallback(() => {
    editor?.chain().focus()
      .toggleStrike()
      .run();
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus()
      .toggleUnderline()
      .run();
  }, [editor]);

  // 简化的高亮功能：使用固定颜色的背景色，并支持切换
  const toggleHighlight = useCallback(() => {
    if (!editor) {
      return;
    }

    // 检查当前选中的文本是否已经有高亮背景色
    const attributes = editor.getAttributes('textStyle');
    const hasHighlight = attributes.backgroundColor === '#ffff00';

    // 根据情况设置或清除高亮
    if (hasHighlight) {
      editor.chain().focus()
        .unsetBackgroundColor()
        .run();
    } else {
      editor.chain().focus()
        .setBackgroundColor('#ffff00')
        .run();
    }
  }, [editor]);

  const toggleSubscript = useCallback(() => {
    editor?.chain().focus()
      .toggleSubscript()
      .run();
  }, [editor]);

  const toggleSuperscript = useCallback(() => {
    editor?.chain().focus()
      .toggleSuperscript()
      .run();
  }, [editor]);

  // 字体大小设置
  const setFontSize = useCallback((size: string) => {
    editor?.chain().focus()
      .setFontSize(size)
      .run();
  }, [editor]);

  // 行高设置
  const setLineHeight = useCallback((height: string) => {
    editor?.chain().focus()
      .setLineHeight(height)
      .run();
  }, [editor]);

  const toggleCodeBlock = useCallback(() => {
    editor?.chain().focus()
      .toggleCodeBlock()
      .run();
  }, [editor]);

  const setTextAlignLeft = useCallback(() => {
    editor?.chain().focus()
      .setTextAlign('left')
      .run();
  }, [editor]);

  const setTextAlignCenter = useCallback(() => {
    editor?.chain().focus()
      .setTextAlign('center')
      .run();
  }, [editor]);

  const setTextAlignRight = useCallback(() => {
    editor?.chain().focus()
      .setTextAlign('right')
      .run();
  }, [editor]);

  const setTextAlignJustify = useCallback(() => {
    editor?.chain().focus()
      .setTextAlign('justify')
      .run();
  }, [editor]);

  const toggleHeading1 = useCallback(() => {
    editor?.chain().focus()
      .toggleHeading({ 'level': 1 })
      .run();
  }, [editor]);

  const toggleHeading2 = useCallback(() => {
    editor?.chain().focus()
      .toggleHeading({ 'level': 2 })
      .run();
  }, [editor]);

  const toggleHeading3 = useCallback(() => {
    editor?.chain().focus()
      .toggleHeading({ 'level': 3 })
      .run();
  }, [editor]);

  const toggleLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    let url = previousUrl || '';

    if (!previousUrl) {
      // eslint-disable-next-line no-alert
      url = window.prompt('URL:') || '';
    }

    if (url) {
      editor?.chain().focus()
        .setLink({ 'href': url })
        .run();
    } else {
      editor?.chain().focus()
        .unsetLink()
        .run();
    }
  }, [editor]);

  // 插入行内数学公式
  const toggleInlineMath = useCallback(() => {
    setMathType('inline');
    setShowLatexEditor(true);
  }, []);

  // 插入公式块
  const toggleBlockMath = useCallback(() => {
    setMathType('block');
    setShowLatexEditor(true);
  }, []);

  // 处理从LaTeX编辑器插入的公式
  const handleInsertMath = useCallback((formula: string) => {
    if (!editor) {
      return;
    }

    if (mathType === 'inline') {
      editor.chain().focus()
        .insertInlineMath({ 'latex': formula })
        .run();
    } else {
      editor.chain().focus()
        .insertBlockMath({ 'latex': formula })
        .run();
    }
  }, [editor, mathType]);

  const toggleTable = useCallback(() => {
    editor?.chain().focus()
      .insertTable({ 'rows': 3, 'cols': 3, 'withHeaderRow': true })
      .run();
  }, [editor]);

  const addTableColumnBefore = useCallback(() => {
    editor?.chain().focus()
      .addColumnBefore()
      .run();
  }, [editor]);

  const addTableColumnAfter = useCallback(() => {
    editor?.chain().focus()
      .addColumnAfter()
      .run();
  }, [editor]);

  const deleteTableColumn = useCallback(() => {
    editor?.chain().focus()
      .deleteColumn()
      .run();
  }, [editor]);

  const addTableRowBefore = useCallback(() => {
    editor?.chain().focus()
      .addRowBefore()
      .run();
  }, [editor]);

  const addTableRowAfter = useCallback(() => {
    editor?.chain().focus()
      .addRowAfter()
      .run();
  }, [editor]);

  const deleteTableRow = useCallback(() => {
    editor?.chain().focus()
      .deleteRow()
      .run();
  }, [editor]);

  const deleteTable = useCallback(() => {
    editor?.chain().focus()
      .deleteTable()
      .run();
  }, [editor]);

  // 图片URL输入状态
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // 菜单显示状态
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [showLineHeightMenu, setShowLineHeightMenu] = useState(false);
  const [showMathMenu, setShowMathMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);

  // 关闭所有菜单
  const closeAllMenus = useCallback(() => {
    setShowHeadingMenu(false);
    setShowColorMenu(false);
    setShowFontMenu(false);
    setShowFontSizeMenu(false);
    setShowLineHeightMenu(false);
    setShowMathMenu(false);
    setShowListMenu(false);
    setShowTableMenu(false);
    setShowAlignMenu(false);
  }, []);

  // 点击外部区域关闭所有菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // 检查点击是否在菜单按钮或下拉菜单内
      const isInMenu = target.closest('.menu-container') || target.closest('[aria-label="标题"]') ||
                      target.closest('[aria-label="对齐方式"]') || target.closest('[aria-label="字体颜色"]') ||
                      target.closest('[aria-label="字体选择"]') || target.closest('[aria-label="字体大小"]') ||
                      target.closest('[aria-label="行高"]') || target.closest('[aria-label="数学公式"]') ||
                      target.closest('[aria-label="列表"]') || target.closest('[aria-label="表格操作"]');

      if (!isInMenu) {
        closeAllMenus();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [closeAllMenus]);

  // 菜单显示/隐藏控制函数
  const handleMenuEnter = (
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    otherSetters: Array<React.Dispatch<React.SetStateAction<boolean>>>
  ) => {
    // 关闭其他所有菜单
    otherSetters.forEach(otherSetter => otherSetter(false));
    setter(true);
  };

  const handleMenuLeave = (
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setter(false);
  };

  const handleImageSubmit = useCallback(() => {
    if (imageUrl.trim()) {
      editor?.chain().focus()
        .setImage({ 'src': imageUrl.trim() })
        .run();
      setImageUrl('');
      setShowImageModal(false);
    }
  }, [editor, imageUrl]);

  const insertImage = useCallback(() => {
    setShowImageModal(true);
  }, []);

  const undo = useCallback(() => {
    editor?.chain().focus()
      .undo()
      .run();
  }, [editor]);

  const redo = useCallback(() => {
    editor?.chain().focus()
      .redo()
      .run();
  }, [editor]);

  return (
    <div className="min-h-screen">
      {/* LaTeX编辑器 */}
      <LatexEditor
        isOpen={showLatexEditor}
        onClose={() => setShowLatexEditor(false)}
        onInsert={handleInsertMath}
      />

      {/* 代码高亮样式 */}
      <style>{`
        /* 确保代码块内文本颜色正确 */
        .ProseMirror pre {
          background-color: #1e1e1e;
          color: #d4d4d4;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        
        /* 确保行内代码样式正确 */
        .ProseMirror code {
          background-color: rgba(175, 184, 193, 0.2);
          color: #d73a49;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 0.875em;
        }
        
        /* 确保代码块内的行内代码样式正确 */
        .ProseMirror pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
          border-radius: 0;
        }
        
        /* 代码高亮主题 - 基于GitHub Dark */
        .ProseMirror .hljs {
          display: block;
          overflow-x: auto;
          padding: 0.5em;
          background: #1e1e1e;
          color: #d4d4d4;
        }
        
        .ProseMirror .hljs-keyword,
        .ProseMirror .hljs-selector-tag,
        .ProseMirror .hljs-literal,
        .ProseMirror .hljs-section,
        .ProseMirror .hljs-link {
          color: #569cd6;
        }
        
        .ProseMirror .hljs-function .hljs-keyword {
          color: #c586c0;
        }
        
        .ProseMirror .hljs-string,
        .ProseMirror .hljs-title,
        .ProseMirror .hljs-name,
        .ProseMirror .hljs-type,
        .ProseMirror .hljs-attribute,
        .ProseMirror .hljs-symbol,
        .ProseMirror .hljs-bullet,
        .ProseMirror .hljs-addition,
        .ProseMirror .hljs-variable,
        .ProseMirror .hljs-template-tag,
        .ProseMirror .hljs-template-variable {
          color: #ce9178;
        }
        
        .ProseMirror .hljs-comment,
        .ProseMirror .hljs-quote,
        .ProseMirror .hljs-deletion,
        .ProseMirror .hljs-meta {
          color: #6a9955;
        }
        
        .ProseMirror .hljs-keyword,
        .ProseMirror .hljs-selector-tag,
        .ProseMirror .hljs-literal,
        .ProseMirror .hljs-section,
        .ProseMirror .hljs-link,
        .ProseMirror .hljs-name,
        .ProseMirror .hljs-strong {
          font-weight: bold;
        }
        
        .ProseMirror .hljs-emphasis {
          font-style: italic;
        }
        
        /* 确保代码块文本可见 */
        .ProseMirror pre {
          color: #d4d4d4 !important;
        }
        
        /* 确保行内代码可见 */
        .ProseMirror code {
          color: #d73a49 !important;
        }
        

      `}</style>
      {/* 顶部栏 - 贴靠顶部并向两侧延展 */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md animate-in fade-in duration-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 网站logo */}
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-yellow-300" />
              <span className="font-bold text-xl tracking-tight">MyMathWiki</span>
            </div>

            {/* 右侧操作按钮 */}
            <div className="flex items-center space-x-3">
              {/* 设置按钮 */}
              <button
                onClick={() => setShowSettingsPanel(prev => !prev)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors relative"
                aria-label="设置"
              >
                <Settings size={20} className="text-white" />
              </button>

              {/* 保存按钮 */}
              <button
                onClick={handleSave}
                disabled={state.isSaving}
                className="inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-md shadow-sm text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/30 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isSaving ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    保存
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* 文章标题区域 */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="请输入文章标题..."
            value={state.title}
            onChange={handleTitleChange}
            className="w-full text-4xl font-bold text-neutral-800 dark:text-neutral-100 bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 focus:outline-none focus:outline-none !important focus:ring-0 !important"
            style={{ 'outline': 'none !important', 'boxShadow': 'none !important' }}
            autoFocus
          />

          {/* 可见性和作者信息区域 */}
          <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-gray-600 dark:text-gray-400 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 可见性设置 */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-500">可见性：</span>
              <div className="flex items-center gap-1">
                {VisibilityOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleVisibilityChange(option.value)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all duration-200 transform hover:scale-105 ${state.visibility === option.value
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
                      `}
                      aria-label={option.label}
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
              <User className="w-4 h-4 text-gray-500 dark:text-gray-500" />
              {isEditingAuthor ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="作者名称"
                    value={tempAuthorName}
                    onChange={(e) => setTempAuthorName(e.target.value)}
                    className="px-3 py-1 border border-primary-300 dark:border-primary-600 rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                    autoFocus
                    onBlur={toggleAuthorEdit}
                    onKeyPress={(e) => e.key === 'Enter' && toggleAuthorEdit()}
                  />
                </div>
              ) : (
                <button
                  onClick={toggleAuthorEdit}
                  className="flex items-center gap-1 px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 transform hover:scale-105"
                >
                  <span>{state.authorName || '匿名作者'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 设置面板 */}
        {showSettingsPanel && (
          <div className="mb-2 p-4 bg-white dark:bg-gray-800 rounded-lg border border-neutral-200 dark:border-gray-700 shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">编辑器设置</h3>
              <button
                onClick={() => setShowSettingsPanel(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="关闭设置"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* 显示不可见字符选项 */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-neutral-800 dark:text-neutral-200">显示不可见字符</h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">显示空格、制表符等不可见字符</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    'showInvisibleCharacters': !prev.showInvisibleCharacters
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    settings.showInvisibleCharacters
                      ? 'bg-primary-600 dark:bg-primary-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-label={settings.showInvisibleCharacters ? '隐藏不可见字符' : '显示不可见字符'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      settings.showInvisibleCharacters ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 编辑器工具栏 */}
        <div className="mb-2 p-2 bg-white dark:bg-gray-800 rounded-t-lg border border-neutral-200 dark:border-gray-700 border-b-0">
          <div className="flex flex-wrap items-center gap-1">
            {/* 标题下拉菜单 */}
            <div className="relative menu-container group">
              <button
                onMouseEnter={() => {
                  handleMenuEnter(
                    setShowHeadingMenu,
                    [setShowColorMenu, setShowFontMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                  );
                }}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-16"
                aria-label="标题"
              >
                <Heading1 size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">标题</span>
              </button>
              {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
              <div
                className="absolute left-0 right-0 h-2 top-full mt-0.5"
                onMouseEnter={() => {
                  handleMenuEnter(
                    setShowHeadingMenu,
                    [setShowColorMenu, setShowFontMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                  );
                }}
              ></div>
              {/* 菜单区域 */}
              <div
                className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                style={{ 'display': showHeadingMenu ? 'block' : 'none' }}
                onMouseEnter={() => {
                  handleMenuEnter(
                    setShowHeadingMenu,
                    [setShowColorMenu, setShowFontMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                  );
                }}
                onMouseLeave={() => handleMenuLeave(setShowHeadingMenu)}
              >
                <button
                  onClick={toggleHeading1}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="一级标题"
                >
                  <Heading1 size={16} className="inline mr-2" />
                  一级标题
                </button>
                <button
                  onClick={toggleHeading2}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="二级标题"
                >
                  <Heading2 size={16} className="inline mr-2" />
                  二级标题
                </button>
                <button
                  onClick={toggleHeading3}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="三级标题"
                >
                  <Heading3 size={16} className="inline mr-2" />
                  三级标题
                </button>
              </div>
              {/* 监听整个菜单容器的鼠标离开事件 */}
              <div
                className="absolute inset-0 top-full left-0 right-0 h-[calc(100%+1rem)]"
                onMouseLeave={() => handleMenuLeave(setShowHeadingMenu)}
              ></div>
            </div>

            <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

            {/* 文本格式按钮 */}
            <button
              onClick={toggleBold}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="粗体"
            >
              <Bold size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">粗体</span>
            </button>
            <button
              onClick={toggleItalic}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="斜体"
            >
              <Italic size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">斜体</span>
            </button>
            <button
              onClick={toggleStrike}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="删除线"
            >
              <Strikethrough size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">删除线</span>
            </button>
            <button
              onClick={toggleUnderline}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="下划线"
            >
              <UnderlineIcon size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">下划线</span>
            </button>
            <button
              onClick={toggleHighlight}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="高亮"
            >
              <Highlighter size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">高亮</span>
            </button>
            <button
              onClick={toggleCode}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="行内代码"
            >
              <Code size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">行内代码</span>
            </button>

            <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

            {/* 下标/上标 */}
            <button
              onClick={toggleSubscript}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="下标"
            >
              <ArrowDownToLine size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">下标</span>
            </button>
            <button
              onClick={toggleSuperscript}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="上标"
            >
              <ArrowUpToLine size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">上标</span>
            </button>

            <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

            {/* 对齐方式 */}
            <div className="relative menu-container group">
              <button
                onMouseEnter={() => handleMenuEnter(
                  setShowAlignMenu,
                  [
                    setShowHeadingMenu,
                    setShowColorMenu,
                    setShowFontMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu,
                    setShowListMenu,
                    setShowTableMenu
                  ]
                )}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-16"
                aria-label="对齐方式"
              >
                <AlignLeft size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">对齐</span>
              </button>
              {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
              <div
                className="absolute left-0 right-0 h-2 top-full mt-0.5"
                onMouseEnter={() => handleMenuEnter(
                  setShowAlignMenu,
                  [
                    setShowHeadingMenu,
                    setShowColorMenu,
                    setShowFontMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu,
                    setShowListMenu,
                    setShowTableMenu
                  ]
                )}
              ></div>
              {/* 菜单区域 */}
              <div
                className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                style={{ 'display': showAlignMenu ? 'block' : 'none' }}
                onMouseEnter={() => handleMenuEnter(
                  setShowAlignMenu,
                  [
                    setShowHeadingMenu,
                    setShowColorMenu,
                    setShowFontMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu,
                    setShowListMenu,
                    setShowTableMenu
                  ]
                )}
                onMouseLeave={() => handleMenuLeave(setShowAlignMenu)}
              >
                <button
                  onClick={setTextAlignLeft}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="左对齐"
                >
                  <AlignLeft size={16} className="inline mr-2" />
                  左对齐
                </button>
                <button
                  onClick={setTextAlignCenter}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="居中对齐"
                >
                  <AlignCenter size={16} className="inline mr-2" />
                  居中对齐
                </button>
                <button
                  onClick={setTextAlignRight}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="右对齐"
                >
                  <AlignRight size={16} className="inline mr-2" />
                  右对齐
                </button>
                <button
                  onClick={setTextAlignJustify}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="两端对齐"
                >
                  <AlignJustify size={16} className="inline mr-2" />
                  两端对齐
                </button>
              </div>
              {/* 监听整个菜单容器的鼠标离开事件 */}
              <div
                className="absolute inset-0 top-full left-0 right-0 h-[calc(100%+1rem)]"
                onMouseLeave={() => handleMenuLeave(setShowAlignMenu)}
              ></div>
            </div>

            <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

            {/* 字体颜色和背景色 */}
            <div className="relative menu-container group">
              <button
                onMouseEnter={() => handleMenuEnter(
                  setShowColorMenu,
                  [
                    setShowHeadingMenu,
                    setShowFontMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu,
                    setShowListMenu,
                    setShowTableMenu,
                    setShowAlignMenu
                  ]
                )}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                aria-label="字体颜色"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">颜色</span>
              </button>
              {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
              <div
                className="absolute left-0 right-0 h-2 top-full mt-0.5"
                onMouseEnter={() => handleMenuEnter(
                  setShowColorMenu,
                  [
                    setShowHeadingMenu,
                    setShowFontMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu,
                    setShowListMenu,
                    setShowTableMenu,
                    setShowAlignMenu
                  ]
                )}
              ></div>
              {/* 菜单区域 */}
              <div
                className="absolute left-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg py-2 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                style={{ 'display': showColorMenu ? 'block' : 'none' }}
                onMouseEnter={() => handleMenuEnter(
                  setShowColorMenu,
                  [
                    setShowHeadingMenu,
                    setShowFontMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu,
                    setShowListMenu,
                    setShowTableMenu,
                    setShowAlignMenu
                  ]
                )}
                onMouseLeave={() => handleMenuLeave(setShowColorMenu)}
              >
                {['black', 'red', 'blue', 'green', 'yellow', 'purple', 'orange'].map((color) => (
                  <button
                    key={color}
                    onClick={() => editor?.chain().focus()
                      .setColor(color)
                      .run()}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    style={{ color }}
                  >
                    <div className={'w-3 h-3 rounded-full'} style={{ 'backgroundColor': color }}></div>
                    {color.charAt(0).toUpperCase() + color.slice(1)}
                  </button>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button
                  onClick={() => editor?.chain().focus()
                    .unsetColor()
                    .run()}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  清除颜色
                </button>
              </div>
              {/* 监听整个菜单容器的鼠标离开事件 */}
              <div
                className="absolute inset-0 top-full left-0 right-0 h-[calc(100%+1rem)]"
                onMouseLeave={() => handleMenuLeave(setShowColorMenu)}
              ></div>
            </div>

            {/* 字体选择 */}
            <div className="relative menu-container group">
              <button
                onMouseEnter={() => handleMenuEnter(
                  setShowFontMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontSizeMenu, setShowLineHeightMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                aria-label="字体选择"
              >
                <span className="text-sm text-gray-600 dark:text-gray-400">Aa</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">字体</span>
              </button>
              {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
              <div
                className="absolute left-0 right-0 h-2 top-full mt-0.5"
                onMouseEnter={() => handleMenuEnter(
                  setShowFontMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontSizeMenu, setShowLineHeightMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
              ></div>
              {/* 菜单区域 */}
              <div
                className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-2 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                style={{ 'display': showFontMenu ? 'block' : 'none' }}
                onMouseEnter={() => handleMenuEnter(
                  setShowFontMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontSizeMenu, setShowLineHeightMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
                onMouseLeave={() => handleMenuLeave(setShowFontMenu)}
              >
                {['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Trebuchet MS', 'Comic Sans MS'].map((font) => (
                  <button
                    key={font}
                    onClick={() => editor?.chain().focus()
                      .setFontFamily(font)
                      .run()}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    style={{ 'fontFamily': font }}
                  >
                    {font}
                  </button>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button
                  onClick={() => editor?.chain().focus()
                    .unsetFontFamily()
                    .run()}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  清除字体
                </button>
              </div>
              {/* 监听整个菜单容器的鼠标离开事件 */}
              <div
                className="absolute inset-0 top-full left-0 right-0 h-[calc(100%+1rem)]"
                onMouseLeave={() => handleMenuLeave(setShowFontMenu)}
              ></div>
            </div>

            {/* 字体大小 */}
            <div className="relative menu-container group">
              <button
                onMouseEnter={() => handleMenuEnter(
                  setShowFontSizeMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontMenu, setShowLineHeightMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                aria-label="字体大小"
              >
                <span className="text-sm text-gray-600 dark:text-gray-400">12px</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">字号</span>
              </button>
              {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
              <div
                className="absolute left-0 right-0 h-2 top-full mt-0.5"
                onMouseEnter={() => handleMenuEnter(
                  setShowFontSizeMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontMenu, setShowLineHeightMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
              ></div>
              {/* 菜单区域 */}
              <div
                className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-2 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                style={{ 'display': showFontSizeMenu ? 'block' : 'none' }}
                onMouseEnter={() => handleMenuEnter(
                  setShowFontSizeMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontMenu, setShowLineHeightMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
                onMouseLeave={() => handleMenuLeave(setShowFontSizeMenu)}
              >
                {['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    style={{ 'fontSize': size }}
                  >
                    {size}
                  </button>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button
                  onClick={() => editor?.chain().focus()
                    .unsetFontSize()
                    .run()}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  清除字号
                </button>
              </div>
              {/* 监听整个菜单容器的鼠标离开事件 */}
              <div
                className="absolute inset-0 top-full left-0 right-0 h-[calc(100%+1rem)]"
                onMouseLeave={() => handleMenuLeave(setShowFontSizeMenu)}
              ></div>
            </div>

            {/* 行高 */}
            <div className="relative menu-container group">
              <button
                onMouseEnter={() => handleMenuEnter(
                  setShowLineHeightMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontMenu, setShowFontSizeMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                aria-label="行高"
              >
                <span className="text-sm text-gray-600 dark:text-gray-400">Aa</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">行高</span>
              </button>
              {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
              <div
                className="absolute left-0 right-0 h-2 top-full mt-0.5"
                onMouseEnter={() => handleMenuEnter(
                  setShowLineHeightMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontMenu, setShowFontSizeMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
              ></div>
              {/* 菜单区域 */}
              <div
                className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-2 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                style={{ 'display': showLineHeightMenu ? 'block' : 'none' }}
                onMouseEnter={() => handleMenuEnter(
                  setShowLineHeightMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontMenu, setShowFontSizeMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
                onMouseLeave={() => handleMenuLeave(setShowLineHeightMenu)}
              >
                {['1.0', '1.2', '1.4', '1.6', '1.8', '2.0', '2.4'].map((height) => (
                  <button
                    key={height}
                    onClick={() => setLineHeight(height)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    style={{ 'lineHeight': height }}
                  >
                    {height}
                  </button>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button
                  onClick={() => editor?.chain().focus()
                    .unsetLineHeight()
                    .run()}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  清除行高
                </button>
              </div>
              {/* 监听整个菜单容器的鼠标离开事件 */}
              <div
                className="absolute inset-0 top-full left-0 right-0 h-[calc(100%+1rem)]"
                onMouseLeave={() => handleMenuLeave(setShowLineHeightMenu)}
              ></div>
            </div>

            <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

            {/* 列表按钮 */}
            <div className="relative menu-container group">
              <button
                onMouseEnter={() => handleMenuEnter(
                  setShowListMenu,
                  [
                    setShowHeadingMenu,
                    setShowColorMenu,
                    setShowFontMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu,
                    setShowTableMenu,
                    setShowAlignMenu
                  ]
                )}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                aria-label="列表"
              >
                <List size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">列表</span>
              </button>
              {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
              <div
                className="absolute left-0 right-0 h-2 top-full mt-0.5"
                onMouseEnter={() => handleMenuEnter(
                  setShowListMenu,
                  [
                    setShowHeadingMenu,
                    setShowColorMenu,
                    setShowFontMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu,
                    setShowTableMenu,
                    setShowAlignMenu
                  ]
                )}
              ></div>
              {/* 菜单区域 */}
              <div
                className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                style={{ 'display': showListMenu ? 'block' : 'none' }}
                onMouseEnter={() => handleMenuEnter(
                  setShowListMenu,
                  [
                    setShowHeadingMenu,
                    setShowColorMenu,
                    setShowFontMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu,
                    setShowTableMenu,
                    setShowAlignMenu
                  ]
                )}
                onMouseLeave={() => handleMenuLeave(setShowListMenu)}
              >
                <button
                  onClick={toggleBulletList}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="无序列表"
                >
                  <List size={16} className="inline mr-2" />
                  无序列表
                </button>
                <button
                  onClick={toggleOrderedList}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="有序列表"
                >
                  <ListOrdered size={16} className="inline mr-2" />
                  有序列表
                </button>
                <button
                  onClick={toggleTaskList}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="任务列表"
                >
                  <CheckSquare size={16} className="inline mr-2" />
                  任务列表
                </button>
              </div>
              {/* 监听整个菜单容器的鼠标离开事件 */}
              <div
                className="absolute inset-0 top-full left-0 right-0 h-[calc(100%+1rem)]"
                onMouseLeave={() => handleMenuLeave(setShowListMenu)}
              ></div>
            </div>

            <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

            {/* 数学公式菜单 */}
            <div className="relative menu-container group">
              <button
                onMouseEnter={() => handleMenuEnter(
                  setShowMathMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontMenu, setShowFontSizeMenu, setShowLineHeightMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                aria-label="数学公式"
              >
                <Calculator size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">公式</span>
              </button>
              {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
              <div
                className="absolute left-0 right-0 h-2 top-full mt-0.5"
                onMouseEnter={() => handleMenuEnter(
                  setShowMathMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontMenu, setShowFontSizeMenu, setShowLineHeightMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
              ></div>
              {/* 菜单区域 */}
              <div
                className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                style={{ 'display': showMathMenu ? 'block' : 'none' }}
                onMouseEnter={() => handleMenuEnter(
                  setShowMathMenu,
                  [setShowHeadingMenu, setShowColorMenu, setShowFontMenu, setShowFontSizeMenu, setShowLineHeightMenu, setShowListMenu, setShowTableMenu, setShowAlignMenu]
                )}
                onMouseLeave={() => handleMenuLeave(setShowMathMenu)}
              >
                <button
                  onClick={toggleInlineMath}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="行内公式"
                >
                  行内公式 ($...$)
                </button>
                <button
                  onClick={toggleBlockMath}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="公式块 ($$...$$)"
                >
                  公式块 ($$...$$)
                </button>
              </div>
              {/* 监听整个菜单容器的鼠标离开事件 */}
              <div
                className="absolute inset-0 top-full left-0 right-0 h-[calc(100%+1rem)]"
                onMouseLeave={() => handleMenuLeave(setShowMathMenu)}
              ></div>
            </div>

            <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

            {/* 结构按钮 */}
            <button
              onClick={toggleBlockquote}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="块引用"
            >
              <Quote size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">引用</span>
            </button>
            <button
              onClick={insertHorizontalRule}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="水平线"
            >
              <Minus size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">水平线</span>
            </button>
            <button
              onClick={toggleCodeBlock}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="代码块"
            >
              <CodeSquare size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">代码块</span>
            </button>

            <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

            {/* 插入按钮 */}
            <button
              onClick={toggleLink}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="插入链接"
            >
              <LinkIcon size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">链接</span>
            </button>
            <button
              onClick={insertImage}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="插入图片"
            >
              <ImageIcon size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">图片</span>
            </button>
            <button
              onClick={toggleTable}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="插入表格"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">表格</span>
            </button>
            {/* 表格操作按钮 */}
            <div className="relative menu-container group">
              <button
                onMouseEnter={() => handleMenuEnter(
                  setShowTableMenu,
                  [
                    setShowHeadingMenu,
                    setShowColorMenu,
                    setShowFontMenu,
                    setShowListMenu,
                    setShowAlignMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu
                  ]
                )}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                aria-label="表格操作"
              >
                <Plus size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">表格操作</span>
              </button>
              {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
              <div
                className="absolute left-0 right-0 h-2 top-full mt-0.5"
                onMouseEnter={() => handleMenuEnter(
                  setShowTableMenu,
                  [
                    setShowHeadingMenu,
                    setShowColorMenu,
                    setShowFontMenu,
                    setShowListMenu,
                    setShowAlignMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu
                  ]
                )}
              ></div>
              {/* 菜单区域 */}
              <div
                className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                style={{ 'display': showTableMenu ? 'block' : 'none' }}
                onMouseEnter={() => handleMenuEnter(
                  setShowTableMenu,
                  [
                    setShowHeadingMenu,
                    setShowColorMenu,
                    setShowFontMenu,
                    setShowListMenu,
                    setShowAlignMenu,
                    setShowFontSizeMenu,
                    setShowLineHeightMenu
                  ]
                )}
                onMouseLeave={() => handleMenuLeave(setShowTableMenu)}
              >
                <button
                  onClick={addTableColumnBefore}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="在左侧添加列"
                >
                  添加列 (左)
                </button>
                <button
                  onClick={addTableColumnAfter}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="在右侧添加列"
                >
                  添加列 (右)
                </button>
                <button
                  onClick={deleteTableColumn}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="删除列"
                >
                  删除列
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button
                  onClick={addTableRowBefore}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="在上方添加行"
                >
                  添加行 (上)
                </button>
                <button
                  onClick={addTableRowAfter}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="在下方添加行"
                >
                  添加行 (下)
                </button>
                <button
                  onClick={deleteTableRow}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="删除行"
                >
                  删除行
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button
                  onClick={deleteTable}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="删除表格"
                >
                  删除表格
                </button>
              </div>
              {/* 监听整个菜单容器的鼠标离开事件 */}
              <div
                className="absolute inset-0 top-full left-0 right-0 h-[calc(100%+1rem)]"
                onMouseLeave={() => handleMenuLeave(setShowTableMenu)}
              ></div>
            </div>

            <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

            {/* 撤销/重做按钮 */}
            <button
              onClick={undo}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="撤销"
            >
              <Undo size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">撤销</span>
            </button>
            <button
              onClick={redo}
              className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
              aria-label="重做"
            >
              <Redo size={16} className="text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">重做</span>
            </button>
          </div>
        </div>

        {/* 编辑器内容区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-sm border border-neutral-200 dark:border-gray-700 transition-all hover:shadow-md">
          {/* Bubble Menu - 选中文本时显示 */}
          {editor && (
            <BubbleMenu
              editor={editor}
              shouldShow={({ 'state': editorState }) => {
                // 只在选中文本时显示
                return !editorState.selection.empty;
              }}
            >
              <div className="flex flex-wrap items-center gap-1 p-1 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-neutral-200 dark:border-gray-700">
                <button
                  onClick={toggleBold}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('bold') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="粗体"
                >
                  <Bold size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleItalic}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('italic') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="斜体"
                >
                  <Italic size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleUnderline}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('underline') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="下划线"
                >
                  <UnderlineIcon size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleStrike}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('strike') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="删除线"
                >
                  <Strikethrough size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleCode}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('code') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="行内代码"
                >
                  <Code size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleHighlight}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.getAttributes('textStyle').backgroundColor === '#ffff00' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="高亮"
                >
                  <Highlighter size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleLink}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('link') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="链接"
                >
                  <LinkIcon size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </BubbleMenu>
          )}

          {/* Floating Menu - 在特定节点上显示 */}
          {editor && (
            <FloatingMenu
              editor={editor}
              shouldShow={({ 'state': editorState }) => {
                // 只在光标位置（非选中文本）且在特定节点类型上显示
                const { selection } = editorState;
                if (!selection.empty) {
                  return false;
                }

                const { $anchor } = selection;
                const allowedNodeTypes = ['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock'];
                return allowedNodeTypes.includes($anchor.parent.type.name);
              }}
            >
              <div className="flex flex-wrap items-center gap-1 p-1 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-neutral-200 dark:border-gray-700">
                <button
                  onClick={toggleBulletList}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('bulletList') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="无序列表"
                >
                  <List size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleOrderedList}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('orderedList') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="有序列表"
                >
                  <ListOrdered size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleTaskList}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('taskList') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="任务列表"
                >
                  <CheckSquare size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleBlockquote}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('blockquote') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="引用"
                >
                  <Quote size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={insertHorizontalRule}
                  className="flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="分隔线"
                >
                  <Minus size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleCodeBlock}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('codeBlock') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="代码块"
                >
                  <CodeSquare size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleInlineMath}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('inlineMath') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="行内数学公式"
                >
                  <Calculator size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={toggleBlockMath}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${editor.isActive('blockMath') ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label="公式块"
                >
                  <Calculator size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </FloatingMenu>
          )}

          {editor && (
            <>
              {/* DragHandleReact组件 - 提供拖拽功能 */}
              <DragHandleReact
                editor={editor}
                /* eslint-disable quote-props */
                computePositionConfig={{
                  placement: 'left',
                  strategy: 'absolute',
                  middleware: [
                    {
                      name: 'offset',
                      fn: ({ x, y }) => {
                        return {
                          x: x - 20,
                          y
                        };
                      }
                    }
                  ]
                }}
                /* eslint-enable quote-props */
              >
                <div className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-move transition-colors">
                  <GripVertical size={16} />
                </div>
              </DragHandleReact>

              <EditorContent
                editor={editor}
                className="prose prose-lg max-w-none mx-auto p-6 md:p-8 prose-headings:scroll-mt-20 prose-headings:text-neutral-800 dark:prose-headings:text-neutral-100 prose-headings:font-bold prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:hover:text-primary-700 dark:prose-a:hover:text-primary-300 prose-a:underline-offset-4 prose-code:bg-neutral-100 dark:prose-code:bg-gray-700 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-neutral-800 dark:prose-code:text-neutral-200 prose-pre:bg-neutral-800 dark:prose-pre:bg-gray-900 prose-pre:text-neutral-100 !dark:prose-pre:text-neutral-200 prose-p:text-neutral-700 dark:prose-p:text-neutral-300 prose-ul:text-neutral-700 dark:prose-ul:text-neutral-300 prose-ul:list-disc !important prose-ul:pl-6 dark:prose-ul:pl-6 prose-ul:list-outside prose-ol:text-neutral-700 dark:prose-ol:text-neutral-300 prose-ol:list-decimal !important prose-ol:pl-6 dark:prose-ol:pl-6 prose-ol:list-outside prose-strong:text-neutral-900 dark:prose-strong:text-neutral-100 prose-em:text-neutral-800 dark:prose-em:text-neutral-200 prose-blockquote:border-l-4 prose-blockquote:border-primary-500 dark:prose-blockquote:border-primary-400 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-neutral-600 dark:prose-blockquote:text-neutral-400 prose-hr:my-8 prose-hr:border-t prose-hr:border-neutral-200 dark:prose-hr:border-gray-700 prose-table:border-collapse prose-table:border prose-table:border-neutral-200 dark:prose-table:border-gray-700 prose-th:border prose-th:border-neutral-200 dark:prose-th:border-gray-700 prose-th:bg-neutral-50 dark:prose-th:bg-gray-800 prose-td:border prose-td:border-neutral-200 dark:prose-td:border-gray-700 prose-td:p-3 prose-th:p-3 prose-td:bg-white dark:prose-td:bg-gray-900 prose-task-list:list-none prose-task-list:pl-0 prose-task-item:list-none prose-task-item:pl-6 dark:prose-task-item:pl-6 prose-task-item:before:inline-block prose-task-item:before:mr-2 prose-task-item:before:w-4 prose-task-item:before:h-4 prose-task-item:before:rounded prose-task-item:before:border prose-task-item:before:border-neutral-300 dark:prose-task-item:before:border-gray-600 prose-task-item:before:bg-white dark:prose-task-item:before:bg-gray-900 prose-task-item:checked:before:bg-primary-600 dark:prose-task-item:checked:before:bg-primary-500 prose-task-item:checked:before:border-transparent prose-task-item:checked:before:text-white prose-task-item:checked:before:content-['✓'] prose-task-item:checked:before:text-center prose-task-item:checked:before:leading-4 focus:outline-none"
                style={{ 'outline': 'none !important', 'boxShadow': 'none !important' }}
              />
            </>
          )}
        </div>
      </article>

      {/* 图片URL输入模态框 */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md animate-in zoom-in duration-300">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">插入图片</h3>
            <div className="mb-4">
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                图片URL
              </label>
              <input
                type="text"
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleImageSubmit()}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setImageUrl('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleImageSubmit}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
              >
                插入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


