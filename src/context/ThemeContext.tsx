import React, { createContext, ReactNode } from 'react';

// 主题接口定义
export interface Theme {
  colors: {
    textPrimary?: string;
    borderColor?: string;
    bgPrimary?: string;
    primaryColor?: string;
  };
}

// 默认主题
export const defaultTheme: Theme = {
  colors: {
    textPrimary: '#333',
    borderColor: '#e0e0e0',
    bgPrimary: '#fff',
    primaryColor: '#4f46e5'
  }
};

// 创建主题上下文
export const ThemeContext = createContext<Theme>(defaultTheme);

interface ThemeProviderProps {
  children: ReactNode;
  theme?: Theme;
}

// 主题提供者组件（可选，当前只提供默认主题）
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  theme = defaultTheme 
}) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;