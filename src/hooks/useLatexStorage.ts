import { useState, useEffect } from 'react';

// 本地存储键名
const RECENT_FORMULAS_KEY = 'latexRecentFormulas';
const FAVORITE_FORMULAS_KEY = 'latexFavoriteFormulas';
const MAX_RECENT_FORMULAS = 10;

/**
 * LaTeX存储管理Hook
 * 负责管理最近使用的公式和收藏的公式
 * @returns 存储管理相关的状态和方法
 */
export function useLatexStorage() {
  // 最近使用的公式
  const [recentFormulas, setRecentFormulas] = useState<string[]>([]);
  // 收藏的公式
  const [favoriteFormulas, setFavoriteFormulas] = useState<string[]>([]);

  /**
   * 从本地存储加载数据
   */
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        // 加载最近使用的公式
        const savedRecent = localStorage.getItem(RECENT_FORMULAS_KEY);
        if (savedRecent) {
          setRecentFormulas(JSON.parse(savedRecent));
        }

        // 加载收藏的公式
        const savedFavorites = localStorage.getItem(FAVORITE_FORMULAS_KEY);
        if (savedFavorites) {
          setFavoriteFormulas(JSON.parse(savedFavorites));
        }
      } catch (error) {
        console.error('Failed to load LaTeX formulas from storage:', error);
      }
    };

    loadFromStorage();
  }, []);

  /**
   * 保存数据到本地存储
   * @param key - 存储键名
   * @param data - 要存储的数据
   */
  const saveToStorage = (key: string, data: string[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ${key} to storage:`, error);
    }
  };

  /**
   * 添加公式到最近使用列表
   * @param formula - LaTeX公式
   */
  const addToRecent = (formula: string) => {
    if (!formula.trim()) return;

    setRecentFormulas(prev => {
      // 移除已存在的相同公式
      const updated = prev.filter(f => f !== formula);
      // 添加到列表开头
      updated.unshift(formula);
      // 限制数量
      const limited = updated.slice(0, MAX_RECENT_FORMULAS);
      // 保存到本地存储
      saveToStorage(RECENT_FORMULAS_KEY, limited);
      return limited;
    });
  };

  /**
   * 从最近使用列表中移除公式
   * @param index - 公式索引
   */
  const removeFromRecent = (index: number) => {
    setRecentFormulas(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      saveToStorage(RECENT_FORMULAS_KEY, updated);
      return updated;
    });
  };

  /**
   * 切换公式的收藏状态
   * @param formula - LaTeX公式
   */
  const toggleFavorite = (formula: string) => {
    if (!formula.trim()) return;

    setFavoriteFormulas(prev => {
      let updated;
      if (prev.includes(formula)) {
        // 移除收藏
        updated = prev.filter(f => f !== formula);
      } else {
        // 添加到收藏
        updated = [...prev, formula];
      }
      saveToStorage(FAVORITE_FORMULAS_KEY, updated);
      return updated;
    });
  };

  /**
   * 清空最近使用的公式
   */
  const clearRecent = () => {
    setRecentFormulas([]);
    saveToStorage(RECENT_FORMULAS_KEY, []);
  };

  /**
   * 清空收藏的公式
   */
  const clearFavorites = () => {
    setFavoriteFormulas([]);
    saveToStorage(FAVORITE_FORMULAS_KEY, []);
  };

  return {
    recentFormulas,
    favoriteFormulas,
    addToRecent,
    removeFromRecent,
    toggleFavorite,
    clearRecent,
    clearFavorites
  };
}