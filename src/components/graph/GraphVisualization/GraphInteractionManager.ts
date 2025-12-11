/**
 * 图谱可视化交互管理类，处理交互相关的逻辑
 */
export class GraphInteractionManager {
  private static instance: GraphInteractionManager;
  
  // 交互状态
  private isBoxSelecting: boolean = false;
  private boxSelection: { x1: number; y1: number; x2: number; y2: number } = { x1: 0, y1: 0, x2: 0, y2: 0 };

  private constructor() {
    // 初始化交互状态
  }

  /**
   * 获取单例实例
   * @returns 交互管理实例
   */
  static getInstance(): GraphInteractionManager {
    if (!GraphInteractionManager.instance) {
      GraphInteractionManager.instance = new GraphInteractionManager();
    }
    return GraphInteractionManager.instance;
  }

  // 状态访问器
  getIsBoxSelecting(): boolean { return this.isBoxSelecting; }
  getBoxSelection(): { x1: number; y1: number; x2: number; y2: number } { return this.boxSelection; }

  // 状态更新方法
  setIsBoxSelecting(isSelecting: boolean): void {
    this.isBoxSelecting = isSelecting;
  }

  setBoxSelection(selection: { x1: number; y1: number; x2: number; y2: number }): void {
    this.boxSelection = selection;
  }

  /**
   * 处理节点拖拽开始事件
   */
  handleNodeDragStart = () => {
    // 拖拽开始时的处理逻辑
  };

  /**
   * 处理节点拖拽结束事件
   */
  handleNodeDragEnd = () => {
    // 拖拽结束时的处理逻辑
  };

  /**
   * 处理开始框选事件
   */
  handleStartBoxSelection = (x: number, y: number): void => {
    this.isBoxSelecting = true;
    this.boxSelection = { x1: x, y1: y, x2: x, y2: y };
  };

  /**
   * 处理更新框选区域事件
   */
  handleUpdateBoxSelection = (x: number, y: number): void => {
    this.boxSelection = { ...this.boxSelection, x2: x, y2: y };
  };

  /**
   * 处理结束框选事件
   */
  handleEndBoxSelection = (): void => {
    this.isBoxSelecting = false;
    this.boxSelection = { x1: 0, y1: 0, x2: 0, y2: 0 };
  };
}
