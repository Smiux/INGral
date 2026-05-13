import React, { useState, useCallback } from 'react';
import { Download, Upload, FileText, AlertCircle, X } from 'lucide-react';
import { useReactFlow, useStore, type Node, type Edge } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { CustomNodeData } from '../Node';
import type { CustomEdgeData } from '../Edge';
import {
  PANEL_CONTAINER_CLASS,
  PANEL_HEADER_CLASS,
  PANEL_TITLE_CLASS,
  PANEL_CONTENT_CLASS,
  PANEL_CLOSE_BTN_CLASS,
  getButtonClasses,
  BUTTON_DISABLED_CLASS,
  PANEL_MOTION_VARIANTS_LEFT,
  PANEL_MOTION_TRANSITION
} from './panelStyles';

interface ImportExportPanelProps {
  onImportComplete: (_nodes: Node<CustomNodeData>[], _edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
}

export const ImportExportPanel: React.FC<ImportExportPanelProps> = React.memo(({ onImportComplete, onClose }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reactFlowInstance = useReactFlow();
  const nodeCount = useStore((state) => state.nodes.length);
  const edgeCount = useStore((state) => state.edges.length);

  const handleExport = useCallback(() => {
    const nodes = reactFlowInstance.getNodes();
    const edges = reactFlowInstance.getEdges();
    const date = new Date()
      .toISOString()
      .slice(0, 10);

    const exportData = {
      'nodes': nodes.map(n => ({ 'id': n.id, 'position': n.position, 'data': n.data, 'type': n.type })),
      'edges': edges.map(e => ({ 'id': e.id, 'source': e.source, 'target': e.target, 'data': e.data, 'type': e.type, 'markerEnd': e.markerEnd })),
      'metadata': { 'exportDate': new Date().toISOString(), 'nodeCount': nodes.length, 'edgeCount': edges.length, 'version': '1.0' }
    };
    const link = document.createElement('a');
    link.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    link.download = `graph-export-${date}.json`;
    link.click();
  }, [reactFlowInstance]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorMessage(null);

    try {
      const ext = file.name
        .split('.')
        .pop()
        ?.toLowerCase();
      if (ext !== 'json') {
        throw new Error('不支持的文件格式，请选择JSON文件');
      }

      const content = await file.text();
      const data = JSON.parse(content);
      const importedNodes: Node<CustomNodeData>[] = data.nodes || [];
      const importedEdges: Edge<CustomEdgeData>[] = data.edges || [];

      onImportComplete(importedNodes, importedEdges);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '导入失败，请检查文件格式');
    } finally {
      event.target.value = '';
    }
  }, [onImportComplete]);

  return (
    <motion.div
      className={PANEL_CONTAINER_CLASS}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={PANEL_MOTION_VARIANTS_LEFT}
      transition={PANEL_MOTION_TRANSITION}
    >
      <header className={`${PANEL_HEADER_CLASS} bg-slate-50/80 dark:bg-slate-900/80`}>
        <div className={PANEL_TITLE_CLASS}>
          <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          导入导出
        </div>
        <button onClick={onClose} className={PANEL_CLOSE_BTN_CLASS}>
          <X size={16} />
        </button>
      </header>

      <div className={`${PANEL_CONTENT_CLASS} bg-slate-100/40 dark:bg-slate-800/40`}>
        {errorMessage && (
          <div className="flex items-center gap-2 px-4 py-2 rounded bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <Download className="w-4 h-4 text-sky-400" />
            导出
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            当前图包含 {nodeCount} 个节点 · {edgeCount} 个连接
          </p>
          <button
            onClick={handleExport}
            disabled={nodeCount === 0}
            className={`w-full bg-slate-200/40 dark:bg-slate-700/40 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 ${getButtonClasses('secondary', 'sky')} ${nodeCount === 0 ? BUTTON_DISABLED_CLASS : ''}`}
          >
            <Download className="w-4 h-4" />
            导出为 JSON
          </button>
        </div>

        <div className="border-t border-slate-200/40 dark:border-slate-700/40" />

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <Upload className="w-4 h-4 text-green-400" />
            导入
          </h3>
          <p className="text-sm text-amber-700/80 dark:text-amber-400/80 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500/70 dark:text-amber-500/70 mt-0.5 flex-shrink-0" />
            <span>导入将替换当前图的所有节点和连接。请确保在导入前保存当前工作。</span>
          </p>
          <label className="relative block cursor-pointer">
            <input
              type="file"
              id="file-upload"
              className="sr-only"
              accept=".json"
              onChange={handleFileChange}
            />
            <span
              className={`w-full bg-slate-200/40 dark:bg-slate-700/40 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 ${getButtonClasses('secondary', 'green')}`}
            >
              <Upload className="w-4 h-4" />
              选择 JSON 文件
            </span>
          </label>
        </div>
      </div>
    </motion.div>
  );
});

export default ImportExportPanel;
