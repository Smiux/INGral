/**
 * 主题管理组件
 * 用于选择和应用图表样式主题
 */
import React from 'react';
import type { GraphTheme } from './ThemeTypes';
import { PRESET_THEMES } from './ThemeTypes';

interface ThemeManagerProps {
  currentTheme: GraphTheme;
  onThemeChange: (theme: GraphTheme) => void;
}

export const ThemeManager: React.FC<ThemeManagerProps> = ({ currentTheme, onThemeChange }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">样式主题</h3>
      
      <div className="grid grid-cols-1 gap-3">
        {PRESET_THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme)}
            className={`p-3 rounded-md border-2 transition-all flex items-center gap-3 ${currentTheme.id === theme.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
          >
            {/* 主题预览 */}
            <div className="flex items-center gap-2">
              {/* 节点预览 */}
              <div 
                className="w-8 h-8 rounded-full border-2" 
                style={{
                  backgroundColor: theme.node.fill,
                  borderColor: theme.node.stroke,
                  borderWidth: `${theme.node.strokeWidth}px`
                }}
              >
                <div 
                  className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    color: theme.node.textFill
                  }}
                >
                  N
                </div>
              </div>
              
              {/* 链接预览 */}
              <div className="w-16 h-0.5" style={{
                backgroundColor: theme.link.stroke,
                opacity: theme.link.strokeOpacity
              }} />
            </div>
            
            {/* 主题名称 */}
            <span className="font-medium">{theme.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
