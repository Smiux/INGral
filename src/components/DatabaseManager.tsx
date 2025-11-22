import React, { useState, useEffect } from 'react';
import { ArrowUpDown, Database, Eye, Trash2, Plus, Filter, Search, Settings, LogOut, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

// 定义表格结构接口
interface TableColumn {
  name: string;
  dataType: string;
  primaryKey: boolean;
}

// 定义表格数据行接口
interface TableRow {
  id: string;
  [key: string]: unknown;
}

const DatabaseManager: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // 获取数据库中的所有表
  const fetchTables = async () => {
    try {
      setLoading(true);
      // 对于Supabase，可以通过information_schema查询表信息
      const { data, error } = await supabase.rpc('list_tables');
      
      if (error) {
        // 如果rpc函数不可用，使用替代方法
        const { data: articles } = await supabase.from('articles').select('*').limit(1);
        const { data: articleLinks } = await supabase.from('article_links').select('*').limit(1);
        const { data: userGraphs } = await supabase.from('user_graphs').select('*').limit(1);
        
        const availableTables = [];
        if (articles !== null) availableTables.push('articles');
        if (articleLinks !== null) availableTables.push('article_links');
        if (userGraphs !== null) availableTables.push('user_graphs');
        
        setTables(availableTables);
      } else {
        setTables(data as string[]);
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError('无法获取数据库表信息');
      // 手动设置已知的表
      setTables(['articles', 'article_links', 'user_graphs']);
    } finally {
      setLoading(false);
    }
  };

  // 获取表结构和数据
  const fetchTableData = async (tableName: string) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedTable(tableName);
      setPage(1);

      // 获取表数据
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(rowsPerPage);

      if (error) {
        throw new Error(`获取表数据失败: ${error.message}`);
      }

      if (data && data.length > 0) {
        // 根据数据推断列信息
        const firstRow = data[0];
        const tableColumns: TableColumn[] = Object.keys(firstRow).map(key => ({
          name: key,
          dataType: typeof firstRow[key] === 'object' && firstRow[key] !== null ? 'json' : typeof firstRow[key],
          primaryKey: key === 'id' // 简单假设id是主键
        }));
        
        setColumns(tableColumns);
        setRows(data.map((row: Record<string, unknown>) => ({
          id: String(row.id || Math.random().toString(36).substr(2, 9)),
          ...row
        })));
      } else {
        setColumns([]);
        setRows([]);
      }
    } catch (err) {
      console.error(`Error fetching ${tableName} data:`, err);
      setError(`无法获取表${tableName}的数据`);
    } finally {
      setLoading(false);
    }
  };

  // 排序功能
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    
    // 对当前数据进行排序
    const sortedRows = [...rows].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // 确保值是数字类型才能进行算术运算
      const numA = typeof aValue === 'number' ? aValue : 0;
      const numB = typeof bValue === 'number' ? bValue : 0;
      return sortDirection === 'asc' ? (numA - numB) : (numB - numA);
    });
    
    setRows(sortedRows);
  };

  // 过滤功能
  const filteredRows = rows.filter(row => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return Object.values(row).some(value => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(query);
    });
  });

  // 初始加载
  useEffect(() => {
    fetchTables();
  }, []);

  // 导出数据功能
  const exportData = () => {
    if (rows.length === 0) return;
    
    const csvContent = [
      columns.map(col => col.name).join(','),
      ...rows.map(row => 
        columns.map(col => {
          const value = row[col.name];
          if (typeof value === 'object' && value !== null) {
            return `"${JSON.stringify(value)}"`;
          }
          return `"${String(value || '').replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedTable}-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Database className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">数据库管理工具</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={exportData}
              disabled={!selectedTable || rows.length === 0}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50"
              title="导出数据"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              title="设置"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">错误: </strong>
            <span>{error}</span>
          </div>
        )}

        {/* 表选择区 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">选择数据表</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            ) : (
              tables.map(table => (
                <button
                  key={table}
                  onClick={() => fetchTableData(table)}
                  className={`h-12 rounded-md px-4 text-left flex items-center space-x-2 transition-colors ${selectedTable === table ? 'bg-blue-100 text-blue-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  <Database className="h-5 w-5" />
                  <span className="font-medium">{table}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 数据表格区 */}
        {selectedTable && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* 工具栏 */}
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-lg font-medium text-gray-900">表: {selectedTable}</h2>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="搜索数据..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  筛选
                </button>
                <button
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加记录
                </button>
              </div>
            </div>

            {/* 数据表格 */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.name}
                        onClick={() => handleSort(column.name)}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-1">
                          <span>{column.name}</span>
                          <span className="text-xs text-gray-400">({column.dataType})</span>
                          {sortField === column.name && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        {columns.map((_, colIndex) => (
                          <td key={colIndex} className="px-6 py-4">
                            <div className="animate-pulse h-4 bg-gray-200 rounded w-32"></div>
                          </td>
                        ))}
                        <td className="px-6 py-4 text-right">
                          <div className="animate-pulse h-8 bg-gray-200 rounded w-20"></div>
                        </td>
                      </tr>
                    ))
                  ) : filteredRows.length > 0 ? (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        {columns.map((column) => {
                          const value = row[column.name];
                          const isJson = typeof value === 'object' && value !== null;
                          
                          return (
                            <td key={column.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {isJson ? (
                                <div className="text-xs text-blue-600 bg-blue-50 p-1 rounded cursor-pointer hover:text-blue-800">
                                  查看JSON
                                </div>
                              ) : value === null || value === undefined ? (
                                <span className="text-gray-400 italic">null</span>
                              ) : typeof value === 'string' && value.length > 50 ? (
                                <span>{value.substring(0, 50)}...</span>
                              ) : (
                                <span>{String(value)}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <Settings className="h-4 w-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-6 py-10 text-center text-gray-500">
                        {searchQuery ? '没有找到匹配的数据' : '表中没有数据'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    显示 <span className="font-medium">{filteredRows.length > 0 ? (page - 1) * rowsPerPage + 1 : 0}</span> 到{' '}
                    <span className="font-medium">{Math.min(page * rowsPerPage, filteredRows.length)}</span> 条，共{' '}
                    <span className="font-medium">{filteredRows.length}</span> 条记录
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setPage(prev => prev + 1)}
                      disabled={page * rowsPerPage >= filteredRows.length}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </nav>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">每页行数:</span>
                <select
                  className="block px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">© 2024 数据库管理工具</p>
          <div className="flex items-center space-x-4">
            <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1">
              <LogOut className="h-4 w-4" />
              <span>退出</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DatabaseManager;
