import React from 'react';
import { X, Square, Pencil, Circle, RectangleHorizontal } from 'lucide-react';
import { useStore, useReactFlow } from '@xyflow/react';
import { motion } from 'framer-motion';
import { CustomNodeData } from '../Node';
import { CustomEdgeData } from '../Edge';
import {
  type HoverColorType,
  PANEL_CONTAINER_RIGHT_CLASS,
  getSectionClasses,
  INPUT_CLASS,
  LABEL_CLASS,
  PANEL_CLOSE_BTN_CLASS,
  PANEL_MOTION_VARIANTS_RIGHT,
  PANEL_MOTION_TRANSITION
} from './panelStyles';

interface ControlPanelProps {
  panelPosition?: 'left' | 'right';
}

type SelectedNodeInfo = { id: string; data: CustomNodeData } | null;
type SelectedEdgeInfo = { id: string; source: string; target: string; data: CustomEdgeData } | null;

const shapeOptions = [
  { 'value': 'circle', 'label': '圆形', 'icon': <Circle className="w-6 h-6" /> },
  { 'value': 'square', 'label': '方形', 'icon': <Square className="w-6 h-6" /> },
  { 'value': 'rectangle', 'label': '矩形', 'icon': <RectangleHorizontal className="w-6 h-6" /> }
];

const getSelectedNodeInfo = (nodes: Array<{ id: string; data: CustomNodeData; selected?: boolean }>): SelectedNodeInfo => {
  const node = nodes.find((n) => n.selected);
  if (node) {
    return { 'id': node.id, 'data': node.data };
  }
  return null;
};

const getSelectedEdgeInfo = (edges: Array<{ id: string; source: string; target: string; data: CustomEdgeData; selected?: boolean }>): SelectedEdgeInfo => {
  const edge = edges.find((e) => e.selected);
  if (edge) {
    return { 'id': edge.id, 'source': edge.source, 'target': edge.target, 'data': edge.data };
  }
  return null;
};

const compareSelectedInfo = <T extends SelectedNodeInfo | SelectedEdgeInfo>(a: T, b: T): boolean => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.id === b.id && JSON.stringify(a.data) === JSON.stringify(b.data);
};

