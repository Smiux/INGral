/**
 * 节点形状注册表
 * 用于管理和渲染不同类型的节点形状
 */
import type { ShapeConfig } from '../types';
import { Position } from 'reactflow';

/**
 * 节点形状注册表类
 */
export class NodeShapeRegistry {
  private shapeConfigs: Record<string, ShapeConfig> = {};

  /**
   * 注册一个新的节点形状配置
   * @param shape 形状名称
   * @param config 形状配置
   */
  registerShape (shape: string, config: ShapeConfig): void {
    this.shapeConfigs[shape] = config;
  }

  /**
   * 获取节点形状配置
   * @param shape 形状名称
   * @returns 形状配置或undefined
   */
  getShapeConfig (shape: string): ShapeConfig | undefined {
    return this.shapeConfigs[shape];
  }

  /**
   * 获取节点形状配置，如果不存在则返回默认配置
   * @param shape 形状名称
   * @param defaultConfig 默认配置
   * @returns 形状配置
   */
  getShapeConfigOrDefault (shape: string, defaultConfig: ShapeConfig): ShapeConfig {
    return this.shapeConfigs[shape] || defaultConfig;
  }

  /**
   * 检查节点形状是否已注册
   * @param shape 形状名称
   * @returns 是否注册
   */
  hasShape (shape: string): boolean {
    return Boolean(this.shapeConfigs[shape]);
  }

  /**
   * 获取所有注册的节点形状
   * @returns 形状名称数组
   */
  getRegisteredShapes (): string[] {
    return Object.keys(this.shapeConfigs);
  }

  /**
   * 清空所有注册的形状配置
   */
  clearShapes (): void {
    this.shapeConfigs = {};
  }
}

// 生成圆形连接点位置
const generateCircleHandles = ({ radius, count }: { radius: number; count: number }): Position[] => {
  const handles: Position[] = [];
  const angleIncrement = (2 * Math.PI) / count;

  for (let i = 0; i < count; i += 1) {
    const angle = i * angleIncrement;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    // 根据坐标确定位置
    let position: Position;
    if (Math.abs(x) > Math.abs(y)) {
      position = x > 0 ? Position.Right : Position.Left;
    } else {
      position = y > 0 ? Position.Bottom : Position.Top;
    }

    handles.push(position);
  }

  return handles;
};

// 生成椭圆连接点位置
const generateEllipseHandles = ({ radius, count }: { radius: number; count: number }): Position[] => {
  // 椭圆连接点位置计算，与圆形类似
  return generateCircleHandles({ radius, count });
};

// 生成菱形连接点位置
const generateDiamondHandles = ({ radius, count }: { radius: number; count: number }): Position[] => {
  // 菱形连接点位置，固定为上下左右
  const baseHandles: Position[] = [Position.Top, Position.Right, Position.Bottom, Position.Left];
  if (count <= 4) {
    return baseHandles.slice(0, count);
  }
  // 如果需要更多连接点，使用圆形分布
  return generateCircleHandles({ radius, count });
};

// 生成多边形连接点位置
const generatePolygonHandles = ({ radius, count }: { radius: number; count: number }): Position[] => {
  // 多边形连接点位置，使用圆形分布
  return generateCircleHandles({ radius, count });
};

