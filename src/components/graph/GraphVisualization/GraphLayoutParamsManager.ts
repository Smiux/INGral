import type { SavedLayout, EnhancedNode, LayoutType, LayoutDirection, EnhancedGraphLink } from './types';

export class GraphLayoutParamsManager {
  private _savedLayouts: SavedLayout[];
  private _onLayoutSave: (layouts: SavedLayout[]) => void;

  constructor(
    initialLayouts: SavedLayout[],
    onLayoutSave: (layouts: SavedLayout[]) => void
  ) {
    this._savedLayouts = initialLayouts;
    this._onLayoutSave = onLayoutSave;
  }

  get savedLayouts(): SavedLayout[] {
    return this._savedLayouts;
  }

  handleLayoutSave(name: string, nodes: EnhancedNode[], _links: EnhancedGraphLink[], layoutType: LayoutType, layoutDirection: LayoutDirection): void {
    // 创建节点位置映射
    const nodePositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        nodePositions[node.id] = { x: node.x, y: node.y };
      }
    });

    const newLayout: SavedLayout = {
      id: `layout-${Date.now()}`,
      name,
      layout: {
        id: `custom-layout-${Date.now()}`,
        name,
        layoutType,
        layoutDirection,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      nodePositions,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this._savedLayouts = [...this._savedLayouts, newLayout];
    this._onLayoutSave(this._savedLayouts);
  }

  handleLayoutApply(): void {
    // 布局应用逻辑将在GraphVisualizationCore中处理
    // 这里只触发回调，实际应用将使用nodePositions更新节点位置
  }

  handleLayoutDelete(layoutId: string): void {
    this._savedLayouts = this._savedLayouts.filter(layout => layout.id !== layoutId);
    this._onLayoutSave(this._savedLayouts);
  }

  getLayoutById(layoutId: string): SavedLayout | undefined {
    return this._savedLayouts.find(layout => layout.id === layoutId);
  }

  updateLayoutName(layoutId: string, newName: string): void {
    this._savedLayouts = this._savedLayouts.map(layout => {
      if (layout.id === layoutId) {
        return {
          ...layout,
          name: newName,
          updatedAt: Date.now(),
          layout: {
            ...layout.layout,
            name: newName,
            updatedAt: Date.now()
          }
        };
      }
      return layout;
    });
    this._onLayoutSave(this._savedLayouts);
  }
}
