import React, { useState, useCallback, useRef, useMemo } from 'react';
import { X, Save, ChevronDown, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { TiptapEditor, TiptapEditorRef } from '@/components/articles/core/TipTap';
import { EditorToolbar } from '@/components/articles/core/Toolbar';
import { CoverManager } from '@/components/articles/managers/Cover';
import type { Editor } from '@tiptap/react';
import type { EmbeddedArticle } from '@/components/gallerys/gallery';

interface SimpleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (article: Omit<EmbeddedArticle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: EmbeddedArticle | null;
  mode: 'create' | 'edit';
}

const SimpleEditorInner: React.FC<SimpleEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode
}) => {
  const initialTitle = useMemo(() => {
    if (mode === 'edit' && initialData) {
      return initialData.title;
    }
    return '';
  }, [mode, initialData]);

  const initialSummary = useMemo(() => {
    if (mode === 'edit' && initialData) {
      return initialData.summary || '';
    }
    return '';
  }, [mode, initialData]);

  const initialTags = useMemo(() => {
    if (mode === 'edit' && initialData) {
      return initialData.tags || [];
    }
    return [];
  }, [mode, initialData]);

  const initialCoverImage = useMemo(() => {
    if (mode === 'edit' && initialData) {
      return initialData.coverImage || null;
    }
    return null;
  }, [mode, initialData]);

  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [coverImage, setCoverImage] = useState<string | null>(initialCoverImage);

  const [titleExpanded, setTitleExpanded] = useState(true);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [coverExpanded, setCoverExpanded] = useState(false);
  const [showCoverManager, setShowCoverManager] = useState(false);

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [fontColor, setFontColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showIframeDialog, setShowIframeDialog] = useState(false);
  const [iframeSrc, setIframeSrc] = useState('');
  const [iframeWidthInput, setIframeWidthInput] = useState('640');
  const [iframeHeightInput, setIframeHeightInput] = useState('360');
  const [showLatexEditor, setShowLatexEditor] = useState(false);
  const [mathType, setMathType] = useState<'inline' | 'block'>('inline');

  const editorRef = useRef<TiptapEditorRef | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  const handleEditorReady = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);
    if (initialData && mode === 'edit') {
      editorInstance.commands.setContent(initialData.content);
    }
  }, [initialData, mode]);

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      return;
    }

    onSave({
      title,
      'content': editor?.getHTML() || '',
      'summary': summary.trim() || undefined,
      'tags': tags.length > 0 ? tags : undefined,
      'coverImage': coverImage || undefined
    });

    onClose();
  }, [title, editor, summary, tags, coverImage, onSave, onClose]);

  const handleLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkDialog(true);
  }, [editor]);

  const handleLinkSubmit = useCallback(() => {
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
  }, [linkUrl, editor]);

  const handleMathClick = useCallback((type: 'inline' | 'block') => {
    setMathType(type);
    setShowLatexEditor(true);
  }, []);

  const handleInsertMath = useCallback((formula: string) => {
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
  }, [mathType, editor]);

  const handleIframe = useCallback(() => {
    setIframeSrc('');
    setIframeWidthInput('640');
    setIframeHeightInput('360');
    setShowIframeDialog(true);
  }, []);

  const handleIframeSubmit = useCallback(() => {
    if (!editor || !iframeSrc) {
      return;
    }

    const width = parseInt(iframeWidthInput, 10) || 640;
    const height = parseInt(iframeHeightInput, 10) || 360;

    editor.chain().focus()
      .setIframeEmbed({
        'src': iframeSrc,
        width,
        height
      })
      .run();
    setShowIframeDialog(false);
    setIframeSrc('');
  }, [editor, iframeSrc, iframeWidthInput, iframeHeightInput]);

  const handleFootnoteClick = useCallback(() => {
    if (!editor) {
      return;
    }
    editor.chain().focus()
      .insertFootnote()
      .run();
  }, [editor]);

  const handleCoverChange = useCallback((base64Image: string | null) => {
    setCoverImage(base64Image);
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-[800px] bg-white dark:bg-neutral-800 shadow-xl z-50 overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            {mode === 'create' ? '创建文章' : '编辑文章'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              <span>保存</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setTitleExpanded(!titleExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                {titleExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">文章标题</span>
                {title && !titleExpanded && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-[300px]">{title}</span>
                )}
              </div>
              {!title.trim() && <span className="text-xs text-red-500">必填</span>}
            </button>
            {titleExpanded && (
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入文章标题..."
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400"
                />
              </div>
            )}
          </div>

          <div className="mb-4 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                {summaryExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">文章简介</span>
                {summary && !summaryExpanded && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-[300px]">{summary}</span>
                )}
              </div>
            </button>
            {summaryExpanded && (
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="输入文章简介"
                  rows={3}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 resize-none"
                />
              </div>
            )}
          </div>

          <div className="mb-4 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setTagsExpanded(!tagsExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                {tagsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">标签</span>
                {tags.length > 0 && !tagsExpanded && (
                  <span className="text-xs text-sky-600 dark:text-sky-400">{tags.length} 个标签</span>
                )}
              </div>
            </button>
            {tagsExpanded && (
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => setTags(tags.filter((_, i) => i !== index))}
                        className="hover:text-sky-900 dark:hover:text-sky-100"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="输入标签后按 Enter 添加..."
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value.trim();
                      if (value && !tags.includes(value)) {
                        setTags([...tags, value]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>

          <div className="mb-4 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setCoverExpanded(!coverExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                {coverExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <ImageIcon className="w-4 h-4 text-sky-500" />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">封面图片</span>
                {coverImage && !coverExpanded && (
                  <span className="text-xs text-sky-600 dark:text-sky-400">已设置</span>
                )}
              </div>
            </button>
            {coverExpanded && (
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                {coverImage ? (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700">
                      <img
                        src={coverImage}
                        alt="封面预览"
                        className="w-full h-auto max-h-[200px] object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCoverManager(true)}
                        className="flex-1 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                      >
                        更换封面
                      </button>
                      <button
                        onClick={() => setCoverImage(null)}
                        className="px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCoverManager(true)}
                    className="w-full px-4 py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-500 dark:text-neutral-400 hover:border-sky-400 dark:hover:border-sky-500 hover:text-sky-500 transition-colors"
                  >
                    <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                    <span className="text-sm">点击设置封面图片</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <EditorToolbar
              editor={editor}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              fontColor={fontColor}
              setFontColor={setFontColor}
              backgroundColor={backgroundColor}
              setBackgroundColor={setBackgroundColor}
              onLinkClick={handleLink}
              onMathClick={handleMathClick}
              onIframeClick={handleIframe}
              onFootnoteClick={handleFootnoteClick}
            />
            <TiptapEditor
              editorRef={editorRef}
              onEditorReady={handleEditorReady}
              content={mode === 'edit' && initialData ? initialData.content : ''}
            />
          </div>
        </div>
      </div>

      <CoverManager
        isOpen={showCoverManager}
        onClose={() => setShowCoverManager(false)}
        currentCoverImage={coverImage}
        onCoverChange={handleCoverChange}
      />

      {showLinkDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLinkDialog(false)} />
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 relative z-10 min-w-[400px] max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-neutral-200">添加链接</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">链接地址</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowLinkDialog(false)}
                  className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleLinkSubmit}
                  className="px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded-md transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showIframeDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowIframeDialog(false)} />
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 relative z-10 min-w-[450px] max-w-lg">
            <h3 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-neutral-200">嵌入内容</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">嵌入地址</label>
                <input
                  type="text"
                  value={iframeSrc}
                  onChange={(e) => setIframeSrc(e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">宽度</label>
                  <input
                    type="number"
                    value={iframeWidthInput}
                    onChange={(e) => setIframeWidthInput(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">高度</label>
                  <input
                    type="number"
                    value={iframeHeightInput}
                    onChange={(e) => setIframeHeightInput(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowIframeDialog(false)}
                  className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleIframeSubmit}
                  disabled={!iframeSrc.trim()}
                  className="px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLatexEditor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLatexEditor(false)} />
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 relative z-10 min-w-[500px] max-w-2xl">
            <h3 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-neutral-200">
              {mathType === 'inline' ? '插入行内公式' : '插入公式块'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">LaTeX 公式</label>
                <textarea
                  placeholder="输入 LaTeX 公式..."
                  rows={5}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      const value = (e.target as HTMLTextAreaElement).value;
                      if (value.trim()) {
                        handleInsertMath(value);
                      }
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowLatexEditor(false)}
                  className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    const textarea = document.querySelector('textarea[placeholder="输入 LaTeX 公式..."]') as HTMLTextAreaElement;
                    if (textarea?.value.trim()) {
                      handleInsertMath(textarea.value);
                    }
                  }}
                  className="px-4 py-2 text-sm text-white bg-sky-500 hover:bg-sky-600 rounded-md transition-colors"
                >
                  插入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const SimpleEditor: React.FC<SimpleEditorProps> = (props) => {
  const key = useMemo(() => {
    return `${props.mode}-${props.initialData?.id || 'new'}-${props.isOpen}`;
  }, [props.mode, props.initialData?.id, props.isOpen]);

  if (!props.isOpen) {
    return null;
  }

  return <SimpleEditorInner key={key} {...props} />;
};

export default SimpleEditor;
