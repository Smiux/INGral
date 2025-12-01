/**
 * 模板预览组件
 * 用于显示模板的缩略图或预览图
 */
import React from 'react';
import type { GraphTemplate } from './TemplateTypes';

interface TemplatePreviewProps {
  template: GraphTemplate;
  width?: number;
  height?: number;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ 
  template, 
  width = 200, 
  height = 150 
}) => {
  // 计算节点的边界，以便缩放和居中显示
  const calculateBounds = () => {
    if (template.nodes.length === 0) {
      return { minX: 0, maxX: width, minY: 0, maxY: height };
    }
    
    const minX = Math.min(...template.nodes.map(node => node.x));
    const maxX = Math.max(...template.nodes.map(node => node.x));
    const minY = Math.min(...template.nodes.map(node => node.y));
    const maxY = Math.max(...template.nodes.map(node => node.y));
    
    return { minX, maxX, minY, maxY };
  };
  
  const bounds = calculateBounds();
  const padding = 20;
  const contentWidth = bounds.maxX - bounds.minX + padding * 2;
  const contentHeight = bounds.maxY - bounds.minY + padding * 2;
  
  // 计算缩放比例，确保预览图适合容器
  const scale = Math.min(
    width / contentWidth,
    height / contentHeight
  );
  
  // 计算居中偏移量
  const offsetX = (width - (contentWidth * scale)) / 2 - bounds.minX * scale + padding * scale;
  const offsetY = (height - (contentHeight * scale)) / 2 - bounds.minY * scale + padding * scale;

  return (
    <div 
      className="bg-gray-50 border border-gray-200 rounded-md overflow-hidden"
      style={{ width, height }}
    >
      <svg width={width} height={height} className="w-full h-full">
        {/* 背景 */}
        <rect width={width} height={height} fill="#f9fafb" />
        
        {/* 绘制链接 */}
        {template.links.map(link => {
          const sourceNode = template.nodes.find(n => n.id === link.source);
          const targetNode = template.nodes.find(n => n.id === link.target);
          
          if (!sourceNode || !targetNode) return null;
          
          const x1 = sourceNode.x * scale + offsetX;
          const y1 = sourceNode.y * scale + offsetY;
          const x2 = targetNode.x * scale + offsetX;
          const y2 = targetNode.y * scale + offsetY;
          
          return (
            <line
              key={link.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#999"
              strokeWidth={2}
              strokeOpacity={0.6}
            />
          );
        })}
        
        {/* 绘制节点 */}
        {template.nodes.map(node => {
          const x = node.x * scale + offsetX;
          const y = node.y * scale + offsetY;
          const radius = 15;
          
          return (
            <g key={node.id}>
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill="#8b5cf6"
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fill="#fff"
                fontWeight="bold"
              >
                {node.title.length > 6 ? `${node.title.substring(0, 6)}...` : node.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
