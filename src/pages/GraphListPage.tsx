/**
 * 知识图谱列表页面
 * 展示和管理知识图谱
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../components/ui/Loader';
import type { Graph } from '../types';
import { Plus, Grid } from 'lucide-react';
import { graphService } from '../services/graphService';

/**
 * 图谱卡片属性接口
 */
interface GraphCardProps {

  /** 图谱数据 */
  graph: Graph;

  /** 点击事件处理函数 */
  onClick: () => void;
}

/**
 * 图谱卡片组件
 * @param props - 组件属性
 */
const GraphCard: React.FC<GraphCardProps> = ({ graph, onClick }) => {
  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">{graph.title}</h3>
        </div>
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
          <span>{graph.nodes?.length || 0} 节点</span>
          <span>{graph.links?.length || 0} 连接</span>
          <span>{new Date(graph.created_at || Date.now()).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export const GraphListPage: React.FC = () => {
  const navigate = useNavigate();
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * 加载图谱数据
   */
  useEffect(() => {
    const loadGraphs = async () => {
      setLoading(true);
      try {
        // 只加载公开图谱
        const allGraphs = await graphService.getAllGraphs('public');
        setGraphs(allGraphs);
      } catch (error) {
        console.error('Error loading graphs:', error);
        setGraphs([]);
      } finally {
        setLoading(false);
      }
    };

    loadGraphs();
  }, []);

  /**
   * 处理创建新图谱
   */
  const handleCreateGraph = () => {
    window.open('/graphs/create', '_blank', 'noopener noreferrer');
  };

  /**
   * 处理图谱点击事件
   * @param graphId - 图谱ID
   */
  const handleGraphClick = (graphId: string) => {
    navigate(`/graphs/${graphId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Graphs</h1>
            <p className="text-gray-600">Explore and manage knowledge graphs</p>
          </div>
          <button
            onClick={handleCreateGraph}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create New Graph
          </button>
        </div>

        {/* Graph List */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader size="large" text="Loading graphs..." />
          </div>
        )}
        {!loading && graphs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {graphs.map((graph) => (
              <GraphCard
                key={graph.id}
                graph={graph}
                onClick={() => handleGraphClick(graph.id!)}
              />
            ))}
          </div>
        )}
        {!loading && graphs.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Grid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No graphs found</h3>
            <p className="mt-2 text-gray-600 mb-6">
              There are no public graphs available yet.
            </p>
            <button
              onClick={handleCreateGraph}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Graph
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// export default GraphListPage;
