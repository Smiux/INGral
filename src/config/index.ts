/**
 * 应用配置
 */
export const APP_CONFIG = {
  'NAME': '知识图谱应用',
  'VERSION': '1.0.0',
  'DESCRIPTION': '一个基于 React 和 Supabase 的知识图谱应用',
  'BASE_URL': '/',
  'API_URL': '',
  'SUPABASE_URL': import.meta.env.VITE_SUPABASE_URL || '',
  'SUPABASE_ANON_KEY': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
};

/**
 * 数据库配置
 */
export const DB_CONFIG = {
  'DEFAULT_LIMIT': 100,
  'MAX_LIMIT': 1000,
  'DEFAULT_OFFSET': 0,
  'DEFAULT_SORT_BY': 'created_at',
  'DEFAULT_SORT_ORDER': 'desc' as const
};

/**
 * 分页配置
 */
export const PAGINATION_CONFIG = {
  'DEFAULT_PAGE_SIZE': 20,
  'PAGE_SIZE_OPTIONS': [10, 20, 50, 100]
};

/**
 * 图表配置
 */
export const CHART_CONFIG = {
  'DEFAULT_WIDTH': 800,
  'DEFAULT_HEIGHT': 400,
  'DEFAULT_MARGIN': {
    'top': 20,
    'right': 20,
    'bottom': 50,
    'left': 60
  }
};

/**
 * 知识图谱配置
 */
export const GRAPH_CONFIG = {
  'DEFAULT_LAYOUT': 'force' as const,
  'NODE_RADIUS': 20,
  'LINK_STRENGTH': 0.1,
  'COLLISION_FORCE': 1,
  'FORCE_X': 0.01,
  'FORCE_Y': 0.01,
  'SIMULATION_ALPHA': 1,
  'SIMULATION_ALPHA_DECAY': 0.0228,
  'SIMULATION_ALPHA_MIN': 0.001
};

/**
 * 键盘快捷键配置
 */
export const KEYBOARD_CONFIG = {
  'SHORTCUT_PREFIX': 'Alt+',
  'ANNOUNCER_DELAY': 500
};

/**
 * 可访问性配置
 */
export const ACCESSIBILITY_CONFIG = {
  'SCREEN_READER_ANNOUNCER_DELAY': 500,
  'FOCUS_TRAP_DELAY': 100,
  'KEYBOARD_NAVIGATION_DELAY': 100
};

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  // 1小时
  'DEFAULT_TTL': 3600000,
  // 24小时
  'MAX_TTL': 86400000,
  'CACHE_SIZE': 100
};

/**
 * 导出配置
 */
export const EXPORT_CONFIG = {
  'DEFAULT_FORMAT': 'json' as const,
  'SUPPORTED_FORMATS': ['json', 'csv', 'pdf', 'png'] as const,
  'MAX_EXPORT_SIZE': 1000
};

/**
 * 搜索配置
 */
export const SEARCH_CONFIG = {
  'DEFAULT_SEARCH_LIMIT': 50,
  'MIN_SEARCH_QUERY_LENGTH': 2,
  'SEARCH_DEBOUNCE_DELAY': 300
};

/**
 * 通知配置
 */
export const NOTIFICATION_CONFIG = {
  'DEFAULT_DURATION': 3000,
  'MAX_DURATION': 10000,
  'POSITION': 'top-right' as const
};

/**
 * 颜色配置
 */
export const COLOR_CONFIG = {
  'PRIMARY': '#007bff',
  'SECONDARY': '#6c757d',
  'SUCCESS': '#28a745',
  'DANGER': '#dc3545',
  'WARNING': '#ffc107',
  'INFO': '#17a2b8',
  'LIGHT': '#f8f9fa',
  'DARK': '#343a40',
  'BACKGROUND': '#ffffff',
  'TEXT': '#212529',
  'BORDER': '#dee2e6',
  'HOVER': '#f8f9fa',
  'ACTIVE': '#e9ecef'
};

/**
 * 标签配置
 */
export const TAG_CONFIG = {
  'DEFAULT_COLOR': '#007bff',
  'MAX_TAGS_PER_ARTICLE': 10,
  'POPULAR_TAGS_LIMIT': 10
};

/**
 * 文章配置
 */
export const ARTICLE_CONFIG = {
  'MAX_TITLE_LENGTH': 255,
  'MAX_CONTENT_LENGTH': 100000,
  'DEFAULT_STATUS': 'draft' as const,
  'SUPPORTED_STATUSES': ['draft', 'published', 'archived'] as const
};

/**
 * 评论配置
 */
export const COMMENT_CONFIG = {
  'MAX_COMMENT_LENGTH': 1000,
  'DEFAULT_COMMENT_STATUS': 'approved' as const,
  'SUPPORTED_COMMENT_STATUSES': ['approved', 'pending', 'rejected'] as const
};

/**
 * 版本历史配置
 */
export const VERSION_CONFIG = {
  'MAX_VERSIONS_PER_ARTICLE': 50,
  'VERSION_COMPARE_LINES': 20
};
