/**
 * Canvas钩子和组件的重新导出文件
 * 提供画布相关的钩子和组件，确保向后兼容性
 */

/**
 * 柱状图数据项类型
 * 支持数字或包含value属性的对象
 */
export type BarChartDataItem = number | { value: number };

/**
 * 图表数据集接口
 * 定义图表数据的结构和样式属性
 */
export interface ChartDataset {
  /** 图表数据，可以是数字数组、坐标点数组或带标签的值数组 */
  data: number[] | { x: number; y: number }[] | { value: number; label: string }[];
  /** 背景颜色，可以是单个颜色或颜色数组 */
  backgroundColor?: string | string[];
  /** 边框颜色，可以是单个颜色或颜色数组 */
  borderColor?: string | string[];
  /** 边框宽度 */
  borderWidth?: number;
  /** 边框圆角 */
  borderRadius?: number;
  /** 数据集标签 */
  label?: string;
  /** 是否填充区域 */
  fill?: boolean;
  /** 曲线张力，用于折线图 */
  tension?: number;
}

/**
 * 饼图数据项接口
 * 定义饼图中单个扇形的数据结构
 */
export interface PieDataItem {
  /** 数据项名称 */
  name: string;
  /** 数据项值 */
  value: number;
  /** 百分比，可选 */
  percentage?: number;
  /** 颜色，可选 */
  color?: string;
  /** 标签，可选 */
  label?: string;
}

// 从canvasUtils导入useCanvas钩子
import { useCanvas as useCanvasFromUtils } from './canvasUtils';

// 从components导入Canvas组件
import { Canvas } from '../components/Canvas';

// 重新导出useCanvas钩子
export const useCanvas = useCanvasFromUtils;

// 重新导出Canvas组件
export { Canvas };

// 注意：为了符合ESLint的react-refresh/only-export-components规则，移除默认导出
// 请使用命名导出：import { useCanvas, Canvas } from './useCanvas'