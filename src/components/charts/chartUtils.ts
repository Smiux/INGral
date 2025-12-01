// 图表相关的共享常量和工具函数

// BarChart 相关常量
export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  success: '#10b981',
  light: '#f3f4f6',
  dark: '#1f2937',
};

// 通用图表配置
export const DEFAULT_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
};

// 生成随机颜色的工具函数
export const generateRandomColor = (index: number): string => {
  const colors = Object.values(CHART_COLORS);
  return colors[index % colors.length] || CHART_COLORS.primary;
};

// 格式化数字的工具函数
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// 图表数据类型
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// Mock数据供开发和测试使用
export const barChartMockData = {
  labels: ['文章', '评论', '标签', '收藏', '点赞'],
  datasets: [
    {
      label: '数量',
      data: [150, 450, 80, 230, 520],
      backgroundColor: 'rgba(79, 70, 229, 0.5)',
    },
  ],
};

export const lineChartMockData = {
  labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
  datasets: [
    {
      label: '页面访问量',
      data: [1200, 1900, 1500, 2400, 2100, 3000, 2700],
      borderColor: '#4f46e5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
    },
  ],
};

// PieChart数据类型
export interface PieDataItem {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

export const pieChartMockData: PieDataItem[] = [
  { name: '直接访问', value: 45, percentage: 45 },
  { name: '搜索引擎', value: 30, percentage: 30 },
  { name: '社交媒体', value: 15, percentage: 15 },
  { name: '外部链接', value: 10, percentage: 10 },
];
