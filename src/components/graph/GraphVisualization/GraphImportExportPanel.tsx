import React, { useState, useCallback } from 'react';
import { Download, Upload, FileText, Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { type Node, type Edge } from '@xyflow/react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';

interface GraphImportExportPanelProps {
  nodes: Node<CustomNodeData>[];
  edges: Edge<CustomEdgeData>[];
  onImportComplete: (_nodes: Node<CustomNodeData>[], _edges: Edge<CustomEdgeData>[]) => void;
}

type ExportFormat = 'json' | 'csv';
type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * 图谱导入导出面板组件
 * 支持多种格式的图谱数据导入导出
 */
export const GraphImportExportPanel: React.FC<GraphImportExportPanelProps> = React.memo(({ nodes, edges, onImportComplete }) => {
  // 状态管理
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importMessage, setImportMessage] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // 导出功能
  const handleExport = useCallback(() => {
    setIsExporting(true);

    try {
      if (exportFormat === 'json') {
        // 导出为JSON格式
        const exportData = {
          'nodes': nodes || [],
          'edges': edges || [],
          'metadata': {
            'exportDate': new Date().toISOString(),
            'nodeCount': nodes?.length || 0,
            'edgeCount': edges?.length || 0,
            'version': '1.0'
          }
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `graph-export-${new Date().toISOString()
          .slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      } else if (exportFormat === 'csv') {
        // 导出为CSV格式
        // 导出节点
        const nodeCsv = [
          ['Node ID', 'Type', 'Title', 'Label', 'X', 'Y'],
          ...(nodes || []).map((node: Node<CustomNodeData>) => [
            node.id,
            node.data?.type || 'default',
            node.data?.title || '',
            node.data?.label || '',
            node.position.x.toString(),
            node.position.y.toString()
          ])
        ].map(row => row.join(',')).join('\n');

        // 导出连接
        const edgeCsv = [
          ['Edge ID', 'Source', 'Target', 'Type', 'Weight', 'Curve Type'],
          ...(edges || []).map((edge: Edge<CustomEdgeData>) => [
            edge.id,
            edge.source.toString(),
            edge.target.toString(),
            edge.data?.type || 'related',
            (edge.data?.weight || 1).toString(),
            edge.data?.curveType || 'default'
          ])
        ].map(row => row.join(',')).join('\n');

        // 合并节点和连接数据，用空行分隔
        const csvContent = `${nodeCsv}\n\n${edgeCsv}`;
        const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);

        const exportFileDefaultName = `graph-export-${new Date().toISOString()
          .slice(0, 10)}.csv`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [nodes, edges, exportFormat]);

  // 导入功能 - 处理文件选择
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImportStatus('loading');
    setIsImporting(true);
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
      setIsImporting(false);
      // 重置文件输入
      event.target.value = '';
    }
  }, [onImportComplete]);

  // 渲染导入状态反馈
  const renderImportStatus = () => {
    if (importStatus === 'idle') {
      return null;
    }

    const statusConfig = {
      'success': {
        'icon': <CheckCircle2 className="w-5 h-5 text-green-500" />,
        'bg': 'bg-green-50',
        'text': 'text-green-800'
      },
      'error': {
        'icon': <AlertCircle className="w-5 h-5 text-red-500" />,
        'bg': 'bg-red-50',
        'text': 'text-red-800'
      },
      'loading': {
        'icon': <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
        'bg': 'bg-blue-50',
        'text': 'text-blue-800'
      }
    };

    const config = statusConfig[importStatus];

    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${config.bg} ${config.text} mb-4`}>
        {config.icon}
        <span className="text-sm font-medium">{importMessage}</span>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-white shadow-lg overflow-y-auto">
      {/* 面板标题 */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          导入导出
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          支持多种格式的图谱数据导入导出
        </p>
      </div>

      {/* 内容区域 */}
      <div className="p-6 space-y-8">
        {/* 导入状态反馈 */}
        {renderImportStatus()}

        {/* 导出功能 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Download className="w-4 h-4 text-gray-500" />
            导出图谱
          </h3>

          <div className="space-y-4">
            {/* 导出格式选择 */}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-sm text-gray-600 min-w-[80px]">导出格式</label>
              <div className="flex gap-2 flex-wrap">
                {(['json', 'csv'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out flex items-center gap-2 ${exportFormat === format ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
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

            {/* 导出信息 */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">
                当前图谱包含 <strong>{nodes?.length || 0} 个节点</strong> 和 <strong>{edges?.length || 0} 个连接</strong>
              </p>
            </div>

            {/* 导出按钮 */}
            <button
              onClick={handleExport}
              disabled={isExporting || (nodes?.length || 0) === 0}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ease-in-out flex items-center justify-center gap-2 ${isExporting || (nodes?.length || 0) === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'}`}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isExporting ? '导出中...' : '导出图谱'}
            </button>
          </div>
        </div>

        {/* 导入功能 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-gray-500" />
            导入图谱
          </h3>

          <div className="space-y-4">
            {/* 导入说明 */}
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800">
                <strong>注意：</strong>导入将替换当前图谱的所有节点和连接。请确保在导入前保存当前工作。
              </p>
            </div>

            {/* 导入格式说明 */}
            <div className="text-sm text-gray-600">
              <p className="mb-2">支持的导入格式：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>JSON - 完整的图谱数据，包括节点和连接的所有属性</li>
                <li>CSV - 包含节点数据和连接数据，用空行分隔</li>
              </ul>
            </div>

            {/* 导入按钮 */}
            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".json,.csv"
                onChange={handleFileChange}
                disabled={isImporting}
              />
              <button
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isImporting}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ease-in-out flex items-center justify-center gap-2 ${isImporting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md'}`}
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {isImporting ? '导入中...' : '选择文件导入'}
              </button>
            </div>

            {/* 导入提示 */}
            <div className="text-xs text-gray-500 text-center">
              支持 .json 和 .csv 格式文件
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});


