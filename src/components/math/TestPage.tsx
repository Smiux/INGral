import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  type KnowledgeObject,
  type KnowledgeConnection,
  type KnowledgeManifest,
  recentlyAdded
} from '@/components/math/types';
import {
  Search,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileJson,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  List,
  Clock
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function escapeHtml (s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Render inline math $...$, then bold **...**, then newlines */
function renderInline (text: string): string {
  // 1. inline math $...$
  const withMath = text.replace(
    /\$([\s\S]*?)\$/g,
    function (_m, code) {
      try {
        return katex.renderToString(code.trim(), { 'throwOnError': false, 'displayMode': false });
      } catch {
        return '<code class="katex-error">' + escapeHtml(code.trim()) + '</code>';
      }
    }
  );

  // 2. bold **...**
  const withBold = withMath.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');

  // 3. single newline → <br>
  return withBold.replace(/\n/g, '<br>');
}

function renderMath (text: string): string {
  // 0. Placeholder for display math, to keep it out of paragraph splitting
  const placeholders: string[] = [];
  let idx = 0;
  const withPlaceholder = text.replace(
    /\$\$([\s\S]*?)\$\$/g,
    function (_m, code) {
      const id = '%%MATH_DISPLAY_' + idx + '%%';
      idx += 1;
      let rendered: string;
      try {
        rendered = katex.renderToString(code.trim(), { 'throwOnError': false, 'displayMode': true });
      } catch {
        rendered = '<code class="katex-error">' + escapeHtml(code.trim()) + '</code>';
      }
      placeholders.push(rendered);
      return id;
    }
  );

  // 1. Split by double newlines (paragraphs)
  const parts = withPlaceholder.split(/\n\n+/);
  const paragraphs = parts.map(function (p) {
    const trimmed = p.trim();
    if (!trimmed) {
      return '';
    }
    const inner = renderInline(trimmed);
    return '<p>' + inner + '</p>';
  });

  // 2. Join paragraphs
  const joined = paragraphs.filter(Boolean).join('\n');

  // 3. Restore display math placeholders
  return joined.replace(/%%MATH_DISPLAY_(\d+)%%/g, function (_m, id) {
    return '<div class="katex-display">' + placeholders[parseInt(id, 10)] + '</div>';
  });
}

/** 返回包含搜索高亮的 HTML 片段 */
function highlightMatch (text: string, query: string): string {
  if (!query.trim()) {
    return escapeHtml(text);
  }
  const lower = text.toLowerCase();
  const q = query.trim().toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) {
    return escapeHtml(text);
  }
  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + q.length));
  const after = escapeHtml(text.slice(idx + q.length));
  return before + '<mark class="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded-sm px-0.5">' + match + '</mark>' + after;
}

