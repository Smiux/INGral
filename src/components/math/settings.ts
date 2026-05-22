export interface CosmosGLSettings {
  simulationPaused: boolean;
  simulationFriction: number;
  simulationGravity: number;
  simulationRepulsion: number;
  pointSizeScale: number;
  linkWidthScale: number;
  pointOpacity: number;
  linkOpacity: number;
}

export const DEFAULT_COSMOS_GL_SETTINGS: CosmosGLSettings = {
  'simulationPaused': true,
  'simulationFriction': 0.7,
  'simulationGravity': 0.3,
  'simulationRepulsion': 0.5,
  'pointSizeScale': 1.0,
  'linkWidthScale': 0.5,
  'pointOpacity': 0.9,
  'linkOpacity': 0.2
};
