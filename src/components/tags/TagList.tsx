import { useEffect, useState } from 'react';
import { Tag } from '../../types';
import { TagService } from '../../services/tagService';
import styles from './TagList.module.css';

interface TagListProps {
  onTagClick?: (tag: Tag) => void;
  selectedTags?: string[];
  onTagsChange?: (selectedTags: string[]) => void;
  showSearch?: boolean;
  maxTags?: number;
  showCount?: boolean;
}

export const TagList: React.FC<TagListProps> = ({
  onTagClick,
  selectedTags = [],
  onTagsChange,
  showSearch = true,
  maxTags,
  showCount = true,
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);

  // 获取标签列表
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        setError(null);
        const allTags = await TagService.getAllTags({
          sortBy: 'usage_count',
          sortOrder: 'desc',
        });
        setTags(allTags);
      } catch (err) {
        setError('获取标签列表失败');
        console.error('获取标签列表错误:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  // 过滤标签
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTags(tags);
    } else {
      const filtered = tags.filter(tag => 
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTags(filtered);
    }
  }, [searchQuery, tags]);

  // 处理标签点击
  const handleTagClick = (tag: Tag) => {
    if (onTagClick) {
      onTagClick(tag);
      return;
    }

    if (onTagsChange) {
      const newSelectedTags = selectedTags.includes(tag.id)
        ? selectedTags.filter(id => id !== tag.id)
        : [...selectedTags, tag.id];
      onTagsChange(newSelectedTags);
    }
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // 渲染标签项
  const renderTag = (tag: Tag) => {
    const isSelected = selectedTags.includes(tag.id);
    
    return (
      <div
        key={tag.id}
        className={`${styles.tagItem} ${isSelected ? styles.selected : ''}`}
        onClick={() => handleTagClick(tag)}
        style={{
          backgroundColor: isSelected ? tag.color : 'transparent',
          borderColor: tag.color,
          color: isSelected ? '#fff' : tag.color,
        }}
      >
        <span className={styles.tagName}>{tag.name}</span>
        {showCount && (
          <span className={styles.tagCount}>({tag.usage_count})</span>
        )}
      </div>
    );
  };

  // 显示加载状态
  if (loading) {
    return <div className={styles.loading}>加载标签中...</div>;
  }

  // 显示错误状态
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  // 限制显示的标签数量
  const tagsToShow = maxTags ? filteredTags.slice(0, maxTags) : filteredTags;

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

      {/* 标签列表 */}
      <div className={styles.tagsContainer}>
        {tagsToShow.length > 0 ? (
          tagsToShow.map(renderTag)
        ) : (
          <div className={styles.empty}>没有找到匹配的标签</div>
        )}
      </div>
    </div>
  );
};