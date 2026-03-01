import React, { useState, useCallback } from 'react';
import { Download, Upload, FileText, AlertCircle, X } from 'lucide-react';
import { useReactFlow, useStore, type Node, type Edge } from '@xyflow/react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';

interface GraphImportExportPanelProps {
  onImportComplete: (_nodes: Node<CustomNodeData>[], _edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const GraphImportExportPanel: React.FC<GraphImportExportPanelProps> = React.memo(({ onImportComplete, onClose, isOpen }) => {
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
    <div className={`panel-container ${isOpen ? 'panel-open' : 'panel-closing'}`}>
      <div className="panel-header">
        <div className="panel-title">
          <FileText className="w-5 h-5 text-sky-400" />
          导入导出
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors flex-shrink-0"
          title="关闭面板"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="panel-content space-y-8">
        {errorMessage && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-800">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        )}

        <div className="rounded-xl p-5 border border-sky-100 transition-all duration-300 bg-sky-50">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-neutral-800">
            <Download className="w-4 h-4 text-sky-400" />
            导出图
          </h3>

          <div className="space-y-4">
            <div className="bg-white/70 p-3.5 rounded-lg border border-sky-100">
              <p className="text-sm text-neutral-600">
                当前图包含 <strong className="text-sky-600">{nodeCount} 个节点</strong> 和 <strong className="text-sky-600">{edgeCount} 个连接</strong>
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={nodeCount === 0}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ease-in-out flex items-center justify-center gap-2 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-white ${nodeCount === 0 ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed hover:scale-100' : 'bg-sky-500 text-white'}`}
            >
              <Download className="w-4 h-4" />
              导出图
            </button>
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-5 border border-green-100 transition-all duration-300">
          <h3 className="text-sm font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-green-500" />
            导入图
          </h3>

          <div className="space-y-4">
            <div className="bg-white/70 p-3.5 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span><strong>注意：</strong>导入将替换当前图的所有节点和连接。请确保在导入前保存当前工作。</span>
              </p>
            </div>

            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".json"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ease-in-out flex items-center justify-center gap-2 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-white bg-green-500 text-white"
              >
                <Upload className="w-4 h-4" />
                选择文件导入
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
