// 页面访问记录类型
export interface PageView {
    id: string;
    page_type: 'article' | 'home' | 'search' | 'profile' | 'settings' | string;
  page_id?: string;
  user_id?: string;
  session_id: string;
  user_agent?: string;
  ip_address?: string;
  referrer?: string;
  duration: number; // 停留时间（秒）
  created_at: string;
  updated_at: string;
}

// 文章交互类型
export interface ArticleInteraction {
  id: string;
  article_id: string;
  user_id?: string;
  interaction_type: 'like' | 'bookmark' | 'comment' | 'share';
  session_id: string;
  created_at: string;
}

// 用户活动记录类型
export interface UserActivity {
  id: string;
  user_id: string;
  activity_date: string;
  page_views: number;
  articles_viewed: number;
  articles_created: number;
  comments_posted: number;
  total_time: number; // 总在线时间（秒）
  last_active: string;
}

// 统计指标类型
export interface AnalyticsMetric {
  metric_name: string;
  metric_value: number;
  period_type: 'day' | 'week' | 'month';
  period_start: string;
  period_end: string;
  dimension?: string;
  dimension_value?: string;
  created_at: string;
}

// 统计查询参数类型
export interface AnalyticsQueryParams {
  start_date: string;
  end_date: string;
  period?: 'day' | 'week' | 'month';
  metrics?: string[];
  dimensions?: string[];
  filters?: Record<string, string | number | boolean | Date>;
  limit?: number;
  offset?: number;
}

// 图表数据类型
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
  tension?: number;
  fill?: boolean;
}

// 仪表板统计卡片类型
export interface StatCard {
  title: string;
  value: number;
  change: number; // 百分比变化
  isPositive: boolean;
  icon: string;
  color: string;
}

// 热门内容类型
export interface PopularContent {
  id: string;
  title: string;
  type: 'article' | 'user';
  view_count: number;
  change_percent: number;
  last_updated?: string;
  author?: string;
}

// 流量来源类型
export interface TrafficSource {
  source: string;
  referrer?: string;
  count: number;
  percentage: number;
}

// 用户活跃度类型
export interface UserEngagement {
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  average_session_duration: number; // 分钟
  pages_per_session: number;
}

// 内容统计类型
export interface ContentStats {
  total_articles: number;
  total_comments: number;
  total_likes: number;
  total_bookmarks: number;
  new_articles_today: number;
  new_comments_today: number;
}

// 时间序列数据类型
export interface TimeSeriesData {
  date: string;
  value: number;
  metric: string;
}

// 仪表板布局类型
export interface DashboardLayout {
  widgets: DashboardWidget[];
  layout: {
    rows: number;
    columns: number;
  };
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'stat_card' | 'list' | 'table';
  title: string;
  dataSource: string;
  config: Record<string, string | number | boolean | object>;
  position: {
    row: number;
    col: number;
    width: number;
    height: number;
  };
}

// 导出统计报告选项
export interface ExportReportOptions {
  format: 'pdf' | 'csv' | 'excel';
  metrics: string[];
  start_date: string;
  end_date: string;
  include_charts?: boolean;
  title?: string;
}

// 过滤器配置类型
export interface FilterConfig {
  name: string;
  type: 'date_range' | 'select' | 'search';
  options?: string[];
  default_value?: string | number | boolean | null;
}

// 主题颜色配置
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  background: string;
  text: string;
  grid: string;
}

// 统计摘要响应类型
export interface AnalyticsSummaryResponse {
  metrics: AnalyticsMetric[];
  total_count: number;
  has_more: boolean;
}

// 实时统计更新类型
export interface RealTimeStatsUpdate {
  metric: string;
  value: number;
  timestamp: string;
}
