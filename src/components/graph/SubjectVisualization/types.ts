export interface SubjectNode {
  id: string;
  level: string;
  parentId?: string;
  color: string;
  val: number;
  title: string;
  x?: number;
  y?: number;
  z?: number;
  originalData: Record<string, unknown>;
}

export interface SubjectLink {
  source: string;
  target: string;
  color: string;
}

export interface GraphData {
  nodes: SubjectNode[];
  links: SubjectLink[];
}

export interface SubjectInfo {
  key: string;
  name: string;
  rootName: string;
}

export interface SelectedNode {
  code: string;
  title: string;
  level: string;
  parentId?: string;
  extraInfo?: Record<string, unknown>;
}

export interface NodeExtraInfo {
  related?: string[];
  inFacet?: string[];
  usedByDiscipline?: string[];
  scopeNote?: string;
  [key: string]: unknown;
}

export interface TooltipField {
  key: string;
  label: string;
  type: 'text' | 'code' | 'list';
}

export interface PanelField {
  key: string;
  label: string;
  type: 'text' | 'code' | 'list' | 'badge';
  icon?: string;
}

export interface SubjectUIConfig {
  tooltipFields: TooltipField[];
  panelFields: PanelField[];
  levelLabels: Record<string, string>;
}

export interface DataTransformer {
  transformData: () => GraphData;
  getSubjectInfo: () => SubjectInfo;
  getUIConfig: () => SubjectUIConfig;
  getNodeExtraInfo?: (node: SubjectNode) => NodeExtraInfo | null;
  getIdName?: (id: string) => string;
  loadData?: () => Promise<void>;
}
