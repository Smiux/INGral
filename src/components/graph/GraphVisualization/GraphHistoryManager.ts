import type { RecentAction } from './types';

export class GraphHistoryManager {
  private _history: RecentAction[];
  private _historyIndex: number;
  private _maxHistoryLength: number = 50;

  constructor() {
    this._history = [];
    this._historyIndex = -1;
  }

  get history(): RecentAction[] {
    return this._history;
  }

  get historyIndex(): number {
    return this._historyIndex;
  }

  get canUndo(): boolean {
    return this._historyIndex > 0;
  }

  get canRedo(): boolean {
    return this._historyIndex < this._history.length - 1;
  }

  updateGraphData(): void {
    // 更新图谱数据
  }

  addHistoryItem(action: RecentAction): void {
    // 如果当前不是在历史记录的最后，清除后面的历史记录
    if (this._historyIndex < this._history.length - 1) {
      this._history = this._history.slice(0, this._historyIndex + 1);
    }

    // 添加新的历史记录项
    this._history.push(action);

    // 限制历史记录长度
    if (this._history.length > this._maxHistoryLength) {
      this._history.shift();
    } else {
      this._historyIndex++;
    }
  }

  handleUndo(): void {
    if (!this.canUndo) return;

    this._historyIndex--;
  }

  handleRedo(): void {
    if (!this.canRedo) return;

    this._historyIndex++;
  }

  clearHistory(): void {
    this._history = [];
    this._historyIndex = -1;
  }

  getCurrentHistoryItem(): RecentAction | undefined {
    return this._history[this._historyIndex];
  }
}