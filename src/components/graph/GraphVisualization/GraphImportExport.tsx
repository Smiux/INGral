import React, { useState, useRef } from 'react';
import { exportService } from '../../../services/exportService';
import { type Graph, GraphNodeType, GraphVisibility } from '../../../types';
import type { EnhancedNode, EnhancedGraphConnection } from './types';

interface GraphImportExportProps {
  nodes: EnhancedNode[];
  links: EnhancedGraphConnection[];
  onImportGraph: (_graph: Graph) => void;
  graphTitle?: string;
  svgSelector?: string;
  showNotification: (_message: string, _type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const GraphImportExport: React.FC<GraphImportExportProps> = ({
  nodes,
  links,
  onImportGraph,
  graphTitle = 'knowledge-graph',
  svgSelector = 'svg',
  showNotification
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理导出操作
  const handleExport = async (format: 'json' | 'graphml' | 'csv' | 'pdf' | 'png') => {
    setIsExporting(true);

    try {
      // 转换节点和链接格式
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
          'source': typeof link.source === 'object' ? (link.source as EnhancedNode).id : String(link.source),
          'target': typeof link.target === 'object' ? (link.target as EnhancedNode).id : String(link.target),
          'type': link.type
        })),
        'is_template': false,
        'visibility': GraphVisibility.PUBLIC,
        'created_at': new Date().toISOString(),
        'updated_at': new Date().toISOString(),
        // 编辑限制相关字段
        'edit_count_24h': 0,
        'edit_count_7d': 0,
        'last_edit_date': new Date().toISOString(),
        'is_change_public': true,
        'is_slow_mode': false,
        'is_unstable': false
      };

      switch (format) {
        case 'json':
          await exportService.exportGraphAsJsonFile(graph);
          break;
        case 'graphml':
          await exportService.exportGraphAsGraphmlFile(graph);
          break;
        case 'csv':
          await exportService.exportGraphAsCsvFiles(graph);
          break;
        case 'pdf':
          await exportService.exportGraphAsPdf(svgSelector, graph);
          break;
        case 'png':
          const safeFilename = graph.title ? graph.title.replace(/[^a-zA-Z0-9_-]/g, '_') : 'knowledge-graph';
          await exportService.exportGraphAsPng(svgSelector, `${safeFilename}.png`);
          break;
      }
    } catch (error) {
      console.error(`导出为${format}失败:`, error);
      showNotification(`导出失败: ${(error as Error).message || '未知错误'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // 处理导入操作
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);

    try {
      const graph = await exportService.importGraphFromFile(file);
      onImportGraph(graph);
    } catch (error) {
      console.error('导入图谱失败:', error);
      showNotification(`导入失败: ${(error as Error).message || '未知错误'}`, 'error');
    } finally {
      setIsImporting(false);
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">图谱导入/导出</h3>

      <div className="space-y-4">
        {/* 导出部分 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">导出图谱</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isExporting ? '导出中...' : '导出为 JSON'}
            </button>
            <button
              onClick={() => handleExport('graphml')}
              disabled={isExporting}
              className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
            >
              {isExporting ? '导出中...' : '导出为 GraphML'}
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="px-3 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors disabled:bg-purple-300 disabled:cursor-not-allowed"
            >
              {isExporting ? '导出中...' : '导出为 CSV'}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              {isExporting ? '导出中...' : '导出为 PDF'}
            </button>
            <button
              onClick={() => handleExport('png')}
              disabled={isExporting}
              className="px-3 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 transition-colors disabled:bg-orange-300 disabled:cursor-not-allowed"
            >
              {isExporting ? '导出中...' : '导出为 PNG'}
            </button>
          </div>
        </div>

        {/* 导入部分 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">导入图谱</h4>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.graphml"
              onChange={handleImport}
              className="hidden"
              id="graph-import-file"
            />
            <label
              htmlFor="graph-import-file"
              className="px-3 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 transition-colors cursor-pointer"
            >
              {isImporting ? '导入中...' : '选择文件导入'}
            </label>
            <div className="text-xs text-gray-500 mt-1">
              支持格式: JSON, GraphML
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
