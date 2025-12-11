import type { GraphTheme, NodeStyle, LinkStyle } from './ThemeTypes';

export class GraphThemeManager {
  private _currentTheme: GraphTheme;
  private _copiedStyle: { type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null;
  private _onThemeChange: (theme: GraphTheme) => void;
  private _onStyleUpdate: () => void;

  constructor(
    initialTheme: GraphTheme,
    onThemeChange: (theme: GraphTheme) => void,
    onStyleUpdate: () => void
  ) {
    this._currentTheme = initialTheme;
    this._copiedStyle = null;
    this._onThemeChange = onThemeChange;
    this._onStyleUpdate = onStyleUpdate;
  }

  get currentTheme(): GraphTheme {
    return this._currentTheme;
  }

  get copiedStyle(): { type: 'node' | 'link'; style: NodeStyle | LinkStyle } | null {
    return this._copiedStyle;
  }

  handleThemeChange(theme: GraphTheme): void {
    this._currentTheme = theme;
    this._onThemeChange(theme);
  }

  handleStyleCopy(type: 'node' | 'link', style: NodeStyle | LinkStyle): void {
    this._copiedStyle = { type, style };
  }

  handleStylePaste(): void {
    // 样式粘贴逻辑将在GraphVisualizationCore中处理
    this._onStyleUpdate();
  }
}
