import React, { useState, useCallback, useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import { useNavigate } from 'react-router-dom';

// 导入 colorPicker CSS
import 'tui-color-picker/dist/tui-color-picker.css';

// @ts-expect-error tui-color-picker 没有 TypeScript 类型定义
import * as colorPicker from 'tui-color-picker';

import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { BulletList, OrderedList, TaskList, TaskItem, ListItem } from '@tiptap/extension-list';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { mergeAttributes } from '@tiptap/core';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import InvisibleCharacters from '@tiptap/extension-invisible-characters';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import NodeRange from '@tiptap/extension-node-range';
import { DragHandle as DragHandleReact } from '@tiptap/extension-drag-handle-react';
import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents';
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

// 支持的编程语言列表
const SupportedLanguages = [
  { 'group': '常用', 'languages': [
    { 'value': 'plaintext', 'label': '纯文本' },
    { 'value': 'javascript', 'label': 'JavaScript' },
    { 'value': 'typescript', 'label': 'TypeScript' },
    { 'value': 'python', 'label': 'Python' },
    { 'value': 'html', 'label': 'HTML' },
    { 'value': 'css', 'label': 'CSS' },
    { 'value': 'json', 'label': 'JSON' },
    { 'value': 'bash', 'label': 'Bash' }
  ]},
  { 'group': '其他', 'languages': [
    { 'value': 'sql', 'label': 'SQL' },
    { 'value': 'markdown', 'label': 'Markdown' },
    { 'value': 'java', 'label': 'Java' },
    { 'value': 'csharp', 'label': 'C#' },
    { 'value': 'php', 'label': 'PHP' }
  ]}
];

// 自定义代码块扩展，添加行号和语言标签
const CustomCodeBlock = CodeBlockLowlight.extend({
  'name': 'codeBlock',
  renderHTML ({ node, HTMLAttributes }) {
    const language = node.attrs.language || 'plaintext';

    return [
      'pre',
      mergeAttributes(HTMLAttributes, {
        'class': 'rounded-lg overflow-hidden relative'
      }),
      [
        'span',
        {
          'class': 'code-block-language cursor-pointer',
          'data-language': language,
          'style': {
            'position': 'absolute',
            'top': '0',
            'right': '0',
            'backgroundColor': '#333',
            'color': '#ccc',
            'padding': '0.25rem 0.75rem',
            'borderBottomLeftRadius': '0.5rem',
            'fontSize': '0.75rem',
            'fontWeight': '500',
            'textTransform': 'uppercase',
            'letterSpacing': '0.5px',
            'zIndex': '10',
            'userSelect': 'none'
          }
        },
        language
      ],
      [
        'code',
        { 'class': `language-${language}` },
        0
      ]
    ];
  }
});

export const ArticleEditor: React.FC = () => {
  // 导航钩子
  const navigate = useNavigate();

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

  // 目录状态
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  // 用于TableOfContents扩展的onUpdate回调
  const [tableOfContentsItems, setTableOfContentsItems] = useState<Array<{ id: string; textContent: string; level: number; itemIndex: number; isActive: boolean; isScrolledOver: boolean }>>([]);
  // 目录容器引用
  const tocRef = useRef<HTMLDivElement>(null);
  // 目录更新防抖定时器
  const tocUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 监听滚动事件，更新目录位置
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // 清除之前的定时器
      clearTimeout(scrollTimeout);

      // 设置新的定时器，滚动停止150ms后执行
      scrollTimeout = setTimeout(() => {
        if (!tocRef.current) {
          return;
        }

        // 获取当前滚动位置
        const currentScrollTop = window.scrollY;

        // 滚动结束后更新目录位置
        tocRef.current.style.top = `${currentScrollTop + 16}px`;
      }, 150);
    };

    // 添加滚动事件监听器
    window.addEventListener('scroll', handleScroll, { 'passive': true });

    // 清理事件监听器和定时器
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, []);

  // 优化的目录更新函数，添加防抖
  const updateTableOfContents = useCallback((content: Array<{ id: string; textContent: string; level: number; itemIndex: number; isActive: boolean; isScrolledOver: boolean }>) => {
    // 清除之前的定时器
    if (tocUpdateTimeoutRef.current) {
      clearTimeout(tocUpdateTimeoutRef.current);
    }

    // 设置新的定时器，50ms后执行更新
    tocUpdateTimeoutRef.current = setTimeout(() => {
      setTableOfContentsItems(content);
      tocUpdateTimeoutRef.current = null;
    }, 50);
  }, []);

  // 组件卸载时清理防抖定时器
  useEffect(() => {
    return () => {
      if (tocUpdateTimeoutRef.current) {
        clearTimeout(tocUpdateTimeoutRef.current);
      }
    };
  }, []);

  // 编辑器onUpdate防抖定时器
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 文字字数统计
  const [characterCount, setCharacterCount] = useState(0);

  // 代码块语言选择器状态
  const [showCodeLanguageSelector, setShowCodeLanguageSelector] = useState(false);
  const [selectedCodeBlockPos, setSelectedCodeBlockPos] = useState<number | null>(null);

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
        // 启用背景色扩展
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
      CustomCodeBlock.configure({
        lowlight,
        'defaultLanguage': 'plaintext'
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
      NodeRange,
      // 目录扩展
      TableOfContents.configure({
        'getIndex': getHierarchicalIndexes,
        'onUpdate': updateTableOfContents
      }),
      CharacterCount.configure({
        'limit': 0
      })
    ],
    'content': state.content,
    'onUpdate': ({ 'editor': editorInstance }) => {
      // 优化：使用防抖来减少频繁的HTML生成和状态更新
      // 仅在编辑器内容真正变化且防抖时间过后更新状态
      const newContent = editorInstance.getHTML();
      if (newContent !== state.content) {
        // 清除之前的定时器
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        // 设置新的定时器，100ms后执行更新
        updateTimeoutRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            'content': newContent
          }));
          updateTimeoutRef.current = null;
        }, 100);
      }

      // 更新字数统计
      const count = editorInstance.storage.characterCount.characters();
      setCharacterCount(count);
    },
    'editorProps': {
      'attributes': {
        'class': 'prose prose-lg max-w-none mx-auto p-6 md:p-8 focus:outline-none',
        'style': 'outline: none !important; box-shadow: none !important;'
      },
      'handleDOMEvents': {
        'click': (view, event) => {
          // 处理代码块语言标签的点击事件
          const target = event.target as HTMLElement;
          // 检查目标是否是代码块语言标签或其子元素
          const languageTag = target.closest('.code-block-language');
          if (languageTag) {
            // 找到最近的 pre 元素
            const preElement = languageTag.closest('pre');
            if (preElement) {
              // 找到对应的代码块节点
              const pos = view.posAtDOM(preElement, 0);
              const node = view.state.doc.resolve(pos).node();

              if (node.type.name === 'codeBlock') {
                // 打开语言选择器
                setSelectedCodeBlockPos(pos);
                setShowCodeLanguageSelector(true);
                event.stopPropagation();
                return true;
              }
            }
          }
          return false;
        },
        // 处理拖拽悬停事件，只在文件拖拽时阻止默认行为
        'dragover': (_view, event) => {
          // 只有当拖拽的是文件时才阻止默认行为
          if (event.dataTransfer && event.dataTransfer.types.includes('Files')) {
            event.preventDefault();
            event.stopPropagation();
            return false;
          }
          // 对于文本选择等其他拖拽行为，允许默认行为
          return true;
        },
        // 处理拖拽放置事件
        'drop': (view, event) => {
          event.preventDefault();
          event.stopPropagation();

          // 获取拖拽的文件
          const files = Array.from(event.dataTransfer?.files || []);

          // 处理每个文件
          files.forEach(file => {
            // 检查是否是图片文件
            if (file.type.startsWith('image/')) {
              // 创建临时URL
              const url = URL.createObjectURL(file);

              // 插入图片到编辑器
              const imageNodeType = view.state.schema.nodes.image;
              if (imageNodeType) {
                view.dispatch(view.state.tr
                  .insert(view.state.selection.head, imageNodeType.create({ 'src': url }))
                );
              }
            }
          });

          return true;
        }
      }
    }
  });

  // 组件卸载时清理防抖定时器
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

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
  // 切换代码块语言
  const setCodeBlockLanguage = useCallback((language: string) => {
    if (!editor || selectedCodeBlockPos === null) {
      setShowCodeLanguageSelector(false);
      setSelectedCodeBlockPos(null);
      return;
    }

    try {
      // 验证位置是否有效
      const editorState = editor.state;
      const doc = editorState.doc;

      if (selectedCodeBlockPos >= 0 && selectedCodeBlockPos <= doc.content.size) {
        const node = doc.resolve(selectedCodeBlockPos).node();

        if (node.type.name === 'codeBlock') {
          editor.chain().focus()
            .updateAttributes('codeBlock', { language })
            .run();
        }
      }
    } catch (error) {
      console.error('Error updating code block language:', error);
    } finally {
      setShowCodeLanguageSelector(false);
      setSelectedCodeBlockPos(null);
    }
  }, [editor, selectedCodeBlockPos]);
  // 菜单显示状态
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // 关闭所有菜单
  const closeAllMenus = useCallback(() => {
    setActiveMenu(null);
    setShowCodeLanguageSelector(false);
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
  const handleMenuEnter = useCallback((menuName: string) => {
    setActiveMenu(menuName);
  }, []);

  const handleMenuLeave = useCallback((menuName: string) => {
    setActiveMenu(prev => prev === menuName ? null : prev);
  }, []);

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

      {/* 代码块语言选择器 */}
      {showCodeLanguageSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowCodeLanguageSelector(false)}
          ></div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 relative z-10 min-w-[300px] max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">选择编程语言</h3>
            {SupportedLanguages.map((group) => (
              <div key={group.group} className="mb-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{group.group}</div>
                <div className="space-y-1">
                  {group.languages.map((lang) => (
                    <button
                      key={lang.value}
                      className="w-full text-left px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => setCodeBlockLanguage(lang.value)}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* 顶部栏 - 贴靠顶部并向两侧延展 */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md animate-in fade-in duration-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 网站logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="返回首页"
            >
              <Brain className="w-6 h-6 text-yellow-300" />
              <span className="font-bold text-xl tracking-tight">MyWiki</span>
            </button>

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

      {/* 主内容区域 - 目录栏作为附加菜单 */}
      <div className="relative">
        {/* 左侧目录栏 - 编辑区域的附加菜单，使用绝对定位 */}
        {showTableOfContents && editor && (
          <div ref={tocRef} className="absolute left-0 top-4 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-neutral-200 dark:border-gray-700 p-4 overflow-y-auto max-h-[calc(100vh-32px)] z-20 ml-4 transition-all duration-300 ease-in-out transform hover:shadow-xl">
            {/* 目录头部 - 包含标题和统计信息 */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary-500 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="9" x2="20" y2="9" />
                  <line x1="4" y1="15" x2="20" y2="15" />
                  <line x1="10" y1="3" x2="10" y2="9" />
                  <line x1="10" y1="15" x2="10" y2="21" />
                </svg>
                目录
              </h3>
              {tableOfContentsItems.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  {tableOfContentsItems.length} 个标题
                </span>
              )}
            </div>

            {tableOfContentsItems.length > 0 ? (
              <nav className="space-y-1">
                {/* 滚动进度条容器 */}
                <div className="relative mb-3">
                  <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    {/* 找到第一个活跃且未滚动过的项，计算进度 */}
                    {(() => {
                      const activeIndex = tableOfContentsItems.findIndex(item => item.isActive && !item.isScrolledOver);
                      const progress = activeIndex >= 0 ? ((activeIndex + 1) / tableOfContentsItems.length) * 100 : 0;
                      return (
                        <div
                          className="h-full bg-primary-500 dark:bg-primary-400 rounded-full transition-all duration-300 ease-out"
                          style={{ 'width': `${progress}%` }}
                        ></div>
                      );
                    })()}
                  </div>
                </div>

                {(() => {
                  // 生成层级编号的函数
                  const generateTocNumber = (
                    items: Array<{ id: string; textContent: string; level: number; itemIndex: number; isActive: boolean; isScrolledOver: boolean }>,
                    currentItem: { id: string; textContent: string; level: number; itemIndex: number; isActive: boolean; isScrolledOver: boolean }
                  ) => {
                    const numberParts: number[] = [];
                    let currentLevel = currentItem.level;
                    let currentIndex = items.indexOf(currentItem);

                    // 从当前项向上遍历，收集各级别索引
                    while (currentLevel > 0 && currentIndex >= 0) {
                      const item = items[currentIndex];
                      if (item && item.level === currentLevel) {
                        numberParts.unshift(item.itemIndex);
                        currentLevel -= 1;
                      }
                      currentIndex -= 1;
                    }

                    return numberParts.join('.');
                  };

                  return tableOfContentsItems.map((item) => {
                    // 计算样式类
                    let itemClass = 'cursor-pointer px-3 py-2.5 rounded-lg transition-all duration-250 ease-in-out transform hover:translate-x-1';
                    if (item.isActive && !item.isScrolledOver) {
                      itemClass += ' bg-primary-50 border-l-4 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:border-primary-400 dark:text-primary-300 shadow-md';
                    } else if (item.isScrolledOver) {
                      itemClass += ' text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300';
                    } else {
                      itemClass += ' hover:bg-gray-50 dark:hover:bg-gray-800 text-neutral-700 dark:text-neutral-300 hover:shadow-sm';
                    }

                    // 计算标题级别样式 - 实现左对齐+逐级缩进+数字编号
                    let fontSize = 'text-base';
                    let fontWeight = 'font-semibold';
                    let levelNumberClass = 'flex-shrink-0 mr-2';

                    // 根据标题级别调整样式
                    switch (item.level) {
                      case 1:
                        fontSize = 'text-base';
                        fontWeight = 'font-semibold';
                        levelNumberClass = 'font-semibold text-primary-600 dark:text-primary-400 flex-shrink-0 mr-2';
                        break;
                      case 2:
                        fontSize = 'text-sm';
                        fontWeight = 'font-medium';
                        levelNumberClass = 'text-sm font-medium text-secondary-500 dark:text-secondary-400 flex-shrink-0 mr-2';
                        break;
                      case 3:
                        fontSize = 'text-xs';
                        fontWeight = 'font-medium';
                        levelNumberClass = 'text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0 mr-2';
                        break;
                      case 5:
                        fontSize = 'text-xs';
                        fontWeight = 'font-light';
                        levelNumberClass = 'text-xs font-light text-gray-400 dark:text-gray-500 flex-shrink-0 mr-2';
                        break;
                      default:
                        fontSize = 'text-xs';
                        fontWeight = 'font-light';
                        levelNumberClass = 'text-xs font-light text-gray-300 dark:text-gray-600 flex-shrink-0 mr-2';
                    }

                    // 生成层级编号
                    const tocNumber = generateTocNumber(tableOfContentsItems, item);

                    return (
                      <div
                        key={item.id}
                        className={`${itemClass} group`}
                        style={{
                          'paddingLeft': `${(item.level - 1) * 12}px`,
                          'overflow': 'hidden'
                        }}
                        onClick={() => {
                          const element = editor.view.dom.querySelector(`[data-toc-id="${item.id}"]`);
                          if (element) {
                            // 滚动到元素位置
                            window.scrollTo({
                              'top': element.getBoundingClientRect().top + window.scrollY - 100,
                              'behavior': 'smooth'
                            });
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 min-h-[26px]">
                          {/* 章节编号 - 所有级别都显示数字 */}
                          <span className={levelNumberClass}>
                            {tocNumber}{item.level === 1 ? '.' : ''}
                          </span>

                          {/* 标题文本 - 左对齐，根据级别调整样式 */}
                          <span
                            className={`truncate transition-all duration-300 max-w-[calc(100%-1rem)] ${fontSize} ${fontWeight} text-left flex-1`}
                            title={item.textContent}
                          >{item.textContent}</span>

                          {/* 当前活跃状态指示器 */}
                          {item.isActive && !item.isScrolledOver && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary-500 dark:text-primary-400 ml-auto flex-shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </nav>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4 opacity-75">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                    <line x1="10" y1="17" x2="10" y2="17" />
                  </svg>
                </div>
                <p className="text-sm font-medium">暂无标题</p>
                <p className="text-xs mt-2 opacity-75">添加标题后将自动生成目录</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs flex items-center gap-1">
                    <span className="font-mono">#</span>
                    <span>一级标题</span>
                  </div>
                  <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs flex items-center gap-1">
                    <span className="font-mono">##</span>
                    <span>二级标题</span>
                  </div>
                  <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs flex items-center gap-1">
                    <span className="font-mono">###</span>
                    <span>三级标题</span>
                  </div>
                </div>
              </div>
            )}

            {/* 目录底部提示 */}
            {tableOfContentsItems.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  点击标题快速跳转到对应位置
                </p>
              </div>
            )}
          </div>
        )}

        {/* 编辑区域 - 作为主要内容，固定宽度，不受目录影响 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
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

              {/* 字数统计 */}
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">{characterCount} 字</span>
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

          {/* 编辑器区域 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-neutral-200 dark:border-gray-700 transition-all hover:shadow-md">
            {/* 编辑器工具栏 */}
            <div className="mb-2 p-2 bg-white dark:bg-gray-800 rounded-t-lg border border-neutral-200 dark:border-gray-700 border-b-0">
              <div className="flex flex-wrap items-center gap-1">
                {/* 标题下拉菜单 */}
                <div className="relative menu-container group">
                  <button
                    onMouseEnter={() => handleMenuEnter('heading')}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-16"
                    aria-label="标题"
                  >
                    <Heading1 size={16} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">标题</span>
                  </button>
                  {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
                  <div
                    className="absolute left-0 right-0 h-2 top-full mt-0.5"
                    onMouseEnter={() => handleMenuEnter('heading')}
                  ></div>
                  {/* 菜单区域 */}
                  <div
                    className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                    style={{ 'display': activeMenu === 'heading' ? 'block' : 'none' }}
                    onMouseEnter={() => handleMenuEnter('heading')}
                    onMouseLeave={() => handleMenuLeave('heading')}
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
                    onMouseLeave={() => handleMenuLeave('heading')}
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
                    onMouseEnter={() => handleMenuEnter('align')}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-16"
                    aria-label="对齐方式"
                  >
                    <AlignLeft size={16} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">对齐</span>
                  </button>
                  {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
                  <div
                    className="absolute left-0 right-0 h-2 top-full mt-0.5"
                    onMouseEnter={() => handleMenuEnter('align')}
                  ></div>
                  {/* 菜单区域 */}
                  <div
                    className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                    style={{ 'display': activeMenu === 'align' ? 'block' : 'none' }}
                    onMouseEnter={() => handleMenuEnter('align')}
                    onMouseLeave={() => handleMenuLeave('align')}
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
                    onMouseLeave={() => handleMenuLeave('align')}
                  ></div>
                </div>

                <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

                {/* 字体颜色和背景色 */}
                <div className="relative menu-container group">
                  <div className="flex items-center gap-1">
                    {/* 字体颜色选择器 */}
                    <div className="relative">
                      <button
                        onMouseEnter={() => handleMenuEnter('color')}
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
                        onMouseEnter={() => handleMenuEnter('color')}
                      ></div>
                      {/* 菜单区域 - 使用tui-color-picker */}
                      <div
                        className="absolute left-0 mt-1 w-[280px] bg-white dark:bg-gray-800 rounded-md shadow-lg py-4 px-3 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                        style={{ 'display': activeMenu === 'color' ? 'block' : 'none' }}
                        onMouseEnter={() => handleMenuEnter('color')}
                        onMouseLeave={() => handleMenuLeave('color')}
                      >
                        <div className="mb-3">
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">字体颜色</h3>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                              style={{ 'backgroundColor': editor?.getAttributes('textStyle').color || '#000000' }}
                              onClick={(e) => {
                                const container = document.createElement('div');
                                container.style.position = 'absolute';
                                container.style.top = '0';
                                container.style.left = '0';
                                container.style.zIndex = '1001';
                                container.style.backgroundColor = 'white';
                                container.style.border = '1px solid #e5e7eb';
                                container.style.borderRadius = '0.375rem';
                                container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                                container.style.padding = '4px';
                                e.currentTarget.parentElement?.appendChild(container);

                                const picker = colorPicker.create({
                                  container,
                                  'color': editor?.getAttributes('textStyle').color || '#000000'
                                });

                                picker.on('selectColor', (event: { color: string }) => {
                                  editor?.chain().focus()
                                    .setColor(event.color)
                                    .run();
                                });
                                const handleClickOutside = (event: MouseEvent) => {
                                  if (container && !container.contains(event.target as Node)) {
                                    try {
                                      picker.destroy();
                                    } catch {
                                      // 忽略 destroy 错误，可能 picker 已经被销毁
                                    }
                                    container.remove();
                                  }
                                };
                                document.addEventListener('mousedown', handleClickOutside);

                                picker.on('hide', () => {
                                  document.removeEventListener('mousedown', handleClickOutside);
                                  container.remove();
                                });
                              }}
                            ></div>
                            <input
                              type="text"
                              value={editor?.getAttributes('textStyle').color || '#000000'}
                              onChange={(e) => {
                                editor?.chain().focus()
                                  .setColor(e.target.value)
                                  .run();
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">背景颜色</h3>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                              style={{ 'backgroundColor': editor?.getAttributes('textStyle').backgroundColor || 'transparent' }}
                              onClick={(e) => {
                                const container = document.createElement('div');
                                container.style.position = 'absolute';
                                container.style.top = '0';
                                container.style.left = '0';
                                container.style.zIndex = '1001';
                                container.style.backgroundColor = 'white';
                                container.style.border = '1px solid #e5e7eb';
                                container.style.borderRadius = '0.375rem';
                                container.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                                container.style.padding = '4px';
                                e.currentTarget.parentElement?.appendChild(container);

                                const picker = colorPicker.create({
                                  container,
                                  'color': editor?.getAttributes('textStyle').backgroundColor || '#ffffff'
                                });

                                picker.on('selectColor', (event: { color: string }) => {
                                  editor?.chain().focus()
                                    .setBackgroundColor(event.color)
                                    .run();
                                });

                                const handleClickOutside = (event: MouseEvent) => {
                                  if (container && !container.contains(event.target as Node)) {
                                    try {
                                      picker.destroy();
                                    } catch {
                                      // 忽略 destroy 错误，可能 picker 已经被销毁
                                    }
                                    container.remove();
                                  }
                                };

                                document.addEventListener('mousedown', handleClickOutside);

                                picker.on('hide', () => {
                                  document.removeEventListener('mousedown', handleClickOutside);
                                  container.remove();
                                });
                              }}
                            ></div>
                            <input
                              type="text"
                              value={editor?.getAttributes('textStyle').backgroundColor || 'transparent'}
                              onChange={(e) => {
                                const color = e.target.value;
                                if (color === 'transparent') {
                                  editor?.chain().focus()
                                    .unsetBackgroundColor()
                                    .run();
                                } else {
                                  editor?.chain().focus()
                                    .setBackgroundColor(color)
                                    .run();
                                }
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => editor?.chain().focus()
                              .unsetColor()
                              .run()}
                            className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                        清除颜色
                          </button>
                          <button
                            onClick={() => editor?.chain().focus()
                              .unsetBackgroundColor()
                              .run()}
                            className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                        清除背景
                          </button>
                        </div>
                      </div>
                      {/* 监听整个菜单容器的鼠标离开事件 */}
                      <div
                        className="absolute inset-0 top-full left-0 right-0 h-[calc(100%+1rem)]"
                        onMouseLeave={() => handleMenuLeave('color')}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 字体选择 */}
                <div className="relative menu-container group">
                  <button
                    onMouseEnter={() => handleMenuEnter('font')}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                    aria-label="字体选择"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">Aa</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">字体</span>
                  </button>
                  {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
                  <div
                    className="absolute left-0 right-0 h-2 top-full mt-0.5"
                    onMouseEnter={() => handleMenuEnter('font')}
                  ></div>
                  {/* 菜单区域 */}
                  <div
                    className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-2 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                    style={{ 'display': activeMenu === 'font' ? 'block' : 'none' }}
                    onMouseEnter={() => handleMenuEnter('font')}
                    onMouseLeave={() => handleMenuLeave('font')}
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
                    onMouseLeave={() => handleMenuLeave('font')}
                  ></div>
                </div>

                {/* 字体大小 */}
                <div className="relative menu-container group">
                  <button
                    onMouseEnter={() => handleMenuEnter('fontSize')}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                    aria-label="字体大小"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">12px</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">字号</span>
                  </button>
                  {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
                  <div
                    className="absolute left-0 right-0 h-2 top-full mt-0.5"
                    onMouseEnter={() => handleMenuEnter('fontSize')}
                  ></div>
                  {/* 菜单区域 */}
                  <div
                    className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-2 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                    style={{ 'display': activeMenu === 'fontSize' ? 'block' : 'none' }}
                    onMouseEnter={() => handleMenuEnter('fontSize')}
                    onMouseLeave={() => handleMenuLeave('fontSize')}
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
                    onMouseLeave={() => handleMenuLeave('fontSize')}
                  ></div>
                </div>

                {/* 行高 */}
                <div className="relative menu-container group">
                  <button
                    onMouseEnter={() => handleMenuEnter('lineHeight')}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                    aria-label="行高"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">Aa</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">行高</span>
                  </button>
                  {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
                  <div
                    className="absolute left-0 right-0 h-2 top-full mt-0.5"
                    onMouseEnter={() => handleMenuEnter('lineHeight')}
                  ></div>
                  {/* 菜单区域 */}
                  <div
                    className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-2 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
                    style={{ 'display': activeMenu === 'lineHeight' ? 'block' : 'none' }}
                    onMouseEnter={() => handleMenuEnter('lineHeight')}
                    onMouseLeave={() => handleMenuLeave('lineHeight')}
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
                    onMouseLeave={() => handleMenuLeave('lineHeight')}
                  ></div>
                </div>

                <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

                {/* 列表按钮 */}
                <div className="relative menu-container group">
                  <button
                    onMouseEnter={() => handleMenuEnter('list')}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                    aria-label="列表"
                  >
                    <List size={16} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">列表</span>
                  </button>
                  {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
                  <div
                    className="absolute left-0 right-0 h-2 top-full mt-0.5"
                    onMouseEnter={() => handleMenuEnter('list')}
                  ></div>
                  {/* 菜单区域 */}
                  <div
                    className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                    style={{ 'display': activeMenu === 'list' ? 'block' : 'none' }}
                    onMouseEnter={() => handleMenuEnter('list')}
                    onMouseLeave={() => handleMenuLeave('list')}
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
                    onMouseLeave={() => handleMenuLeave('list')}
                  ></div>
                </div>

                <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

                {/* 数学公式菜单 */}
                <div className="relative menu-container group">
                  <button
                    onMouseEnter={() => handleMenuEnter('math')}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                    aria-label="数学公式"
                  >
                    <Calculator size={16} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">公式</span>
                  </button>
                  {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
                  <div
                    className="absolute left-0 right-0 h-2 top-full mt-0.5"
                    onMouseEnter={() => handleMenuEnter('math')}
                  ></div>
                  {/* 菜单区域 */}
                  <div
                    className="absolute left-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                    style={{ 'display': activeMenu === 'math' ? 'block' : 'none' }}
                    onMouseEnter={() => handleMenuEnter('math')}
                    onMouseLeave={() => handleMenuLeave('math')}
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
                    onMouseLeave={() => handleMenuLeave('math')}
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
                    onMouseEnter={() => handleMenuEnter('table')}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16"
                    aria-label="表格操作"
                  >
                    <Plus size={16} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">表格操作</span>
                  </button>
                  {/* 连接区域 - 确保鼠标可以从按钮平滑移动到菜单 */}
                  <div
                    className="absolute left-0 right-0 h-2 top-full mt-0.5"
                    onMouseEnter={() => handleMenuEnter('table')}
                  ></div>
                  {/* 菜单区域 */}
                  <div
                    className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                    style={{ 'display': activeMenu === 'table' ? 'block' : 'none' }}
                    onMouseEnter={() => handleMenuEnter('table')}
                    onMouseLeave={() => handleMenuLeave('table')}
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
                    onMouseLeave={() => handleMenuLeave('table')}
                  ></div>
                </div>

                <span className="w-px h-12 bg-gray-300 dark:bg-gray-700 mx-1"></span>

                {/* 目录开关按钮 */}
                <button
                  onClick={() => setShowTableOfContents(!showTableOfContents)}
                  className={`flex flex-col items-center justify-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 w-16 ${showTableOfContents ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : ''}`}
                  aria-label={showTableOfContents ? '隐藏目录' : '显示目录'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="9" x2="20" y2="9" />
                    <line x1="4" y1="15" x2="20" y2="15" />
                    <line x1="10" y1="3" x2="10" y2="9" />
                    <line x1="10" y1="15" x2="10" y2="21" />
                  </svg>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">目录</span>
                </button>

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

            {/* 编辑器主容器 */}
            <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-sm border border-neutral-200 dark:border-gray-700 transition-all hover:shadow-md">
              {/* 编辑区域 */}
              <div>
                {/* Bubble Menu - 选中文本时显示 */}
                {editor && (
                  <BubbleMenu
                    editor={editor}
                    shouldShow={({ 'state': editorState }) => {
                      // 只在选中文本时显示，且选中范围长度大于0
                      const { selection } = editorState;
                      if (selection.empty) {
                        return false;
                      }

                      // 优化：避免调用昂贵的textBetween，直接检查选中范围长度
                      // 对于大批量文本选择，textBetween操作会导致长任务
                      const { from, to } = selection;
                      const selectionLength = to - from;

                      // 只在有实际选中范围时显示
                      return selectionLength > 0;
                    }}
                    className="transition-all duration-200 ease-in-out"
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

                      // 检查当前节点类型是否允许
                      const nodeName = $anchor.parent.type.name;
                      if (!allowedNodeTypes.includes(nodeName)) {
                        return false;
                      }

                      // 对于标题节点，确保是有效的标题级别（1-6）
                      if (nodeName === 'heading') {
                        const level = $anchor.parent.attrs.level;
                        if (typeof level !== 'number' || level < 1 || level > 6) {
                          return false;
                        }
                      }

                      return true;
                    }}
                    className="transition-all duration-200 ease-in-out"
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
                            fn: ({ x, y }: { x: number; y: number }) => {
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
            </div>
          </div>
        </div>
      </div>
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


