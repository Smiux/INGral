import React from 'react';
import type { Tag } from '../../types';

interface TagCloudProps {
  tags: Tag[];
  selectedTagId?: string | undefined;
  onTagClick?: (_tag: Tag) => void;
  maxTags?: number;
  showHierarchy?: boolean;
  sizeRange?: [number, number];
  colorRange?: [number, number];
  randomizeOrder?: boolean;
}

export const TagCloud: React.FC<TagCloudProps> = ({
  tags,
  selectedTagId,
  onTagClick,
  maxTags = 20,
  showHierarchy = false,
  sizeRange = [12, 24],
  colorRange = [200, 50],
  randomizeOrder = true
}) => {
  // 递归扁平化标签树
  const flattenTags = (tagTree: Tag[]): Tag[] => {
    return tagTree.flatMap(tagItem => {
      const hasChildren = tagItem.children && tagItem.children.length > 0;
      const children = hasChildren ? flattenTags(tagItem.children || []) : [];
      return [tagItem, ...children];
    });
  };

  // 扁平化标签树
  const flatTags = flattenTags(tags);

  // 计算标签的大小范围
  const getTagSize = (usageCount: number) => {
    // 找出最大和最小使用次数
    const maxUsage = Math.max(...flatTags.map(tagItem => tagItem.usage_count || 0), 1);
    const minUsage = Math.min(...flatTags.map(tagItem => tagItem.usage_count || 0), 1);

    // 计算相对大小
    const [minSize, maxSize] = sizeRange;
    const sizeRangeValue = maxSize - minSize;
    const usageRange = maxUsage - minUsage;

    if (usageRange === 0) {
      // 默认大小
      return (minSize + maxSize) / 2;
    }

    const relativeSize = ((usageCount - minUsage) / usageRange) * sizeRangeValue;
    return minSize + relativeSize;
  };

  // 计算标签的颜色
  const getTagColor = (usageCount: number) => {
    // 找出最大和最小使用次数
    const maxUsage = Math.max(...flatTags.map(tagItem => tagItem.usage_count || 0), 1);
    const minUsage = Math.min(...flatTags.map(tagItem => tagItem.usage_count || 0), 1);

    // 根据使用次数生成颜色（从蓝色到红色）
    const [startHue, endHue] = colorRange;
    const usageRange = maxUsage - minUsage;
    const hue = usageRange === 0 ? startHue : startHue - ((usageCount - minUsage) / usageRange) * (startHue - endHue);

    return `hsl(${hue}, 70%, 60%)`;
  };

  // 限制标签数量
  let limitedTags = flatTags.slice(0, maxTags);

  // 随机化标签顺序
  if (randomizeOrder) {
    limitedTags = [...limitedTags].sort(() => Math.random() - 0.5);
  }

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-white rounded-lg shadow-sm">
      {limitedTags.map(tagItem => {
        const size = getTagSize(tagItem.usage_count || 0);
        const color = tagItem.color || getTagColor(tagItem.usage_count || 0);
        const isSelected = selectedTagId === tagItem.id;

        return (
          <button
            key={tagItem.id}
            className={`px-3 py-1 rounded-full transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            style={{
              'fontSize': `${size}px`,
              'backgroundColor': isSelected ? `${color}20` : `${color}10`,
              color,
              'border': `1px solid ${color}30`,
              'cursor': onTagClick ? 'pointer' : 'default',
              'textDecoration': showHierarchy && tagItem.parent_id ? 'underline' : 'none',
              'fontWeight': showHierarchy && !tagItem.parent_id ? 'bold' : 'normal'
            }}
            onClick={() => onTagClick && onTagClick(tagItem)}
            title={`使用次数: ${tagItem.usage_count || 0}${showHierarchy && tagItem.parent_id ? ' (子标签)' : ''}`}
          >
            {tagItem.name}
          </button>
        );
      })}
    </div>
  );
};

export default TagCloud;
