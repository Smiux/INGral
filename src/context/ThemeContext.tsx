/**
 * 主题上下文
 * 提供应用的主题管理
 */
import React, { createContext, ReactNode } from 'react';
import { type Theme, defaultTheme } from './themeUtils';

/**
 * 主题上下文对象
 */
export const ThemeContext = createContext<Theme>(defaultTheme);

/**
 * 主题提供者属性接口
 */
interface ThemeProviderProps {
  /** 子组件 */
  children: ReactNode;
  /** 自定义主题（可选） */
  theme?: Theme;
}

/**
 * 主题提供者组件
 * 管理应用的主题状态
 * @param props - 组件属性
 */
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

// 注意：为了符合ESLint的react-refresh/only-export-components规则，我们不导出非组件内容
// 请通过命名导入使用ThemeContext
// export default ThemeContext;