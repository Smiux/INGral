/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 主色调：蓝色系
        primary: {
          50: '#f0f9ff', // 浅天蓝色
          100: '#e0f2fe', // 天蓝色
          200: '#bae6fd', // 浅蓝色
          300: '#7dd3fc', // 亮蓝色
          400: '#38bdf8', // 中亮蓝色
          500: '#0ea5e9', // 主蓝色
          600: '#0284c7', // 深蓝
          700: '#0369a1', // 暗蓝色
        },
        // 辅助色：绿色系
        secondary: {
          50: '#f0fdf4', // 浅绿
          100: '#dcfce7', // 浅绿色
          200: '#bbf7d0', // 淡绿色
          300: '#86efac', // 蓝绿色
          400: '#4ade80', // 亮绿色
          500: '#22c55e', // 主绿色
          600: '#16a34a', // 深绿
          700: '#15803d', // 暗绿色
        },
        // 中性色：白色和灰色系
        neutral: {
          50: '#ffffff', // 纯白
          100: '#f9fafb', // 极浅灰
          200: '#f3f4f6', // 浅灰
          300: '#e5e7eb', // 中浅灰
          400: '#d1d5db', // 中灰
          500: '#9ca3af', // 中性灰
          600: '#6b7280', // 中深灰
          700: '#4b5563', // 深灰
          800: '#1f2937', // 暗灰
          900: '#111827', // 极暗灰
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
};
