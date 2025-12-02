import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BaseService } from './baseService';
import type {
  PageView,
  ArticleInteraction,
  AnalyticsMetric,
  AnalyticsQueryParams,
  ChartData,
  StatCard,
  PopularContent,
  TrafficSource,
  UserEngagement,
  ContentStats,
  TimeSeriesData,
} from '../types/analytics';

export class AnalyticsService extends BaseService {
  private static instance: AnalyticsService;
  private analyticsCache: Record<string, { data: unknown; timestamp: number }> = {};

  private constructor() {
    super();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // 缓存相关方法
  private getCached<T>(key: string): T | null {
    const cached = this.analyticsCache[key];
    if (!cached) {return null;}

    // 检查缓存是否过期（10分钟）
    const now = Date.now();
    if (now - cached.timestamp > 10 * 60 * 1000) {
      delete this.analyticsCache[key];
      return null;
    }

    return cached.data as T;
  }

  private setCached<T>(key: string, data: T): void {
    this.analyticsCache[key] = {
      data,
      timestamp: Date.now(),
    };
  }

  // 只使用标准缓存方法

  // 记录页面访问
  public async trackPageView(pageView: Omit<PageView, 'id' | 'created_at' | 'updated_at'>): Promise<PageView> {
    try {
      this.checkSupabaseClient();
      const { data, error } = await this.supabase
        .from('page_views')
        .insert(pageView)
        .select('*')
        .single();

      if (error || !data) {
        this.handleError(error, '记录页面访问', 'AnalyticsService');
      }

      // 清除相关缓存
      this.clearDashboardCache();

      return data;
    } catch (error) {
      console.error('Error in trackPageView:', error);
      throw error instanceof Error ? error : new Error('Unknown error in trackPageView');
    }
  }

  // 更新页面访问持续时间
  public async updatePageViewDuration(viewId: string, duration: number): Promise<void> {
    try {
      this.checkSupabaseClient();
      const { error } = await this.supabase
        .from('page_views')
        .update({ duration, updated_at: new Date().toISOString() })
        .eq('id', viewId);

      if (error) {
        this.handleError(error, '更新页面访问持续时间', 'AnalyticsService');
      }

      // 清除相关缓存
      this.clearDashboardCache();
    } catch (error) {
      console.error('Error updating page view duration:', error);
      throw error instanceof Error ? error : new Error('Unknown error updating page view duration');
    }
  }

  // 记录文章交互
  public async trackArticleInteraction(interaction: Omit<ArticleInteraction, 'id' | 'created_at'>): Promise<ArticleInteraction> {
    try {
      this.checkSupabaseClient();
      const { data, error } = await this.supabase
        .from('article_interactions')
        .insert(interaction)
        .select('*')
        .single();

      if (error || !data) {
        this.handleError(error, '记录文章交互', 'AnalyticsService');
      }

      // 清除相关缓存
      this.clearDashboardCache();

      return data;
    } catch (error) {
      console.error('Error in trackArticleInteraction:', error);
      throw error instanceof Error ? error : new Error('Unknown error in trackArticleInteraction');
    }
  }

  // 获取统计摘要
  public async getAnalyticsSummary(params: AnalyticsQueryParams): Promise<AnalyticsMetric[]> {
    const cacheKey = `summary_${JSON.stringify(params)}`;
    const cached = this.getCached<AnalyticsMetric[]>(cacheKey);
    if (cached) {return cached;}

    try {
      this.checkSupabaseClient();
      // 首先尝试从汇总表获取
      let query = this.supabase
        .from('analytics_summary')
        .select('*')
        .gte('period_start', params.start_date)
        .lte('period_end', params.end_date);

      if (params.period) {
        query = query.eq('period_type', params.period);
      }

      if (params.metrics && params.metrics.length > 0) {
        query = query.in('metric_name', params.metrics);
      }

      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (key === 'dimension' && value !== undefined && value !== null) {
            query = query.eq('dimension', value);
          } else if (key === 'dimension_value' && value !== undefined && value !== null) {
            query = query.eq('dimension_value', value);
          }
        });
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        // 如果汇总表没有数据，则直接查询原始表
        return this.calculateMetricsFromRawData(params);
      }

      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      // 回退到计算原始数据
      return this.calculateMetricsFromRawData(params);
    }
  }

  // 从原始数据计算指标
  private async calculateMetricsFromRawData(params: AnalyticsQueryParams): Promise<AnalyticsMetric[]> {
    try {
      this.checkSupabaseClient();
      const results: AnalyticsMetric[] = [];
      const metrics = params.metrics || ['total_page_views', 'unique_visitors', 'active_users'];
      const currentTime = new Date().toISOString();

      // 计算总页面访问量
      if (metrics.includes('total_page_views')) {
        const { count, error } = await this.supabase
          .from('page_views')
          .select('*', { count: 'exact' })
          .gte('created_at', params.start_date)
          .lte('created_at', params.end_date)
          .single();

        if (!error) {
          results.push({
            metric_name: 'total_page_views',
            metric_value: typeof count === 'number' ? count : 0,
            period_type: params.period || 'day',
            period_start: params.start_date,
            period_end: params.end_date,
            created_at: currentTime,
          });
        }
      }

      // 计算独立访客数
      if (metrics.includes('unique_visitors')) {
        const { count: visitorCount, error } = await this.supabase
          .from('page_views')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', params.start_date)
          .lte('created_at', params.end_date);

        if (!error) {
          results.push({
            metric_name: 'unique_visitors',
            metric_value: typeof visitorCount === 'number' ? visitorCount : 0,
            period_type: params.period || 'day',
            period_start: params.start_date,
            period_end: params.end_date,
            created_at: currentTime,
          });
        }
      }

      // 计算活跃用户数
      if (metrics.includes('active_users')) {
        const { count: userCount, error } = await this.supabase
          .from('user_activity')
          .select('user_id', { count: 'exact' })
          .gte('activity_date', params.start_date)
          .lte('activity_date', params.end_date)
          .single();

        if (!error) {
          results.push({
            metric_name: 'active_users',
            metric_value: typeof userCount === 'number' ? userCount : 0,
            period_type: params.period || 'day',
            period_start: params.start_date,
            period_end: params.end_date,
            created_at: currentTime,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error calculating metrics from raw data:', error);
      return [];
    }
  }

  // 获取时间序列数据
  public async getTimeSeriesData(metric: string, startDate: string, endDate: string, period: 'day' | 'week' | 'month' = 'day'): Promise<TimeSeriesData[]> {
    const cacheKey = `timeseries_${metric}_${startDate}_${endDate}_${period}`;
    const cached = this.getCached<TimeSeriesData[]>(cacheKey);
    if (cached) {return cached;}

    try {
      this.checkSupabaseClient();
      let dates: Date[] = [];
      let dateFormat = 'yyyy-MM-dd';

      // 生成时间序列日期
      if (period === 'day') {
        dates = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) });
      } else if (period === 'week') {
        dates = eachWeekOfInterval({ start: new Date(startDate), end: new Date(endDate) }, { weekStartsOn: 1 });
        dateFormat = 'yyyy-\'W\'WW';
      } else if (period === 'month') {
        dates = eachMonthOfInterval({ start: new Date(startDate), end: new Date(endDate) });
        dateFormat = 'yyyy-MM';
      }

      const result: TimeSeriesData[] = [];

      // 为每个时间段获取数据
      for (const date of dates) {
        let startOfPeriod: Date;
        let endOfPeriod: Date;

        if (period === 'day') {
          startOfPeriod = startOfDay(date);
          endOfPeriod = endOfDay(date);
        } else if (period === 'week') {
          startOfPeriod = startOfDay(date);
          endOfPeriod = endOfDay(new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000));
        } else { // month
          startOfPeriod = startOfDay(date);
          endOfPeriod = endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
        }

        let count = 0;

        if (metric === 'page_views') {
          const { count: pageCount } = await this.supabase
            .from('page_views')
            .select('*', { count: 'exact' })
            .gte('created_at', startOfPeriod.toISOString())
            .lte('created_at', endOfPeriod.toISOString())
            .single();
          count = typeof pageCount === 'number' ? pageCount : 0;
        } else if (metric === 'unique_visitors') {
          const { count: visitorCount } = await this.supabase
            .from('page_views')
            .select('session_id', { count: 'exact' })
            .gte('created_at', startOfPeriod.toISOString())
            .lte('created_at', endOfPeriod.toISOString())
            .single();
          count = typeof visitorCount === 'number' ? visitorCount : 0;
        } else if (metric === 'active_users') {
          const { count: activeUserCount } = await this.supabase
            .from('user_activity')
            .select('user_id', { count: 'exact' })
            .gte('activity_date', format(startOfPeriod, 'yyyy-MM-dd'))
            .lte('activity_date', format(endOfPeriod, 'yyyy-MM-dd'))
            .single();
          count = typeof activeUserCount === 'number' ? activeUserCount : 0;
        }

        result.push({
          date: format(date, dateFormat, { locale: zhCN }),
          value: count,
          metric,
        });
      }

      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error getting time series data:', error);
      return [];
    }
  }

  // 获取热门文章
  public async getPopularArticles(limit = 10, days = 7): Promise<PopularContent[]> {
    const cacheKey = `popular_articles_${limit}_${days}`;
    const cached = this.getCached<PopularContent[]>(cacheKey);
    if (cached) {return cached;}

    try {
      this.checkSupabaseClient();
      const startDate = subDays(new Date(), days).toISOString();

      // 查询文章访问量
      const { data: popularData, error } = await this.supabase
        .from('page_views')
        .select('page_id, COUNT(*) as view_count')
        .eq('page_type', 'article')
        .gte('created_at', startDate)
        .order('view_count', { ascending: false })
        .limit(limit) as { data: { page_id: string; view_count: number | string }[] | null; error: unknown; };

      if (error || !popularData || !Array.isArray(popularData)) {
        console.error('Error getting popular articles:', error);
        return [];
      }

      // 获取文章详情
      const popularContent: PopularContent[] = [];
      for (const item of popularData) {
        if (item?.page_id) {
          const { data: articleData, error: articleError } = await this.supabase
            .from('articles')
            .select('title, author_name, updated_at')
            .eq('slug', item.page_id)
            .single();

          if (!articleError && articleData) {
            // 直接使用articles表中的author_name字段
            const authorName = articleData.author_name || 'Anonymous';

            popularContent.push({
              id: item.page_id,
              title: articleData.title || '未命名文章',
              type: 'article',
              view_count: typeof item.view_count === 'number' || typeof item.view_count === 'string'
                ? Number(item.view_count)
                : 0,
              change_percent: 0, // 简化处理，实际可计算变化百分比
              last_updated: articleData.updated_at || new Date().toISOString(),
              author: authorName,
            });
          }
        }
      }

      this.setCached(cacheKey, popularContent);
      return popularContent;
    } catch (error) {
      console.error('Error in getPopularArticles:', error);
      return [];
    }
  }

  // 获取流量来源
  public async getTrafficSources(limit = 10): Promise<TrafficSource[]> {
    const cacheKey = `traffic_sources_${limit}`;
    const cached = this.getCached<TrafficSource[]>(cacheKey);
    if (cached) {return cached;}

    try {
      this.checkSupabaseClient();
      const startDate = subDays(new Date(), 30).toISOString();

      // 分析referrer获取流量来源
      const { data: trafficData, error } = await this.supabase
        .from('page_views')
        .select('referrer')
        .gte('created_at', startDate)
        .limit(limit);

      if (error || !trafficData || !Array.isArray(trafficData)) {
        console.error('Error getting traffic sources:', error);
        return [];
      }

      // 简化处理，不再计算总数

      // 处理流量来源
      const sources: TrafficSource[] = [];
      for (const item of trafficData) {
        let source = '直接访问';
        const referrer = item.referrer || '';

        // 简单的来源分类
        if (referrer.includes('baidu.com')) {source = '百度';}
        else if (referrer.includes('google.com')) {source = 'Google';}
        else if (referrer.includes('bing.com')) {source = 'Bing';}
        else if (referrer.includes('sogou.com')) {source = '搜狗';}
        else if (referrer.includes('weibo.com')) {source = '微博';}
        else if (referrer.includes('zhihu.com')) {source = '知乎';}
        else if (referrer) {source = '其他网站';}

        sources.push({
          source,
          referrer,
          count: 1, // 简化处理
          percentage: 0, // 简化处理
        });
      }

      this.setCached(cacheKey, sources);
      return sources;
    } catch (error) {
      console.error('Error in getTrafficSources:', error);
      return [];
    }
  }

  // 获取用户活跃度统计
  public async getUserEngagement(): Promise<UserEngagement> {
    const cacheKey = 'user_engagement';
    const cached = this.getCached<UserEngagement>(cacheKey);
    if (cached) {return cached;}

    try {
      this.checkSupabaseClient();
      // 计算日活跃用户
      const today = format(new Date(), 'yyyy-MM-dd');
      const { count: dailyCount } = await this.supabase
        .from('user_activity')
        .select('user_id', { count: 'exact' })
        .eq('activity_date', today);

      // 计算周活跃用户
      const weekStart = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const { count: weeklyCount } = await this.supabase
        .from('user_activity')
        .select('user_id', { count: 'exact' })
        .gte('activity_date', weekStart);

      // 计算月活跃用户
      const monthStart = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const { count: monthlyCount } = await this.supabase
        .from('user_activity')
        .select('user_id', { count: 'exact' })
        .gte('activity_date', monthStart);

      // 暂时跳过平均会话时长计算，因为相关数据可能不完整

      // 计算每次会话平均页面数
      const { data: sessionPages } = await this.supabase
        .from('page_views')
        .select('session_id, COUNT(*) as page_count')
        .gte('created_at', subDays(new Date(), 7).toISOString())
        .order('session_id');

      const avgPagesPerSession = sessionPages && sessionPages.length > 0
        ? 1 // 假设每个会话至少有一个页面访问
        : 0;

      const engagement: UserEngagement = {
        daily_active_users: typeof dailyCount === 'number' ? dailyCount : 0,
        weekly_active_users: typeof weeklyCount === 'number' ? weeklyCount : 0,
        monthly_active_users: typeof monthlyCount === 'number' ? monthlyCount : 0,
        average_session_duration: 0, // 暂时设置为0，因为avgSession对象没有avg_duration属性
        pages_per_session: avgPagesPerSession,
      };

      this.setCached(cacheKey, engagement);
      return engagement;
    } catch (error) {
      console.error('Error getting user engagement:', error);
      // 返回默认值
      return {
        daily_active_users: 0,
        weekly_active_users: 0,
        monthly_active_users: 0,
        average_session_duration: 0,
        pages_per_session: 0,
      };
    }
  }

  // 获取内容统计
  public async getContentStats(): Promise<ContentStats> {
    const cacheKey = 'content_stats';
    const cached = this.getCached<ContentStats>(cacheKey);
    if (cached) {return cached;}

    try {
      this.checkSupabaseClient();
      // 获取文章总数
      const { count: totalArticlesCount } = await this.supabase
        .from('articles')
        .select('*', { count: 'exact' })
        .single() as { count: number | null; error: unknown; };

      // 获取评论总数
      const { count: totalCommentsCount } = await this.supabase
        .from('comments')
        .select('id', { count: 'exact' });

      // 获取点赞总数
      const { count: totalLikesCount } = await this.supabase
        .from('article_interactions')
        .select('*', { count: 'exact' })
        .eq('interaction_type', 'like')
        .single() as { count: number | null; error: unknown; };

      // 获取收藏总数
      const { count: totalBookmarksCount } = await this.supabase
        .from('article_bookmarks')
        .select('*', { count: 'exact' })
        .eq('interaction_type', 'bookmark')
        .single() as { count: number | null; error: unknown; };

      // 获取今日新增文章
      const today = startOfDay(new Date()).toISOString();
      const { count: newArticlesCount } = await this.supabase
        .from('articles')
        .select('id', { count: 'exact' })
        .gte('created_at', today);

      // 获取今日新增评论
      const { count: newCommentsCount } = await this.supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .gte('created_at', today)
        .single();

      const stats: ContentStats = {
        total_articles: typeof totalArticlesCount === 'number' ? totalArticlesCount : 0,
        total_comments: typeof totalCommentsCount === 'number' ? totalCommentsCount : 0,
        total_likes: typeof totalLikesCount === 'number' ? totalLikesCount : 0,
        total_bookmarks: typeof totalBookmarksCount === 'number' ? totalBookmarksCount : 0,
        new_articles_today: typeof newArticlesCount === 'number' ? newArticlesCount : 0,
        new_comments_today: typeof newCommentsCount === 'number' ? newCommentsCount : 0,
      };

      this.setCached(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error getting content stats:', error);
      // 返回默认值
      return {
        total_articles: 0,
        total_comments: 0,
        total_likes: 0,
        total_bookmarks: 0,
        new_articles_today: 0,
        new_comments_today: 0,
      };
    }
  }

  // 生成统计卡片数据
  public async getStatCards(): Promise<StatCard[]> {
    try {
      const [engagement, contentStats, summary] = await Promise.all([
        this.getUserEngagement(),
        this.getContentStats(),
        this.getAnalyticsSummary({
          start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
          end_date: format(new Date(), 'yyyy-MM-dd'),
        }),
      ]);

      // 计算变化百分比（简化处理）
      const calculateChange = (current: number, previous = 0): { change: number; isPositive: boolean } => {
        if (previous === 0) {return { change: current > 0 ? 100 : 0, isPositive: current > 0 };}
        const change = ((current - previous) / previous) * 100;
        return { change, isPositive: change >= 0 };
      };

      // 确保所有数据都有值
      const totalPageViews = typeof summary.find(m => m.metric_name === 'total_page_views')?.metric_value === 'number'
        ? summary.find(m => m.metric_name === 'total_page_views')?.metric_value || 0
        : 0;
      const uniqueVisitors = typeof summary.find(m => m.metric_name === 'unique_visitors')?.metric_value === 'number'
        ? summary.find(m => m.metric_name === 'unique_visitors')?.metric_value || 0
        : 0;
      const monthlyActiveUsers = typeof engagement.monthly_active_users === 'number'
        ? engagement.monthly_active_users
        : 0;
      const totalArticles = typeof contentStats.total_articles === 'number'
        ? contentStats.total_articles
        : 0;

      const cards: StatCard[] = [
        {
          title: '总页面访问量',
          value: totalPageViews,
          ...calculateChange(totalPageViews),
          icon: 'eye',
          color: 'primary',
        },
        {
          title: '独立访客',
          value: uniqueVisitors,
          ...calculateChange(uniqueVisitors),
          icon: 'users',
          color: 'info',
        },
        {
          title: '月活跃用户',
          value: monthlyActiveUsers,
          ...calculateChange(monthlyActiveUsers),
          icon: 'activity',
          color: 'success',
        },
        {
          title: '总文章数',
          value: totalArticles,
          ...calculateChange(totalArticles),
          icon: 'file-text',
          color: 'warning',
        },
      ];

      return cards;
    } catch (error) {
      console.error('Error getting stat cards:', error);
      return [];
    }
  }

  // 获取图表数据
  public async getChartData(metric: string, period: 'day' | 'week' | 'month' = 'day', days = 30): Promise<ChartData> {
    try {
      // 尝试从缓存获取
      const cacheKey = `chart_${metric}_${period}_${days}`;
      const cachedData = this.getCached<ChartData>(cacheKey);
      if (cachedData) {return cachedData;}

      const endDate = new Date();
      const startDate = subDays(endDate, days);

      const timeSeries = await this.getTimeSeriesData(
        metric,
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd'),
        period,
      );

      const chartData: ChartData = {
        labels: timeSeries.map(item => item.date),
        datasets: [{
          label: this.getMetricLabel(metric),
          data: timeSeries.map(item => item.value),
          borderColor: this.getMetricColor(metric),
          backgroundColor: this.getMetricColor(metric, 0.1),
          tension: 0.3,
          fill: true,
        }],
      };

      this.setCached(cacheKey, chartData);
      return chartData;
    } catch (error) {
      console.error('Error getting chart data:', error);
      return { labels: [], datasets: [] };
    }
  }

  // 辅助方法：获取指标标签
  private getMetricLabel(metric: string): string {
    const labels: Record<string, string> = {
      'page_views': '页面访问量',
      'unique_visitors': '独立访客数',
      'active_users': '活跃用户数',
    };
    return labels[metric] || metric;
  }

  // 辅助方法：获取指标颜色
  private getMetricColor(metric: string, opacity = 1): string {
    const colors: Record<string, string> = {
      'page_views': `rgba(59, 130, 246, ${opacity})`,
      'unique_visitors': `rgba(56, 189, 248, ${opacity})`,
      'active_users': `rgba(16, 185, 129, ${opacity})`,
    };
    return colors[metric] || `rgba(107, 114, 128, ${opacity})`;
  }

  // 清除仪表板相关缓存
  private clearDashboardCache(): void {
    // 清除所有缓存，简化实现
    this.analyticsCache = {};
  }

  // 生成统计报告（异步）
  public async generateReport(params: { start_date: string; end_date: string; format: 'pdf' | 'csv' | 'excel' }): Promise<string> {
    try {
      // 尝试从缓存获取
      const cacheKey = `report_${params.start_date}_${params.end_date}_${params.format}`;
      const cachedReport = this.getCached<string>(cacheKey);
      if (cachedReport) {return cachedReport;}

      // 实际项目中可以实现报告生成逻辑
      // 这里返回一个模拟的报告URL
      const reportUrl = `/reports/${Date.now()}.${params.format}`;

      // 缓存报告URL
      this.setCached(cacheKey, reportUrl);
      return reportUrl;
    } catch (error) {
      console.error('Error generating report:', error);
      return `/reports/${Date.now()}.${params.format}`;
    }
  }
}

// 导出单例
export const analyticsService = AnalyticsService.getInstance();
