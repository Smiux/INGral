/**
 * 图表模板类型定义
 * 提供图表模板和模板分类的类型定义
 */

// 模板分类接口
export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// 图表模板接口
export interface GraphTemplate {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  category?: TemplateCategory;
  nodes: { id: string; title: string; x: number; y: number }[];
  links: { id: string; source: string; target: string; type: string }[];
  is_public: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// 预设模板分类
export const PRESET_CATEGORIES: TemplateCategory[] = [
  {
    id: 'default',
    name: '默认分类',
    description: '默认模板分类',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'knowledge',
    name: '知识图谱',
    description: '用于展示知识关系的图谱模板',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'flowchart',
    name: '流程图',
    description: '用于展示流程关系的图谱模板',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'network',
    name: '网络拓扑',
    description: '用于展示网络拓扑结构的图谱模板',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mindmap',
    name: '思维导图',
    description: '用于展示思维发散的图谱模板',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// 预设图表模板
export const PRESET_TEMPLATES: GraphTemplate[] = [
  {
    id: 'template-1',
    name: '简单知识图谱',
    description: '包含3个节点和2条链接的简单知识图谱',
    category_id: 'knowledge',
    nodes: [
      { id: 'node-1', title: '节点1', x: 100, y: 100 },
      { id: 'node-2', title: '节点2', x: 300, y: 100 },
      { id: 'node-3', title: '节点3', x: 200, y: 200 }
    ],
    links: [
      { id: 'link-1', source: 'node-1', target: 'node-2', type: '相关' },
      { id: 'link-2', source: 'node-1', target: 'node-3', type: '包含' }
    ],
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'template-2',
    name: '简单流程图',
    description: '包含4个节点和3条链接的简单流程图',
    category_id: 'flowchart',
    nodes: [
      { id: 'node-1', title: '开始', x: 100, y: 100 },
      { id: 'node-2', title: '步骤1', x: 250, y: 100 },
      { id: 'node-3', title: '步骤2', x: 400, y: 100 },
      { id: 'node-4', title: '结束', x: 550, y: 100 }
    ],
    links: [
      { id: 'link-1', source: 'node-1', target: 'node-2', type: '流向' },
      { id: 'link-2', source: 'node-2', target: 'node-3', type: '流向' },
      { id: 'link-3', source: 'node-3', target: 'node-4', type: '流向' }
    ],
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
