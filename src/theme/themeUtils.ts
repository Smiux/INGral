// 主题工具函数

// 主题类型
export type Theme = 'light' | 'dark';

// 主题配置接口
export interface ThemeConfig {
  colors: {
    textPrimary?: string;
    borderColor?: string;
    bgPrimary?: string;
    primaryColor?: string;
  };
}

// 浅色主题配置
export const lightThemeConfig: ThemeConfig = {
  'colors': {
    'textPrimary': '#333',
    'borderColor': '#e0e0e0',
    'bgPrimary': '#fff',
    'primaryColor': '#4f46e5'
  }
};

// 深色主题配置
export const darkThemeConfig: ThemeConfig = {
  'colors': {
    'textPrimary': '#fff',
    'borderColor': '#333',
    'bgPrimary': '#121212',
    'primaryColor': '#818cf8'
  }
};

