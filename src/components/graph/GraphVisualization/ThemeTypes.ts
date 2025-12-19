/**
 * 样式主题类型定义
 * 提供图表样式主题的类型定义和预设主题
 */

// 节点样式接口
export interface NodeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  fontSize: number;
  textFill: string;
  hoverStrokeWidth?: number;
  borderRadius?: number;
  selectedStrokeWidth?: number;
  hoverTextFill?: string;
  selectedFill?: string;
  selectedStroke?: string;
}

// 链接样式接口
export interface LinkStyle {
  stroke: string;
  strokeWidth: number;
  strokeOpacity: number;
}

// 图表主题接口
export interface GraphTheme {
  id: string;
  name: string;
  node: NodeStyle;
  link: LinkStyle;
  backgroundColor: string;
}

// 预设样式主题列表
export const PRESET_THEMES: GraphTheme[] = [
  {
    'id': 'default',
    'name': '默认主题',
    'node': {
      'fill': '#8b5cf6',
      'stroke': '#fff',
      'strokeWidth': 2,
      'radius': 20,
      'fontSize': 12,
      'textFill': '#fff'
    },
    'link': {
      'stroke': '#999',
      'strokeWidth': 2,
      'strokeOpacity': 0.6
    },
    'backgroundColor': '#f9fafb'
  },
  {
    'id': 'dark',
    'name': '深色主题',
    'node': {
      'fill': '#3b82f6',
      'stroke': '#1e293b',
      'strokeWidth': 2,
      'radius': 20,
      'fontSize': 12,
      'textFill': '#fff'
    },
    'link': {
      'stroke': '#64748b',
      'strokeWidth': 2,
      'strokeOpacity': 0.8
    },
    'backgroundColor': '#0f172a'
  },
  {
    'id': 'vibrant',
    'name': '活力主题',
    'node': {
      'fill': '#ec4899',
      'stroke': '#fff',
      'strokeWidth': 2,
      'radius': 20,
      'fontSize': 12,
      'textFill': '#fff'
    },
    'link': {
      'stroke': '#f59e0b',
      'strokeWidth': 2,
      'strokeOpacity': 0.8
    },
    'backgroundColor': '#fef3c7'
  },
  {
    'id': 'nature',
    'name': '自然主题',
    'node': {
      'fill': '#10b981',
      'stroke': '#fff',
      'strokeWidth': 2,
      'radius': 20,
      'fontSize': 12,
      'textFill': '#fff'
    },
    'link': {
      'stroke': '#059669',
      'strokeWidth': 2,
      'strokeOpacity': 0.8
    },
    'backgroundColor': '#d1fae5'
  },
  {
    'id': 'monochrome',
    'name': '黑白主题',
    'node': {
      'fill': '#6b7280',
      'stroke': '#fff',
      'strokeWidth': 2,
      'radius': 20,
      'fontSize': 12,
      'textFill': '#fff'
    },
    'link': {
      'stroke': '#9ca3af',
      'strokeWidth': 2,
      'strokeOpacity': 0.8
    },
    'backgroundColor': '#f3f4f6'
  }
];
