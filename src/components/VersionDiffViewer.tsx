import React, { useState, useRef, useEffect } from 'react';
import { ArticleVersion, VersionDiff } from '../types/version';
import versionHistoryService from '../services/versionHistoryService';
import styles from './VersionDiffViewer.module.css';

// 简单的差异表格组件
interface DiffTableProps {
  oldText: string;
  newText: string;
}

const DiffTable: React.FC<DiffTableProps> = ({ oldText, newText }) => {
  // 简单实现行级比较，实际项目中可以使用更复杂的差异算法
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  // 生成差异行
  const diffLines: JSX.Element[] = [];
  const maxLength = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';
    
    if (oldLine === newLine) {
      diffLines.push(
        <tr key={i} className={styles.sameLine}>
          <td className={styles.lineNumber}>{i + 1}</td>
          <td className={styles.lineNumber}>{i + 1}</td>
          <td className={styles.lineContent}>{oldLine}</td>
        </tr>
      );
    } else if (oldLine && !newLine) {
      diffLines.push(
        <tr key={i} className={styles.deletedLine}>
          <td className={styles.lineNumber}>{i + 1}</td>
          <td className={styles.lineNumber}></td>
          <td className={styles.deletedContent}>{oldLine}</td>
        </tr>
      );
    } else if (!oldLine && newLine) {
      diffLines.push(
        <tr key={i} className={styles.addedLine}>
          <td className={styles.lineNumber}></td>
          <td className={styles.lineNumber}>{i + 1}</td>
          <td className={styles.addedContent}>{newLine}</td>
        </tr>
      );
    } else {
      diffLines.push(
        <tr key={`${i}-old`} className={styles.deletedLine}>
          <td className={styles.lineNumber}>{i + 1}</td>
          <td className={styles.lineNumber}></td>
          <td className={styles.deletedContent}>{oldLine}</td>
        </tr>,
        <tr key={`${i}-new`} className={styles.addedLine}>
          <td className={styles.lineNumber}></td>
          <td className={styles.lineNumber}>{i + 1}</td>
          <td className={styles.addedContent}>{newLine}</td>
        </tr>
      );
    }
  }

  return (
    <div className={styles.diffTableContainer}>
      <table className={styles.diffTable}>
        <thead>
          <tr>
            <th className={styles.oldHeader}>旧版本行号</th>
            <th className={styles.newHeader}>新版本行号</th>
            <th className={styles.contentHeader}>内容</th>
          </tr>
        </thead>
        <tbody>{diffLines}</tbody>
      </table>
    </div>
  );
};

// 元数据差异视图组件
interface MetadataDiffViewProps {
  oldMeta: Record<string, unknown>;
  newMeta: Record<string, unknown>;
}

