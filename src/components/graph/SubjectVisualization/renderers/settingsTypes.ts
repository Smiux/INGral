export type DagMode = 'td' | 'bu' | 'lr' | 'rl' | 'radialout' | 'radialin' | null;

export interface ForceGraphSettings {
  dagMode: DagMode;
  dagLevelDistance: number;
  d3AlphaDecay: number;
  d3VelocityDecay: number;
  cooldownTime: number;
  linkWidth: number;
  linkOpacity: number;
  nodeRelSize: number;
  nodeOpacity: number;
}

export interface CosmosGLSettings {
  simulationPaused: boolean;
  simulationFriction: number;
  simulationGravity: number;
  simulationRepulsion: number;
  curvedLinks: boolean;
  linkDefaultArrows: boolean;
  pointSizeScale: number;
  linkWidthScale: number;
  pointOpacity: number;
  linkOpacity: number;
}

export interface DeckGLSettings {
  baseRadius: number;
  radiusStep: number;
  nodeSize: number;
  nodeOpacity: number;
  linkWidth: number;
  linkOpacity: number;
  nodeStrokeWidth: number;
}

export const DEFAULT_FORCE_GRAPH_SETTINGS: ForceGraphSettings = {
  'dagMode': 'radialout',
  'dagLevelDistance': 300,
  'd3AlphaDecay': 0.02,
  'd3VelocityDecay': 0.3,
  'cooldownTime': 15000,
  'linkWidth': 1.5,
  'linkOpacity': 0.6,
  'nodeRelSize': 4,
  'nodeOpacity': 0.9
};

export const DEFAULT_COSMOS_GL_SETTINGS: CosmosGLSettings = {
  'simulationPaused': true,
  'simulationFriction': 0.2,
  'simulationGravity': 0.1,
  'simulationRepulsion': 0.8,
  'curvedLinks': false,
  'linkDefaultArrows': true,
  'pointSizeScale': 1,
  'linkWidthScale': 1,
  'pointOpacity': 1,
  'linkOpacity': 1
};

export const DEFAULT_DECK_GL_SETTINGS: DeckGLSettings = {
  'baseRadius': 500,
  'radiusStep': 400,
  'nodeSize': 5,
  'nodeOpacity': 0.9,
  'linkWidth': 1.5,
  'linkOpacity': 0.6,
  'nodeStrokeWidth': 1
};

export const DAG_MODE_OPTIONS: { value: DagMode; label: string; description: string }[] = [
  { 'value': null, 'label': '无', 'description': '自由力导向布局' },
  { 'value': 'td', 'label': '自上而下', 'description': '根节点在顶部' },
  { 'value': 'bu', 'label': '自下而上', 'description': '根节点在底部' },
  { 'value': 'lr', 'label': '从左到右', 'description': '根节点在左侧' },
  { 'value': 'rl', 'label': '从右到左', 'description': '根节点在右侧' },
  { 'value': 'radialout', 'label': '辐射向外', 'description': '根节点在中心，子节点向外辐射' },
  { 'value': 'radialin', 'label': '辐射向内', 'description': '根节点在外围，子节点向中心收敛' }
];
