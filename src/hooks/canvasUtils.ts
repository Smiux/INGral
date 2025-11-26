/**
 * Canvas工具函数和钩子
 * 提供Canvas绘制相关的类型定义和钩子函数
 */
import { useRef, useCallback } from 'react';

/**
 * 饼图数据项类型
 */
export interface PieDataItem {
  /** 数据项名称 */
  name: string;
  /** 数据项值 */
  value: number;
  /** 数据项颜色（可选） */
  color?: string;
}

/**
 * 图表类型定义
 */
export type ChartType = 'bar' | 'line' | 'pie';

/**
 * Canvas绘制选项类型
 */
export interface UseCanvasOptions {
  /** 图表类型 */
  type: ChartType;
  /** 图表高度（可选） */
  height?: number;
  /** 图表宽度（可选） */
  width?: number;
  /** 是否水平绘制（仅条形图） */
  horizontal?: boolean;
  /** 其他配置选项 */
  [key: string]: unknown;
}

/**
 * 数据集项类型
 */
export interface DataSetItem {
  /** 数据值 */
  value: number;
  /** 数据颜色（可选） */
  color?: string;
  /** 数据标签（可选） */
  label?: string;
}

/**
 * Canvas绘制hook，支持不同类型的图表渲染
 * @param data 图表数据
 * @param options 配置选项
 * @returns canvas引用和绘制函数
 */
export const useCanvas = <T>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _data: T,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: UseCanvasOptions
): {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  drawChart: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
} => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * 绘制图表的函数
   * @param _ctx Canvas 2D上下文
   * @param _canvas Canvas元素
   */
  const drawChart = useCallback((
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ctx: CanvasRenderingContext2D,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _canvas: HTMLCanvasElement
  ) => {
    // 绘制逻辑将从useCanvas.tsx中移动过来
    // 暂时保留空实现
  }, []);

  return {
    canvasRef,
    drawChart
  };
};
