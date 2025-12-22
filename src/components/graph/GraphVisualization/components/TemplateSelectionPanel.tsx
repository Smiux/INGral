// 模板选择面板组件

import React, { useState, useCallback } from 'react';
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { GraphTemplate } from '../types/TemplateTypes';
import { TEMPLATE_CATEGORIES, PRESET_TEMPLATES } from '../templates/PresetTemplates';
import styles from './TemplateSelectionPanel.module.css';

interface TemplateSelectionPanelProps {
  onSelectTemplate: (_template: GraphTemplate) => void;
  onClose: () => void;
}

const TemplateCard: React.FC<{
  template: GraphTemplate;
  onClick: () => void;
}> = ({ template, onClick }) => {
  return (
    <div
      className={`${styles.templateCard} ${styles[template.category]}`}
      onClick={onClick}
    >
      <div className={styles.templateIcon}>
        {/* 使用模板图标 */}
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20">
          {/* 这里可以根据template.icon渲染对应的Lucide图标 */}
          <span className="text-xl">📊</span>
        </div>
      </div>
      <div className={styles.templateInfo}>
        <h3 className={styles.templateName}>{template.name}</h3>
        <p className={styles.templateDescription}>{template.description}</p>
        <div className={`${styles.templateBadge} ${template.isDefault ? styles.defaultBadge : ''}`}>
          {/* 使用条件判断替代嵌套三元表达式 */}
          {(() => {
            if (template.isDefault) {
              return '默认';
            }
            if (template.isCustom) {
              return '自定义';
            }
            return '';
          })()}
        </div>
      </div>
      <div className={styles.templatePreview}>
        {/* 简单的模板预览 */}
        <div className={styles.previewNodes}>
          {/* 显示模板中的节点数量 */}
          <div className={styles.previewNode}></div>
          {template.nodes.length > 1 && <div className={styles.previewNode}></div>}
          {template.nodes.length > 2 && <div className={styles.previewNode}></div>}
          {template.nodes.length > 3 && <div className={styles.previewMore}>+{template.nodes.length - 3}</div>}
        </div>
      </div>
    </div>
  );
};

export const TemplateSelectionPanel: React.FC<TemplateSelectionPanelProps> = ({ onSelectTemplate, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('flowchart');
  const [currentPage, setCurrentPage] = useState(0);
  const [templatesPerPage] = useState(6);

  // 获取所有模板（目前只有预设模板）
  const getAllTemplates = useCallback(() => {
    return PRESET_TEMPLATES;
  }, []);

  // 过滤当前分类的模板
  const filteredTemplates = getAllTemplates().filter(template => template.category === selectedCategory);

  // 分页处理
  const totalPages = Math.ceil(filteredTemplates.length / templatesPerPage);
  const currentTemplates = filteredTemplates.slice(
    currentPage * templatesPerPage,
    (currentPage + 1) * templatesPerPage
  );

  // 处理模板选择
  const handleTemplateSelect = useCallback((template: GraphTemplate) => {
    onSelectTemplate(template);
    onClose();
  }, [onSelectTemplate, onClose]);

  // 处理分类切换
  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(0);
  }, []);

  // 处理分页
  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  return (
    <div className={styles.templatePanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>选择图谱模板</h2>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="关闭模板选择面板"
        >
          ✕
        </button>
      </div>

      <div className={styles.categoryTabs}>
        {TEMPLATE_CATEGORIES.map(category => (
          <button
            key={category.id}
            className={`${styles.categoryTab} ${selectedCategory === category.id ? styles.activeTab : ''}`}
            onClick={() => handleCategoryChange(category.id)}
          >
            <span className={styles.categoryIcon}>📋</span>
            <span className={styles.categoryName}>{category.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.templatesGrid}>
        {currentTemplates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => handleTemplateSelect(template)}
          />
        ))}
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationButton}
            onClick={handlePrevPage}
            disabled={currentPage === 0}
          >
            <ChevronLeft size={16} />
            上一页
          </button>
          <span className={styles.pageInfo}>
            {currentPage + 1} / {totalPages}
          </span>
          <button
            className={styles.paginationButton}
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
          >
            下一页
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* 添加自定义模板按钮 */}
      <div className={styles.addTemplateContainer}>
        <button className={styles.addTemplateButton}>
          <PlusCircle size={20} />
          <span>创建自定义模板</span>
        </button>
      </div>
    </div>
  );
};
