import React from 'react';
import type { Tag } from '../../types';

interface TagCloudProps {
  tags: Tag[];
  selectedTagId?: string | undefined;
  onTagClick?: (tag: Tag) => void;
  maxTags?: number;
}

export const TagCloud: React.FC<TagCloudProps> = ({ 
  tags, 
  selectedTagId, 
  onTagClick, 
  maxTags = 20 
}) => {
  // 计算标签的大小范围
  const getTagSize = (usageCount: number) => {
    // 找出最大和最小使用次数
    const maxUsage = Math.max(...tags.map(tag => tag.usage_count || 0), 1);
    const minUsage = Math.min(...tags.map(tag => tag.usage_count || 0), 1);
    
    // 计算相对大小（12px 到 24px）
    const sizeRange = 24 - 12;
    const usageRange = maxUsage - minUsage;
    
    if (usageRange === 0) {
      return 16; // 默认大小
    }
    
    const relativeSize = ((usageCount - minUsage) / usageRange) * sizeRange;
    return 12 + relativeSize;
  };
  
  // 计算标签的颜色
  const getTagColor = (usageCount: number) => {
    // 找出最大和最小使用次数
    const maxUsage = Math.max(...tags.map(tag => tag.usage_count || 0), 1);
    const minUsage = Math.min(...tags.map(tag => tag.usage_count || 0), 1);
    
    // 根据使用次数生成颜色（从蓝色到红色）
    const usageRange = maxUsage - minUsage;
    const hue = usageRange === 0 ? 200 : 200 - ((usageCount - minUsage) / usageRange) * 150;
    
    return `hsl(${hue}, 70%, 60%)`;
  };
  
  // 限制标签数量
  const limitedTags = tags.slice(0, maxTags);
  
  return (
    <div className="flex flex-wrap gap-2 p-4 bg-white rounded-lg shadow-sm">
      {limitedTags.map(tag => {
        const size = getTagSize(tag.usage_count || 0);
        const color = tag.color || getTagColor(tag.usage_count || 0);
        const isSelected = selectedTagId === tag.id;
        
        return (
          <button
            key={tag.id}
            className={`px-3 py-1 rounded-full transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            style={{
              fontSize: `${size}px`,
              backgroundColor: isSelected ? `${color}20` : `${color}10`,
              color: color,
              border: `1px solid ${color}30`,
              cursor: onTagClick ? 'pointer' : 'default',
            }}
            onClick={() => onTagClick && onTagClick(tag)}
            title={`使用次数: ${tag.usage_count || 0}`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
};

export default TagCloud;