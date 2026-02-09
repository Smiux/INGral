import React, { useState, useCallback } from 'react';
import { Download, Upload, FileText, Database, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { useReactFlow, type Node, type Edge } from '@xyflow/react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';

interface GraphImportExportPanelProps {
  onImportComplete: (_nodes: Node<CustomNodeData>[], _edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
}

type ExportFormat = 'json' | 'csv';
type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * 图导入导出面板组件
 * 支持多种格式的图数据导入导出
 */
export const GraphImportExportPanel: React.FC<GraphImportExportPanelProps> = React.memo(({ onImportComplete, onClose }) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importMessage, setImportMessage] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const reactFlowInstance = useReactFlow();
  const nodeCount = reactFlowInstance.getNodes().length;
  const edgeCount = reactFlowInstance.getEdges().length;

  const handleExport = useCallback(() => {
    setIsExporting(true);

    const createDownloadLink = (content: string, filename: string, mimeType: string): void => {
      const dataUri = `${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', filename);
      linkElement.click();
    };

    const generateFilename = (format: ExportFormat): string => {
      const date = new Date()
        .toISOString()
        .slice(0, 10);
      return `graph-export-${date}.${format}`;
    };

    const nodesData = reactFlowInstance.getNodes().map((node) => ({
      'id': node.id,
      'position': node.position,
      'data': node.data,
      'type': node.type
    })) as Node<CustomNodeData>[];

    const edgesData = reactFlowInstance.getEdges().map((edge) => ({
      'id': edge.id,
      'source': edge.source,
      'target': edge.target,
      'data': edge.data,
      'type': edge.type,
      'markerEnd': edge.markerEnd
    })) as Edge<CustomEdgeData>[];

    try {
      if (exportFormat === 'json') {
        const exportData = {
          'nodes': nodesData,
          'edges': edgesData,
          'metadata': {
            'exportDate': new Date().toISOString(),
            'nodeCount': nodesData.length,
            'edgeCount': edgesData.length,
            'version': '1.0'
          }
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        createDownloadLink(dataStr, generateFilename('json'), 'data:application/json');
      } else if (exportFormat === 'csv') {
        const nodeCsv = [
          ['Node ID', 'Type', 'Title', 'Label', 'X', 'Y'],
          ...nodesData.map((node: Node<CustomNodeData>) => [
            node.id,
            node.data?.type || 'default',
            node.data?.title || '',
            node.data?.label || '',
            node.position.x.toString(),
            node.position.y.toString()
          ])
        ].map(row => row.join(',')).join('\n');

        const edgeCsv = [
          ['Edge ID', 'Source', 'Target', 'Type', 'Weight', 'Curve Type'],
          ...edgesData.map((edge: Edge<CustomEdgeData>) => [
            edge.id,
            edge.source.toString(),
            edge.target.toString(),
            edge.data?.type || 'related',
            (edge.data?.weight || 1).toString(),
            edge.data?.curveType || 'default'
          ])
        ].map(row => row.join(',')).join('\n');

        const csvContent = `${nodeCsv}\n\n${edgeCsv}`;
        createDownloadLink(csvContent, generateFilename('csv'), 'data:text/csv');
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [exportFormat, reactFlowInstance]);

  // 导入功能 - 处理文件选择
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImportStatus('loading');
    setImportMessage('正在解析文件...');

    try {
      const fileExtension = file.name.split('.').pop()
        ?.toLowerCase();

      // 文件类型验证
      if (!['json', 'csv'].includes(fileExtension || '')) {
        throw new Error('不支持的文件格式，请选择JSON或CSV文件');
      }

      const fileContent = await file.text();
      let importedNodes: Node<CustomNodeData>[] = [];
      let importedEdges: Edge<CustomEdgeData>[] = [];

      if (fileExtension === 'json') {
        // 解析JSON文件
        const importData = JSON.parse(fileContent);

        // 验证JSON结构
        if (!importData.nodes || !Array.isArray(importData.nodes)) {
          throw new Error('无效的JSON文件：缺少nodes数组');
        }

        if (!importData.edges || !Array.isArray(importData.edges)) {
          throw new Error('无效的JSON文件：缺少edges数组');
        }

        importedNodes = importData.nodes as Node<CustomNodeData>[];
        importedEdges = importData.edges as Edge<CustomEdgeData>[];
      } else if (fileExtension === 'csv') {
        // 解析CSV文件
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');

        // 找到节点和连接数据的分界点（空行之后）
        const emptyLineIndex = lines.findIndex(line => line.trim() === '');

        if (emptyLineIndex === -1) {
          throw new Error('无效的CSV文件：缺少节点和连接数据的分隔');
        }

        // 解析节点数据
        const nodeLines = lines.slice(0, emptyLineIndex);
        const nodeHeaderLine = nodeLines[0];
        if (!nodeHeaderLine) {
          throw new Error('无效的CSV文件：缺少节点数据标题行');
        }
        const nodeHeaders = nodeHeaderLine.split(',');

        // 验证节点头信息
        if (!nodeHeaders.includes('Node ID') || !nodeHeaders.includes('X') || !nodeHeaders.includes('Y')) {
          throw new Error('无效的CSV文件：节点数据缺少必要字段');
        }

        importedNodes = nodeLines.slice(1).map((line, index) => {
          const values = line.split(',');
          return {
            'id': values[0] || `node-${index}`,
            'type': 'custom',
            'position': {
              'x': parseFloat(values[4] || '0') || 0,
              'y': parseFloat(values[5] || '0') || 0
            },
            'data': {
              'type': values[1] || 'default',
              'title': values[2] || `Node ${index + 1}`,
              'label': values[3] || ''
            },
            'selected': false
          } as Node<CustomNodeData>;
        });

        // 解析连接数据
        const edgeLines = lines.slice(emptyLineIndex + 1);
        const edgeHeaderLine = edgeLines[0];
        if (!edgeHeaderLine) {
          throw new Error('无效的CSV文件：缺少连接数据标题行');
        }
        const edgeHeaders = edgeHeaderLine.split(',');

        // 验证连接头信息
        if (!edgeHeaders.includes('Edge ID') || !edgeHeaders.includes('Source') || !edgeHeaders.includes('Target')) {
          throw new Error('无效的CSV文件：连接数据缺少必要字段');
        }

        importedEdges = edgeLines.slice(1).map(line => {
          const values = line.split(',');
          return {
            'id': values[0] || `edge-${Date.now()}-${Math.random().toString(36)
              .substr(2, 9)}`,
            'source': values[1] || '',
            'target': values[2] || '',
            'type': 'floating',
            'data': {
              'type': values[3] || 'related',
              'weight': parseFloat(values[4] || '1') || 1,
              'curveType': (values[5] as 'default' | 'smoothstep' | 'straight' | 'simplebezier') || 'default'
            },
            'selected': false
          } as Edge<CustomEdgeData>;
        });
      }

      // 验证导入数据的完整性
      if (importedNodes.length === 0) {
        throw new Error('无效的文件：未找到节点数据');
      }

      // 调用导入完成回调
      onImportComplete(importedNodes, importedEdges);

      setImportStatus('success');
      setImportMessage(`成功导入 ${importedNodes.length} 个节点和 ${importedEdges.length} 个连接`);

      // 3秒后重置状态
      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 3000);
    } catch (error) {
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : '导入失败，请检查文件格式');

      // 5秒后重置状态
      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 5000);
    } finally {
      // 重置文件输入
      event.target.value = '';
    }
  }, [onImportComplete]);



  return (
    <div className="panel-container">
      <div className="panel-header">
        <div className="panel-title">
          <Database className="w-5 h-5 text-primary-400" />
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
        {importStatus !== 'idle' && (() => {
          const statusConfig = {
            'success': { 'bg': 'bg-green-50', 'text': 'text-green-800', 'icon': <CheckCircle2 className="w-5 h-5 text-green-500" /> },
            'error': { 'bg': 'bg-red-50', 'text': 'text-red-800', 'icon': <AlertCircle className="w-5 h-5 text-red-500" /> },
            'loading': { 'bg': 'bg-blue-50', 'text': 'text-blue-800', 'icon': <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> }
          };
          const config = statusConfig[importStatus];
          return (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg mb-4 ${config.bg} ${config.text}`}>
              {config.icon}
              <span className="text-sm font-medium">{importMessage}</span>
            </div>
          );
        })()}

        <div className="rounded-xl p-5 border border-primary-100 hover:shadow-md transition-all duration-300 bg-primary-50">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-neutral-800">
            <Download className="w-4 h-4 text-primary-400" />
            导出图
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-sm font-medium min-w-[80px] text-neutral-600">导出格式</label>
              <div className="flex gap-3 flex-wrap">
                {(['json', 'csv'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out flex items-center gap-2 transform hover:scale-[1.03] ${exportFormat === format ? 'text-white shadow-md bg-gradient-to-r from-primary-500 to-primary-600' : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'}`}
                  >
                    {format === 'json' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <Database className="w-4 h-4" />
                    )}
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/70 p-3.5 rounded-lg shadow-sm border border-primary-100">
              <p className="text-sm text-neutral-600">
                当前图包含 <strong className="text-primary-700">{nodeCount} 个节点</strong> 和 <strong className="text-primary-700">{edgeCount} 个连接</strong>
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting || nodeCount === 0}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-sm hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-white ${isExporting || nodeCount === 0 ? 'bg-gradient-to-r from-neutral-300 to-neutral-400 text-neutral-500 cursor-not-allowed hover:shadow-sm hover:scale-100' : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'}`}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isExporting ? '导出中...' : '导出图'}
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl p-5 shadow-sm border border-secondary-100 hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-secondary-500" />
            导入图
          </h3>

          <div className="space-y-4">
            <div className="bg-white/70 p-3.5 rounded-lg border border-amber-200 shadow-sm">
              <p className="text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span><strong>注意：</strong>导入将替换当前图的所有节点和连接。请确保在导入前保存当前工作。</span>
              </p>
            </div>

            <div className="text-sm text-neutral-600 bg-white/70 p-3.5 rounded-lg shadow-sm border border-secondary-100">
              <p className="mb-2 font-medium">支持的导入格式：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>JSON - 完整的图数据，包括节点和连接的所有属性</li>
                <li>CSV - 包含节点数据和连接数据，用空行分隔</li>
              </ul>
            </div>

            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".json,.csv"
                onChange={handleFileChange}
                disabled={importStatus === 'loading'}
              />
              <button
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={importStatus === 'loading'}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-sm hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:ring-offset-2 focus:ring-offset-white ${importStatus === 'loading' ? 'bg-gradient-to-r from-neutral-300 to-neutral-400 text-neutral-500 cursor-not-allowed hover:shadow-sm hover:scale-100' : 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white'}`}
              >
                {importStatus === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {importStatus === 'loading' ? '导入中...' : '选择文件导入'}
              </button>
            </div>

            <div className="text-xs text-neutral-500 text-center font-medium">
              支持 .json 和 .csv 格式文件
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});


