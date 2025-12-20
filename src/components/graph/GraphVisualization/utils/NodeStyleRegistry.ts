/**
 * 节点样式注册表
 * 用于注册和管理不同类型节点的样式
 */
import type { NodeStyle, NodeTheme } from '../types';

/**
 * 节点样式注册表类
 */
export class NodeStyleRegistry {
  private styles: NodeTheme = {};

  /**
   * 注册一个新的节点类型样式
   * @param type 节点类型
   * @param style 节点样式
   */
  registerStyle (type: string, style: NodeStyle): void {
    this.styles[type] = style;
  }

  /**
   * 更新已注册的节点样式
   * @param type 节点类型
   * @param style 节点样式更新
   */
  updateStyle (type: string, style: Partial<NodeStyle>): void {
    if (this.styles[type]) {
      this.styles[type] = { ...this.styles[type], ...style };
    }
  }

  /**
   * 删除已注册的节点样式
   * @param type 节点类型
   */
  removeStyle (type: string): void {
    delete this.styles[type];
  }

  /**
   * 获取节点类型的样式
   * @param type 节点类型
   * @returns 节点样式或undefined
   */
  getStyle (type: string): NodeStyle | undefined {
    return this.styles[type];
  }

  /**
   * 获取节点类型的样式，如果不存在则返回默认样式
   * @param type 节点类型
   * @param defaultStyle 默认样式
   * @returns 节点样式
   */
  getStyleOrDefault (type: string, defaultStyle: NodeStyle): NodeStyle {
    return this.styles[type] || defaultStyle;
  }

  /**
   * 检查节点类型是否已注册样式
   * @param type 节点类型
   * @returns 是否注册
   */
  hasStyle (type: string): boolean {
    return Boolean(this.styles[type]);
  }

  /**
   * 获取所有注册的节点类型
   * @returns 节点类型数组
   */
  getRegisteredTypes (): string[] {
    return Object.keys(this.styles);
  }

  /**
   * 获取所有样式
   * @returns 样式映射
   */
  getAllStyles (): NodeTheme {
    return { ...this.styles };
  }

  /**
   * 清空所有注册的样式
   */
  clearStyles (): void {
    this.styles = {};
  }

  /**
   * 从样式映射中批量注册样式
   * @param styleMap 样式映射
   */
  registerStylesFromMap (styleMap: NodeTheme): void {
    this.styles = { ...this.styles, ...styleMap };
  }

  /**
   * 获取基础样式（不带选中状态）
   * @param type 节点类型
   * @returns 节点样式或undefined
   */
  getBaseStyle (type: string): NodeStyle | undefined {
    return this.styles[type.replace('-selected', '')];
  }

  /**
   * 获取选中状态样式，如果不存在则自动生成
   * @param type 节点类型
   * @param baseStyle 基础样式
   * @returns 选中状态样式
   */
  getSelectedStyle (type: string, baseStyle: NodeStyle): NodeStyle {
    const selectedStyleKey = `${type}-selected`;
    if (this.styles[selectedStyleKey]) {
      return this.styles[selectedStyleKey];
    }

    // 如果没有专门的选中样式，自动生成
    return {
      ...baseStyle,
      'fill': baseStyle.selectedFill || '#FF6B6B',
      'stroke': baseStyle.selectedStroke || '#FF5252',
      'strokeWidth': baseStyle.selectedStrokeWidth || baseStyle.strokeWidth + 1
    };
  }
}

/**
 * 创建并配置默认的样式注册表
 */
export const createDefaultStyleRegistry = (): NodeStyleRegistry => {
  const registry = new NodeStyleRegistry();

  // 默认样式
  const defaultStyle: NodeStyle = {
    'fill': '#4ECDC4',
    'stroke': '#26A69A',
    'strokeWidth': 2,
    'textFill': '#FFFFFF',
    'fontSize': 12
  };

  // 选中状态默认样式
  const defaultSelectedStyle: NodeStyle = {
    'fill': '#FF6B6B',
    'stroke': '#FF5252',
    'strokeWidth': 3,
    'textFill': '#FFFFFF',
    'fontSize': 12
  };

  // 注册概念节点样式
  registry.registerStyle('concept', {
    ...defaultStyle
  });

  // 注册概念节点选中样式
  registry.registerStyle('concept-selected', {
    ...defaultSelectedStyle
  });

  // 注册文章节点样式
  registry.registerStyle('article', {
    'fill': '#3B82F6',
    'stroke': '#2563EB',
    'strokeWidth': 2,
    'textFill': '#FFFFFF',
    'fontSize': 12
  });

  // 注册文章节点选中样式
  registry.registerStyle('article-selected', {
    'fill': '#FF6B6B',
    'stroke': '#FF5252',
    'strokeWidth': 3,
    'textFill': '#FFFFFF',
    'fontSize': 12
  });

  // 注册资源节点样式
  registry.registerStyle('resource', {
    'fill': '#10B981',
    'stroke': '#059669',
    'strokeWidth': 2,
    'textFill': '#FFFFFF',
    'fontSize': 12
  });

  // 注册资源节点选中样式
  registry.registerStyle('resource-selected', {
    'fill': '#FF6B6B',
    'stroke': '#FF5252',
    'strokeWidth': 3,
    'textFill': '#FFFFFF',
    'fontSize': 12
  });

  // 注册聚合节点样式
  registry.registerStyle('aggregate', {
    'fill': '#F59E0B',
    'stroke': '#D97706',
    'strokeWidth': 2,
    'textFill': '#FFFFFF',
    'fontSize': 12
  });

  // 注册聚合节点选中样式
  registry.registerStyle('aggregate-selected', {
    'fill': '#FF6B6B',
    'stroke': '#FF5252',
    'strokeWidth': 3,
    'textFill': '#FFFFFF',
    'fontSize': 12
  });

  return registry;
};

/**
 * 默认样式注册表实例
 */
export const defaultStyleRegistry = createDefaultStyleRegistry();
