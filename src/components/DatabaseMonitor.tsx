import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Database, RefreshCw, ExternalLink } from 'lucide-react';
import { testSupabaseConnection } from '@/lib/supabase';

interface TableStats {
  name: string;
  rowCount: number;
  lastUpdated: string;
  status: 'ok' | 'warning' | 'error';
}

interface PerformanceMetric {
  name: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
}

export const DatabaseMonitor: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [connectionTime, setConnectionTime] = useState<number>(0);
  const [tableStats, setTableStats] = useState<TableStats[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 使用空数组初始化，之后会从真实数据库获取数据

  const checkConnection = async () => {
    try {
      const startTime = performance.now();
      setConnectionStatus('checking');
      const connected = await testSupabaseConnection();
      const endTime = performance.now();
      setConnectionTime(endTime - startTime);
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // 检查连接
      await checkConnection();
      
      // 暂时使用空数组，后续应从真实数据库获取数据
      setTableStats([]);
      setPerformanceMetrics([]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
    // 每30秒自动刷新一次
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      {/* 标题和刷新按钮 */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Database Monitoring</h2>
        <button 
          onClick={refreshData}
          disabled={isRefreshing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 连接状态卡片 */}
      <div className={`mb-8 p-6 rounded-lg border ${connectionStatus === 'connected' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-100' : 'bg-red-100'}`}>
            {connectionStatus === 'connected' ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {connectionStatus === 'connected' ? 'Connected to Database' : 
               connectionStatus === 'disconnected' ? 'Database Connection Failed' : 'Checking Connection...'}
            </h3>
            <p className="text-sm text-gray-600">
              {connectionStatus === 'connected' 
                ? `Connected in ${connectionTime.toFixed(2)}ms` 
                : connectionStatus === 'disconnected'
                  ? 'Connection failed. Please check database settings.'
                  : 'Testing connection...'}
            </p>
          </div>
        </div>
      </div>

      {/* 性能指标网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {performanceMetrics.map((metric, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">{metric.name}</div>
            <div className="text-xl font-bold text-gray-900 mb-2">{metric.value}</div>
            <div className={`text-xs font-medium px-2 py-1 rounded-full ${metric.trend === 'up' ? 'bg-green-100 text-green-800' : metric.trend === 'down' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
              {metric.trend === 'up' ? '↑ Improving' : metric.trend === 'down' ? '↓ Worsening' : '→ Stable'}
            </div>
          </div>
        ))}
      </div>

      {/* 表格统计 */}
      <div className="overflow-x-auto">
        <h3 className="text-lg font-semibold mb-4">Database Tables</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row Count</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableStats.length > 0 ? tableStats.map((table, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Database className="w-5 h-5 mr-3 text-gray-500" />
                    <div className="font-medium text-gray-900">{table.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-gray-900">{table.rowCount}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{table.lastUpdated}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${table.status === 'ok' ? 'bg-green-100 text-green-800' : table.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {table.status === 'ok' ? 'Healthy' : table.status === 'warning' ? 'Warning' : 'Error'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900 flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                  No tables found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
