import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowUpDown, Calendar, User, MoreHorizontal, RefreshCw } from 'lucide-react';
import type { VersionHistoryResult, ArticleVersion } from '../../types/version';
import versionHistoryService from '../../services/versionHistoryService';
import styles from './VersionHistoryList.module.css';

interface VersionHistoryListProps {
  articleId: string;
  onVersionSelect?: (versionId: string) => void;
  onRestore?: (versionId: string) => void;
}

/**
 * 版本历史列表组件
 */
const VersionHistoryList: React.FC<VersionHistoryListProps> = ({
  articleId,
  onVersionSelect,
  onRestore,
}) => {
  const [versionHistory, setVersionHistory] = useState<VersionHistoryResult>({
    versions: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; versionId: string } | null>(null);

  // 加载版本历史
  const loadVersions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await versionHistoryService.getArticleVersions({
        articleId,
        page: versionHistory.page,
        limit: versionHistory.limit,
        order: sortOrder,
      });

      setVersionHistory(result);
    } catch (err) {
      setError('加载版本历史失败');
      console.error('加载版本历史失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 使用useRef保存最新的versionHistory值，避免循环依赖
  const versionHistoryRef = useRef(versionHistory);

  useEffect(() => {
    versionHistoryRef.current = versionHistory;
  }, [versionHistory]);

  // 将loadVersions函数使用useCallback包装以稳定依赖
  const memoizedLoadVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 使用ref获取最新的page和limit值，避免循环依赖
      const currentVersionHistory = versionHistoryRef.current;
      const result = await versionHistoryService.getArticleVersions({
        articleId,
        page: currentVersionHistory.page,
        limit: currentVersionHistory.limit,
      });

      setVersionHistory(result);
    } catch (err) {
      setError('加载版本历史失败');
      console.error('加载版本历史失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  // 初始加载
  useEffect(() => {
    memoizedLoadVersions();
  }, [memoizedLoadVersions]);

  // 处理排序切换
  const handleSortToggle = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    setPage(1);
  };

  // 处理页面切换
  const setPage = (page: number) => {
    setVersionHistory((prev: VersionHistoryResult) => ({ ...prev, page }));
  };

  // 处理版本选择
  const handleVersionClick = (versionId: string) => {
    setSelectedVersionId(versionId);
    onVersionSelect?.(versionId);
  };

  // 处理还原版本
  const handleRestore = async (versionId: string) => {
    if (window.confirm('确定要还原到这个版本吗？这将创建一个新的版本记录。')) {
      try {
        await versionHistoryService.restoreVersion({
          versionId,
          articleId,
          restoreComment: '手动还原',
        });

        // 重新加载版本历史
        loadVersions();

        // 触发还原回调
        onRestore?.(versionId);
      } catch (err) {
        console.error('还原版本失败:', err);
        alert('还原版本失败，请重试');
      }
    }
  };

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, versionId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      versionId,
    });
  };

  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // 全局点击关闭右键菜单
  useEffect(() => {
    const handleGlobalClick = () => closeContextMenu();
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // 格式化时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 渲染分页
  const renderPagination = () => {
    const { page, totalPages } = versionHistory;
    const pages: number[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 显示当前页附近的页码
      let start = Math.max(1, page - 2);
      const end = Math.min(totalPages, start + 4);

      if (end - start < 4) {
        start = Math.max(1, end - 4);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return (
      <div className={styles.pagination}>
        <button
          className={styles.paginationButton}
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          上一页
        </button>

        {pages.map(p => (
          <button
            key={p}
            className={`${styles.paginationButton} ${page === p ? styles.activePage : ''}`}
            onClick={() => setPage(p)}
          >
            {p}
          </button>
        ))}

        <button
          className={styles.paginationButton}
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          下一页
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>版本历史</h2>
        <div className={styles.headerActions}>
          <button
            className={styles.sortButton}
            onClick={handleSortToggle}
            title={sortOrder === 'desc' ? '从旧到新排序' : '从新到旧排序'}
          >
            <ArrowUpDown className={styles.sortIcon} />
            {sortOrder === 'desc' ? '从新到旧' : '从旧到新'}
          </button>
        </div>
      </div>

      {versionHistory.versions.length === 0 ? (
        <div className={styles.empty}>暂无版本历史</div>
      ) : (
        <>
          <div className={styles.versionList}>
            {versionHistory.versions.map((version: ArticleVersion) => (
              <div
                key={version.id}
                className={`${styles.versionItem} ${selectedVersionId === version.id ? styles.selected : ''}`}
                onClick={() => handleVersionClick(version.id)}
                onContextMenu={(e) => handleContextMenu(e, version.id)}
              >
                <div className={styles.versionHeader}>
                  <div className={styles.versionInfo}>
                    <span className={styles.versionNumber}>版本 {version.version_number}</span>
                    {version.change_summary && (
                      <span className={styles.changeSummary}>{version.change_summary}</span>
                    )}
                  </div>
                  <div className={styles.versionActions}>
                    <button
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(version.id);
                      }}
                      title="还原此版本"
                    >
                      <RefreshCw className={styles.actionIcon} />
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e as React.MouseEvent, version.id);
                      }}
                      title="更多选项"
                    >
                      <MoreHorizontal className={styles.actionIcon} />
                    </button>
                  </div>
                </div>

                <div className={styles.versionDetails}>
                  <div className={styles.detailItem}>
                    <User className={styles.detailIcon} />
                    <span>{version.author_id || '未知用户'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <Calendar className={styles.detailIcon} />
                    <span>{formatDate(version.created_at)}</span>
                  </div>
                  {version.is_published && (
                    <div className={styles.publishedBadge}>已发布</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {renderPagination()}
        </>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
          }}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              handleRestore(contextMenu.versionId);
              closeContextMenu();
            }}
          >
            <RefreshCw className={styles.contextMenuIcon} />
            还原此版本
          </button>
        </div>
      )}
    </div>
  );
};

export default VersionHistoryList;
