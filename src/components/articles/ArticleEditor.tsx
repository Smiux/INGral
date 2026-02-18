import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { articleService } from '../../services/articleService';
import { LatexEditor } from './LatexEditor';
import { TiptapEditor, TiptapEditorRef } from './TipTapEditor';
import { EditorToolbar } from './EditorToolbar';
import {
  Globe, User, Lock, Save,
  CheckCircle, MessageCircle,
  FileText, ListTree
} from 'lucide-react';

interface EditorState {
  title: string;
  visibility: 'public' | 'unlisted';
  authorName: string;
  isSaving: boolean;
}

const VisibilityOptions = [
  { 'value': 'public', 'label': '公开', 'icon': Globe },
  { 'value': 'unlisted', 'label': '仅分享', 'icon': Lock }
] as const;

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
      return 'bg-primary-50 border-l-4 border-primary-500 text-primary-700';
    }
    if (isScrolledOverFlag) {
      return 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600';
    }
    return 'hover:bg-neutral-50 text-neutral-700';
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
          <CheckCircle className="w-4 h-4 text-primary-500 ml-auto flex-shrink-0 animate-pulse" />
        )}
      </div>
    </div>
  );
};

export const ArticleEditor: React.FC = () => {
  const navigate = useNavigate();

  const [state, setState] = useState<EditorState>({
    'title': '',
    'visibility': 'public',
    'authorName': '',
    'isSaving': false
  });

  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [tempAuthorName, setTempAuthorName] = useState('');

  const [showLatexEditor, setShowLatexEditor] = useState(false);
  const [mathType, setMathType] = useState<'inline' | 'block'>('inline');

  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const [tableOfContentsItems, setTableOfContentsItems] = useState<Array<{
    id: string;
    textContent: string;
    level: number;
    itemIndex: number;
    isActive: boolean;
    isScrolledOver: boolean;
  }>>([]);

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [fontColor, setFontColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const [characterCount, setCharacterCount] = useState(0);

  const tocRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<TiptapEditorRef | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const [isToolbarSticky, setIsToolbarSticky] = useState(false);

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

  React.useEffect(() => {
    const headerHeight = 64;
    const handleScroll = () => {
      if (!toolbarRef.current) {
        return;
      }
      const toolbarRect = toolbarRef.current.getBoundingClientRect();
      const shouldBeSticky = toolbarRect.top <= headerHeight;
      setIsToolbarSticky(shouldBeSticky);
    };

    window.addEventListener('scroll', handleScroll, { 'passive': true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    const editor = editorRef.current?.getEditor();
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

  const handleInsertMath = useCallback((formula: string) => {
    const editor = editorRef.current?.getEditor();
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
  }, [mathType]);

  const handleLink = useCallback(() => {
    const editor = editorRef.current?.getEditor();
    const previousUrl = editor?.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkDialog(true);
  }, []);

  const handleLinkSubmit = useCallback(() => {
    const editor = editorRef.current?.getEditor();
    if (!editor) {
      return;
    }

    if (linkUrl) {
      editor.chain().focus()
        .setLink({ 'href': linkUrl })
        .run();
    } else {
      editor.chain().focus()
        .unsetLink()
        .run();
    }
    setShowLinkDialog(false);
  }, [linkUrl]);

  const handleTocClick = (itemId: string) => {
    const editor = editorRef.current?.getEditor();
    const element = editor?.view.dom.querySelector(`[data-toc-id="${itemId}"]`);
    if (element) {
      window.scrollTo({
        'top': element.getBoundingClientRect().top + window.scrollY - 100,
        'behavior': 'smooth'
      });
    }
  };

  const handleMathClick = useCallback((type: 'inline' | 'block') => {
    setMathType(type);
    setShowLatexEditor(true);
  }, []);

  const handleCharacterCountChange = useCallback((count: number) => {
    setCharacterCount(count);
  }, []);

  const handleTableOfContentsChange = useCallback((items: typeof tableOfContentsItems) => {
    setTableOfContentsItems(items);
  }, []);

  const handleToggleTableOfContents = useCallback(() => {
    setShowTableOfContents(prev => !prev);
  }, []);

  const handleLinkClick = useCallback(() => {
    handleLink();
  }, [handleLink]);

  const editor = editorRef.current?.getEditor();

  return (
    <div className="min-h-screen">
      {showLinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLinkDialog(false)} />
          <div className="bg-white rounded-lg border border-neutral-200 p-4 relative z-10 min-w-[400px] max-w-md">
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

      <LatexEditor
        isOpen={showLatexEditor}
        onClose={() => setShowLatexEditor(false)}
        onInsert={handleInsertMath}
      />

      <header className="sticky top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 p-2 rounded hover:bg-neutral-100 transition-colors">
              <span className="font-bold text-xl tracking-tight text-neutral-800">IN Gral</span>
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

      <div className="relative">
        {showTableOfContents && (
          <div ref={tocRef} className="absolute left-0 top-4 w-48 bg-white border border-neutral-200 rounded-lg overflow-y-auto max-h-[calc(100vh-120px)] z-20 ml-4 transition-all duration-300 ease-in-out transform flex flex-col">
            <div className="p-3">
              <h3 className="text-lg font-semibold text-neutral-800 flex items-center gap-2 mb-4">
                <ListTree className="w-4 h-4 text-primary-400" />
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
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium">暂无标题</p>
                  <p className="text-xs mt-2 opacity-75">添加标题后将自动生成目录</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-neutral-500" />
                <span className="text-sm text-neutral-600">{characterCount} 个字符</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200">
            <div
              ref={toolbarRef}
              className={`transition-all duration-300 ${
                isToolbarSticky
                  ? 'sticky top-[64px] z-40 bg-white border-b border-neutral-200 shadow-sm'
                  : ''
              }`}
            >
              <EditorToolbar
                editor={editor ?? null}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                fontColor={fontColor}
                setFontColor={setFontColor}
                backgroundColor={backgroundColor}
                setBackgroundColor={setBackgroundColor}
                showTableOfContents={showTableOfContents}
                onToggleTableOfContents={handleToggleTableOfContents}
                onLinkClick={handleLinkClick}
                onMathClick={handleMathClick}
              />
            </div>
            <TiptapEditor
              editorRef={editorRef}
              onCharacterCountChange={handleCharacterCountChange}
              onTableOfContentsChange={handleTableOfContentsChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
