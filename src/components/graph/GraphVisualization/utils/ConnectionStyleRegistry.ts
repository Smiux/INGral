/**
 * 连接样式注册表
 * 用于注册和管理不同类型连接的样式
 */

import type { ConnectionStyle, ConnectionTheme } from '../types';

/**
 * 连接样式注册表类
 */
export class ConnectionStyleRegistry {
  private styles: ConnectionTheme = {};

  /**
   * 注册一个新的连接类型样式
   * @param type 连接类型
   * @param style 连接样式
   */
  registerStyle (type: string, style: ConnectionStyle): void {
    this.styles[type] = style;
  }

  /**
   * 更新已注册的连接样式
   * @param type 连接类型
   * @param style 连接样式更新
   */
  updateStyle (type: string, style: Partial<ConnectionStyle>): void {
    if (this.styles[type]) {
      this.styles[type] = { ...this.styles[type], ...style };
    }
  }

  /**
   * 删除已注册的连接样式
   * @param type 连接类型
   */
  removeStyle (type: string): void {
    delete this.styles[type];
  }

  /**
   * 获取连接类型的样式
   * @param type 连接类型
   * @returns 连接样式或undefined
   */
  getStyle (type: string): ConnectionStyle | undefined {
    return this.styles[type];
  }

  /**
   * 获取连接类型的样式，如果不存在则返回默认样式
   * @param type 连接类型
   * @param defaultStyle 默认样式
   * @returns 连接样式
   */
  getStyleOrDefault (type: string, defaultStyle: ConnectionStyle): ConnectionStyle {
    const style = this.styles[type] || {};
    return { ...defaultStyle, ...style };
  }

  /**
   * 检查连接类型是否已注册样式
   * @param type 连接类型
   * @returns 是否注册
   */
  hasStyle (type: string): boolean {
    return Boolean(this.styles[type]);
  }

  /**
   * 获取所有注册的连接类型
   * @returns 连接类型数组
   */
  getRegisteredTypes (): string[] {
    return Object.keys(this.styles);
  }

  /**
   * 获取所有样式
   * @returns 样式映射
   */
  getAllStyles (): ConnectionTheme {
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
  registerStylesFromMap (styleMap: ConnectionTheme): void {
    this.styles = { ...this.styles, ...styleMap };
  }

  /**
   * 合并样式，将多个样式合并为一个
   * @param styleNames 样式名称数组
   * @param defaultStyle 默认样式
   * @returns 合并后的样式
   */
  mergeStyles (styleNames: string[], defaultStyle: ConnectionStyle): ConnectionStyle {
    const mergedStyle = { ...defaultStyle };

    for (const styleName of styleNames) {
      const style = this.styles[styleName];
      if (style) {
        Object.assign(mergedStyle, style);
      }
    }

    return mergedStyle;
  }
}

/**
 * 创建并配置默认的连接样式注册表
 */
export const createDefaultConnectionStyleRegistry = (): ConnectionStyleRegistry => {
  const registry = new ConnectionStyleRegistry();

  // 默认样式
  const defaultStyle: ConnectionStyle = {
    'stroke': '#999999',
    'strokeWidth': 1.5,
    'strokeDasharray': 'none',
    'arrowCount': 1
  };

  // 注册默认连接样式
  registry.registerStyle('default', defaultStyle);

  // 注册关系连接样式
  registry.registerStyle('related', {
    'stroke': '#3B82F6',
    'strokeWidth': 2
  });

  // 注册因果连接样式
  registry.registerStyle('causal', {
    'stroke': '#EF4444',
    'strokeWidth': 2
  });

  // 注册继承连接样式
  registry.registerStyle('inheritance', {
    'stroke': '#10B981',
    'strokeWidth': 2
  });

  // 注册包含连接样式
  registry.registerStyle('containment', {
    'stroke': '#F59E0B',
    'strokeWidth': 2
  });

  // 注册引用连接样式
  registry.registerStyle('reference', {
    'stroke': '#8B5CF6',
    'strokeWidth': 2,
    'strokeDasharray': '5,5'
  });

  // 注册动态连接样式（带有动画）
  registry.registerStyle('dynamic', {
    'stroke': '#EC4899',
    'strokeWidth': 2,
    'animation': 'flow 2s linear infinite'
  });

  return registry;
};

/**
 * 默认连接样式注册表实例
 */
export const defaultConnectionStyleRegistry = createDefaultConnectionStyleRegistry();
