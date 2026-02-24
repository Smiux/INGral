import React, { useCallback, memo } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Code, List, Heading1,
  Undo, Redo, Link as LinkIcon,
  Strikethrough, Underline as UnderlineIcon, Highlighter,
  Quote, Minus, CodeSquare,
  AlignLeft,
  Plus, ChevronDown, FunctionSquare, Subscript, Superscript, ListTree, Palette
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
  'Microsoft YaHei': '微软雅黑',
  'SimSun': '宋体',
  'SimHei': '黑体',
  'KaiTi': '楷体',
  'FangSong': '仿宋',
  'STHeiti': '华文黑体',
  'Source Han Sans': '思源黑体',
  'Source Han Serif': '思源宋体'
};
const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
const LINE_HEIGHTS = ['1.0', '1.2', '1.4', '1.6', '1.8', '2.0', '2.4'];

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  showMenu?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = memo(({ icon, label, onClick, showMenu }) => (
  <button
    onClick={onClick}
    className={'flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all duration-200 w-16'}
  >
    <div className="flex items-center gap-1">
      {icon}
      {showMenu !== undefined && (
        <ChevronDown className={`w-4 h-4 text-neutral-600 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
      )}
    </div>
    <span className="text-xs text-neutral-600 mt-1">{label}</span>
  </button>
));

interface DropdownMenuProps {
  isOpen: boolean;
  children: React.ReactNode;
  width?: string;
  maxHeight?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = memo(({ isOpen, children, width = 'w-32', maxHeight = 'max-h-60' }) => (
  <div
    className={`absolute left-0 mt-1 ${width} ${maxHeight} bg-white rounded-md py-1 z-10 transition-all duration-200 border border-neutral-200 overflow-y-auto ${
      isOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'
    }`}
    style={{ 'top': '100%' }}
  >
    {children}
  </div>
));

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

const ColorPicker: React.FC<ColorPickerProps> = memo(({ color, onChange, label }) => (
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
));

interface EditorToolbarProps {
  editor: Editor | null;
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
  fontColor: string;
  setFontColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  showTableOfContents: boolean;
  onToggleTableOfContents: () => void;
  onLinkClick: () => void;
  onMathClick: (type: 'inline' | 'block') => void;
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
  showTableOfContents,
  onToggleTableOfContents,
  onLinkClick,
  onMathClick
}) => {
  const toggleHighlight = useCallback(() => {
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
  }, [editor]);

  const handleLink = useCallback(() => {
    onLinkClick();
  }, [onLinkClick]);

  const handleMathInline = useCallback(() => {
    onMathClick('inline');
    setActiveMenu(null);
  }, [onMathClick, setActiveMenu]);

  const handleMathBlock = useCallback(() => {
    onMathClick('block');
    setActiveMenu(null);
  }, [onMathClick, setActiveMenu]);

  if (!editor) {
    return null;
  }

  return (
    <div className="mb-2 p-2 bg-white rounded-t-lg border border-neutral-200 border-b-0">
      <div className="flex flex-wrap items-center gap-1">
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
                  editor.chain().focus()
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

        {[
          { 'icon': <Bold size={16} />, 'label': '粗体', 'action': () => editor.chain().focus()
            .toggleBold()
            .run() },
          { 'icon': <Italic size={16} />, 'label': '斜体', 'action': () => editor.chain().focus()
            .toggleItalic()
            .run() },
          { 'icon': <Strikethrough size={16} />, 'label': '删除线', 'action': () => editor.chain().focus()
            .toggleStrike()
            .run() },
          { 'icon': <UnderlineIcon size={16} />, 'label': '下划线', 'action': () => editor.chain().focus()
            .toggleUnderline()
            .run() },
          { 'icon': <Highlighter size={16} />, 'label': '高亮', 'action': toggleHighlight },
          { 'icon': <Code size={16} />, 'label': '行内代码', 'action': () => editor.chain().focus()
            .toggleCode()
            .run() },
          { 'icon': <Subscript size={16} />, 'label': '下标', 'action': () => editor.chain().focus()
            .toggleSubscript()
            .run() },
          { 'icon': <Superscript size={16} />, 'label': '上标', 'action': () => editor.chain().focus()
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

        <div className="relative menu-container">
          <ToolbarButton
            icon={<AlignLeft size={16} className="text-neutral-600" />}
            label="对齐"
            showMenu={activeMenu === 'align'}
            onClick={() => setActiveMenu(activeMenu === 'align' ? null : 'align')}
          />
          <DropdownMenu isOpen={activeMenu === 'align'} width="w-32">
            {[
              { 'label': '左对齐', 'action': () => editor.chain().focus()
                .setTextAlign('left')
                .run() },
              { 'label': '居中对齐', 'action': () => editor.chain().focus()
                .setTextAlign('center')
                .run() },
              { 'label': '右对齐', 'action': () => editor.chain().focus()
                .setTextAlign('right')
                .run() },
              { 'label': '两端对齐', 'action': () => editor.chain().focus()
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

        <div className="relative menu-container">
          <button
            onClick={() => {
              if (editor) {
                setFontColor(editor.getAttributes('textStyle').color || '#000000');
                setBackgroundColor(editor.getAttributes('textStyle').backgroundColor || '#ffffff');
              }
              setActiveMenu(activeMenu === 'color' ? null : 'color');
            }}
            className={`flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16 ${activeMenu === 'color' ? 'bg-primary-50 text-primary-600' : ''}`}
          >
            <div className="flex items-center gap-1">
              <Palette className="w-4 h-4 text-neutral-600" />
              <ChevronDown className={`w-3 h-3 text-neutral-600 transition-transform duration-200 ${activeMenu === 'color' ? 'rotate-180' : ''}`} />
            </div>
            <span className="text-xs text-neutral-600 mt-1">颜色</span>
          </button>
          <div className={`absolute left-0 mt-1 w-[280px] bg-white rounded-md py-4 px-3 z-10 transition-all duration-200 border border-neutral-200 ${activeMenu === 'color' ? 'opacity-100 visible' : 'opacity-0 invisible'}`} style={{ 'top': '100%' }}>
            <ColorPicker color={fontColor} onChange={(color) => {
              setFontColor(color); editor.chain().focus()
                .setColor(color)
                .run();
            }} label="字体颜色" />
            <ColorPicker color={backgroundColor} onChange={(color) => {
              setBackgroundColor(color); editor.chain().focus()
                .setBackgroundColor(color)
                .run();
            }} label="背景颜色" />
            <div className="border-t border-gray-200 my-3" />
            <div className="flex gap-2">
              <button onClick={() => {
                setFontColor('#000000'); editor.chain().focus()
                  .unsetColor()
                  .run();
              }} className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">清除颜色</button>
              <button onClick={() => {
                setBackgroundColor('#ffffff'); editor.chain().focus()
                  .unsetBackgroundColor()
                  .run();
              }} className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">清除背景</button>
            </div>
          </div>
        </div>

        <div className="relative menu-container">
          <ToolbarButton
            icon={<span className="text-sm text-neutral-600">Aa</span>}
            label="字体"
            showMenu={activeMenu === 'font'}
            onClick={() => setActiveMenu(activeMenu === 'font' ? null : 'font')}
          />
          <DropdownMenu isOpen={activeMenu === 'font'} width="w-48" maxHeight="max-h-48">
            {Object.entries(FONTS).map(([family, label]) => (
              <button key={family} onClick={() => {
                editor.chain().focus()
                  .setFontFamily(family)
                  .run(); setActiveMenu(null);
              }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100" style={{ 'fontFamily': family }}>{label}</button>
            ))}
            <div className="border-t border-gray-200 my-1" />
            <button onClick={() => {
              editor.chain().focus()
                .unsetFontFamily()
                .run(); setActiveMenu(null);
            }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">清除字体</button>
          </DropdownMenu>
        </div>

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
                editor.chain().focus()
                  .setFontSize(size)
                  .run(); setActiveMenu(null);
              }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100" style={{ 'fontSize': size }}>{size}</button>
            ))}
            <div className="border-t border-gray-200 my-1" />
            <button onClick={() => {
              editor.chain().focus()
                .unsetFontSize()
                .run(); setActiveMenu(null);
            }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">清除字号</button>
          </DropdownMenu>
        </div>

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
                editor.chain().focus()
                  .setLineHeight(height)
                  .run(); setActiveMenu(null);
              }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100" style={{ 'lineHeight': height }}>{height}</button>
            ))}
            <div className="border-t border-gray-200 my-1" />
            <button onClick={() => {
              editor.chain().focus()
                .unsetLineHeight()
                .run(); setActiveMenu(null);
            }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">清除行高</button>
          </DropdownMenu>
        </div>

        <div className="relative menu-container">
          <ToolbarButton
            icon={<List size={16} className="text-neutral-600" />}
            label="列表"
            showMenu={activeMenu === 'list'}
            onClick={() => setActiveMenu(activeMenu === 'list' ? null : 'list')}
          />
          <DropdownMenu isOpen={activeMenu === 'list'}>
            <button onClick={() => {
              editor.chain().focus()
                .toggleBulletList()
                .run(); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">无序列表</button>
            <button onClick={() => {
              editor.chain().focus()
                .toggleOrderedList()
                .run(); setActiveMenu(null);
            }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">有序列表</button>
          </DropdownMenu>
        </div>

        <div className="relative menu-container">
          <ToolbarButton
            icon={<FunctionSquare size={16} className="text-neutral-600" />}
            label="公式"
            showMenu={activeMenu === 'math'}
            onClick={() => setActiveMenu(activeMenu === 'math' ? null : 'math')}
          />
          <DropdownMenu isOpen={activeMenu === 'math'}>
            <button onClick={handleMathInline} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">行内公式 ($...$)</button>
            <button onClick={handleMathBlock} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">公式块 ($$...$$)</button>
          </DropdownMenu>
        </div>

        {[
          { 'icon': <Quote size={16} />, 'label': '引用', 'action': () => editor.chain().focus()
            .toggleBlockquote()
            .run() },
          { 'icon': <Minus size={16} />, 'label': '水平线', 'action': () => editor.chain().focus()
            .setHorizontalRule()
            .run() },
          { 'icon': <CodeSquare size={16} />, 'label': '代码块', 'action': () => editor.chain().focus()
            .toggleCodeBlock()
            .run() }
        ].map((btn, idx) => (
          <button key={idx} onClick={btn.action} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16">
            <div className="text-neutral-600">{btn.icon}</div>
            <span className="text-xs text-neutral-600 mt-1">{btn.label}</span>
          </button>
        ))}

        <button onClick={handleLink} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16">
          <LinkIcon size={16} className="text-neutral-600" />
          <span className="text-xs text-neutral-600 mt-1">链接</span>
        </button>
        <button onClick={() => editor.chain().focus()
          .insertTable({ 'rows': 3, 'cols': 3, 'withHeaderRow': true })
          .run()} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16">
          <Plus size={16} className="text-neutral-600" />
          <span className="text-xs text-neutral-600 mt-1">表格</span>
        </button>

        <div className="relative menu-container">
          <ToolbarButton
            icon={<Plus size={16} className="text-neutral-600" />}
            label="表格操作"
            showMenu={activeMenu === 'table'}
            onClick={() => setActiveMenu(activeMenu === 'table' ? null : 'table')}
          />
          <DropdownMenu isOpen={activeMenu === 'table'} width="w-48">
            {[
              { 'label': '添加列 (左)', 'action': () => editor.chain().focus()
                .addColumnBefore()
                .run() },
              { 'label': '添加列 (右)', 'action': () => editor.chain().focus()
                .addColumnAfter()
                .run() },
              { 'label': '删除列', 'action': () => editor.chain().focus()
                .deleteColumn()
                .run() },
              { 'label': '添加行 (上)', 'action': () => editor.chain().focus()
                .addRowBefore()
                .run() },
              { 'label': '添加行 (下)', 'action': () => editor.chain().focus()
                .addRowAfter()
                .run() },
              { 'label': '删除行', 'action': () => editor.chain().focus()
                .deleteRow()
                .run() },
              { 'label': '删除表格', 'action': () => editor.chain().focus()
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

        <button
          onClick={onToggleTableOfContents}
          className={`flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16 ${showTableOfContents ? 'bg-primary-50 text-primary-600' : ''}`}
        >
          <ListTree className="w-4 h-4 text-neutral-600" />
          <span className="text-xs text-neutral-600 mt-1">目录</span>
        </button>

        <button onClick={() => editor.chain().focus()
          .undo()
          .run()} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16">
          <Undo size={16} className="text-neutral-600" />
          <span className="text-xs text-neutral-600 mt-1">撤销</span>
        </button>
        <button onClick={() => editor.chain().focus()
          .redo()
          .run()} className="flex flex-col items-center justify-center p-2 rounded hover:bg-neutral-100 transition-all w-16">
          <Redo size={16} className="text-neutral-600" />
          <span className="text-xs text-neutral-600 mt-1">重做</span>
        </button>
      </div>
    </div>
  );
};

export const EditorToolbar = memo(EditorToolbarInner);
