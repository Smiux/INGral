import React from 'react';
import type { GraphNode, GraphLink } from '../../../types';

interface GraphGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  onInsert: () => void;
  generatedGraph: { nodes: GraphNode[]; links: GraphLink[] } | null;
  config: {
    maxNodes: number;
    maxLinks: number;
    minConceptOccurrences: number;
    extractionDepth: number;
  };
  onConfigChange: (_config: {
    maxNodes: number;
    maxLinks: number;
    minConceptOccurrences: number;
    extractionDepth: number;
  }) => void;
}

export const GraphGenerator: React.FC<GraphGeneratorProps> = ({
  isOpen,
  onClose,
  onGenerate,
  onInsert,
  generatedGraph,
  config,
  onConfigChange
}) => {
  if (!isOpen) {
    return null;
  }

  const handleConfigChange = (field: string, value: number) => {
    onConfigChange({
      ...config,
      [field]: value
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">知识图表生成器</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 配置区域 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">生成配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                最大节点数
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={config.maxNodes}
                onChange={(e) => handleConfigChange('maxNodes', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                最大关系数
              </label>
              <input
                type="number"
                min="5"
                max="200"
                value={config.maxLinks}
                onChange={(e) => handleConfigChange('maxLinks', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                概念最小出现次数
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.minConceptOccurrences}
                onChange={(e) => handleConfigChange('minConceptOccurrences', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                提取深度
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={config.extractionDepth}
                onChange={(e) => handleConfigChange('extractionDepth', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onGenerate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              生成知识图表
            </button>
          </div>
        </div>

        {/* 结果展示区域 */}
        {generatedGraph && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">生成结果</h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  节点数: {generatedGraph.nodes.length}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  关系数: {generatedGraph.links.length}
                </span>
              </div>
              <div className="mt-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">主要概念:</h4>
                <div className="flex flex-wrap gap-2">
                  {generatedGraph.nodes.slice(0, 10).map((node) => (
                    <span
                      key={node.id}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full"
                    >
                      {node.title}
                    </span>
                  ))}
                  {generatedGraph.nodes.length > 10 && (
                    <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                      +{generatedGraph.nodes.length - 10} 更多
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onInsert}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                插入到文章
              </button>
            </div>
          </div>
        )}

        {/* 底部说明 */}
        <div className="p-4 bg-gray-50 dark:bg-gray-750">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>提示：</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>调整配置参数可以控制生成的知识图表复杂度</li>
              <li>生成的图表将使用 [graph]...[/graph] 语法插入到文章中</li>
              <li>可以在预览模式中查看知识图表的渲染效果</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
