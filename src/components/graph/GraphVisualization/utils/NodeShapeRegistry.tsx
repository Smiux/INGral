/**
 * 节点形状注册表
 * 用于注册和管理不同的节点形状
 */
import type { ShapeConfig, ShapeConfigMap } from '../types';

/**
 * 节点形状注册表类
 */
export class NodeShapeRegistry {
  private shapes: ShapeConfigMap = {};

  /**
   * 注册一个新的节点形状
   * @param name 形状名称
   * @param config 形状配置
   */
  registerShape (name: string, config: ShapeConfig): void {
    this.shapes[name] = config;
  }

  /**
   * 更新已注册的节点形状
   * @param name 形状名称
   * @param config 形状配置
   */
  updateShape (name: string, config: Partial<ShapeConfig>): void {
    if (this.shapes[name]) {
      this.shapes[name] = { ...this.shapes[name], ...config };
    }
  }

  /**
   * 删除已注册的节点形状
   * @param name 形状名称
   */
  removeShape (name: string): void {
    delete this.shapes[name];
  }

  /**
   * 获取形状配置
   * @param name 形状名称
   * @returns 形状配置或undefined
   */
  getShape (name: string): ShapeConfig | undefined {
    return this.shapes[name];
  }

  /**
   * 获取形状配置，如果不存在则返回默认配置
   * @param name 形状名称
   * @param defaultConfig 默认形状配置
   * @returns 形状配置
   */
  getShapeOrDefault (name: string, defaultConfig: ShapeConfig): ShapeConfig {
    return this.shapes[name] || defaultConfig;
  }

  /**
   * 检查形状是否已注册
   * @param name 形状名称
   * @returns 是否注册
   */
  hasShape (name: string): boolean {
    return Boolean(this.shapes[name]);
  }

  /**
   * 获取所有注册的形状名称
   * @returns 形状名称数组
   */
  getRegisteredShapes (): string[] {
    return Object.keys(this.shapes);
  }

  /**
   * 获取所有注册的形状配置
   * @returns 形状配置映射
   */
  getAllShapes (): ShapeConfigMap {
    return { ...this.shapes };
  }

  /**
   * 清空所有注册的形状
   */
  clearShapes (): void {
    this.shapes = {};
  }

  /**
   * 从配置映射中批量注册形状
   * @param shapeMap 形状配置映射
   */
  registerShapesFromMap (shapeMap: ShapeConfigMap): void {
    this.shapes = { ...this.shapes, ...shapeMap };
  }
}

/**
 * 创建并配置默认的形状注册表
 */
export const createDefaultShapeRegistry = (): NodeShapeRegistry => {
  const registry = new NodeShapeRegistry();

  // 注册圆形
  registry.registerShape('circle', {
    'render': ({ style, radius }) => (
      <circle
        r={radius}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        className="transition-all duration-200"
      />
    )
  });

  // 注册椭圆形（使用圆形实现）
  registry.registerShape('ellipse', {
    'render': ({ style, radius }) => (
      <ellipse
        rx={radius}
        ry={radius * 0.8}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        className="transition-all duration-200"
      />
    )
  });

  // 注册矩形
  registry.registerShape('rect', {
    'render': ({ style, radius }) => (
      <rect
        width={radius * 2.5}
        height={radius * 1.5}
        x={-radius * 1.25}
        y={-radius * 0.75}
        rx={5}
        ry={5}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        className="transition-all duration-200"
      />
    )
  });

  // 注册矩形别名
  registry.registerShape('rectangle', {
    'render': ({ style, radius }) => (
      <rect
        width={radius * 2.5}
        height={radius * 1.5}
        x={-radius * 1.25}
        y={-radius * 0.75}
        rx={5}
        ry={5}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        className="transition-all duration-200"
      />
    )
  });

  // 注册三角形
  registry.registerShape('triangle', {
    'render': ({ style, radius }) => (
      <path
        d={`M 0 ${-radius} L ${radius} ${radius} L ${-radius} ${radius} Z`}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        className="transition-all duration-200"
      />
    )
  });

  // 注册菱形
  registry.registerShape('diamond', {
    'render': ({ style, radius }) => (
      <path
        d={`M 0 ${-radius} L ${radius} 0 L 0 ${radius} L ${-radius} 0 Z`}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        className="transition-all duration-200"
      />
    )
  });

  // 注册六边形
  registry.registerShape('hexagon', {
    'render': ({ style, radius }) => (
      <path
        d={`M 0 ${-radius} L ${radius * 0.866} ${-radius * 0.5} L ${radius * 0.866} ${radius * 0.5} L 0 ${radius} L ${-radius * 0.866} ${radius * 0.5} L ${-radius * 0.866} ${-radius * 0.5} Z`}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        className="transition-all duration-200"
      />
    )
  });

  return registry;
};

/**
 * 默认形状注册表实例
 */
export const defaultShapeRegistry = createDefaultShapeRegistry();
