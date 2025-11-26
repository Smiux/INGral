
import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService';
import { StatCard, ChartData, PopularContent, TrafficSource, UserEngagement, ContentStats } from '../types/analytics';
import { LineChart } from '../components/charts/LineChart';
// import { BarChart } from '../components/charts/BarChart';
import { PieChart } from '../components/charts/PieChart';
import { StatCard as StatCardComponent } from '../components/StatCard';
import { DataTable } from '../components/DataTable';
import { DateRangePicker } from '../components/DateRangePicker';
import { Select } from '../components/Select';
import styles from './DashboardPage.module.css';
import { subDays } from 'date-fns';

/**
 * 仪表盘页面组件
 * 展示系统使用情况和内容统计数据
 */
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date()
  });
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedMetric, setSelectedMetric] = useState<string>('page_views');
  
  // 统计数据状态
  const [statCards, setStatCards] = useState<StatCard[]>([]);
  const [chartData, setChartData] = useState<ChartData>({ labels: [], datasets: [] });
  const [popularArticles, setPopularArticles] = useState<PopularContent[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [userEngagement, setUserEngagement] = useState<UserEngagement | null>(null);
  const [contentStats, setContentStats] = useState<ContentStats | null>(null);
  
  // 定时器引用，用于自动刷新
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 加载仪表盘数据
   * 并行请求所有统计数据，包括卡片、图表、热门文章等
   */
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 并行加载所有仪表板数据
      const [
        cards, 
        chart, 
        articles, 
        sources, 
        engagement, 
        stats
      ] = await Promise.all([
        analyticsService.getStatCards(),
        analyticsService.getChartData(
          selectedMetric, 
          timePeriod,
          Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
        ),
        analyticsService.getPopularArticles(10, 7),
        analyticsService.getTrafficSources(8),
        analyticsService.getUserEngagement(),
        analyticsService.getContentStats()
      ]);

      setStatCards(cards);
      setChartData(chart);
      setPopularArticles(articles);
      setTrafficSources(sources);
      setUserEngagement(engagement);
      setContentStats(stats);
    } catch {
      setError('加载仪表板数据失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  }, [selectedMetric, timePeriod, dateRange]);

  // 初始加载和依赖变化时重新加载
  useEffect(() => {
    loadDashboardData();
    
    // 设置自动刷新（每5分钟）
    refreshTimerRef.current = setInterval(() => {
      loadDashboardData();
    }, 5 * 60 * 1000);

    // 清理定时器
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [loadDashboardData]);

  /**
   * 手动刷新数据
   */
  const handleRefresh = () => {
    loadDashboardData();
  };

  /**
   * 处理日期范围变化
   * @param range - 新的日期范围
   */
  const handleDateRangeChange = (range: { start: Date; end: Date }) => {
    setDateRange(range);
  };

  /**
   * 处理时间周期变化
   * @param period - 新的时间周期（日/周/月）
   */
  const handlePeriodChange = (period: 'day' | 'week' | 'month') => {
    setTimePeriod(period);
  };

  /**
   * 处理指标选择变化
   * @param metric - 新的统计指标
   */
  const handleMetricChange = (metric: string) => {
    setSelectedMetric(metric);
  };

  /**
   * 查看文章详情
   * @param articleId - 文章ID
   */
  const handleViewArticle = (articleId: string) => {
    navigate(`/article/${articleId}`);
  };

  /**
   * 格式化数字为易读形式
   * @param num - 要格式化的数字
   * @returns 格式化后的字符串（如 1.2K, 3.4M）
   */
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>加载仪表板数据中...</p>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{error}</p>
        <button 
          className={styles.retryButton}
          onClick={handleRefresh}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 页面标题和操作栏 */}
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <h1 className={styles.title}>统计仪表板</h1>
          <p className={styles.subtitle}>查看系统使用情况和内容统计</p>
        </div>
        <div className={styles.actions}>
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            maxDate={new Date()}
          />
          <button 
            className={styles.refreshButton}
            onClick={handleRefresh}
            title="刷新数据"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 过滤器区域 */}
      <div className={styles.filterContainer}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>时间粒度</label>
          <div className={styles.periodButtons}>
            {['day', 'week', 'month'].map((period) => (
              <button
                key={period}
                className={`${styles.periodButton} ${timePeriod === period ? styles.activePeriod : ''}`}
                onClick={() => handlePeriodChange(period as 'day' | 'week' | 'month')}
              >
                {period === 'day' ? '日' : period === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>统计指标</label>
          <Select
            options={[
              { value: 'page_views', label: '页面访问量' },
              { value: 'unique_visitors', label: '独立访客数' },
              { value: 'active_users', label: '活跃用户数' }
            ]}
            value={selectedMetric}
            onChange={handleMetricChange}
          />
        </div>
      </div>

      {/* 统计卡片 */}
      <div className={styles.statCardsContainer}>
        {statCards.map((card, index) => (
          <StatCardComponent
            key={index}
            title={card.title}
            value={formatNumber(card.value)}
            change={card.change}
            isPositive={card.isPositive}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </div>

      {/* 图表区域 */}
      <div className={styles.chartsContainer}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>{selectedMetric === 'page_views' ? '页面访问量趋势' : 
                  selectedMetric === 'unique_visitors' ? '独立访客趋势' : '活跃用户趋势'}</h3>
          </div>
          <div className={styles.chartContent}>
            <LineChart 
              data={chartData} 
              height={300}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }}
            />
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>流量来源分布</h3>
          </div>
          <div className={styles.chartContent}>
            <PieChart
              data={trafficSources.map(source => ({
                name: source.source,
                value: source.count,
                percentage: source.percentage
              }))}
              height={300}
            />
          </div>
        </div>
      </div>

      {/* 详细数据区域 */}
      <div className={styles.detailsContainer}>
        {/* 热门文章表格 */}
        <div className={styles.detailCard}>
          <div className={styles.detailHeader}>
            <h3>热门文章</h3>
            <span className={styles.periodBadge}>最近7天</span>
          </div>
          <div className={styles.tableContainer}>
            <DataTable<PopularContent>
              columns={[
                {
                  header: '标题',
                  accessor: 'title',
                  render: (_value, row) => (
                    <button
                      className={styles.articleLink}
                      onClick={() => handleViewArticle(row.id)}
                    >
                      {row.title}
                    </button>
                  )
                },
                {
                  header: '作者',
                  accessor: 'author'
                },
                {
                  header: '浏览量',
                  accessor: 'view_count',
                  align: 'right',
                  render: (value) => formatNumber(value as number)
                },
                {
                  header: '更新时间',
                  accessor: 'last_updated',
                  render: (value) => {
                    if (!value) return '';
                    const date = new Date(value as string);
                    return date.toLocaleDateString('zh-CN');
                  }
                }
              ]}
              data={popularArticles}
              emptyText="暂无热门文章数据"
            />
          </div>
        </div>

        {/* 用户活跃度卡片 */}
        <div className={styles.detailCard}>
          <div className={styles.detailHeader}>
            <h3>用户活跃度</h3>
          </div>
          {userEngagement && (
            <div className={styles.engagementGrid}>
              <div className={styles.engagementItem}>
                <div className={styles.engagementValue}>{userEngagement.daily_active_users}</div>
                <div className={styles.engagementLabel}>日活跃用户</div>
              </div>
              <div className={styles.engagementItem}>
                <div className={styles.engagementValue}>{userEngagement.weekly_active_users}</div>
                <div className={styles.engagementLabel}>周活跃用户</div>
              </div>
              <div className={styles.engagementItem}>
                <div className={styles.engagementValue}>{userEngagement.monthly_active_users}</div>
                <div className={styles.engagementLabel}>月活跃用户</div>
              </div>
              <div className={styles.engagementItem}>
                <div className={styles.engagementValue}>{userEngagement.average_session_duration.toFixed(1)}m</div>
                <div className={styles.engagementLabel}>平均会话时长</div>
              </div>
              <div className={styles.engagementItem}>
                <div className={styles.engagementValue}>{userEngagement.pages_per_session.toFixed(1)}</div>
                <div className={styles.engagementLabel}>每次会话页面数</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 内容统计区域 */}
      {contentStats && (
        <div className={styles.contentStatsContainer}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>内容统计概览</h3>
            </div>
            <div className={styles.contentStatsGrid}>
              <div className={styles.contentStatItem}>
                <div className={styles.contentStatValue}>{formatNumber(contentStats.total_articles)}</div>
                <div className={styles.contentStatLabel}>总文章数</div>
                <div className={styles.contentStatSub}>
                  <span className={styles.positiveChange}>+{contentStats.new_articles_today}</span> 今日新增
                </div>
              </div>
              <div className={styles.contentStatItem}>
                <div className={styles.contentStatValue}>{formatNumber(contentStats.total_comments)}</div>
                <div className={styles.contentStatLabel}>总评论数</div>
                <div className={styles.contentStatSub}>
                  <span className={styles.positiveChange}>+{contentStats.new_comments_today}</span> 今日新增
                </div>
              </div>
              <div className={styles.contentStatItem}>
                <div className={styles.contentStatValue}>{formatNumber(contentStats.total_likes)}</div>
                <div className={styles.contentStatLabel}>总点赞数</div>
              </div>
              <div className={styles.contentStatItem}>
                <div className={styles.contentStatValue}>{formatNumber(contentStats.total_bookmarks)}</div>
                <div className={styles.contentStatLabel}>总收藏数</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};