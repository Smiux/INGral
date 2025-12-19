import { useEffect, useState, useCallback } from 'react';
import type { Tag } from '../../types';
import { tagService } from '../../services/tagService';
import styles from './TagList.module.css';

interface TagListProps {
  onTagClick?: () => void;
  selectedTags?: string[];
  onTagsChange?: () => void;
  showSearch?: boolean;
  showCount?: boolean;
}

export const TagList: React.FC<TagListProps> = ({
  onTagClick,
  selectedTags = [],
  onTagsChange,
  showSearch = true,
  showCount = true
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTagTree, setFilteredTagTree] = useState<Tag[]>([]);

  // 获取标签树
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        setError(null);
        // 使用getTagTree()方法获取层级标签树
        const tagTree = await tagService.getTagTree();
        setTags(tagTree);
      } catch (err) {
        setError('获取标签列表失败');
        console.error('获取标签列表错误:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  // 递归过滤标签树
  const filterTagTree = useCallback((tagTree: Tag[], query: string): Tag[] => {
    if (!query.trim()) {
      return tagTree;
    }

    return tagTree.flatMap(tag => {
      const hasMatchingName = tag.name.toLowerCase().includes(query.toLowerCase());
      const hasChildren = tag.children && tag.children.length > 0;

      // 递归过滤子标签
      const filteredChildren = hasChildren ? filterTagTree(tag.children || [], query) : [];

      // 如果标签名称匹配或者有匹配的子标签，则保留该标签
      if (hasMatchingName || filteredChildren.length > 0) {
        return [{
          ...tag,
          'children': filteredChildren
        }];
      }

      return [];
    });
  }, []);

  // 过滤标签树
  useEffect(() => {
    setFilteredTagTree(filterTagTree(tags, searchQuery));
  }, [searchQuery, tags, filterTagTree]);

  // 处理标签点击
  const handleTagClick = useCallback(() => {
    if (onTagClick) {
      onTagClick();
      return;
    }

    if (onTagsChange) {
      onTagsChange();
    }
  }, [onTagClick, onTagsChange]);

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // 展开状态管理
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  // 处理展开/折叠
  const handleToggleExpand = useCallback((tagId: string) => {
    setExpandedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  }, []);

  // 递归渲染标签树
  const renderTagTree = useCallback((tagList: Tag[], level = 0) => {
    return tagList.map(tagItem => {
      const isSelected = selectedTags.includes(tagItem.id);
      const hasChildren = tagItem.children && tagItem.children.length > 0;
      const isExpanded = expandedTags.has(tagItem.id);

      return (
        <div key={tagItem.id} className={styles.tagTreeItem}>
          <div
            className={`${styles.tagItem} ${isSelected ? styles.selected : ''}`}
            onClick={() => handleTagClick()}
            style={{
              'backgroundColor': isSelected ? tagItem.color : 'transparent',
              'borderColor': tagItem.color,
              'color': isSelected ? '#fff' : tagItem.color,
              'paddingLeft': `${level * 20}px`
            }}
          >
            {hasChildren && (
              <button
                className={styles.expandButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(tagItem.id);
                }}
                style={{ 'marginRight': '5px' }}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            <span className={styles.tagName}>{tagItem.name}</span>
            {showCount && (
              <span className={styles.tagCount}>({tagItem.usage_count})</span>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div className={styles.tagChildren}>
              {renderTagTree(tagItem.children || [], level + 1)}
            </div>
          )}
        </div>
      );
    });
  }, [selectedTags, expandedTags, handleTagClick, handleToggleExpand, showCount]);

  // 显示加载状态
  if (loading) {
    return <div className={styles.loading}>加载标签中...</div>;
  }

  // 显示错误状态
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      {/* 搜索框 */}
      {showSearch && (
        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="搜索标签..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      )}

      {/* 标签树 */}
      <div className={styles.tagsContainer}>
        {searchQuery.trim() === '' && renderTagTree(tags)}
        {searchQuery.trim() !== '' && filteredTagTree.length > 0 && renderTagTree(filteredTagTree)}
        {searchQuery.trim() !== '' && filteredTagTree.length === 0 && (
          <div className={styles.empty}>没有找到匹配的标签</div>
        )}
      </div>
    </div>
  );
};