interface SectionProps {
  title: string;
  hoverColor: HoverColorType;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, hoverColor, children }) => {
  const classes = getSectionClasses(hoverColor);
  return (
    <div className={classes.container}>
      <h3 className={classes.title}>
        {title}
      </h3>
      {children}
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ panelPosition = 'right' }) => {
  const selectedNode = useStore(
    (state) => getSelectedNodeInfo(state.nodes as Array<{ id: string; data: CustomNodeData; selected?: boolean }>),
    compareSelectedInfo
  );
  const selectedEdge = useStore(
    (state) => getSelectedEdgeInfo(state.edges as Array<{ id: string; source: string; target: string; data: CustomEdgeData; selected?: boolean }>),
    compareSelectedInfo
  );
  const reactFlowInstance = useReactFlow();

  const [nodeColors, setNodeColors] = React.useState({
    'fill': '#fff',
    'stroke': '#4ECDC4',
    'textColor': '#666',
    'titleBackgroundColor': '#4ECDC4',
    'titleTextColor': '#FFFFFF'
  });
  const [edgeColors, setEdgeColors] = React.useState({
    'stroke': '#3b82f6',
    'arrowColor': '#3b82f6',
    'labelBackgroundColor': '#3b82f6',
    'labelTextColor': '#ffffff'
  });
  const [isComposing, setIsComposing] = React.useState(false);
  const [localNodeState, setLocalNodeState] = React.useState({
    'title': '',
    'category': '',
    'content': ''
  });
  const [localEdgeState, setLocalEdgeState] = React.useState({
    'type': 'related',
    'strokeWidth': '2',
    'curveType': 'default'
  });

  React.useEffect(() => {
    if (selectedNode) {
      setLocalNodeState({
        'title': selectedNode.data.title || '',
        'category': selectedNode.data.category || '',
        'content': selectedNode.data.metadata?.content || ''
      });
      setNodeColors({
        'fill': selectedNode.data.style?.fill || '#ffffff',
        'stroke': selectedNode.data.style?.stroke || '#4ECDC4',
        'textColor': selectedNode.data.style?.textColor || '#666666',
        'titleBackgroundColor': selectedNode.data.style?.titleBackgroundColor || '#4ECDC4',
        'titleTextColor': selectedNode.data.style?.titleTextColor || '#FFFFFF'
      });
    }
  }, [selectedNode]);

  React.useEffect(() => {
    if (selectedEdge) {
      setLocalEdgeState({
        'type': selectedEdge.data?.type || 'related',
        'strokeWidth': String(selectedEdge.data?.style?.strokeWidth ?? 2),
        'curveType': selectedEdge.data?.curveType || 'default'
      });
      setEdgeColors({
        'stroke': selectedEdge.data?.style?.stroke || '#3b82f6',
        'arrowColor': selectedEdge.data?.style?.arrowColor || '#3b82f6',
        'labelBackgroundColor': selectedEdge.data?.style?.labelBackgroundColor || '#3b82f6',
        'labelTextColor': selectedEdge.data?.style?.labelTextColor || '#ffffff'
      });
    }
  }, [selectedEdge]);

  const clearSelection = () => {
    reactFlowInstance.setNodes((nodes) => nodes.map((node) => ({ ...node, 'selected': false })));
    reactFlowInstance.setEdges((edges) => edges.map((edge) => ({ ...edge, 'selected': false })));
  };

  const updateNode = (updates: Partial<CustomNodeData> & { style?: Record<string, unknown> }) => {
    if (!selectedNode) {
      return;
    }
    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === selectedNode.id
          ? { ...node, 'data': { ...node.data, ...updates, 'style': { ...(node.data.style || {}), ...(updates.style || {}) } } }
          : node
      )
    );
  };

  const updateEdge = (updates: Partial<CustomEdgeData> & { style?: Record<string, unknown> }, markerEnd?: { type: 'arrowclosed'; color: string }) => {
    if (!selectedEdge) {
      return;
    }
    reactFlowInstance.setEdges((edges) =>
      edges.map((edge) =>
        edge.id === selectedEdge.id
          ? { ...edge, 'data': { ...edge.data, ...updates, 'style': { ...(edge.data?.style || {}), ...(updates.style || {}) } }, ...(markerEnd && { markerEnd }) }
          : edge
      )
    );
  };

  const commitNodeChange = (name: string, value: string) => {
    if (!selectedNode) {
      return;
    }
    switch (name) {
      case 'content':
        updateNode({ 'metadata': { ...(selectedNode.data.metadata || {}), 'content': value } });
        break;
      case 'shape':
        updateNode({ 'shape': value as 'circle' | 'square' | 'rectangle' });
        break;
      default:
        updateNode({ [name]: value });
    }
  };

  const commitEdgeChange = (name: string, value: string) => {
    if (!selectedEdge) {
      return;
    }
    switch (name) {
      case 'strokeWidth': {
        const numValue = parseFloat(value);
        updateEdge({ 'style': { 'strokeWidth': Math.max(0, isNaN(numValue) ? 0 : numValue) } });
        break;
      }
      default:
        updateEdge({ [name]: value });
    }
  };

  const handleNodeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!selectedNode) {
      return;
    }
    const { name, value } = e.target;
    setLocalNodeState((prev) => ({ ...prev, [name]: value }));
    if (!isComposing) {
      commitNodeChange(name, value);
    }
  };

  const handleEdgeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!selectedEdge) {
      return;
    }
    const { name, value } = e.target;
    setLocalEdgeState((prev) => ({ ...prev, [name]: value }));
    if (!isComposing) {
      commitEdgeChange(name, value);
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsComposing(false);
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const name = target.name;
    const value = target.value;
    if (selectedNode && ['title', 'category', 'content'].includes(name)) {
      commitNodeChange(name, value);
    } else if (selectedEdge && ['type', 'strokeWidth', 'curveType'].includes(name)) {
      commitEdgeChange(name, value);
    }
  };

  const handleNodeColorChange = (key: keyof typeof nodeColors, color: string) => {
    setNodeColors((prev) => ({ ...prev, [key]: color }));
    updateNode({ 'style': { [key]: color } });
  };

  const handleEdgeColorChange = (key: keyof typeof edgeColors, color: string) => {
    setEdgeColors((prev) => ({ ...prev, [key]: color }));
    if (key === 'arrowColor') {
      updateEdge({ 'style': { [key]: color } }, { 'type': 'arrowclosed', color });
    } else {
      updateEdge({ 'style': { [key]: color } });
    }
  };

  const isNode = Boolean(selectedNode);
  const title = isNode ? '编辑节点' : '编辑连接';

  const panelClass = `${PANEL_CONTAINER_RIGHT_CLASS} ${panelPosition === 'left' ? 'border-l-0 border-r border-slate-200/60 dark:border-slate-700/60 left-0' : 'right-0'}`;

  const renderHeader = (headerTitle: string) => (
    <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-700/60">
      <div>
        <h2 className="text-base font-medium flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Pencil className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          {headerTitle}
        </h2>
      </div>
      <button
        onClick={clearSelection}
        className={PANEL_CLOSE_BTN_CLASS}
      >
        <X size={16} />
      </button>
    </div>
  );

  const colorPicker = (color: string, onColorChange: (color: string) => void, label: string) => (
    <div className="space-y-1.5">
      <label className={LABEL_CLASS}>
        {label}
      </label>
      <div className="flex items-center gap-2 h-9 rounded border border-slate-200/60 dark:border-slate-700/60 bg-slate-200/50 dark:bg-slate-800/80">
        <div className="relative w-7 h-7 ml-1 flex-shrink-0">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-slate-200 dark:border-slate-600 bg-transparent opacity-0 absolute inset-0"
          />
          <div className="w-7 h-7 rounded border border-slate-200 dark:border-slate-600" style={{ 'backgroundColor': color }} />
        </div>
        <input
          type="text"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="flex-1 text-xs px-2 py-0 bg-transparent text-slate-400 dark:text-slate-500 border-0 focus:outline-none h-full font-mono"
        />
      </div>
    </div>
  );

  return (
    <motion.div
      className={panelClass}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={PANEL_MOTION_VARIANTS_RIGHT}
      transition={PANEL_MOTION_TRANSITION}
    >
      {renderHeader(title)}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selectedNode && (
          <>
            <Section title="节点信息" hoverColor="sky">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className={LABEL_CLASS}>节点标题</label>
                  <input
                    name="title"
                    type="text"
                    value={localNodeState.title}
                    onChange={handleNodeChange}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    placeholder="输入节点标题"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={LABEL_CLASS}>节点类别</label>
                  <input
                    name="category"
                    type="text"
                    value={localNodeState.category}
                    onChange={handleNodeChange}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    placeholder="输入节点类别"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={LABEL_CLASS}>节点内容</label>
                  <textarea
                    name="content"
                    value={localNodeState.content}
                    onChange={handleNodeChange}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    placeholder="输入节点内容"
                    rows={3}
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>
              </div>
            </Section>

            <Section title="节点外观" hoverColor="teal">
              <div className="space-y-3">
                <label className={LABEL_CLASS}>节点形状</label>
                <div className="grid grid-cols-3 gap-2">
                  {shapeOptions.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateNode({ 'shape': value as 'circle' | 'square' | 'rectangle' })}
                      className={`p-2.5 rounded border transition-all duration-200 flex flex-col items-center gap-1.5 ${
                        selectedNode.data.shape === value
                          ? 'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          : 'border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {icon}
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-2 pt-1">
                  {colorPicker(nodeColors.fill, (color) => handleNodeColorChange('fill', color), '背景颜色')}
                  {colorPicker(nodeColors.stroke, (color) => handleNodeColorChange('stroke', color), '边框颜色')}
                  {colorPicker(nodeColors.textColor, (color) => handleNodeColorChange('textColor', color), '文字颜色')}
                  {colorPicker(nodeColors.titleBackgroundColor, (color) => handleNodeColorChange('titleBackgroundColor', color), '标题背景色')}
                  {colorPicker(nodeColors.titleTextColor, (color) => handleNodeColorChange('titleTextColor', color), '标题文字色')}
                </div>
              </div>
            </Section>
          </>
        )}

        {selectedEdge && (
          <>
            <Section title="连接信息" hoverColor="blue">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className={LABEL_CLASS}>连接类别</label>
                  <input
                    name="type"
                    type="text"
                    value={localEdgeState.type}
                    onChange={handleEdgeChange}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    placeholder="输入连接类别"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </Section>

            <Section title="连接线样式" hoverColor="emerald">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className={LABEL_CLASS}>连接线样式</label>
                  <select
                    name="curveType"
                    value={localEdgeState.curveType}
                    onChange={handleEdgeChange}
                    className={INPUT_CLASS}
                  >
                    <option value="default">Bezier曲线</option>
                    <option value="straight">直线</option>
                    <option value="smoothstep">平滑阶梯线</option>
                    <option value="simplebezier">简单Bezier曲线</option>
                  </select>
                </div>
              </div>
            </Section>

            <Section title="连接外观" hoverColor="teal">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className={LABEL_CLASS}>连接宽度</label>
                  <input
                    name="strokeWidth"
                    type="number"
                    min={0}
                    value={localEdgeState.strokeWidth}
                    onChange={handleEdgeChange}
                    className={`${INPUT_CLASS} text-center`}
                  />
                </div>
                <div className="space-y-2 pt-1">
                  {colorPicker(edgeColors.stroke, (color) => handleEdgeColorChange('stroke', color), '连接颜色')}
                  {colorPicker(edgeColors.arrowColor, (color) => handleEdgeColorChange('arrowColor', color), '箭头颜色')}
                  {colorPicker(edgeColors.labelBackgroundColor, (color) => handleEdgeColorChange('labelBackgroundColor', color), '标签背景色')}
                  {colorPicker(edgeColors.labelTextColor, (color) => handleEdgeColorChange('labelTextColor', color), '标签文字色')}
                </div>
              </div>
            </Section>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ControlPanel;
