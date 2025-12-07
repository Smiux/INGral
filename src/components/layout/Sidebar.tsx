import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Users, Brain, Plus, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onCloseMobile?: () => void;
}

export function Sidebar({ isCollapsed, onToggle, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const navLinks = [
    { to: '/graph', icon: Brain, label: 'Knowledge Graph', aria: '知识图谱' },
    { to: '/articles', icon: BookOpen, label: 'Articles', aria: '文章' },
    { to: '/database', icon: Database, label: 'Database Monitor', aria: '数据库监控' },
    { to: '/discussions', icon: Users, label: 'Discussions', aria: '讨论' },
    { to: '/create', icon: Plus, label: 'Create New', aria: '创建新内容' },
  ];

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, index: number) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => prev > 0 ? prev - 1 : navLinks.length - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => prev < navLinks.length - 1 ? prev + 1 : 0);
        break;
      case 'Enter':
      case ' ': // Spacebar
        e.preventDefault();
        // 触发链接点击
        if (index >= 0 && index < navLinks.length) {
          const navLink = navLinks[index];
          if (navLink && navLink.to) {
            // 直接导航到目标链接
            window.location.href = navLink.to;
            // 关闭移动端侧边栏
            onCloseMobile?.();
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        // 关闭移动端侧边栏
        onCloseMobile?.();
        break;
      default:
        break;
    }
  };

  // 处理焦点变化
  const handleFocus = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <aside 
      className={`fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 ease-in-out flex flex-col shadow-md
        ${isCollapsed ? 'w-16' : 'w-64'}`}
      tabIndex={0}
      onKeyDown={(e) => handleKeyDown(e, activeIndex)}
      role="navigation"
      aria-label="主导航"
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute top-4 right-[-10px] bg-primary-600 text-white p-1.5 rounded-full shadow-md hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
        tabIndex={0}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation links */}
      <nav className="flex-1 mt-12 px-3 py-2 space-y-1 overflow-y-auto" aria-label="侧边栏导航" role="menubar">
        {navLinks.map((link, index) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 touch-manipulation
                ${isActive 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/50'}
                ${activeIndex === index ? 'ring-2 ring-offset-2 ring-primary-500' : ''}`}
              aria-label={link.aria}
              role="menuitem"
              tabIndex={0}
              onFocus={() => handleFocus(index)}
              onKeyDown={(e) => handleKeyDown(e as unknown as React.KeyboardEvent<HTMLUListElement>, index)}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {!isCollapsed && <span className="whitespace-nowrap">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="flex items-center justify-center">
          <ThemeToggle />
        </div>
      </div>

      {/* Sidebar footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            <p>MyMathWiki</p>
            <p className="text-neutral-400 dark:text-neutral-500">Version 1.0.0</p>
          </div>
        </div>
      )}
    </aside>
  );
}