function ExtField ({
  fieldKey,
  value
}: {
  fieldKey: string;
  value: unknown;
}) {
  // proof 格式: { "zh": string[] } —— 语言键 → 字符串数组
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const zhArr = obj.zh;
    if (Array.isArray(zhArr)) {
      return (
        <div>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {fieldKey}
          </span>
          <div className="space-y-1 mt-1">
            {zhArr.map(function (item, i) {
              if (typeof item !== 'string') {
                return null;
              }
              return (
                <div
                  key={i}
                  className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed math-content"
                  dangerouslySetInnerHTML={{ '__html': renderMath(item) }}
                />
              );
            })}
          </div>
        </div>
      );
    }
    // Fallback: unknown object → JSON
    return (
      <div>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{fieldKey}</span>
        <div className="text-xs text-slate-400 mt-1 font-mono">{JSON.stringify(value)}</div>
      </div>
    );
  }

  // tags / references / article / notes: 数组
  if (!Array.isArray(value)) {
    return null;
  }
  const arr = value;

  return (
    <div>
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
        {fieldKey}
      </span>
      {fieldKey === 'tags' && (
        <div className="flex flex-wrap gap-1 mt-1">
          {(arr as string[]).map((t, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {fieldKey === 'references' && (
        <div className="space-y-1 mt-1">
          {(arr as string[]).map((r, i) => (
            <div
              key={i}
              className="text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed"
            >
              [{i + 1}] {r}
            </div>
          ))}
        </div>
      )}
      {fieldKey !== 'tags' && fieldKey !== 'references' && (
        <div className="space-y-1 mt-1">
          {arr.map((item, i) => {
            if (typeof item === 'string') {
              return (
                <div
                  key={i}
                  className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed math-content"
                  dangerouslySetInnerHTML={{ '__html': renderMath(item) }}
                />
              );
            }
            if (item && typeof item === 'object') {
              const obj = item as Record<string, string>;
              const content = obj.zh;
              return (
                <div
                  key={i}
                  className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed math-content"
                >
                  {content
                    ? (
                      <div
                        dangerouslySetInnerHTML={{
                          '__html': renderMath(content)
                        }}
                      />
                    )
                    : (
                      <span className="text-slate-400 italic">
                        {JSON.stringify(item)}
                      </span>
                    )}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

function ConnectionRow ({
  conn,
  objectMap,
  direction,
  onNavigate
}: {
  conn: KnowledgeConnection;
  objectMap: Map<string, KnowledgeObject>;
  direction: 'out' | 'in';
  onNavigate: (id: string) => void;
}) {
  const otherId = direction === 'out' ? conn.to : conn.from;
  const other = objectMap.get(otherId);

  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
      <div className="flex items-center gap-2 mb-1">
        {direction === 'out'
          ? (
            <>
              <span className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate max-w-[180px]">
                {conn.from}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <span
                className="text-xs font-mono text-emerald-600 dark:text-emerald-400 truncate max-w-[180px] cursor-pointer hover:underline"
                onClick={function () {
                  onNavigate(otherId);
                }}
              >
                {conn.to}
              </span>
            </>
          )
          : (
            <>
              <span
                className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate max-w-[180px] cursor-pointer hover:underline"
                onClick={function () {
                  onNavigate(otherId);
                }}
              >
                {conn.from}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 truncate max-w-[180px]">
                {conn.to}
              </span>
            </>
          )}
        {other && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate ml-auto shrink-0">
            {other.name.zh?.[0] || ''}
          </span>
        )}
      </div>
      {conn.description.zh?.map(function (d, i) {
        return (
          <div
            key={i}
            className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed math-content"
            dangerouslySetInnerHTML={{ '__html': renderMath(d) }}
          />
        );
      })}
    </div>
  );
}

export default function TestPage () {
  const [manifest, setManifest] = useState<KnowledgeManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const PAGE_SIZE = 30;

  useEffect(function () {
    fetch('/data/knowledge-build/manifest.json')
      .then(function (res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        setManifest(data);
        setLoading(false);
      })
      .catch(function (err) {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const objectMap = useMemo(function () {
    if (!manifest) {
      return new Map<string, KnowledgeObject>();
    }
    return new Map(
      manifest.objects.map(function (o) {
        return [o.id, o];
      })
    );
  }, [manifest]);

  const allIds = useMemo(function () {
    if (!manifest) {
      return [];
    }
    return manifest.objects
      .map(function (o) {
        return o.id;
      })
      .sort();
  }, [manifest]);

  const filteredIds = useMemo(function () {
    if (!filter) {
      return allIds;
    }
    const lower = filter.toLowerCase();
    return allIds.filter(function (id) {
      return id.toLowerCase().includes(lower);
    });
  }, [allIds, filter]);

  const totalPages = Math.ceil(filteredIds.length / PAGE_SIZE);

  const pageIds = useMemo(function () {
    const start = page * PAGE_SIZE;
    return filteredIds.slice(start, start + PAGE_SIZE);
  }, [filteredIds, page]);

  const selected = selectedId ? objectMap.get(selectedId) : null;

  const outgoingConnections = useMemo(function () {
    if (!manifest || !selectedId) {
      return [];
    }
    return manifest.connections.filter(function (c) {
      return c.from === selectedId;
    });
  }, [manifest, selectedId]);

  const incomingConnections = useMemo(function () {
    if (!manifest || !selectedId) {
      return [];
    }
    return manifest.connections.filter(function (c) {
      return c.to === selectedId;
    });
  }, [manifest, selectedId]);

  const handleSelectId = useCallback(function (id: string) {
    setSelectedId(id);
    setError(null);
  }, []);

  const searchResults = useMemo(function () {
    const trimmed = searchId.trim().toLowerCase();
    if (!trimmed) {
      return [];
    }
    return allIds.filter(function (id) {
      return id.toLowerCase().includes(trimmed);
    });
  }, [allIds, searchId]);

  const handleSearchChange = function (e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchId(val);
    if (val.trim()) {
      setShowSearchResults(true);
      const trimmed = val.trim().toLowerCase();
      const matches = allIds.filter(function (id) {
        return id.toLowerCase().includes(trimmed);
      });
      if (matches.length === 1 && matches[0]) {
        handleSelectId(matches[0]);
        setShowSearchResults(false);
      }
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSearchKeyDown = function (e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      const trimmed = searchId.trim().toLowerCase();
      if (!trimmed) {
        return;
      }
      const matches = allIds.filter(function (id) {
        return id.toLowerCase().includes(trimmed);
      });
      if (matches.length === 1 && matches[0]) {
        handleSelectId(matches[0]);
        setShowSearchResults(false);
      } else if (matches.length > 0) {
        setShowSearchResults(true);
      }
    }
    if (e.key === 'Escape') {
      setShowSearchResults(false);
    }
  };

  const handleSearchBlur = function () {
    setTimeout(function () {
      setShowSearchResults(false);
    }, 200);
  };

  const handleFilterChange = function (e: React.ChangeEvent<HTMLInputElement>) {
    setFilter(e.target.value);
    setPage(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          Knowledge Object Inspector
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          输入 Object ID 或从列表中点击查看节点及其连接信息
        </p>
      </div>

      <div className="flex gap-2 mb-6 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchId}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            placeholder="搜索 Object ID，支持模糊匹配..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Search results dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-80 overflow-y-auto">
            {searchResults.map(function (id) {
              const obj = objectMap.get(id);
              const name = obj
                ? (obj.name.zh?.[0] || '')
                : '';
              return (
                <button
                  key={id}
                  onMouseDown={function () {
                    handleSelectId(id);
                    setShowSearchResults(false);
                  }}
                  className="w-full text-left px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div
                    className="text-xs font-mono text-slate-700 dark:text-slate-300"
                    dangerouslySetInnerHTML={{ '__html': highlightMatch(id, searchId) }}
                  />
                  {name && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {name}
                    </div>
                  )}
                </button>
              );
            })}
            <div className="px-4 py-2 text-[10px] text-slate-400 text-center">
              共 {searchResults.length} 个结果
            </div>
          </div>
        )}

        {showSearchResults && searchResults.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
            <div className="px-4 py-3 text-xs text-slate-400 text-center">
              未找到匹配的 ID
            </div>
          </div>
        )}
      </div>

      {fetchError && !selected && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {fetchError}
        </div>
      )}

      <div className="flex gap-6">
        {/* ── Object List Sidebar ── */}
        <div className="w-72 shrink-0">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <List className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Objects
              </span>
              <span className="ml-auto text-xs text-slate-400">
                {filteredIds.length}
              </span>
            </div>

            {/* ── Recent section ── */}
            <div className="border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  最近添加
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto">
                {recentlyAdded.map(function (id) {
                  const obj = objectMap.get(id);
                  const name = obj ? (obj.name.zh?.[0] || '') : '';
                  return (
                    <button
                      key={id}
                      onClick={function () {
                        handleSelectId(id);
                      }}
                      className={
                        'w-full text-left px-4 py-1.5 border-b border-slate-100 dark:border-slate-700/50 transition-colors ' +
                        (id === selectedId
                          ? 'bg-amber-50 dark:bg-amber-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/30')
                      }
                    >
                      <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">
                        {id}
                      </div>
                      {name && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {name}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <input
                type="text"
                value={filter}
                onChange={handleFilterChange}
                placeholder="筛选 ID..."
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="overflow-y-auto max-h-[70vh]">
              {pageIds.map(function (id) {
                const obj = objectMap.get(id);
                const name = obj
                  ? (obj.name.zh?.[0] || '')
                  : '';
                const isSelected = id === selectedId;
                return (
                  <button
                    key={id}
                    onClick={function () {
                      handleSelectId(id);
                    }}
                    className={
                      'w-full text-left px-4 py-2 border-b border-slate-100 dark:border-slate-700/50 transition-colors ' +
                      (isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/30')
                    }
                  >
                    <div className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                      {id}
                    </div>
                    {name && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {name}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <button
                disabled={page === 0}
                onClick={function () {
                  setPage(page - 1);
                }}
                className={
                  'p-1 rounded transition-colors ' +
                  (page === 0
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700')
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {page + 1} / {totalPages || 1}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={function () {
                  setPage(page + 1);
                }}
                className={
                  'p-1 rounded transition-colors ' +
                  (page >= totalPages - 1
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700')
                }
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0">
          {selected && (
            <div className="space-y-6"><div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <FileJson className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Object
                </span>
                <span className="ml-auto text-xs text-slate-400 font-mono">
                  {selected.id}
                </span>
              </div>
              <div className="p-5 space-y-4 text-sm">
                <div>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      id
                  </span>
                  <div className="mt-0.5 font-mono text-slate-800 dark:text-slate-200">
                    {selected.id}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      type
                  </span>
                  <div className="mt-0.5">
                    <span
                      className={
                        'inline-block px-2 py-0.5 rounded text-xs font-medium ' +
                          (selected.type === 'definition'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400')
                      }
                    >
                      {selected.type}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      name
                  </span>
                  {selected.name.zh?.map(function (n, i) {
                    return (
                      <div key={i} className="mt-0.5 text-slate-800 dark:text-slate-200">
                        {i > 0 && <span className="text-xs text-slate-400 mr-1">(别名) </span>}
                        {n}
                      </div>
                    );
                  })}
                  {!selected.name.zh && (
                    <div className="mt-0.5 text-slate-400 italic text-xs">
                         无名称
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                       description
                  </span>
                  {selected.description.zh?.map(function (d, i) {
                    return (
                      <div key={i} className="mt-0.5 text-slate-700 dark:text-slate-300 leading-relaxed">
                        {i > 0 && (
                          <div className="text-xs text-slate-400 mb-1">
                               (等价描述 {i + 1})
                          </div>
                        )}
                        <div
                          className="math-content"
                          dangerouslySetInnerHTML={{ '__html': renderMath(d) }}
                        />
                      </div>
                    );
                  })}
                  {!selected.description.zh && (
                    <div className="mt-0.5 text-slate-400 italic text-xs">
                         无描述
                    </div>
                  )}
                </div>

                {selected.extension && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3 block">
                        extension
                    </span>
                    <div className="space-y-3">
                      {Object.entries(selected.extension).map(function ([key, value]) {
                        return (
                          <ExtField
                            key={key}
                            fieldKey={key}
                            value={value}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <GitBranch className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Connections
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  {outgoingConnections.length + incomingConnections.length} 条
                </span>
              </div>

              <div className="p-5 space-y-6">
                {outgoingConnections.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                        出边 &mdash; {outgoingConnections.length} 条
                    </h3>
                    <div className="space-y-2">
                      {outgoingConnections.map(function (c, i) {
                        return (
                          <ConnectionRow
                            key={i}
                            conn={c}
                            objectMap={objectMap}
                            direction="out"
                            onNavigate={handleSelectId}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {incomingConnections.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                        入边 &mdash; {incomingConnections.length} 条
                    </h3>
                    <div className="space-y-2">
                      {incomingConnections.map(function (c, i) {
                        return (
                          <ConnectionRow
                            key={i}
                            conn={c}
                            objectMap={objectMap}
                            direction="in"
                            onNavigate={handleSelectId}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {outgoingConnections.length === 0 &&
                    incomingConnections.length === 0 && (
                  <div className="text-sm text-slate-400 italic">
                      无连接
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {!selected && !fetchError && (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                从左侧列表选择或输入 Object ID 查询
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
