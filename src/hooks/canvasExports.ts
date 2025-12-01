/**
 * Canvas相关内容的统一导出文件
 * 提供画布组件、钩子和类型的统一导出，方便外部使用
 */

// 导出Canvas组件
import { Canvas } from '../components/canvas/Canvas';

// 导出useCanvas钩子
import { useCanvas } from './useCanvasHook';

// 导出Canvas相关类型
import type { BarChartDataItem, ChartDataset, PieDataItem } from './canvasTypes';

// 统一导出所有Canvas相关内容
export { Canvas, useCanvas };
export type { BarChartDataItem, ChartDataset, PieDataItem };
