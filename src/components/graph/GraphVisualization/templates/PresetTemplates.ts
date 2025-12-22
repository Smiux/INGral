// 预设图谱模板库

import type { GraphTemplate } from '../types/TemplateTypes';


// 预设模板分类
export const TEMPLATE_CATEGORIES = [
  { 'id': 'flowchart', 'name': '流程图', 'icon': 'FlowChart' },
  { 'id': 'orgchart', 'name': '组织架构图', 'icon': 'Sitemap' },
  { 'id': 'conceptmap', 'name': '概念图', 'icon': 'Brain' },
  { 'id': 'timeline', 'name': '时序图', 'icon': 'CalendarClock' },
  { 'id': 'causemap', 'name': '因果关系图', 'icon': 'ArrowRightLeft' },
  { 'id': 'custom', 'name': '自定义模板', 'icon': 'PlusCircle' }
];

// 预设模板列表
export const PRESET_TEMPLATES: GraphTemplate[] = [
  // 基础概念图
  {
    'id': 'template_basic',
    'name': '基础图谱',
    'description': '简单的基础图谱模板，包含几个示例节点和连接',
    'category': 'conceptmap',
    'icon': 'Brain',
    'isDefault': true,
    'nodes': [
      {
        'id': 'node_1',
        'title': '核心概念',
        'connections': 2,
        'type': 'concept',
        'shape': 'rect',
        'style': {
          'fill': '#3b82f6',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 16,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '这是一个核心概念节点'
        },
        'layout': { 'x': 300, 'y': 100, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'node_2',
        'title': '子概念A',
        'connections': 1,
        'type': 'concept',
        'shape': 'rect',
        'style': {
          'fill': '#10b981',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '这是子概念A'
        },
        'layout': { 'x': 150, 'y': 250, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'node_3',
        'title': '子概念B',
        'connections': 1,
        'type': 'concept',
        'shape': 'rect',
        'style': {
          'fill': '#f59e0b',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '这是子概念B'
        },
        'layout': { 'x': 450, 'y': 250, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      }
    ],
    'connections': [
      {
        'id': 'connection_1',
        'type': 'related',
        'source': 'node_1',
        'target': 'node_2',
        'label': '包含',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'connection_2',
        'type': 'related',
        'source': 'node_1',
        'target': 'node_3',
        'label': '包含',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      }
    ],
    'defaultLayout': {
      'type': 'force',
      'direction': 'top-bottom',
      'parameters': {
        'nodeSpacing': 100,
        'levelSpacing': 100
      }
    }
  },
  // 空白模板
  {
    'id': 'template_empty',
    'name': '空白图谱',
    'description': '完全空白的图谱模板，适合从零开始创建',
    'category': 'custom',
    'icon': 'PlusCircle',
    'nodes': [],
    'connections': [],
    'defaultLayout': {
      'type': 'force',
      'direction': 'top-bottom',
      'parameters': {
        'nodeSpacing': 100,
        'levelSpacing': 100
      }
    }
  },
  // 流程图模板
  {
    'id': 'template_flowchart',
    'name': '标准流程图',
    'description': '包含开始、处理、判断和结束节点的标准流程图',
    'category': 'flowchart',
    'icon': 'FlowChart',
    'nodes': [
      {
        'id': 'flow_start',
        'title': '开始',
        'connections': 1,
        'type': 'flow',
        'shape': 'circle',
        'style': {
          'fill': '#10b981',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '流程开始'
        },
        'layout': { 'x': 200, 'y': 100, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'flow_process1',
        'title': '处理步骤1',
        'connections': 2,
        'type': 'flow',
        'shape': 'rect',
        'style': {
          'fill': '#3b82f6',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '执行第一个处理步骤'
        },
        'layout': { 'x': 200, 'y': 200, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'flow_decision',
        'title': '判断条件',
        'connections': 3,
        'type': 'flow',
        'shape': 'diamond',
        'style': {
          'fill': '#f59e0b',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '判断条件是否满足'
        },
        'layout': { 'x': 200, 'y': 300, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'flow_process2',
        'title': '处理步骤2',
        'connections': 1,
        'type': 'flow',
        'shape': 'rect',
        'style': {
          'fill': '#3b82f6',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '执行第二个处理步骤'
        },
        'layout': { 'x': 350, 'y': 400, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'flow_end',
        'title': '结束',
        'connections': 1,
        'type': 'flow',
        'shape': 'circle',
        'style': {
          'fill': '#ef4444',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '流程结束'
        },
        'layout': { 'x': 200, 'y': 500, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      }
    ],
    'connections': [
      {
        'id': 'flow_conn1',
        'type': 'flow',
        'source': 'flow_start',
        'target': 'flow_process1',
        'label': '',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'flow_conn2',
        'type': 'flow',
        'source': 'flow_process1',
        'target': 'flow_decision',
        'label': '',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'flow_conn3',
        'type': 'flow',
        'source': 'flow_decision',
        'target': 'flow_process2',
        'label': '是',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'flow_conn4',
        'type': 'flow',
        'source': 'flow_decision',
        'target': 'flow_end',
        'label': '否',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'flow_conn5',
        'type': 'flow',
        'source': 'flow_process2',
        'target': 'flow_end',
        'label': '',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      }
    ],
    'defaultLayout': {
      'type': 'dagre',
      'direction': 'top-bottom',
      'parameters': {
        'nodeSpacing': 100,
        'levelSpacing': 100
      }
    }
  },
  // 组织架构图模板
  {
    'id': 'template_orgchart',
    'name': '组织架构图',
    'description': '包含多层级的组织架构图模板',
    'category': 'orgchart',
    'icon': 'Sitemap',
    'nodes': [
      {
        'id': 'org_ceo',
        'title': 'CEO',
        'connections': 2,
        'type': 'org',
        'shape': 'rect',
        'style': {
          'fill': '#8b5cf6',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 16,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '首席执行官'
        },
        'layout': { 'x': 400, 'y': 100, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'org_cfo',
        'title': 'CFO',
        'connections': 2,
        'type': 'org',
        'shape': 'rect',
        'style': {
          'fill': '#3b82f6',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '首席财务官'
        },
        'layout': { 'x': 200, 'y': 250, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'org_cto',
        'title': 'CTO',
        'connections': 2,
        'type': 'org',
        'shape': 'rect',
        'style': {
          'fill': '#3b82f6',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '首席技术官'
        },
        'layout': { 'x': 600, 'y': 250, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'org_finance',
        'title': '财务部',
        'connections': 1,
        'type': 'org',
        'shape': 'rect',
        'style': {
          'fill': '#10b981',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '财务部门'
        },
        'layout': { 'x': 200, 'y': 400, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'org_tech',
        'title': '技术部',
        'connections': 1,
        'type': 'org',
        'shape': 'rect',
        'style': {
          'fill': '#10b981',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '技术部门'
        },
        'layout': { 'x': 600, 'y': 400, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      }
    ],
    'connections': [
      {
        'id': 'org_conn1',
        'type': 'org',
        'source': 'org_ceo',
        'target': 'org_cfo',
        'label': '',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'org_conn2',
        'type': 'org',
        'source': 'org_ceo',
        'target': 'org_cto',
        'label': '',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'org_conn3',
        'type': 'org',
        'source': 'org_cfo',
        'target': 'org_finance',
        'label': '',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'org_conn4',
        'type': 'org',
        'source': 'org_cto',
        'target': 'org_tech',
        'label': '',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      }
    ],
    'defaultLayout': {
      'type': 'dagre',
      'direction': 'top-bottom',
      'parameters': {
        'nodeSpacing': 150,
        'levelSpacing': 150
      }
    }
  },
  // 时序图模板
  {
    'id': 'template_timeline',
    'name': '项目时序图',
    'description': '包含多个时间节点的项目进度时序图',
    'category': 'timeline',
    'icon': 'CalendarClock',
    'nodes': [
      {
        'id': 'time_phase1',
        'title': '阶段1',
        'connections': 1,
        'type': 'time',
        'shape': 'rect',
        'style': {
          'fill': '#3b82f6',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '项目启动'
        },
        'layout': { 'x': 100, 'y': 200, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'time_phase2',
        'title': '阶段2',
        'connections': 2,
        'type': 'time',
        'shape': 'rect',
        'style': {
          'fill': '#10b981',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '需求分析'
        },
        'layout': { 'x': 300, 'y': 200, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'time_phase3',
        'title': '阶段3',
        'connections': 2,
        'type': 'time',
        'shape': 'rect',
        'style': {
          'fill': '#f59e0b',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '开发实现'
        },
        'layout': { 'x': 500, 'y': 200, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'time_phase4',
        'title': '阶段4',
        'connections': 2,
        'type': 'time',
        'shape': 'rect',
        'style': {
          'fill': '#ef4444',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '测试验收'
        },
        'layout': { 'x': 700, 'y': 200, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'time_phase5',
        'title': '阶段5',
        'connections': 1,
        'type': 'time',
        'shape': 'rect',
        'style': {
          'fill': '#8b5cf6',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '项目上线'
        },
        'layout': { 'x': 900, 'y': 200, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      }
    ],
    'connections': [
      {
        'id': 'time_conn1',
        'type': 'time',
        'source': 'time_phase1',
        'target': 'time_phase2',
        'label': '1个月',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'time_conn2',
        'type': 'time',
        'source': 'time_phase2',
        'target': 'time_phase3',
        'label': '2个月',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'time_conn3',
        'type': 'time',
        'source': 'time_phase3',
        'target': 'time_phase4',
        'label': '1.5个月',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'time_conn4',
        'type': 'time',
        'source': 'time_phase4',
        'target': 'time_phase5',
        'label': '0.5个月',
        'weight': 1.0,
        'style': {
          'stroke': '#3b82f6',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      }
    ],
    'defaultLayout': {
      'type': 'dagre',
      'direction': 'left-right',
      'parameters': {
        'nodeSpacing': 100,
        'levelSpacing': 100
      }
    }
  },
  // 因果关系图模板
  {
    'id': 'template_causemap',
    'name': '因果关系图',
    'description': '展示因果关系的流程图模板',
    'category': 'causemap',
    'icon': 'ArrowRightLeft',
    'nodes': [
      {
        'id': 'cause_root',
        'title': '根本原因',
        'connections': 2,
        'type': 'cause',
        'shape': 'rect',
        'style': {
          'fill': '#ef4444',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '根本问题'
        },
        'layout': { 'x': 300, 'y': 100, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'cause_effect1',
        'title': '影响1',
        'connections': 2,
        'type': 'effect',
        'shape': 'rect',
        'style': {
          'fill': '#f59e0b',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '直接影响1'
        },
        'layout': { 'x': 150, 'y': 250, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'cause_effect2',
        'title': '影响2',
        'connections': 2,
        'type': 'effect',
        'shape': 'rect',
        'style': {
          'fill': '#f59e0b',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '直接影响2'
        },
        'layout': { 'x': 450, 'y': 250, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'cause_impact1',
        'title': '结果1',
        'connections': 1,
        'type': 'effect',
        'shape': 'rect',
        'style': {
          'fill': '#3b82f6',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '最终结果1'
        },
        'layout': { 'x': 150, 'y': 400, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      },
      {
        'id': 'cause_impact2',
        'title': '结果2',
        'connections': 1,
        'type': 'effect',
        'shape': 'rect',
        'style': {
          'fill': '#3b82f6',
          'stroke': '#fff',
          'strokeWidth': 2,
          'fontSize': 14,
          'textFill': '#fff'
        },
        'state': { 'isExpanded': false, 'isFixed': false, 'isSelected': false, 'isHovered': false, 'isDragging': false, 'isCollapsed': false },
        'metadata': {
          'is_custom': true,
          'createdAt': Date.now(),
          'updatedAt': Date.now(),
          'version': 1,
          'content': '最终结果2'
        },
        'layout': { 'x': 450, 'y': 400, 'isFixed': false, 'isExpanded': false },
        'group': { 'isGroup': false, 'memberIds': [], 'isGroupExpanded': false },
        'handles': { 'handleCount': 4, 'handlePositions': ['top', 'right', 'bottom', 'left'], 'lockedHandles': {}, 'handleLabels': {} }
      }
    ],
    'connections': [
      {
        'id': 'cause_conn1',
        'type': 'cause',
        'source': 'cause_root',
        'target': 'cause_effect1',
        'label': '导致',
        'weight': 1.0,
        'style': {
          'stroke': '#ef4444',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'cause_conn2',
        'type': 'cause',
        'source': 'cause_root',
        'target': 'cause_effect2',
        'label': '导致',
        'weight': 1.0,
        'style': {
          'stroke': '#ef4444',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'cause_conn3',
        'type': 'effect',
        'source': 'cause_effect1',
        'target': 'cause_impact1',
        'label': '产生',
        'weight': 1.0,
        'style': {
          'stroke': '#f59e0b',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      },
      {
        'id': 'cause_conn4',
        'type': 'effect',
        'source': 'cause_effect2',
        'target': 'cause_impact2',
        'label': '产生',
        'weight': 1.0,
        'style': {
          'stroke': '#f59e0b',
          'strokeWidth': 2,
          'arrowSize': 6,
          'arrowType': 'triangle'
        },
        'metadata': { 'createdAt': Date.now(), 'updatedAt': Date.now(), 'version': 1 },
        'state': { 'isSelected': false, 'isHovered': false, 'isEditing': false },
        'curveControl': { 'controlPointsCount': 0, 'controlPoints': [], 'curveType': 'default', 'locked': false },
        'animation': { 'isAnimating': false }
      }
    ],
    'defaultLayout': {
      'type': 'force',
      'direction': 'top-bottom',
      'parameters': {
        'nodeSpacing': 100,
        'levelSpacing': 100
      }
    }
  }
];

// 获取模板的工具函数
export const getTemplateById = (templateId: string): GraphTemplate | undefined => {
  return PRESET_TEMPLATES.find(template => template.id === templateId);
};

// 获取指定分类的模板
export const getTemplatesByCategory = (categoryId: string): GraphTemplate[] => {
  return PRESET_TEMPLATES.filter(template => template.category === categoryId);
};
