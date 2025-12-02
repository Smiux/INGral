import React, { useState, useEffect, useRef } from 'react';
import type { Tag } from '../../types';
import { tagService } from '../../services/tagService';
import styles from './TagSelector.module.css';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (selectedTags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags = [],
  onChange,
  maxTags = 5,
  disabled = false,
}) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 获取可用标签
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        setError(null);
        const tags = await tagService.getAllTags({
        sortBy: 'usage_count',
        sortOrder: 'desc',
      });
        setAvailableTags(tags);
      } catch (err) {
        setError('获取标签失败');
        console.error('获取标签错误:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  // 过滤标签
  useEffect(() => {
    const filtered = availableTags
      .filter(tag => !selectedTags.includes(tag.id))
      .filter(tag =>
        searchQuery.trim() === '' ||
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    setFilteredTags(filtered);
  }, [searchQuery, availableTags, selectedTags]);

  // 处理点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 处理标签选择
  const handleTagSelect = (tagId: string) => {
    if (selectedTags.length >= maxTags) {
      return;
    }

    if (!selectedTags.includes(tagId)) {
      onChange([...selectedTags, tagId]);
      setSearchQuery('');
      setShowDropdown(false);
    }
  };

  // 处理标签移除
  const handleTagRemove = (tagId: string) => {
    onChange(selectedTags.filter(id => id !== tagId));
  };

  // 创建新标签
  const handleCreateTag = async () => {
    if (!newTagName.trim() || creatingTag) {
      return;
    }

    try {
      setCreatingTag(true);
      const newTag = await tagService.createTag({
        name: newTagName.trim(),
      });

      if (newTag) {
        // 添加到选择的标签中
        handleTagSelect(newTag.id);

        // 更新可用标签列表
        setAvailableTags([...availableTags, newTag]);
        setNewTagName('');
      }
    } catch (err) {
      console.error('创建标签失败:', err);
    } finally {
      setCreatingTag(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery && filteredTags.length > 0 && filteredTags[0] && 'id' in filteredTags[0]) {
        handleTagSelect(filteredTags[0].id);
      } else if (newTagName.trim()) {
        handleCreateTag();
      }
    }
  };

  // 获取选中的标签详情
  const selectedTagsDetails = selectedTags
    .map(id => availableTags.find(tag => tag.id === id))
    .filter((tag): tag is Tag => tag !== undefined);

  // 显示已选择的标签
  const renderSelectedTags = () => {
    return (
      <div className={styles.selectedTags}>
        {selectedTagsDetails.map(tag => (
          <div key={tag.id} className={styles.selectedTag} style={{ backgroundColor: tag.color }}>
            <span className={styles.tagName}>{tag.name}</span>
            {!disabled && (
              <button
                className={styles.removeTagBtn}
                onClick={() => handleTagRemove(tag.id)}
                aria-label={`移除标签 ${tag.name}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 显示下拉框
  const renderDropdown = () => {
    if (!showDropdown) {return null;}

    return (
      <div className={styles.dropdown} ref={dropdownRef}>
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <>
            {/* 搜索结果 */}
            {filteredTags.length > 0 && (
              <div className={styles.tagList}>
                {filteredTags.slice(0, 10).map(tag => (
                  <div
                    key={tag.id}
                    className={styles.tagOption}
                    onClick={() => handleTagSelect(tag.id)}
                  >
                    <div
                      className={styles.tagColorIndicator}
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className={styles.tagName}>{tag.name}</span>
                    {tag.usage_count > 0 && (
                      <span className={styles.tagUsage}>({tag.usage_count})</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 创建新标签选项 */}
            {searchQuery && filteredTags.length === 0 && !creatingTag && (
              <div className={styles.createTagOption}>
                <button
                  className={styles.createTagBtn}
                  onClick={handleCreateTag}
                  disabled={creatingTag}
                >
                  创建新标签: {searchQuery}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* 已选择的标签 */}
      {renderSelectedTags()}

      {/* 标签输入框 */}
      {!disabled && selectedTags.length < maxTags && (
        <div className={styles.inputContainer}>
          <input
            type="text"
            className={styles.input}
            placeholder="搜索或输入新标签名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
          />
          {renderDropdown()}
        </div>
      )}

      {/* 标签数量限制提示 */}
      {selectedTags.length >= maxTags && (
        <div className={styles.limitReached}>
          已达到最大标签数量限制 ({maxTags})
        </div>
      )}
    </div>
  );
};
