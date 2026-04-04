import React, { useCallback, memo } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Code, List, Heading1,
  Undo, Redo, Link as LinkIcon,
  Strikethrough, Underline as UnderlineIcon, Highlighter,
  Quote, Minus, CodeSquare,
  Plus, ChevronDown, FunctionSquare, Subscript, Superscript, Palette, AlignLeft, CodeXml, ChevronRightSquare
} from 'lucide-react';

const FONTS: Record<string, string> = {
  'Arial': 'Arial',
  'Helvetica': 'Helvetica',
  'Times New Roman': 'Times New Roman',
  'Courier New': 'Courier New',
  'Georgia': 'Georgia',
  'Verdana': 'Verdana',
  'Trebuchet MS': 'Trebuchet MS',
  'Comic Sans MS': 'Comic Sans MS',
  '微软雅黑': '"Microsoft YaHei", sans-serif',
  '宋体': '"SimSun", serif',
  '黑体': '"SimHei", sans-serif',
  '楷体': '"KaiTi", serif',
  '仿宋': '"FangSong", serif',
  '华文黑体': '"STHeiti", "STHeiti Light", "Microsoft YaHei", sans-serif',
  '思源黑体': '"Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
  '思源宋体': '"Source Han Serif SC", "Noto Serif CJK SC", "SimSun", serif'
};
const FONT_SIZES = ['8px', '9px', '10px', '11px', '12px', '13px', '14px', '15px', '16px', '17px', '18px', '19px', '20px', '22px', '24px', '26px', '28px', '30px', '32px', '36px', '40px', '44px', '48px', '54px', '60px', '68px', '76px', '84px', '96px'];
const LINE_HEIGHTS = ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.8', '2.0', '2.2', '2.4', '2.6', '2.8', '3.0'];

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  showMenu?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = memo(({ icon, label, onClick, showMenu }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 w-16"
  >
    <div className="flex items-center gap-1">
      {icon}
      {showMenu !== undefined && (
        <ChevronDown className={`w-4 h-4 text-neutral-600 dark:text-neutral-400 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
      )}
    </div>
    <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{label}</span>
  </button>
));

interface DropdownMenuProps {
  isOpen: boolean;
  children: React.ReactNode;
  width?: string;
  maxHeight?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = memo(({ isOpen, children, width = 'w-32', maxHeight = 'max-h-60' }) => {
  const visibilityClasses = isOpen
    ? 'opacity-100 visible pointer-events-auto'
    : 'opacity-0 invisible pointer-events-none';

  const baseClasses = 'absolute left-0 mt-1 rounded-md py-1 z-10 transition-all duration-200 overflow-y-auto';

  return (
    <div
      className={`${baseClasses} ${width} ${maxHeight} bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 ${visibilityClasses}`}
      style={{ 'top': '100%' }}
    >
      {children}
    </div>
  );
});

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

const ColorPicker: React.FC<ColorPickerProps> = memo(({ color, onChange, label }) => (
  <div className="mb-3">
    <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">{label}</h3>
    <div className="flex items-center gap-3 h-10 rounded-lg border border-neutral-300 dark:border-neutral-600 overflow-hidden">
      <div className="relative w-8 h-8 ml-1 flex-shrink-0">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-neutral-300 dark:border-neutral-600 bg-transparent opacity-0 absolute inset-0"
        />
        <div className="w-8 h-8 rounded border border-neutral-300 dark:border-neutral-600" style={{ 'backgroundColor': color }} />
      </div>
      <input
        type="text"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-sm px-2 py-0 bg-neutral-50 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-0 focus:outline-none h-full"
      />
    </div>
  </div>
));

interface EditorToolbarProps {
  editor: Editor | null;
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
  fontColor: string;
  setFontColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  onLinkClick: () => void;
  onMathClick: (type: 'inline' | 'block') => void;
  onIframeClick: () => void;
}

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

const EditorToolbarInner: React.FC<EditorToolbarProps> = ({
  editor,
  activeMenu,
  setActiveMenu,
  fontColor,
  setFontColor,
  backgroundColor,
  setBackgroundColor,
  onLinkClick,
  onMathClick,
  onIframeClick
}) => {
  const runEditorCommand = useCallback((command: (chain: ReturnType<Editor['chain']>) => void) => {
    if (!editor) {
      return;
    }
    command(editor.chain().focus());
  }, [editor]);

  const toggleHighlight = useCallback(() => {
    if (!editor) {
      return;
    }
    const hasHighlight = editor.getAttributes('textStyle').backgroundColor === '#ffff00';
    if (hasHighlight) {
      runEditorCommand(c => c.unsetBackgroundColor().run());
    } else {
      runEditorCommand(c => c.setBackgroundColor('#ffff00').run());
    }
  }, [editor, runEditorCommand]);

  if (!editor) {
    return null;
  }

  return (
    <div className="mb-2 p-2 bg-white dark:bg-neutral-800 rounded-t-lg border border-neutral-200 dark:border-neutral-700 border-b-0">
      <div className="flex flex-wrap items-center gap-1">
        <div className="relative menu-container">
          <ToolbarButton
            icon={<Heading1 size={16} className="text-neutral-600 dark:text-neutral-400" />}
            label="标题"
            showMenu={activeMenu === 'heading'}
            onClick={() => setActiveMenu(activeMenu === 'heading' ? null : 'heading')}
          />
          <DropdownMenu isOpen={activeMenu === 'heading'}>
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                onClick={() => {
                  runEditorCommand(c => c.toggleHeading({ 'level': level as 1 | 2 | 3 }).run());
                  setActiveMenu(null);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                {getHeadingLabel(level)}
              </button>
            ))}
          </DropdownMenu>
        </div>

        <span className="w-px h-12 bg-neutral-300 dark:bg-neutral-600 mx-1" />

        <button onClick={() => runEditorCommand(c => c.toggleBold().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 w-16">
          <Bold size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">粗体</span>
        </button>
        <button onClick={() => runEditorCommand(c => c.toggleItalic().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 w-16">
          <Italic size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">斜体</span>
        </button>
        <button onClick={() => runEditorCommand(c => c.toggleStrike().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 w-16">
          <Strikethrough size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">删除线</span>
        </button>
        <button onClick={() => runEditorCommand(c => c.toggleUnderline().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 w-16">
          <UnderlineIcon size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">下划线</span>
        </button>
        <button onClick={toggleHighlight} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 w-16">
          <Highlighter size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">高亮</span>
        </button>
        <button onClick={() => runEditorCommand(c => c.toggleCode().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 w-16">
          <Code size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">行内代码</span>
        </button>
        <button onClick={() => runEditorCommand(c => c.toggleSubscript().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 w-16">
          <Subscript size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">下标</span>
        </button>
        <button onClick={() => runEditorCommand(c => c.toggleSuperscript().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 w-16">
          <Superscript size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">上标</span>
        </button>

        <div className="relative menu-container">
          <ToolbarButton
            icon={<AlignLeft size={16} className="text-neutral-600 dark:text-neutral-400" />}
            label="对齐"
            showMenu={activeMenu === 'align'}
            onClick={() => setActiveMenu(activeMenu === 'align' ? null : 'align')}
          />
          <DropdownMenu isOpen={activeMenu === 'align'} width="w-32">
            <button onClick={() => {
              runEditorCommand(c => c.setTextAlign('left').run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">左对齐</button>
            <button onClick={() => {
              runEditorCommand(c => c.setTextAlign('center').run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">居中对齐</button>
            <button onClick={() => {
              runEditorCommand(c => c.setTextAlign('right').run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">右对齐</button>
            <button onClick={() => {
              runEditorCommand(c => c.setTextAlign('justify').run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">两端对齐</button>
          </DropdownMenu>
        </div>

        <span className="w-px h-12 bg-neutral-300 dark:bg-neutral-600 mx-1" />

        <div className="relative menu-container">
          <button
            onClick={() => {
              if (editor) {
                setFontColor(editor.getAttributes('textStyle').color || '#000000');
                setBackgroundColor(editor.getAttributes('textStyle').backgroundColor || '#ffffff');
              }
              setActiveMenu(activeMenu === 'color' ? null : 'color');
            }}
            className={`flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all w-16 ${activeMenu === 'color' ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400' : ''}`}
          >
            <div className="flex items-center gap-1">
              <Palette className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <ChevronDown className={`w-3 h-3 text-neutral-600 dark:text-neutral-400 transition-transform duration-200 ${activeMenu === 'color' ? 'rotate-180' : ''}`} />
            </div>
            <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">颜色</span>
          </button>
          <div className={`absolute left-0 mt-1 w-[280px] bg-white dark:bg-neutral-800 rounded-md py-4 px-3 z-10 transition-all duration-200 border border-neutral-200 dark:border-neutral-700 ${activeMenu === 'color' ? 'opacity-100 visible' : 'opacity-0 invisible'}`} style={{ 'top': '100%' }}>
            <ColorPicker color={fontColor} onChange={(color) => {
              setFontColor(color); runEditorCommand(c => c.setColor(color).run());
            }} label="字体颜色" />
            <ColorPicker color={backgroundColor} onChange={(color) => {
              setBackgroundColor(color); runEditorCommand(c => c.setBackgroundColor(color).run());
            }} label="背景颜色" />
            <div className="border-t border-neutral-200 dark:border-neutral-700 my-3" />
            <div className="flex gap-2">
              <button onClick={() => {
                setFontColor('#000000'); runEditorCommand(c => c.unsetColor().run());
              }} className="flex-1 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">清除颜色</button>
              <button onClick={() => {
                setBackgroundColor('#ffffff'); runEditorCommand(c => c.unsetBackgroundColor().run());
              }} className="flex-1 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">清除背景</button>
            </div>
          </div>
        </div>

        <div className="relative menu-container">
          <ToolbarButton
            icon={<span className="text-sm text-neutral-600 dark:text-neutral-400">Aa</span>}
            label="字体"
            showMenu={activeMenu === 'font'}
            onClick={() => setActiveMenu(activeMenu === 'font' ? null : 'font')}
          />
          <DropdownMenu isOpen={activeMenu === 'font'} width="w-48" maxHeight="max-h-48">
            {Object.entries(FONTS).map(([label, family]) => (
              <button key={label} onClick={() => {
                runEditorCommand(c => c.setFontFamily(family).run()); setActiveMenu(null);
              }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700" style={{ 'fontFamily': family }}>{label}</button>
            ))}
            <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
            <button onClick={() => {
              runEditorCommand(c => c.unsetFontFamily().run()); setActiveMenu(null);
            }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">清除字体</button>
          </DropdownMenu>
        </div>

        <div className="relative menu-container">
          <ToolbarButton
            icon={<span className="text-sm text-neutral-600 dark:text-neutral-400">12px</span>}
            label="字号"
            showMenu={activeMenu === 'fontSize'}
            onClick={() => setActiveMenu(activeMenu === 'fontSize' ? null : 'fontSize')}
          />
          <DropdownMenu isOpen={activeMenu === 'fontSize'} width="w-32">
            {FONT_SIZES.map((size) => (
              <button key={size} onClick={() => {
                runEditorCommand(c => c.setFontSize(size).run()); setActiveMenu(null);
              }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700" style={{ 'fontSize': size }}>{size}</button>
            ))}
            <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
            <button onClick={() => {
              runEditorCommand(c => c.unsetFontSize().run()); setActiveMenu(null);
            }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">清除字号</button>
          </DropdownMenu>
        </div>

        <div className="relative menu-container">
          <ToolbarButton
            icon={<span className="text-sm text-neutral-600 dark:text-neutral-400">Aa</span>}
            label="行高"
            showMenu={activeMenu === 'lineHeight'}
            onClick={() => setActiveMenu(activeMenu === 'lineHeight' ? null : 'lineHeight')}
          />
          <DropdownMenu isOpen={activeMenu === 'lineHeight'} width="w-32">
            {LINE_HEIGHTS.map((height) => (
              <button key={height} onClick={() => {
                runEditorCommand(c => c.updateAttributes('paragraph', { 'lineHeight': height }).run()); setActiveMenu(null);
              }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700" style={{ 'lineHeight': height }}>{height}</button>
            ))}
            <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
            <button onClick={() => {
              runEditorCommand(c => c.updateAttributes('paragraph', { 'lineHeight': null }).run()); setActiveMenu(null);
            }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">清除行高</button>
          </DropdownMenu>
        </div>

        <div className="relative menu-container">
          <ToolbarButton
            icon={<List size={16} className="text-neutral-600 dark:text-neutral-400" />}
            label="列表"
            showMenu={activeMenu === 'list'}
            onClick={() => setActiveMenu(activeMenu === 'list' ? null : 'list')}
          />
          <DropdownMenu isOpen={activeMenu === 'list'}>
            <button onClick={() => {
              runEditorCommand(c => c.toggleBulletList().run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">无序列表</button>
            <button onClick={() => {
              runEditorCommand(c => c.toggleOrderedList().run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">有序列表</button>
          </DropdownMenu>
        </div>

        <div className="relative menu-container">
          <ToolbarButton
            icon={<FunctionSquare size={16} className="text-neutral-600 dark:text-neutral-400" />}
            label="公式"
            showMenu={activeMenu === 'math'}
            onClick={() => setActiveMenu(activeMenu === 'math' ? null : 'math')}
          />
          <DropdownMenu isOpen={activeMenu === 'math'}>
            <button onClick={() => {
              onMathClick('inline'); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">行内公式 </button>
            <button onClick={() => {
              onMathClick('block'); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">公式块</button>
          </DropdownMenu>
        </div>

        <button onClick={() => runEditorCommand(c => c.toggleBlockquote().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all w-16">
          <Quote size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">引用</span>
        </button>
        <button onClick={() => runEditorCommand(c => c.setHorizontalRule().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all w-16">
          <Minus size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">水平线</span>
        </button>
        <button onClick={() => runEditorCommand(c => c.toggleCodeBlock().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all w-16">
          <CodeSquare size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">代码块</span>
        </button>

        <button onClick={() => runEditorCommand(c => c.insertCollapsible().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all w-16">
          <ChevronRightSquare size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">折叠</span>
        </button>

        <button onClick={onLinkClick} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all w-16">
          <LinkIcon size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">链接</span>
        </button>
        <button onClick={onIframeClick} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all w-16">
          <CodeXml size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">嵌入</span>
        </button>
        <button onClick={() => runEditorCommand(c => c.insertTable({ 'rows': 3, 'cols': 3, 'withHeaderRow': true }).run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all w-16">
          <Plus size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">表格</span>
        </button>

        <div className="relative menu-container">
          <ToolbarButton
            icon={<Plus size={16} className="text-neutral-600 dark:text-neutral-400" />}
            label="表格操作"
            showMenu={activeMenu === 'table'}
            onClick={() => setActiveMenu(activeMenu === 'table' ? null : 'table')}
          />
          <DropdownMenu isOpen={activeMenu === 'table'} width="w-48">
            <button onClick={() => {
              runEditorCommand(c => c.addColumnBefore().run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">添加列 (左)</button>
            <button onClick={() => {
              runEditorCommand(c => c.addColumnAfter().run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">添加列 (右)</button>
            <button onClick={() => {
              runEditorCommand(c => c.deleteColumn().run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">删除列</button>
            <button onClick={() => {
              runEditorCommand(c => c.addRowBefore().run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">添加行 (上)</button>
            <button onClick={() => {
              runEditorCommand(c => c.addRowAfter().run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">添加行 (下)</button>
            <button onClick={() => {
              runEditorCommand(c => c.deleteRow().run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">删除行</button>
            <button onClick={() => {
              runEditorCommand(c => c.deleteTable().run()); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">删除表格</button>
          </DropdownMenu>
        </div>

        <span className="w-px h-12 bg-neutral-300 dark:bg-neutral-600 mx-1" />

        <button onClick={() => runEditorCommand(c => c.undo().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all w-16">
          <Undo size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">撤销</span>
        </button>
        <button onClick={() => runEditorCommand(c => c.redo().run())} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all w-16">
          <Redo size={16} className="text-neutral-600 dark:text-neutral-400 mx-auto" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">重做</span>
        </button>
      </div>
    </div>
  );
};

export const EditorToolbar = memo(EditorToolbarInner);
