import React, { useState, useCallback, useRef } from 'react';
import {
  FilterNode,
  FilterCondition,
  CompositeFilter,
  FilterField,
  FilterOperator,
  LogicOperator,
  FILTER_FIELD_CONFIGS,
  createFilterCondition,
  createCompositeFilter
} from '../../types/filter';
import styles from './FilterBuilder.module.css';

interface FilterBuilderProps {
  filter: CompositeFilter;
  onFilterChange: (filter: CompositeFilter) => void;
  onUseCompositeFilterChange: (use: boolean) => void;
  useCompositeFilter: boolean;
}

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  filter,
  onFilterChange,
  onUseCompositeFilterChange,
  useCompositeFilter
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [editingNodeId, setEditingNodeId] = useState<string | undefined>();
  const builderRef = useRef<HTMLDivElement>(null);

  // 查找节点
  const findNode = useCallback((node: FilterNode, id: string): FilterNode | null => {
    if (node.id === id) {
      return node;
    }
    
    if ('conditions' in node) {
      for (const child of node.conditions) {
        const found = findNode(child, id);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  }, []);

  // 更新节点 - 确保返回CompositeFilter类型
  const updateNode = useCallback((node: CompositeFilter, id: string, updater: (node: FilterNode) => FilterNode): CompositeFilter => {
    if (node.id === id) {
      const updated = updater(node);
      if ('conditions' in updated) {
        return updated;
      }
      return node;
    }
    
    return {
      ...node,
      conditions: node.conditions.map(child => {
        if ('conditions' in child) {
          return updateNode(child, id, updater);
        }
        return updater(child);
      })
    };
  }, []);

  // 添加条件
  const addCondition = useCallback((parentId: string) => {
    const newCondition = createFilterCondition();
    
    const updatedFilter = updateNode(filter, parentId, (node) => {
      if ('conditions' in node) {
        return {
          ...node,
          conditions: [...node.conditions, newCondition]
        };
      }
      return node;
    });
    
    onFilterChange(updatedFilter);
    setSelectedNodeId(newCondition.id);
    setEditingNodeId(newCondition.id);
  }, [filter, updateNode, onFilterChange]);

  // 添加组合条件
  const addCompositeFilter = useCallback((parentId: string, operator: LogicOperator = 'AND') => {
    const newComposite = createCompositeFilter(operator);
    
    const updatedFilter = updateNode(filter, parentId, (node) => {
      if ('conditions' in node) {
        return {
          ...node,
          conditions: [...node.conditions, newComposite]
        };
      }
      return node;
    });
    
    onFilterChange(updatedFilter);
    setSelectedNodeId(newComposite.id);
  }, [filter, updateNode, onFilterChange]);

  // 删除节点
  const deleteNode = useCallback((nodeId: string) => {
    // 不能删除根节点
    if (nodeId === filter.id) {
      return;
    }
    
    // 递归删除节点
    const removeNode = (node: CompositeFilter): CompositeFilter => {
      return {
        ...node,
        conditions: node.conditions.filter(child => child.id !== nodeId)
          .map(child => {
            if ('conditions' in child) {
              return removeNode(child);
            }
            return child;
          })
      };
    };
    
    onFilterChange(removeNode(filter));
    setSelectedNodeId(undefined);
    setEditingNodeId(undefined);
  }, [filter, onFilterChange]);

  // 更新条件
  const updateCondition = useCallback((id: string, updates: Partial<FilterCondition>) => {
    const updatedFilter = updateNode(filter, id, (node) => {
      if ('field' in node) {
        return {
          ...node,
          ...updates
        };
      }
      return node;
    });
    
    onFilterChange(updatedFilter);
  }, [filter, updateNode, onFilterChange]);

  // 更新组合条件
  const updateCompositeFilter = useCallback((id: string, updates: Partial<CompositeFilter>) => {
    const updatedFilter = updateNode(filter, id, (node) => {
      if ('conditions' in node) {
        return {
          ...node,
          ...updates
        };
      }
      return node;
    });
    
    onFilterChange(updatedFilter);
  }, [filter, updateNode, onFilterChange]);

  // 渲染条件节点
  const renderCondition = useCallback((condition: FilterCondition) => {
    const config = FILTER_FIELD_CONFIGS[condition.field];
    const isSelected = selectedNodeId === condition.id;
    const isEditing = editingNodeId === condition.id;

    return (
      <div
        key={condition.id}
        className={`${styles.conditionNode} ${isSelected ? styles.selectedNode : ''}`}
        onClick={() => setSelectedNodeId(condition.id)}
      >
        <div className={styles.nodeHeader}>
          <span className={styles.nodeType}>条件</span>
          <div className={styles.nodeActions}>
            <button
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                setEditingNodeId(isEditing ? undefined : condition.id);
              }}
              aria-label={isEditing ? '取消编辑' : '编辑条件'}
            >
              {isEditing ? '取消' : '编辑'}
            </button>
            <button
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(condition.id);
              }}
              aria-label="删除条件"
            >
              删除
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className={styles.conditionEditor}>
            {/* 字段选择 */}
            <div className={styles.editorRow}>
              <label className={styles.editorLabel}>字段:</label>
              <select
                className={styles.editorSelect}
                value={condition.field}
                onChange={(e) => {
                  updateCondition(condition.id, {
                    field: e.target.value as FilterField
                  });
                }}
              >
                {Object.values(FILTER_FIELD_CONFIGS).map(fieldConfig => (
                  <option key={fieldConfig.field} value={fieldConfig.field}>
                    {fieldConfig.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 操作符选择 */}
            <div className={styles.editorRow}>
              <label className={styles.editorLabel}>操作符:</label>
              <select
                className={styles.editorSelect}
                value={condition.operator}
                onChange={(e) => {
                  updateCondition(condition.id, {
                    operator: e.target.value as FilterOperator
                  });
                }}
              >
                {config.operators.map(operator => (
                  <option key={operator} value={operator}>
                    {operator.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* 值输入 */}
            <div className={styles.editorRow}>
              <label className={styles.editorLabel}>值:</label>
              {config.type === 'select' || config.type === 'multiselect' ? (
                <select
                  className={styles.editorSelect}
                  value={condition.value as string | number | readonly string[] | undefined}
                  onChange={(e) => {
                    updateCondition(condition.id, {
                      value: config.type === 'multiselect' ? [e.target.value] : e.target.value
                    });
                  }}
                  multiple={config.type === 'multiselect'}
                >
                  {config.options?.map(option => (
                    <option 
                      key={option.value?.toString() || Math.random().toString()} 
                      value={option.value as string | number | readonly string[] | undefined}
                    >
                      {option.label}
                    </option>
                  )) || (
                    <option value="">无选项</option>
                  )}
                </select>
              ) : config.type === 'date' ? (
                <input
                  type="date"
                  className={styles.editorInput}
                  value={condition.value as string || ''}
                  onChange={(e) => {
                    updateCondition(condition.id, {
                      value: e.target.value
                    });
                  }}
                />
              ) : config.type === 'number' ? (
                <input
                  type="number"
                  className={styles.editorInput}
                  value={condition.value as number || ''}
                  onChange={(e) => {
                    updateCondition(condition.id, {
                      value: parseFloat(e.target.value) || 0
                    });
                  }}
                  min={config.min}
                  max={config.max}
                />
              ) : (
                <input
                  type="text"
                  className={styles.editorInput}
                  value={condition.value as string || ''}
                  onChange={(e) => {
                    updateCondition(condition.id, {
                      value: e.target.value
                    });
                  }}
                  placeholder={config.placeholder}
                />
              )}
            </div>

            {/* 第二个值（用于between操作符） */}
            {(condition.operator === 'between' || condition.operator === 'not_between') && (
              <div className={styles.editorRow}>
                <label className={styles.editorLabel}>至:</label>
                {config.type === 'date' ? (
                  <input
                    type="date"
                    className={styles.editorInput}
                    value={condition.value2 as string || ''}
                    onChange={(e) => {
                      updateCondition(condition.id, {
                        value2: e.target.value
                      });
                    }}
                  />
                ) : config.type === 'number' ? (
                  <input
                    type="number"
                    className={styles.editorInput}
                    value={condition.value2 as number || ''}
                    onChange={(e) => {
                      updateCondition(condition.id, {
                        value2: parseFloat(e.target.value) || 0
                      });
                    }}
                    min={config.min}
                    max={config.max}
                  />
                ) : (
                  <input
                    type="text"
                    className={styles.editorInput}
                    value={condition.value2 as string || ''}
                    onChange={(e) => {
                      updateCondition(condition.id, {
                        value2: e.target.value
                      });
                    }}
                    placeholder={config.placeholder}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.conditionDisplay}>
            <span className={styles.fieldName}>{config.label}</span>
            <span className={styles.operatorText}>{condition.operator.replace('_', ' ')}</span>
            <span className={styles.fieldValue}>
              {condition.value?.toString() || '未设置'}
              {condition.value2 && (
                <> 至 {condition.value2.toString()}</>
              )}
            </span>
          </div>
        )}
      </div>
    );
  }, [selectedNodeId, editingNodeId, deleteNode, updateCondition]);

  // 渲染筛选器
  const renderFilter = useCallback(() => {
    // 渲染组合节点 - 移到useCallback内部避免依赖变化问题
    const renderCompositeNode = (composite: CompositeFilter, level = 0) => {
      const isSelected = selectedNodeId === composite.id;

      return (
        <div
          key={composite.id}
          className={`${styles.compositeNode} ${isSelected ? styles.selectedNode : ''}`}
          onClick={() => setSelectedNodeId(composite.id)}
        >
          <div className={styles.nodeHeader}>
            <div className={styles.logicOperator}>
              <select
                className={styles.operatorSelect}
                value={composite.operator}
                onChange={(e) => {
                  updateCompositeFilter(composite.id, {
                    operator: e.target.value as LogicOperator
                  });
                }}
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
                <option value="NOT">NOT</option>
              </select>
            </div>
            <div className={styles.nodeActions}>
              <button
                className={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  addCondition(composite.id);
                }}
                aria-label="添加条件"
              >
                添加条件
              </button>
              <button
                className={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  addCompositeFilter(composite.id);
                }}
                aria-label="添加组合条件"
              >
                添加组合
              </button>
              {composite.id !== 'root' && (
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(composite.id);
                  }}
                  aria-label="删除组合条件"
                >
                  删除
                </button>
              )}
            </div>
          </div>

          <div className={styles.conditionsContainer}>
            {composite.conditions.length > 0 ? (
              composite.conditions.map((condition, index) => (
                <div key={condition.id} className={styles.conditionWrapper}>
                  {index > 0 && (
                    <div className={styles.conditionSeparator}>
                      {composite.operator}
                    </div>
                  )}
                  {'conditions' in condition ? (
                    renderCompositeNode(condition as CompositeFilter, level + 1)
                  ) : (
                    renderCondition(condition as FilterCondition)
                  )}
                </div>
              ))
            ) : (
              <div className={styles.emptyConditions}>
                无筛选条件，点击"添加条件"开始构建筛选规则
              </div>
            )}
          </div>
        </div>
      );
    };

    return renderCompositeNode(filter);
  }, [filter, selectedNodeId, renderCondition, updateCompositeFilter, addCondition, addCompositeFilter, deleteNode, setSelectedNodeId]);

  return (
    <div className={styles.filterBuilderContainer} ref={builderRef}>
      <div className={styles.builderHeader}>
        <h3 className={styles.builderTitle}>高级筛选构建器</h3>
        <div className={styles.useFilterToggle}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={useCompositeFilter}
              onChange={(e) => onUseCompositeFilterChange(e.target.checked)}
              className={styles.toggleInput}
            />
            <span className={styles.toggleSlider}></span>
            使用组合筛选
          </label>
        </div>
      </div>

      <div className={styles.builderContent}>
        {renderFilter()}
      </div>

      <div className={styles.builderFooter}>
        <button
          className={`${styles.actionButton} ${styles.primaryButton}`}
          onClick={() => {
            onUseCompositeFilterChange(true);
          }}
          disabled={useCompositeFilter}
        >
          应用筛选
        </button>
        <button
          className={styles.actionButton}
          onClick={() => {
            onUseCompositeFilterChange(false);
          }}
          disabled={!useCompositeFilter}
        >
          取消筛选
        </button>
      </div>
    </div>
  );
};

export default FilterBuilder;
