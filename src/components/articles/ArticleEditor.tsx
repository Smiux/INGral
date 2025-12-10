/**
 * 文章编辑器组件
 * 支持Markdown编辑、LaTeX公式、实时预览和自动保存功能
 * 重构为使用子组件架构，提高代码可维护性和可扩展性
 */
import { ArticleEditorCore } from './ArticleEditor/ArticleEditorCore';

export function ArticleEditor() {
  return (
    <ArticleEditorCore />
  );
}