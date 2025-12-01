/**
 * Canvas钩子定义
 * 提供画布相关的钩子函数
 */

// 从canvasUtils导入useCanvas钩子
import { useCanvas as useCanvasFromUtils } from './canvasUtils';

// 重新导出useCanvas钩子
export const useCanvas = useCanvasFromUtils;