// 创建默认形状注册表
const createDefaultShapeRegistry = (): NodeShapeRegistry => {
  const registry = new NodeShapeRegistry();

  // 注册矩形形状
  registry.registerShape('rect', {
    'render': ({ style, contentWidth = 100, contentHeight = 50 }) => (
      <rect
        width={contentWidth}
        height={contentHeight}
        rx={style.borderRadius || 6}
        ry={style.borderRadius || 6}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth || 2}
        strokeDasharray={style.strokeDasharray as string || undefined}
      />
    ),
    'generateHandlePositions': ({ radius, count }) => {
      const handles: Position[] = [];
      const angleIncrement = (2 * Math.PI) / count;

      for (let i = 0; i < count; i += 1) {
        const angle = i * angleIncrement;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        let position: Position;
        if (Math.abs(x) > Math.abs(y)) {
          position = x > 0 ? Position.Right : Position.Left;
        } else {
          position = y > 0 ? Position.Bottom : Position.Top;
        }

        handles.push(position);
      }

      return handles;
    }
  });

  // 注册圆形形状
  registry.registerShape('circle', {
    'render': ({ style, contentWidth = 100, contentHeight = 100 }) => {
      const size = Math.max(contentWidth, contentHeight);
      return (
        <circle
          r={size / 2}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth || 2}
          strokeDasharray={style.strokeDasharray as string || undefined}
        />
      );
    },
    'generateHandlePositions': ({ radius, count }) => generateCircleHandles({ radius, count })
  });

  // 注册椭圆形状
  registry.registerShape('ellipse', {
    'render': ({ style, contentWidth = 100, contentHeight = 50 }) => (
      <ellipse
        rx={contentWidth / 2}
        ry={contentHeight / 2}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth || 2}
        strokeDasharray={style.strokeDasharray as string || undefined}
      />
    ),
    'generateHandlePositions': ({ radius, count }) => generateEllipseHandles({ radius, count })
  });

  // 注册三角形形状
  registry.registerShape('triangle', {
    'render': ({ style, contentWidth = 100, contentHeight = 100 }) => {
      const size = Math.max(contentWidth, contentHeight);
      const height = size * Math.sqrt(3) / 2;
      return (
        <path
          d={`M 0 ${-height / 2} L ${size / 2} ${height / 2} L ${-size / 2} ${height / 2} Z`}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth || 2}
          strokeDasharray={style.strokeDasharray as string || undefined}
        />
      );
    },
    'generateHandlePositions': ({ radius, count }) => generateCircleHandles({ radius, count })
  });

  // 注册菱形形状
  registry.registerShape('diamond', {
    'render': ({ style, contentWidth = 100, contentHeight = 100 }) => {
      const width = contentWidth / 2;
      const height = contentHeight / 2;
      return (
        <path
          d={`M 0 ${-height} L ${width} 0 L 0 ${height} L ${-width} 0 Z`}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth || 2}
          strokeDasharray={style.strokeDasharray as string || undefined}
        />
      );
    },
    'generateHandlePositions': ({ radius, count }) => generateDiamondHandles({ radius, count })
  });

  // 注册六边形形状
  registry.registerShape('hexagon', {
    'render': ({ style, contentWidth = 100, contentHeight = 100 }) => {
      const size = Math.max(contentWidth, contentHeight);
      const radius = size / 2;
      return (
        <path
          d={`M ${radius} 0 
            L ${radius / 2} ${radius * Math.sqrt(3) / 2} 
            L ${-radius / 2} ${radius * Math.sqrt(3) / 2} 
            L ${-radius} 0 
            L ${-radius / 2} ${-radius * Math.sqrt(3) / 2} 
            L ${radius / 2} ${-radius * Math.sqrt(3) / 2} Z`}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth || 2}
          strokeDasharray={style.strokeDasharray as string || undefined}
        />
      );
    },
    'generateHandlePositions': ({ radius, count }) => generatePolygonHandles({ radius, count })
  });

  // 注册五边形形状
  registry.registerShape('pentagon', {
    'render': ({ style, contentWidth = 100, contentHeight = 100 }) => {
      const size = Math.max(contentWidth, contentHeight);
      const radius = size / 2;
      const angleIncrement = (2 * Math.PI) / 5;
      let path = 'M';
      for (let i = 0; i < 5; i += 1) {
        const angle = i * angleIncrement - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        path += ` ${x} ${y}`;
      }
      path += ' Z';
      return (
        <path
          d={path}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth || 2}
          strokeDasharray={style.strokeDasharray as string || undefined}
        />
      );
    },
    'generateHandlePositions': ({ radius, count }) => generatePolygonHandles({ radius, count })
  });

  return registry;
};

/**
 * 默认形状注册表实例
 */
export const defaultShapeRegistry = createDefaultShapeRegistry();
