/**
 * 力导向布局Web Worker
 * 将计算密集型的力导向布局计算从主线程分离，提高UI响应性
 */

// 引入D3.js的力导向布局相关功能
import * as d3 from 'd3';

// 定义节点和链接类型
type GraphNode = {
  id: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  type?: string;
  connections?: number;
};

type GraphLink = {
  id: string;
  source: string | { id: string };
  target: string | { id: string };
  type?: string;
  label?: string;
  weight?: number;
};

// 定义消息类型
type WorkerMessage = {
  type: 'init' | 'update' | 'start' | 'stop' | 'restart';
  payload?: {
    nodes: GraphNode[];
    links: GraphLink[];
    width: number;
    height: number;
    forceParameters?: {
      charge?: number;
      linkStrength?: number;
      linkDistance?: number;
      gravity?: number;
    };
    isLargeGraph?: boolean;
    isVeryLargeGraph?: boolean;
    alpha?: number;
  };
};

// 定义响应类型
type WorkerResponse = {
  type: 'tick' | 'end';
  payload?: {
    nodes: Array<{ id: string; x: number; y: number }>;
    links: GraphLink[];
    alpha: number;
  };
};

// 模拟实例
let simulation: d3.Simulation<GraphNode, GraphLink> | null = null;

// 处理初始化消息
function handleInitMessage(message: WorkerMessage) {
  if (!message.payload) return;
  
  const { nodes, links, width, height, forceParameters, isLargeGraph = false, isVeryLargeGraph = false } = message.payload;
  
  // 使用力导向参数或默认值，根据图大小动态调整
  const charge = forceParameters?.charge ?? (isVeryLargeGraph ? -150 : isLargeGraph ? -200 : -300);
  const linkStrength = forceParameters?.linkStrength ?? (isVeryLargeGraph ? 0.02 : isLargeGraph ? 0.05 : 0.1);
  const linkDistance = forceParameters?.linkDistance ?? (isVeryLargeGraph ? 80 : isLargeGraph ? 100 : 150);
  const gravity = forceParameters?.gravity ?? (isVeryLargeGraph ? 0.05 : isLargeGraph ? 0.08 : 0.1);
  
  // 优化：对于超大型图，使用更高效的力导向算法
  simulation = d3.forceSimulation(nodes)
    // 使用自定义或默认的链接参数，对于大型图使用更高效的链接计算
    .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id)
      .distance(linkDistance)
      .strength(linkStrength))
    // 使用自定义或默认的电荷强度，对于大型图使用quadraticCharge以提高性能
    .force('charge', isVeryLargeGraph 
      ? d3.forceManyBody<GraphNode>().strength(charge).distanceMin(30).distanceMax(100)
      : d3.forceManyBody<GraphNode>().strength(charge))
    // 使用自定义或默认的重力
    .force('gravity', d3.forceManyBody<GraphNode>().strength(gravity * 0.1))
    .force('center', d3.forceCenter<GraphNode>(width / 2, height / 2))
    // 优化：根据节点类型和大小调整碰撞半径，对于大型图使用更小的碰撞半径
    .force('collision', d3.forceCollide<GraphNode>().radius((d: GraphNode) => {
      return d.type === 'aggregate' 
        ? 30 + 10 
        : isVeryLargeGraph ? 15 : isLargeGraph ? 25 : 30;
    }));
  
  // 对于超大型图，增加alphaDecay以加快收敛速度
  if (isVeryLargeGraph) {
    simulation.alphaDecay(0.02);
  }
  
  // 对于大型图，添加velocityDecay以减少震荡
  if (isLargeGraph) {
    simulation.velocityDecay(0.6);
  }
  
  // 设置tick事件处理
  simulation.on('tick', () => {
    // 发送tick事件到主线程
    self.postMessage({
      type: 'tick',
      payload: {
        nodes,
        links,
        alpha: simulation?.alpha() || 0
      }
    } as WorkerResponse);
  });
  
  // 设置end事件处理
  simulation.on('end', () => {
    // 发送end事件到主线程
    self.postMessage({
      type: 'end',
      payload: {
        nodes,
        links,
        alpha: simulation?.alpha() || 0
      }
    } as WorkerResponse);
  });
}

// 处理更新消息
function handleUpdateMessage(message: WorkerMessage) {
  if (!message.payload || !simulation) return;
  
  const { nodes, links, forceParameters, isLargeGraph = false, isVeryLargeGraph = false } = message.payload;
  
  // 更新节点和链接
  simulation.nodes(nodes);
  const linkForce = simulation.force('link') as d3.ForceLink<GraphNode, GraphLink>;
  linkForce?.links(links);
  
  // 如果提供了新的力参数，更新力参数
  if (forceParameters) {
    const charge = forceParameters.charge ?? (isVeryLargeGraph ? -150 : isLargeGraph ? -200 : -300);
    const linkStrength = forceParameters.linkStrength ?? (isVeryLargeGraph ? 0.02 : isLargeGraph ? 0.05 : 0.1);
    const linkDistance = forceParameters.linkDistance ?? (isVeryLargeGraph ? 80 : isLargeGraph ? 100 : 150);
    const gravity = forceParameters.gravity ?? (isVeryLargeGraph ? 0.05 : isLargeGraph ? 0.08 : 0.1);
    
    // 更新力参数
    const chargeForce = simulation.force('charge') as d3.ForceManyBody<GraphNode>;
    chargeForce?.strength(charge);
    
    const linkForce = simulation.force('link') as d3.ForceLink<GraphNode, GraphLink>;
    linkForce?.strength(linkStrength);
    linkForce?.distance(linkDistance);
    
    const gravityForce = simulation.force('gravity') as d3.ForceManyBody<GraphNode>;
    gravityForce?.strength(gravity * 0.1);
  }
}

// 处理start消息
function handleStartMessage(message: WorkerMessage) {
  if (!simulation || !message.payload) return;
  
  const { alpha = 0.3 } = message.payload;
  simulation.alpha(alpha).restart();
}

// 处理stop消息
function handleStopMessage() {
  if (!simulation) return;
  simulation.stop();
}

// 处理restart消息
function handleRestartMessage(message: WorkerMessage) {
  if (!simulation || !message.payload) return;
  
  const { alpha = 0.3 } = message.payload;
  simulation.alpha(alpha).restart();
}

// 监听消息
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  
  switch (message.type) {
    case 'init':
      handleInitMessage(message);
      break;
    case 'update':
      handleUpdateMessage(message);
      break;
    case 'start':
      handleStartMessage(message);
      break;
    case 'stop':
      handleStopMessage();
      break;
    case 'restart':
      handleRestartMessage(message);
      break;
    default:
      break;
  }
};

// 导出类型（如果需要）
export type {
  WorkerMessage,
  WorkerResponse
};
