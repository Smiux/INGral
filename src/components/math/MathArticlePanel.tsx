import { useMemo, useState } from 'react';
import { X, BookOpen, Tags, ListTree, ExternalLink, Info, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import katex from 'katex';
import { type KnowledgeObject, type KnowledgeConnection, type KnowledgeNode, NODE_TYPE_LABELS } from './types';

const inlineMathExt = {
  'name': 'inlineMath',
  'level': 'inline' as const,
  'start' (src: string) {
    return src.indexOf('$');
  },
  'tokenizer' (src: string) {
    const match = src.match(/^\$([^$\n]+?)\$/);
    if (match) {
      return { 'type': 'inlineMath', 'raw': match[0], 'text': match[1]!.trim() };
    }
    return undefined;
  },
  'renderer' (token: { 'text': string }) {
    try {
      return katex.renderToString(token.text, { 'throwOnError': false, 'displayMode': false });
    } catch {
      return `<code class="katex-error">${token.text}</code>`;
    }
  }
};

const blockMathExt = {
  'name': 'blockMath',
  'level': 'block' as const,
  'start' (src: string) {
    return src.indexOf('$$');
  },
  'tokenizer' (src: string) {
    const match = src.match(/^\$\$([^$]+?)\$\$/);
    if (match) {
      return { 'type': 'blockMath', 'raw': match[0], 'text': match[1]!.trim() };
    }
    return undefined;
  },
  'renderer' (token: { 'text': string }) {
    try {
      return `<div class="katex-display">${katex.renderToString(token.text, { 'throwOnError': false, 'displayMode': true })}</div>`;
    } catch {
      return `<pre><code class="katex-error">${token.text}</code></pre>`;
    }
  }
};

marked.use({ 'extensions': [blockMathExt, inlineMathExt] });

function renderMarkdown (md: string): string {
  return marked.parse(md, { 'async': false }) as string;
}

function MarkdownRenderer ({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      className={`prose prose-xs prose-slate dark:prose-invert max-w-none [&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto [&_.katex]:text-inherit ${className ?? ''}`}
      dangerouslySetInnerHTML={{ '__html': html }}
    />
  );
}

function Section ({ 'icon': Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1.5 text-slate-400 dark:text-slate-500">
        <Icon className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
      </div>
      {children}
    </div>
  );
}

interface MathArticlePanelProps {
  node: KnowledgeNode | null;
  object: KnowledgeObject | null;
  connection: { sourceId: string; targetId: string } | null;
  connections: KnowledgeConnection[];
  objectMap: Map<string, KnowledgeObject>;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
  locale: string;
}

function DepList ({ deps, onNavigate }: { deps: { id: string; label: string }[]; onNavigate: (id: string) => void }) {
  if (deps.length === 0) {
    return <span className="text-xs text-slate-300 dark:text-slate-600">无</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {deps.map((dep) => (
        <button
          key={dep.id}
          onClick={() => onNavigate(dep.id)}
          className="text-xs px-1.5 py-0.5 rounded bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-700 dark:hover:text-slate-300 transition-colors font-mono"
        >
          {dep.label}
        </button>
      ))}
    </div>
  );
}

function getObjDisplayName (obj: KnowledgeObject | undefined, locale: string, fallbackId: string): string {
  if (!obj) {
    return fallbackId.split('.').pop() ?? fallbackId;
  }
  return obj.name?.[locale]?.[0] ?? obj.name?.zh?.[0] ?? obj.name?.en?.[0] ?? fallbackId.split('.').pop() ?? fallbackId;
}

export default function MathArticlePanel ({
  node,
  object,
  connection,
  connections,
  objectMap,
  isOpen,
  onClose,
  onNavigate,
  locale
}: MathArticlePanelProps) {
  const isConnectionMode = connection !== null;

  const matchingConns = connection
    ? connections.filter(c => c.from === connection.sourceId && c.to === connection.targetId)
    : [];
  const sourceObj = connection ? objectMap.get(connection.sourceId) : undefined;
  const targetObj = connection ? objectMap.get(connection.targetId) : undefined;
  const sourceName = connection ? getObjDisplayName(sourceObj, locale, connection.sourceId) : '';
  const targetName = connection ? getObjDisplayName(targetObj, locale, connection.targetId) : '';
  const connAllDescs = matchingConns.flatMap(c => c.description?.[locale] ?? c.description?.zh ?? []);
  const [connDescIndex, setConnDescIndex] = useState(0);
  const connSafeIndex = Math.min(connDescIndex, connAllDescs.length - 1);
  const connCurrentDesc = connAllDescs[connSafeIndex] ?? '';

  const nameZh = node?.name ?? object?.name?.zh?.[0] ?? '';
  const nameAliasesZh = object?.name?.zh?.slice(1) ?? [];
  const nameAliasesEn = object?.name?.en?.slice(1) ?? [];
  const aliases = locale === 'en' && nameAliasesEn.length > 0 ? nameAliasesEn : nameAliasesZh;

  const descZh = object?.description?.zh ?? [];
  const descEn = object?.description?.en ?? [];
  const descList = locale === 'en' ? descEn : descZh;
  const [descIndex, setDescIndex] = useState(0);
  const safeIndex = Math.min(descIndex, descList.length - 1);
  const currentDesc = descList[safeIndex] ?? '';

  const notes = object?.extension?.notes ?? [];
  const tags = object?.extension?.tags ?? [];
  const sources = object?.extension?.sources ?? [];

  const inboundConnections = connections.filter(c => c.to === node?.id);
  const outboundConnections = connections.filter(c => c.from === node?.id);

  const seenIn = new Set<string>();
  const relatedIn = inboundConnections.map(c => c.from).filter(id => {
    if (seenIn.has(id)) {
      return false;
    }
    seenIn.add(id);
    return true;
  })
    .map(id => ({ id, 'label': id.split('.').pop() ?? id }));

  const seenOut = new Set<string>();
  const relatedOut = outboundConnections.map(c => c.to).filter(id => {
    if (seenOut.has(id)) {
      return false;
    }
    seenOut.add(id);
    return true;
  })
    .map(id => ({ id, 'label': id.split('.').pop() ?? id }));

  return (
    <AnimatePresence>
      {isOpen && (node || connection) && (
        <motion.div
          initial={{ 'x': 384, 'opacity': 0 }}
          animate={{ 'x': 0, 'opacity': 1 }}
          exit={{ 'x': 384, 'opacity': 0 }}
          transition={{ 'type': 'spring', 'damping': 25, 'stiffness': 250 }}
          className="fixed right-0 top-0 h-full w-96 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm border-l border-slate-200/60 dark:border-slate-700/60 z-40 flex flex-col"
        >
          {isConnectionMode ? (
            <>
              <div className="flex items-center justify-between p-3 border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    连接
                  </span>
                  <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{sourceName}</h2>
                  <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                  <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{targetName}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-300 dark:text-slate-600 font-mono mb-3">
                  <span className="truncate">{connection!.sourceId}</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                  <span className="truncate">{connection!.targetId}</span>
                </div>

                {connCurrentDesc && (
                  <Section icon={BookOpen} title="描述">
                    <div className="rounded-lg border bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-800/40 overflow-hidden">
                      <div className="px-3 pt-3">
                        <MarkdownRenderer content={connCurrentDesc} className="text-xs leading-relaxed text-slate-600 dark:text-slate-400" />
                      </div>
                      {connAllDescs.length > 1 && (
                        <div className="flex items-center justify-between px-3 pb-2.5 gap-2">
                          <button
                            onClick={() => setConnDescIndex(i => (i - 1 + connAllDescs.length) % connAllDescs.length)}
                            className="p-1 rounded hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-indigo-400 dark:text-indigo-500">
                            {connSafeIndex + 1} / {connAllDescs.length}
                          </span>
                          <button
                            onClick={() => setConnDescIndex(i => (i + 1) % connAllDescs.length)}
                            className="p-1 rounded hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Section>
                )}

                <Section icon={ArrowRight} title="端点">
                  <div className="space-y-1.5">
                    <button
                      onClick={() => onNavigate(connection!.sourceId)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <span className="text-slate-400 dark:text-slate-500 mr-1.5">源</span>
                      <span className="text-slate-600 dark:text-slate-300 font-mono">{sourceName}</span>
                    </button>
                    <button
                      onClick={() => onNavigate(connection!.targetId)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <span className="text-slate-400 dark:text-slate-500 mr-1.5">目标</span>
                      <span className="text-slate-600 dark:text-slate-300 font-mono">{targetName}</span>
                    </button>
                  </div>
                </Section>
              </div>

              <div className="p-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-300 dark:text-slate-600">
                {matchingConns.length} 条连接
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {node ? NODE_TYPE_LABELS[node.type] : ''}
                  </span>
                  <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={node?.id}>
                    {nameZh}
                  </h2>
                  {aliases.length > 0 && (
                    <div className="group relative shrink-0">
                      <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 cursor-help" />
                      <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50">
                        <div className="bg-slate-800 dark:bg-slate-700 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                          {aliases.join('、')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <div className="text-xs text-slate-300 dark:text-slate-600 font-mono mb-3 break-all">{node?.id}</div>

                {currentDesc && (
                  <Section icon={BookOpen} title="描述">
                    <div className="rounded-lg border bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-800/40 overflow-hidden">
                      <div className="px-3 pt-3">
                        <MarkdownRenderer content={currentDesc} className="text-xs leading-relaxed text-slate-600 dark:text-slate-400" />
                      </div>
                      {descList.length > 1 && (
                        <div className="flex items-center justify-between px-3 pb-2.5 gap-2">
                          <button
                            onClick={() => setDescIndex(i => (i - 1 + descList.length) % descList.length)}
                            className="p-1 rounded hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-indigo-400 dark:text-indigo-500">
                            {safeIndex + 1} / {descList.length}
                          </span>
                          <button
                            onClick={() => setDescIndex(i => (i + 1) % descList.length)}
                            className="p-1 rounded hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Section>
                )}

                {notes.length > 0 && (
                  <Section icon={ListTree} title="注记">
                    {notes.map((note, i) => {
                      const text = note[locale] ?? note.zh ?? note.en ?? '';
                      return text ? (
                        <div key={i} className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded p-2 border-l-2 border-slate-300 dark:border-slate-600">
                          <MarkdownRenderer content={text} />
                        </div>
                      ) : null;
                    })}
                  </Section>
                )}

                {relatedIn.length > 0 && (
                  <Section icon={ListTree} title="指向此条目">
                    <DepList deps={relatedIn} onNavigate={onNavigate} />
                  </Section>
                )}

                {relatedOut.length > 0 && (
                  <Section icon={ListTree} title="此条目指向">
                    <DepList deps={relatedOut} onNavigate={onNavigate} />
                  </Section>
                )}

                {tags.length > 0 && (
                  <Section icon={Tags} title="标签">
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-slate-100/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {sources.length > 0 && (
                  <Section icon={ExternalLink} title="来源">
                    <div className="space-y-1">
                      {sources.map((src, i) => (
                        <div key={i} className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/30 rounded px-2 py-1">
                          {src}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {object?.extension?.notation && object.extension.notation.length > 0 && (
                  <Section icon={Tags} title="记号">
                    <div className="space-y-1">
                      {object.extension.notation.map((n, i) => (
                        <div key={i} className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded px-2 py-1">
                          <MarkdownRenderer content={`$${n}$`} />
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>

              <div className="p-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-300 dark:text-slate-600 flex gap-3">
                <span>{node?.domain}</span>
                <span>·</span>
                <span>连接: {inboundConnections.length + outboundConnections.length}</span>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
