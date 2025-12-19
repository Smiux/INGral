import { useState } from 'react';
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Link2, Image,
  Heading1, Heading2, Heading3, Table, Calculator, GitBranch, BookMarked,
  BookOpen, BarChart3, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  RotateCcw, RotateCw,
  Layers2, FileCode2, CheckSquare, Square, Type, Footprints, Highlighter,
  ArrowUpCircle, ArrowDownCircle, Music, ChevronDown, ChevronRight,
  FileText, MessageSquare, Send
} from 'lucide-react';

interface EditorFormattingToolbarProps {
  onFormat: (_formatType: string, _data?: Record<string, unknown>) => void;
  onCopyFormat: () => void;
  onPasteFormat: () => void;
  onToggleFormatBrush: () => void;
  isFormatBrushActive: boolean;
}

/**
 * 编辑器格式化工具栏组件
 * 提供各种文本格式化功能按钮
 */
export function EditorFormattingToolbar ({ onFormat, onCopyFormat, onPasteFormat, onToggleFormatBrush, isFormatBrushActive }: EditorFormattingToolbarProps) {
  // 代码语言下拉菜单状态
  const [showCodeLanguageDropdown, setShowCodeLanguageDropdown] = useState(false);
  // 表格尺寸下拉菜单状态
  const [showTableSizeDropdown, setShowTableSizeDropdown] = useState(false);
  // 对齐方式下拉菜单状态
  const [showAlignmentDropdown, setShowAlignmentDropdown] = useState(false);
  // 扩展语法下拉菜单状态
  const [showExtensionDropdown, setShowExtensionDropdown] = useState(false);
  // 标题层级下拉菜单状态
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  // 列表类型下拉菜单状态
  const [showListDropdown, setShowListDropdown] = useState(false);

  // 常用编程语言列表
  const programmingLanguages = [
    'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'html', 'css', 'json',
    'xml', 'yaml', 'sql', 'bash', 'markdown', 'plaintext'
  ];

  // 表格尺寸选项
  const tableSizes = [
    { 'rows': 2, 'cols': 2 },
    { 'rows': 2, 'cols': 3 },
    { 'rows': 2, 'cols': 4 },
    { 'rows': 3, 'cols': 2 },
    { 'rows': 3, 'cols': 3 },
    { 'rows': 3, 'cols': 4 },
    { 'rows': 4, 'cols': 3 },
    { 'rows': 4, 'cols': 4 }
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 px-3 py-1 flex flex-wrap items-center gap-1 transition-all duration-200">
      {/* 文本格式化 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFormat('bold')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm active:scale-95 active:bg-gray-300 dark:active:bg-gray-600 flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="加粗 (Ctrl+B)"
          aria-label="加粗"
        >
          <Bold size={14} />
          <span>加粗</span>
        </button>
        <button
          onClick={() => onFormat('italic')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm active:scale-95 active:bg-gray-300 dark:active:bg-gray-600 flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="斜体 (Ctrl+I)"
          aria-label="斜体"
        >
          <Italic size={14} />
          <span>斜体</span>
        </button>
        <button
          onClick={() => onFormat('strikethrough')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm active:scale-95 active:bg-gray-300 dark:active:bg-gray-600 flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="删除线"
          aria-label="删除线"
        >
          <Strikethrough size={14} />
          <span>删除线</span>
        </button>
        <button
          onClick={() => onFormat('code')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="行内代码"
          aria-label="行内代码"
        >
          <Code size={14} />
          <span>行内代码</span>
        </button>
      </div>

      {/* 格式刷 */}
      <div className="flex items-center gap-1">
        <button
          onClick={onCopyFormat}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="复制格式 (Ctrl+Shift+C)"
          aria-label="复制格式"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <span>复制格式</span>
        </button>
        <button
          onClick={onPasteFormat}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="粘贴格式 (Ctrl+Shift+V)"
          aria-label="粘贴格式"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          </svg>
          <span>粘贴格式</span>
        </button>
        <button
          onClick={onToggleFormatBrush}
          className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150 flex items-center gap-1.5 text-xs whitespace-nowrap ${isFormatBrushActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700 shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:shadow-sm'}`}
          title={isFormatBrushActive ? '关闭格式刷' : '格式刷'}
          aria-label="格式刷"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
          </svg>
          <span>格式刷</span>
        </button>
      </div>

      {/* 分隔线 */}
      <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

      {/* 标题层级下拉菜单 */}
      <div className="relative">
        <button
          onClick={() => setShowHeadingDropdown(!showHeadingDropdown)}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="标题层级"
          aria-label="标题层级"
        >
          <Type size={14} />
          <span>标题</span>
        </button>
        {/* 标题层级下拉菜单 */}
        {showHeadingDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 min-w-[140px] py-1 opacity-100 visible translate-y-0 transition-all duration-200 ease-out" style={{'animation': 'fadeIn 0.2s ease-out, slideDown 0.2s ease-out'}}>
            <button
              onClick={() => {
                onFormat('h1');
                setShowHeadingDropdown(false);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
            >
              <Heading1 size={14} />
              <span>一级标题</span>
            </button>
            <button
              onClick={() => {
                onFormat('h2');
                setShowHeadingDropdown(false);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
            >
              <Heading2 size={14} />
              <span>二级标题</span>
            </button>
            <button
              onClick={() => {
                onFormat('h3');
                setShowHeadingDropdown(false);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
            >
              <Heading3 size={14} />
              <span>三级标题</span>
            </button>
          </div>
        )}
      </div>

      {/* 列表类型下拉菜单 */}
      <div className="relative">
        <button
          onClick={() => setShowListDropdown(!showListDropdown)}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="列表类型"
          aria-label="列表类型"
        >
          <List size={14} />
          <span>列表</span>
        </button>
        {/* 列表类型下拉菜单 */}
        {showListDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 min-w-[140px] py-1 opacity-100 visible translate-y-0 transition-all duration-200 ease-out" style={{'animation': 'fadeIn 0.2s ease-out, slideDown 0.2s ease-out'}}>
            <button
              onClick={() => {
                onFormat('ul');
                setShowListDropdown(false);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
            >
              <List size={14} />
              <span>无序列表</span>
            </button>
            <button
              onClick={() => {
                onFormat('ol');
                setShowListDropdown(false);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
            >
              <ListOrdered size={14} />
              <span>有序列表</span>
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => onFormat('quote')}
        className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
        title="引用 (Ctrl+Shift+Q)"
        aria-label="引用"
      >
        <Quote size={14} />
        <span>引用</span>
      </button>

      {/* 对齐方式 */}
      <div className="relative">
        <button
          onClick={() => setShowAlignmentDropdown(!showAlignmentDropdown)}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="对齐方式"
          aria-label="对齐方式"
        >
          <AlignLeft size={14} />
          <span>对齐</span>
        </button>
        {/* 对齐方式下拉菜单 */}
        {showAlignmentDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 min-w-[140px] py-1 opacity-100 visible translate-y-0 transition-all duration-200 ease-out" style={{'animation': 'fadeIn 0.2s ease-out, slideDown 0.2s ease-out'}}>
            <button
              onClick={() => {
                onFormat('align-left');
                setShowAlignmentDropdown(false);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
            >
              <AlignLeft size={14} />
              <span>左对齐</span>
            </button>
            <button
              onClick={() => {
                onFormat('align-center');
                setShowAlignmentDropdown(false);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
            >
              <AlignCenter size={14} />
              <span>居中对齐</span>
            </button>
            <button
              onClick={() => {
                onFormat('align-right');
                setShowAlignmentDropdown(false);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
            >
              <AlignRight size={14} />
              <span>右对齐</span>
            </button>
            <button
              onClick={() => {
                onFormat('align-justify');
                setShowAlignmentDropdown(false);
              }}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
            >
              <AlignJustify size={14} />
              <span>两端对齐</span>
            </button>
          </div>
        )}
      </div>

      {/* 分隔线 */}
      <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

      {/* 代码块 */}
      <div className="relative">
        <button
          onClick={() => setShowCodeLanguageDropdown(!showCodeLanguageDropdown)}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="代码块 (Ctrl+Shift+K)"
          aria-label="代码块"
        >
          <FileCode2 size={14} />
          <span>代码块</span>
        </button>
        {/* 语法选择下拉菜单 */}
        {showCodeLanguageDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 min-w-[180px] py-1 max-h-[250px] overflow-y-auto opacity-100 visible translate-y-0 transition-all duration-200 ease-out" style={{'animation': 'fadeIn 0.2s ease-out, slideDown 0.2s ease-out'}}>
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">选择编程语言:</div>
            {programmingLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  onFormat('codeblock', { 'language': lang });
                  setShowCodeLanguageDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 媒体和链接 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFormat('link')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="链接"
          aria-label="链接"
        >
          <Link2 size={14} />
          <span>链接</span>
        </button>
        <button
          onClick={() => onFormat('image')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="图片"
          aria-label="图片"
        >
          <Image size={14} />
          <span>图片</span>
        </button>
      </div>

      {/* 表格 */}
      <div className="relative">
        <button
          onClick={() => setShowTableSizeDropdown(!showTableSizeDropdown)}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="表格"
          aria-label="表格"
        >
          <Table size={14} />
          <span>表格</span>
        </button>
        {/* 表格尺寸下拉菜单 */}
        {showTableSizeDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 min-w-[180px] py-2 opacity-100 visible translate-y-0 transition-all duration-200 ease-out" style={{'animation': 'fadeIn 0.2s ease-out, slideDown 0.2s ease-out'}}>
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">选择表格尺寸:</div>
            <div className="grid grid-cols-4 gap-1 px-2">
              {tableSizes.map((size, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onFormat('table', { 'rows': size.rows, 'cols': size.cols });
                    setShowTableSizeDropdown(false);
                  }}
                  className="flex items-center justify-center p-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md aspect-square"
                  title={`${size.rows}行 x ${size.cols}列`}
                >
                  <span className="text-xs">{size.rows}×{size.cols}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 分隔线 */}
      <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600"></div>

      {/* 特殊内容 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFormat('latex')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="LaTeX公式"
          aria-label="LaTeX公式"
        >
          <Calculator size={14} />
          <span>公式</span>
        </button>
        <button
          onClick={() => onFormat('sympy-cell')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="SymPy计算单元格"
          aria-label="SymPy计算单元格"
        >
          <BarChart3 size={14} />
          <span>计算</span>
        </button>
        <button
          onClick={() => onFormat('mermaid')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="Mermaid思维导图"
          aria-label="Mermaid思维导图"
        >
          <GitBranch size={14} />
          <span>导图</span>
        </button>
        <button
          onClick={() => onFormat('graph')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="知识图表"
          aria-label="知识图表"
        >
          <Layers2 size={14} />
          <span>图表</span>
        </button>
      </div>

      {/* 扩展语法 */}
      <div className="relative">
        <button
          onClick={() => setShowExtensionDropdown(!showExtensionDropdown)}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="扩展语法"
          aria-label="扩展语法"
        >
          <ChevronDown size={14} />
          <span>更多</span>
        </button>
        {/* 扩展语法下拉菜单 */}
        {showExtensionDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 min-w-[180px] py-1 opacity-100 visible translate-y-0 transition-all duration-200 ease-out" style={{'animation': 'fadeIn 0.2s ease-out, slideDown 0.2s ease-out'}}>
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">扩展语法:</div>

            {/* 列表扩展 */}
            <div className="mt-1 border-t border-gray-200 dark:border-gray-700 pt-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">列表扩展</div>
              <button
                onClick={() => {
                  onFormat('task-list');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <Square size={14} />
                <span>任务列表</span>
              </button>
              <button
                onClick={() => {
                  onFormat('task-list-done');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <CheckSquare size={14} />
                <span>已完成任务</span>
              </button>
              <button
                onClick={() => {
                  onFormat('definition-list');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <Type size={14} />
                <span>定义列表</span>
              </button>
            </div>

            {/* 文本扩展 */}
            <div className="mt-1 border-t border-gray-200 dark:border-gray-700 pt-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">文本扩展</div>
              <button
                onClick={() => {
                  onFormat('footnote');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <Footprints size={14} />
                <span>脚注</span>
              </button>
              <button
                onClick={() => {
                  onFormat('highlight');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <Highlighter size={14} />
                <span>高亮文本</span>
              </button>
              <button
                onClick={() => {
                  onFormat('superscript');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <ArrowUpCircle size={14} />
                <span>上标</span>
              </button>
              <button
                onClick={() => {
                  onFormat('subscript');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <ArrowDownCircle size={14} />
                <span>下标</span>
              </button>
              <button
                onClick={() => {
                  onFormat('emoji');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <MessageSquare size={14} />
                <span>表情符号</span>
              </button>
            </div>

            {/* 媒体扩展 */}
            <div className="mt-1 border-t border-gray-200 dark:border-gray-700 pt-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">媒体扩展</div>
              <button
                onClick={() => {
                  onFormat('audio');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <Music size={14} />
                <span>音频</span>
              </button>
            </div>

            {/* 容器扩展 */}
            <div className="mt-1 border-t border-gray-200 dark:border-gray-700 pt-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">容器扩展</div>
              <button
                onClick={() => {
                  onFormat('collapsible');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <ChevronRight size={14} />
                <span>可折叠区块</span>
              </button>
            </div>

            {/* 图表扩展 */}
            <div className="mt-1 border-t border-gray-200 dark:border-gray-700 pt-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">图表扩展</div>
              <button
                onClick={() => {
                  onFormat('plantuml');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <FileCode2 size={14} />
                <span>PlantUML</span>
              </button>
              <button
                onClick={() => {
                  onFormat('graphviz');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <GitBranch size={14} />
                <span>Graphviz</span>
              </button>
            </div>

            {/* 数学扩展 */}
            <div className="mt-1 border-t border-gray-200 dark:border-gray-700 pt-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">数学扩展</div>
              <button
                onClick={() => {
                  onFormat('math-numbered');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <FileText size={14} />
                <span>带编号公式</span>
              </button>
            </div>

            {/* 链接扩展 */}
            <div className="mt-1 border-t border-gray-200 dark:border-gray-700 pt-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">链接扩展</div>
              <button
                onClick={() => {
                  onFormat('autolink');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <Link2 size={14} />
                <span>自动链接</span>
              </button>
              <button
                onClick={() => {
                  onFormat('email-link');
                  setShowExtensionDropdown(false);
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-md"
              >
                <Send size={14} />
                <span>邮箱链接</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 引用管理 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFormat('insert-citation')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="插入引用"
          aria-label="插入引用"
        >
          <BookMarked size={14} />
          <span>插入引用</span>
        </button>
        <button
          onClick={() => onFormat('generate-bibliography')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="生成参考文献"
          aria-label="生成参考文献"
        >
          <BookOpen size={14} />
          <span>参考文献</span>
        </button>
      </div>



      {/* 撤销/重做 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFormat('undo')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="撤销 (Ctrl+Z)"
          aria-label="撤销"
        >
          <RotateCcw size={14} />
          <span>撤销</span>
        </button>
        <button
          onClick={() => onFormat('redo')}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150 hover:shadow-sm flex items-center gap-1.5 text-xs whitespace-nowrap"
          title="重做 (Ctrl+Y)"
          aria-label="重做"
        >
          <RotateCw size={14} />
          <span>重做</span>
        </button>
      </div>
    </div>
  );
}
