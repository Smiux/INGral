// 筛选条件类型定义

// 筛选操作符
export type FilterOperator = 
  | 'equals' // 等于
  | 'not_equals' // 不等于
  | 'contains' // 包含
  | 'not_contains' // 不包含
  | 'starts_with' // 以...开头
  | 'ends_with' // 以...结尾
  | 'greater_than' // 大于
  | 'less_than' // 小于
  | 'greater_than_or_equal' // 大于等于
  | 'less_than_or_equal' // 小于等于
  | 'in' // 在集合中
  | 'not_in' // 不在集合中
  | 'between' // 在范围内
  | 'not_between' // 不在范围内
  | 'is_null' // 为空
  | 'is_not_null'; // 不为空

// 逻辑运算符
export type LogicOperator = 'AND' | 'OR' | 'NOT';

// 筛选字段类型
export type FilterField = 
  | 'title' // 标题
  | 'content' // 内容
  | 'author_id' // 作者ID
  | 'author_name' // 作者名称
  | 'created_at' // 创建时间
  | 'updated_at' // 更新时间
  | 'views' // 浏览量
  | 'tags' // 标签
  | 'visibility' // 可见性
  | 'type' // 类型
  | 'search_rank' // 搜索排名
  | 'semantic_score'; // 语义分数

// 筛选值类型
export type FilterValue = string | number | boolean | string[] | null;

// 基础筛选条件接口
export interface FilterCondition {
  id: string; // 条件ID
  field: FilterField; // 筛选字段
  operator: FilterOperator; // 操作符
  value: FilterValue; // 筛选值
  value2?: FilterValue; // 第二个值，用于between等操作符
}

// 组合筛选条件接口
export interface CompositeFilter {
  id: string; // 组合ID
  operator: LogicOperator; // 逻辑运算符
  conditions: (FilterCondition | CompositeFilter)[]; // 子条件或组合
}

// 可视化筛选条件节点类型
export type FilterNode = FilterCondition | CompositeFilter;

// 筛选条件构建器状态接口
export interface FilterBuilderState {
  root: CompositeFilter; // 根节点
  selectedNodeId?: string; // 当前选中的节点ID
  draggingNodeId?: string; // 当前拖动的节点ID
  dropTargetId?: string; // 当前拖放目标ID
  dropPosition?: 'before' | 'after' | 'inside'; // 拖放位置
}

// 筛选条件保存接口
export interface SavedFilter {
  id: string; // 保存的筛选ID
  name: string; // 筛选名称
  description?: string; // 筛选描述
  filter: CompositeFilter; // 筛选条件
  createdAt: string; // 创建时间
  updatedAt: string; // 更新时间
  isPublic: boolean; // 是否公开
}

// 筛选字段配置接口
export interface FilterFieldConfig {
  field: FilterField; // 字段名
  label: string; // 显示标签
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean'; // 字段类型
  operators: FilterOperator[]; // 支持的操作符
  options?: { value: FilterValue; label: string }[]; // 选项，用于select和multiselect类型
  defaultValue?: FilterValue; // 默认值
  placeholder?: string; // 占位符
  min?: number | string | undefined; // 最小值，用于number和date类型
  max?: number | string | undefined; // 最大值，用于number和date类型
}

// 筛选字段配置
export const FILTER_FIELD_CONFIGS: Record<FilterField, FilterFieldConfig> = {
  title: {
    field: 'title',
    label: '标题',
    type: 'text',
    operators: ['contains', 'not_contains', 'equals', 'not_equals', 'starts_with', 'ends_with'],
    placeholder: '输入标题关键词'
  },
  content: {
    field: 'content',
    label: '内容',
    type: 'text',
    operators: ['contains', 'not_contains', 'equals', 'not_equals', 'starts_with', 'ends_with'],
    placeholder: '输入内容关键词'
  },
  author_id: {
    field: 'author_id',
    label: '作者ID',
    type: 'text',
    operators: ['equals', 'not_equals', 'contains', 'not_contains'],
    placeholder: '输入作者ID'
  },
  author_name: {
    field: 'author_name',
    label: '作者名称',
    type: 'text',
    operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with'],
    placeholder: '输入作者名称'
  },
  created_at: {
    field: 'created_at',
    label: '创建时间',
    type: 'date',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between', 'not_between'],
    max: new Date().toISOString().split('T')[0]
  },
  updated_at: {
    field: 'updated_at',
    label: '更新时间',
    type: 'date',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between', 'not_between'],
    max: new Date().toISOString().split('T')[0]
  },
  views: {
    field: 'views',
    label: '浏览量',
    type: 'number',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between', 'not_between'],
    min: 0
  },
  tags: {
    field: 'tags',
    label: '标签',
    type: 'multiselect',
    operators: ['contains', 'not_contains', 'in', 'not_in'],
    options: [], // 动态加载
    placeholder: '选择或输入标签'
  },
  visibility: {
    field: 'visibility',
    label: '可见性',
    type: 'select',
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    options: [
      { value: 'public', label: '公开' },
      { value: 'private', label: '私有' },
      { value: 'protected', label: '受保护' }
    ]
  },
  type: {
    field: 'type',
    label: '类型',
    type: 'select',
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    options: [
      { value: 'article', label: '文章' },
      { value: 'comment', label: '评论' },
      { value: 'concept', label: '概念' }
    ]
  },
  search_rank: {
    field: 'search_rank',
    label: '搜索排名',
    type: 'number',
    operators: ['greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between', 'not_between'],
    min: 0,
    max: 1
  },
  semantic_score: {
    field: 'semantic_score',
    label: '语义分数',
    type: 'number',
    operators: ['greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between', 'not_between'],
    min: 0,
    max: 1
  }
};

// 创建默认筛选条件
export const createDefaultFilter = (): CompositeFilter => ({
  id: 'root',
  operator: 'AND',
  conditions: []
});

// 创建新的条件节点
export const createFilterCondition = (): FilterCondition => ({
  id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  field: 'title',
  operator: 'contains',
  value: ''
});

// 创建新的组合节点
export const createCompositeFilter = (operator: LogicOperator = 'AND'): CompositeFilter => ({
  id: `composite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  operator,
  conditions: []
});

// 生成唯一ID
export const generateFilterId = (prefix: string = 'filter'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
