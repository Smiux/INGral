import { useState } from 'react';
import { X, BookOpen, Code, GitBranch, Layers, FileCode, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type NodeData, NODE_TYPE_LABELS } from './types';

interface MathArticlePanelProps {
  nodeData: NodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
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

function CodeBlock ({ content }: { content: string }) {
  if (!content) {
    return null;
  }
  return (
    <pre className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 rounded p-2.5 overflow-x-auto whitespace-pre-wrap break-all font-mono">
      {content}
    </pre>
  );
}

function DepList ({ deps, onNavigate, initialLimit = 30 }: { deps: string[]; onNavigate: (id: string) => void; initialLimit?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (deps.length === 0) {
    return <span className="text-xs text-slate-300 dark:text-slate-600">无</span>;
  }
  const visible = expanded ? deps : deps.slice(0, initialLimit);
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {visible.map((dep) => (
          <button
            key={dep}
            onClick={() => onNavigate(dep)}
            className="text-xs px-1.5 py-0.5 rounded bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-700 dark:hover:text-slate-300 transition-colors font-mono"
          >
            {dep.split('.').pop()}
          </button>
        ))}
      </div>
      {deps.length > initialLimit && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-sky-500 hover:text-sky-400 dark:text-sky-400 dark:hover:text-sky-300 mt-1 transition-colors"
        >
          {expanded ? '收起' : `+${deps.length - initialLimit} 更多`}
        </button>
      )}
    </div>
  );
}

function ExpandableText ({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div className={`text-xs leading-relaxed text-slate-500 dark:text-slate-400 whitespace-pre-wrap ${expanded ? '' : 'line-clamp-8'}`}>
        {text}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-sky-500 hover:text-sky-400 dark:text-sky-400 dark:hover:text-sky-300 mt-1 transition-colors"
      >
        {expanded ? '收起' : '展开全部'}
      </button>
    </div>
  );
}

export default function MathArticlePanel ({ nodeData, isOpen, onClose, onNavigate }: MathArticlePanelProps) {
  return (
    <AnimatePresence>
      {isOpen && nodeData && (
        <motion.div
          initial={{ 'x': 384, 'opacity': 0 }}
          animate={{ 'x': 0, 'opacity': 1 }}
          exit={{ 'x': 384, 'opacity': 0 }}
          transition={{ 'type': 'spring', 'damping': 25, 'stiffness': 250 }}
          className="fixed right-0 top-0 h-full w-96 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm border-l border-slate-200/60 dark:border-slate-700/60 z-40 flex flex-col"
        >
          <div className="flex items-center justify-between p-3 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {NODE_TYPE_LABELS[nodeData.type]}
              </span>
              <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate font-mono" title={nodeData.id}>
                {nodeData.id.split('.').pop()}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="text-xs text-slate-300 dark:text-slate-600 font-mono mb-3 break-all">{nodeData.id}</div>

            {nodeData.declType && (
              <Section icon={Code} title="类型签名">
                <CodeBlock content={nodeData.declType} />
              </Section>
            )}

            {nodeData.docString && (
              <Section icon={BookOpen} title="文档">
                <div className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{nodeData.docString}</div>
              </Section>
            )}

            {nodeData.moduleDoc && (
              <Section icon={BookOpen} title="模块文档">
                <ExpandableText text={nodeData.moduleDoc} />
              </Section>
            )}

            {nodeData.type === 'Theorem' && nodeData.goalState && (
              <Section icon={Lightbulb} title="证明目标">
                <CodeBlock content={nodeData.goalState} />
              </Section>
            )}

            {nodeData.type === 'Theorem' && nodeData.proofTactic && (
              <Section icon={FileCode} title="证明策略">
                <CodeBlock content={nodeData.proofTactic} />
              </Section>
            )}

            {nodeData.directDeps.length > 0 && (
              <Section icon={GitBranch} title="直接依赖">
                <DepList deps={nodeData.directDeps} onNavigate={onNavigate} />
              </Section>
            )}

            {nodeData.indirectDeps.length > 0 && (
              <Section icon={GitBranch} title="间接依赖">
                <DepList deps={nodeData.indirectDeps} onNavigate={onNavigate} />
              </Section>
            )}

            {nodeData.specialDeps.length > 0 && (
              <Section icon={GitBranch} title="特殊依赖">
                <DepList deps={nodeData.specialDeps} onNavigate={onNavigate} />
              </Section>
            )}

            {nodeData.extendsClasses.length > 0 && (
              <Section icon={Layers} title="继承">
                <DepList deps={nodeData.extendsClasses} onNavigate={onNavigate} />
              </Section>
            )}

            {nodeData.sameModule.length > 0 && (
              <Section icon={Layers} title="同模块声明">
                <DepList deps={nodeData.sameModule} onNavigate={onNavigate} />
              </Section>
            )}

            {nodeData.sourceCode && (
              <Section icon={Code} title="源码">
                <CodeBlock content={nodeData.sourceCode} />
              </Section>
            )}
          </div>

          <div className="p-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-300 dark:text-slate-600 flex gap-3">
            <span>模块: {nodeData.module.split('.').slice(-2)
              .join('.')}</span>
            <span>分支: {nodeData.branch}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
