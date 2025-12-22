// 图谱模板类型定义

import type { EnhancedNode, EnhancedGraphConnection } from '../types';

// 模板元数据接口
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: 'flowchart' | 'orgchart' | 'conceptmap' | 'timeline' | 'causemap' | 'custom';
  // 模板图标，使用Lucide图标名称
  icon: string;
  // 模板缩略图URL
  thumbnail?: string;
  // 是否为默认模板
  isDefault?: boolean;
  // 是否为用户自定义模板
  isCustom?: boolean;
}

// 图谱模板接口
export interface GraphTemplate extends TemplateMetadata {
  // 模板数据
  nodes: EnhancedNode[];
  connections: EnhancedGraphConnection[];
  // 模板默认布局
  defaultLayout: {
    type: 'force' | 'dagre' | 'circle' | 'grid' | 'radial' | 'concentric';
    direction?: 'top-bottom' | 'bottom-top' | 'left-right' | 'right-left';
    parameters?: {
      nodeSpacing?: number;
      levelSpacing?: number;
      // 力导向布局参数
      force?: {
        charge?: number;
        linkStrength?: number;
        linkDistance?: number;
        gravity?: number;
      };
    };
  };
  // 模板创建者信息（仅自定义模板）
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 模板库接口
export interface TemplateLibrary {
  templates: GraphTemplate[];
  categories: Array<{
    id: TemplateMetadata['category'];
    name: string;
    icon: string;
  }>;
}
