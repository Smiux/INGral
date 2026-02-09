import { Plus, Grid } from 'lucide-react';

export function GraphListPage () {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800 mb-2">知识图</h1>
            <p className="text-neutral-600">探索和管理知识图</p>
          </div>
          <button
            onClick={() => window.open('/graphs/create', '_blank', 'noopener noreferrer')}
            className="flex items-center gap-2 px-5 py-3 bg-secondary-50 text-secondary-700 border border-secondary-200 rounded-lg font-medium hover:bg-secondary-100 hover:border-secondary-300 transition-all duration-200 transform hover:scale-105"
          >
            <Plus className="w-5 h-5 text-secondary-600" />
            创建新图
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-12 text-center">
          <Grid className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-800">没有找到图</h3>
          <p className="mt-2 text-neutral-600 mb-6">
            目前还没有可用的图。
          </p>
          <button
            onClick={() => window.open('/graphs/create', '_blank', 'noopener noreferrer')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary-50 text-secondary-700 border border-secondary-200 rounded-lg font-medium hover:bg-secondary-100 hover:border-secondary-300 transition-all duration-200 transform hover:scale-105"
          >
            <Plus className="w-4 h-4 text-secondary-600" />
            创建你的第一个图
          </button>
        </div>
      </div>
    </div>
  );
}
