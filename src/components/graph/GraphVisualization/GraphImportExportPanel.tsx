import React, { useState, useCallback } from 'react';
import { Download, Upload, FileText, Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useStore, type Node, type Edge } from '@xyflow/react';
import type { CustomNodeData } from './CustomNode';
import type { CustomEdgeData } from './FloatingEdge';

interface GraphImportExportPanelProps {
  onImportComplete: (_nodes: Node<CustomNodeData>[], _edges: Edge<CustomEdgeData>[]) => void;
  onClose: () => void;
}

// 比较函数，只比较必要的属性
const edgesEqual = (prev: Edge[], next: Edge[]): boolean => {
  if (prev.length !== next.length) {
    return false;
  }

  // 比较边的关键属性：source, target, weight
  for (let i = 0; i < prev.length; i += 1) {
    const prevEdge = prev[i];
    const nextEdge = next[i];

    if (!prevEdge || !nextEdge) {
      return false;
    }

    if (String(prevEdge.source) !== String(nextEdge.source) ||
        String(prevEdge.target) !== String(nextEdge.target) ||
        (prevEdge.data?.weight || 1) !== (nextEdge.data?.weight || 1)) {
      return false;
    }
  }
  return true;
};

const nodesEqual = (prev: Node[], next: Node[]): boolean => {
  if (prev.length !== next.length) {
    return false;
  }

  // 比较节点的关键属性：id
  for (let i = 0; i < prev.length; i += 1) {
    const prevNode = prev[i];
    const nextNode = next[i];

    if (!prevNode || !nextNode || prevNode.id !== nextNode.id) {
      return false;
    }
  }
  return true;
};

type ExportFormat = 'json' | 'csv';
type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * 图导入导出面板组件
 * 支持多种格式的图数据导入导出
 */
export const GraphImportExportPanel: React.FC<GraphImportExportPanelProps> = React.memo(({ onImportComplete, onClose }) => {
  // 在组件内部使用useStore获取nodes和edges，避免不必要的props传递
  const nodes = useStore<Node<CustomNodeData>[]>((state) =>
    state.nodes.map((node) => ({
      'id': node.id,
      'position': node.position,
      'data': node.data,
      'type': node.type
    })) as Node<CustomNodeData>[],
  nodesEqual
  );

  const edges = useStore<Edge<CustomEdgeData>[]>((state) =>
    state.edges.map((edge) => ({
      'id': edge.id,
      'source': edge.source,
      'target': edge.target,
      'data': edge.data,
      'type': edge.type,
      'markerEnd': edge.markerEnd
    })) as Edge<CustomEdgeData>[],
  edgesEqual
  );

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
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            导入导出
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            支持多种格式的图数据导入导出
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors flex-shrink-0"
          title="关闭面板"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-6 space-y-8">
        {/* 导入状态反馈 */}
        {renderImportStatus()}

        {/* 导出功能 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-600" />
            导出图
          </h3>

          <div className="space-y-4">
            {/* 导出格式选择 */}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-sm text-gray-600 font-medium min-w-[80px]">导出格式</label>
              <div className="flex gap-3 flex-wrap">
                {(['json', 'csv'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out flex items-center gap-2 transform hover:scale-[1.03] ${exportFormat === format ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
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
            <div className="bg-white/70 p-3.5 rounded-lg shadow-sm border border-blue-100">
              <p className="text-sm text-gray-600">
                当前图包含 <strong className="text-blue-700">{nodes?.length || 0} 个节点</strong> 和 <strong className="text-blue-700">{edges?.length || 0} 个连接</strong>
              </p>
            </div>

            {/* 导出按钮 */}
            <button
              onClick={handleExport}
              disabled={isExporting || (nodes?.length || 0) === 0}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-sm hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white ${isExporting || (nodes?.length || 0) === 0 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed hover:shadow-sm hover:scale-100' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}`}
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

        {/* 导入功能 */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 shadow-sm border border-green-100 hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-green-600" />
            导入图
          </h3>

          <div className="space-y-4">
            {/* 导入说明 */}
            <div className="bg-white/70 p-3.5 rounded-lg border border-amber-200 shadow-sm">
              <p className="text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span><strong>注意：</strong>导入将替换当前图的所有节点和连接。请确保在导入前保存当前工作。</span>
              </p>
            </div>

            {/* 导入格式说明 */}
            <div className="text-sm text-gray-600 bg-white/70 p-3.5 rounded-lg shadow-sm border border-green-100">
              <p className="mb-2 font-medium">支持的导入格式：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>JSON - 完整的图数据，包括节点和连接的所有属性</li>
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
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-sm hover:shadow-lg transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white ${isImporting ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed hover:shadow-sm hover:scale-100' : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'}`}
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
            <div className="text-xs text-gray-500 text-center font-medium">
              支持 .json 和 .csv 格式文件
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});


