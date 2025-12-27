import React, { useState, useRef } from 'react';
import { exportService } from '../../../services/exportService';
import { type Graph, GraphNodeType, GraphVisibility } from '../../../types';
import type { GraphNode, GraphConnection } from './GraphTypes';

interface GraphImportExportProps {
  nodes: GraphNode[];
  links: GraphConnection[];
  onImportGraph: (_graph: Graph) => void;
  graphTitle?: string;
  showNotification: (_message: string, _type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const GraphImportExport: React.FC<GraphImportExportProps> = ({
  nodes,
  links,
  onImportGraph,
  graphTitle = 'knowledge-graph',
  showNotification
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (format: 'json' | 'graphml' | 'csv' | 'pdf' | 'png') => {
    setIsExporting(true);

    try {
      const graph: Graph = {
        'id': `exported-${Date.now()}`,
        'author_id': 'exported',
        'author_name': 'Exported',
        'title': graphTitle,
        'nodes': nodes.map(node => ({
          'id': node.id,
          'title': node.title,
          'connections': node.connections,
          'type': GraphNodeType[(node.type?.toUpperCase() as keyof typeof GraphNodeType) || 'CONCEPT'],
          'content': node.metadata.content || ''
        })),
        'links': links.map(link => ({
          'source': String(link.source),
          'target': String(link.target),
          'type': link.type
        })),
        'visibility': GraphVisibility.PUBLIC,
        'created_at': new Date().toISOString(),
        'updated_at': new Date().toISOString(),
        'edit_count_24h': 0,
        'edit_count_7d': 0,
        'last_edit_date': new Date().toISOString(),
        'is_change_public': false,
        'is_slow_mode': false,
        'is_unstable': false
      };

      if (format === 'json') {
        await exportService.exportGraphAsJsonFile(graph);
      } else if (format === 'graphml') {
        await exportService.exportGraphAsGraphmlFile(graph);
      } else if (format === 'csv') {
        await exportService.exportGraphAsCsvFiles(graph);
      } else if (format === 'pdf') {
        await exportService.exportGraphAsPdf('#graph-canvas', graph);
      } else if (format === 'png') {
        await exportService.exportGraphAsPng('#graph-canvas', 'graph-export.png');
      }
      showNotification('导出成功', 'success');
    } catch {
      showNotification('导出失败', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);

    try {
      const graph = await exportService.importGraphFromFile(file);
      onImportGraph(graph);
      showNotification('导入成功', 'success');
    } catch {
      showNotification('导入失败', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => handleExport('json')}
          disabled={isExporting}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isExporting ? '导出中...' : '导出JSON'}
        </button>
        <button
          onClick={() => handleExport('graphml')}
          disabled={isExporting}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isExporting ? '导出中...' : '导出GraphML'}
        </button>
        <button
          onClick={() => handleExport('csv')}
          disabled={isExporting}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isExporting ? '导出中...' : '导出CSV'}
        </button>
        <button
          onClick={() => handleExport('png')}
          disabled={isExporting}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isExporting ? '导出中...' : '导出PNG'}
        </button>
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          导入图谱
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.graphml,.csv"
          onChange={handleImport}
          disabled={isImporting}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};

export default GraphImportExport;