const MetadataDiffView: React.FC<MetadataDiffViewProps> = ({ oldMeta, newMeta }) => {
  // 获取所有唯一的键名
  const allKeys = [...new Set([...Object.keys(oldMeta), ...Object.keys(newMeta)])];
  
  // 过滤出有变化的键
  const changedKeys = allKeys.filter(key => oldMeta[key] !== newMeta[key]);

  if (changedKeys.length === 0) {
    return <p className={styles.noChanges}>元数据没有变化</p>;
  }

  return (
    <table className={styles.metadataTable}>
      <thead>
        <tr>
          <th>属性名</th>
          <th>旧值</th>
          <th>新值</th>
        </tr>
      </thead>
      <tbody>
        {changedKeys.map(key => {
          const oldValue = oldMeta[key] !== undefined ? oldMeta[key] : 'undefined';
          const newValue = newMeta[key] !== undefined ? newMeta[key] : 'undefined';
          
          // 格式化值以便显示
          const formatValue = (value: unknown) => {
            if (typeof value === 'object' && value !== null) {
              return JSON.stringify(value, null, 2);
            }
            return String(value);
          };

          return (
            <tr key={key}>
              <td className={styles.metadataKey}>{key}</td>
              <td className={styles.metadataOldValue}>
                <pre>{formatValue(oldValue)}</pre>
              </td>
              <td className={styles.metadataNewValue}>
                <pre>{formatValue(newValue)}</pre>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

interface VersionDiffViewerProps {
  versionA: ArticleVersion;
  versionB?: ArticleVersion;
  onClose?: () => void;
}

export const VersionDiffViewer: React.FC<VersionDiffViewerProps> = ({
  versionA,
  versionB,
  onClose
}) => {
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'title' | 'content' | 'metadata'>('content');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDiff = async () => {
      setLoading(true);
      setError(null);
      try {
        if (versionB) {
          const comparison = await versionHistoryService.compareVersions(versionA.id, versionB.id);
          setDiff(comparison);
        } else {
          // 如果只提供了一个版本，则获取其完整内容作为基准比较
          const versionContent = await versionHistoryService.getVersionById(versionA.id);
          setDiff({
            title: {
              old: '',
              new: versionContent.title,
              changed: true
            },
            content: {
              old: '',
              new: versionContent.content,
              changed: true
            },
            metadata: {
              old: {},
              new: versionContent.metadata || {},
              changed: true
            },
            versionA,
            versionB: versionContent
          });
        }
      } catch (err) {
        console.error('Failed to fetch version diff:', err);
        setError('无法加载版本差异。请稍后再试。');
      } finally {
        setLoading(false);
      }
    };

    fetchDiff();
  }, [versionA, versionB]);

  useEffect(() => {
    // 使用更具体的事件处理器类型
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (isFullscreen && viewerRef.current) {
      viewerRef.current.classList.add(styles.fullscreen);
      document.body.style.overflow = 'hidden';
    } else if (viewerRef.current) {
      viewerRef.current.classList.remove(styles.fullscreen);
      document.body.style.overflow = 'auto';
    }
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>加载版本差异中...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <button 
            className={styles.retryButton}
            onClick={() => {
              // 重试按钮功能
              setLoading(true);
              versionHistoryService.compareVersions(versionA.id, versionB?.id || versionA.id)
                .then(setDiff)
                .catch(err => {
                  console.error('Retry failed:', err);
                  setError('重试失败，请稍后再试。');
                })
                .finally(() => setLoading(false));
            }}
          >
            重试
          </button>
        </div>
      );
    }

    if (!diff) {
      return <div className={styles.emptyState}>没有找到版本差异数据</div>;
    }

    return (
      <div className={styles.contentContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabButton} ${selectedTab === 'content' ? styles.activeTab : ''}`}
            onClick={() => setSelectedTab('content')}
            disabled={!diff.content.changed}
          >
            内容差异
            {diff.content.changed && <span className={styles.changedIndicator}>*</span>}
          </button>
          <button
            className={`${styles.tabButton} ${selectedTab === 'title' ? styles.activeTab : ''}`}
            onClick={() => setSelectedTab('title')}
            disabled={!diff.title.changed}
          >
            标题差异
            {diff.title.changed && <span className={styles.changedIndicator}>*</span>}
          </button>
          <button
            className={`${styles.tabButton} ${selectedTab === 'metadata' ? styles.activeTab : ''}`}
            onClick={() => setSelectedTab('metadata')}
            disabled={!diff.metadata.changed}
          >
            元数据差异
            {diff.metadata.changed && <span className={styles.changedIndicator}>*</span>}
          </button>
        </div>

        <div className={styles.diffContent}>
          {selectedTab === 'content' && (
            <div className={styles.diffSection}>
              <h3>文章内容差异</h3>
              <DiffTable 
                oldText={diff.content.old} 
                newText={diff.content.new}
              />
            </div>
          )}

          {selectedTab === 'title' && (
            <div className={styles.diffSection}>
              <h3>文章标题差异</h3>
              <div className={styles.titleDiff}>
                {diff.title.old && (
                  <div className={styles.oldValue}>
                    <div className={styles.label}>旧标题：</div>
                    <div className={styles.value}>{diff.title.old}</div>
                  </div>
                )}
                {diff.title.new && (
                  <div className={styles.newValue}>
                    <div className={styles.label}>新标题：</div>
                    <div className={styles.value}>{diff.title.new}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'metadata' && (
            <div className={styles.diffSection}>
              <h3>元数据差异</h3>
              <div className={styles.metadataDiff}>
                <MetadataDiffView oldMeta={diff.metadata.old} newMeta={diff.metadata.new} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container} ref={viewerRef}>
      <div className={styles.header}>
        <div className={styles.versionInfo}>
          <h2>版本差异比较</h2>
          <div className={styles.versionDetails}>
            <div className={styles.versionPair}>
              {versionB ? (
                <>
                  <span className={styles.versionLabel}>版本 {versionB.version_number}</span>
                  <span className={styles.arrow}>→</span>
                  <span className={styles.versionLabel}>版本 {versionA.version_number}</span>
                </>
              ) : (
                <span className={styles.versionLabel}>版本 {versionA.version_number}</span>
              )}
            </div>
            <div className={styles.timestamps}>
              {versionB && (
                <span className={styles.timestamp}>
                  {formatDate(versionB.created_at)}
                </span>
              )}
              <span className={styles.timestamp}>
                {formatDate(versionA.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <button 
            className={styles.actionButton}
            onClick={toggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏查看'}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m8 3 4 1m0 0 4-1m-4 1v4m4-4v4m-10 10 4-1m0 0 4 1m-4-1v-4m4 4v-4"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 8 4-1m0 0 4 1m-4-1v4m-4 4 4 1m0 0 4-1m-4 1v-4m10-4-4 1m0 0-4-1m4 1v4m4 4-4-1m0 0-4 1m4-1v-4"/>
              </svg>
            )}
          </button>
          <button 
            className={styles.actionButton}
            onClick={onClose}
            title="关闭"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      </div>
      
      {renderContent()}
    </div>
  );
};
