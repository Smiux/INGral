/**
 * 知识图列表页面
 * 展示和管理知识图
 */
import { Plus, Grid } from 'lucide-react';


export const GraphListPage: React.FC = () => {
  /**
   * 处理创建新图
   */
  const handleCreateGraph = () => {
    window.open('/graphs/create', '_blank', 'noopener noreferrer');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">知识图</h1>
            <p className="text-gray-600">探索和管理知识图</p>
          </div>
          <button
            onClick={handleCreateGraph}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            创建新图
          </button>
        </div>
        {(
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Grid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">没有找到图</h3>
            <p className="mt-2 text-gray-600 mb-6">
              目前还没有可用的图。
            </p>
            <button
              onClick={handleCreateGraph}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              创建你的第一个图
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
