import React from 'react';
import { X, Square, Pencil, Circle, RectangleHorizontal, MousePointer2 } from 'lucide-react';
import { useStore, useReactFlow } from '@xyflow/react';

import { CustomNodeData } from './CustomNode';
import { CustomEdgeData } from './FloatingEdge';

type ColorType = 'blue' | 'green' | 'purple' | 'orange' | 'teal';

const colorConfig = {
  'blue': { 'bg': 'from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30', 'border': 'border-blue-100 dark:border-blue-900', 'icon': 'text-blue-600 dark:text-blue-400', 'focus': 'focus:ring-blue-500' },
  'green': { 'bg': 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30', 'border': 'border-green-100 dark:border-green-900', 'icon': 'text-green-600 dark:text-green-400', 'focus': 'focus:ring-green-500' },
  'purple': { 'bg': 'from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30', 'border': 'border-purple-100 dark:border-purple-900', 'icon': 'text-purple-600 dark:text-purple-400', 'focus': 'focus:ring-purple-500' },
  'orange': { 'bg': 'from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30', 'border': 'border-orange-100 dark:border-orange-900', 'icon': 'text-orange-600 dark:text-orange-400', 'focus': 'focus:ring-orange-500' },
  'teal': { 'bg': 'from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30', 'border': 'border-teal-100 dark:border-teal-900', 'icon': 'text-teal-600 dark:text-teal-400', 'focus': 'focus:ring-teal-500' }
};

interface GraphControlPanelProps {
  panelPosition?: 'left' | 'right';
}

const Section: React.FC<{
  title: string;
  color: ColorType;
  children: React.ReactNode;
}> = ({ title, color, children }) => {
  const config = colorConfig[color];
  return (
    <div className={`rounded-xl p-4 border bg-gradient-to-br ${config.bg} ${config.border}`}>
      <h3 className={`text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3 flex items-center gap-2 ${config.icon}`}>
        {title}
      </h3>
      {children}
    </div>
  );
};

type SelectedNodeInfo = { id: string; data: CustomNodeData } | null;
type SelectedEdgeInfo = { id: string; source: string; target: string; data: CustomEdgeData } | null;

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

const shapeOptions = [
  { 'value': 'circle', 'label': '圆形', 'icon': <Circle className="w-6 h-6" /> },
  { 'value': 'square', 'label': '方形', 'icon': <Square className="w-6 h-6" /> },
  { 'value': 'rectangle', 'label': '矩形', 'icon': <RectangleHorizontal className="w-6 h-6" /> }
];

export const GraphControlPanel: React.FC<GraphControlPanelProps> = ({ panelPosition = 'right' }) => {
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
    'fill': '#ffffff',
    'stroke': '#4ECDC4',
    'textColor': '#666666',
    'titleBackgroundColor': '#4ECDC4',
    'titleTextColor': '#FFFFFF'
  });

  const [edgeColors, setEdgeColors] = React.useState({
    'stroke': '#3b82f6',
    'arrowColor': '#3b82f6',
    'labelBackgroundColor': '#3b82f6',
    'labelTextColor': '#FFFFFF'
  });

  const [isComposing, setIsComposing] = React.useState(false);
  const [localNodeState, setLocalNodeState] = React.useState<{
    title: string;
    category: string;
    content: string;
    handleCount: string;
  }>({
    'title': '',
    'category': '',
    'content': '',
    'handleCount': '0'
  });
  const [localEdgeState, setLocalEdgeState] = React.useState<{
    type: string;
    strokeWidth: string;
    curveType: string;
  }>({
    'type': 'related',
    'strokeWidth': '2',
    'curveType': 'default'
  });

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
          ? {
            ...node,
            'data': {
              ...node.data,
              ...updates,
              'style': { ...(node.data.style || {}), ...(updates.style || {}) }
            }
          }
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
          ? {
            ...edge,
            'data': {
              ...edge.data,
              ...updates,
              'style': { ...(edge.data?.style || {}), ...(updates.style || {}) }
            },
            ...(markerEnd && { markerEnd })
          }
          : edge
      )
    );
  };

  const commitNodeChange = (name: string, value: string) => {
    if (!selectedNode) {
      return;
    }
    switch (name) {
      case 'handleCount': {
        const numValue = parseInt(value, 10);
        updateNode({ 'handleCount': Math.max(0, isNaN(numValue) ? 0 : numValue) });
        break;
      }
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

    if (selectedNode && ['title', 'category', 'content', 'handleCount'].includes(name)) {
      commitNodeChange(name, value);
    } else if (selectedEdge && ['type', 'strokeWidth', 'curveType'].includes(name)) {
      commitEdgeChange(name, value);
    }
  };

  React.useEffect(() => {
    if (selectedNode) {
      setLocalNodeState({
        'title': selectedNode.data.title || '',
        'category': selectedNode.data.category || '',
        'content': selectedNode.data.metadata?.content || '',
        'handleCount': String(selectedNode.data.handleCount ?? 0)
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
        'labelTextColor': selectedEdge.data?.style?.labelTextColor || '#FFFFFF'
      });
    }
  }, [selectedEdge]);

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
  const subtitle = isNode ? '调整节点属性和连接点配置' : '修改连接样式和属性';

  const panelClass = `w-72 bg-white dark:bg-neutral-800 flex flex-col overflow-hidden h-full ${panelPosition === 'left' ? 'border-r border-neutral-200 dark:border-neutral-700 absolute left-0 top-0 z-10' : 'border-l border-neutral-200 dark:border-neutral-700 absolute right-0 top-0 z-10 panel-right'}`;

  const renderHeader = (headerTitle: string, headerSubtitle?: string) => (
    <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
          <Pencil className="w-5 h-5" style={{ 'color': '#3b82f6' }} />
          {headerTitle}
        </h2>
        {headerSubtitle && (
          <p className="text-sm mt-1 text-neutral-600 dark:text-neutral-400">
            {headerSubtitle}
          </p>
        )}
      </div>
      <button
        onClick={clearSelection}
        className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-neutral-600 dark:text-neutral-400"
      >
        <X size={20} />
      </button>
    </div>
  );

  if (!selectedNode && !selectedEdge) {
    return (
      <div className={panelClass}>
        {renderHeader('编辑面板')}
        <div className="flex-1 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
          <div className="text-center">
            <MousePointer2 className="w-16 h-16 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm">请选择一个节点或连接来编辑</p>
          </div>
        </div>
      </div>
    );
  }

  const inputField = ({ name, value, placeholder, type = 'text', min, max, step }: { name: string; value: string; placeholder: string; type?: 'text' | 'number'; min?: number; max?: number; step?: number }) => (
    <input
      name={name}
      type={type}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={handleNodeChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-400 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
    />
  );

  const colorPicker = (color: string, onColorChange: (color: string) => void, label: string) => (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide flex items-center gap-2">
        {label}
      </label>
      <div className="flex items-center gap-3 h-10 rounded-lg border border-neutral-300 dark:border-neutral-600 overflow-hidden bg-white dark:bg-neutral-700">
        <div className="relative w-8 h-8 ml-1 flex-shrink-0">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-neutral-300 dark:border-neutral-600 bg-transparent opacity-0 absolute inset-0"
          />
          <div className="w-8 h-8 rounded border border-neutral-300 dark:border-neutral-600" style={{ 'backgroundColor': color }} />
        </div>
        <input
          type="text"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="flex-1 text-sm px-2 py-0 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-0 focus:outline-none h-full"
        />
      </div>
    </div>
  );

  return (
    <div className={panelClass}>
      {renderHeader(title, subtitle)}

      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode && (
          <div className="space-y-6 p-1">
            <Section title="节点基本信息" color="blue">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">节点标题</label>
                  {inputField({ 'name': 'title', 'value': localNodeState.title, 'placeholder': '输入节点标题' })}
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">节点类别</label>
                  {inputField({ 'name': 'category', 'value': localNodeState.category, 'placeholder': '输入节点类别' })}
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">节点内容</label>
                  <textarea
                    name="content"
                    value={localNodeState.content}
                    onChange={handleNodeChange}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    placeholder="输入节点内容"
                    rows={4}
                    className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-400 resize-y bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                  />
                </div>
              </div>
            </Section>

            <Section title="连接点配置" color="green">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">连接点数量</label>
                  {inputField({ 'name': 'handleCount', 'value': localNodeState.handleCount, 'placeholder': '', 'type': 'number', 'min': 0 })}
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 italic">连接点会均匀分布在节点外围</p>
                </div>
              </div>
            </Section>

            <Section title="节点外观" color="purple">
              <div className="space-y-3">
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">节点形状</label>
                <div className="grid grid-cols-3 gap-3">
                  {shapeOptions.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateNode({ 'shape': value as 'circle' | 'square' | 'rectangle' })}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${selectedNode.data.shape === value ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'border-neutral-200 dark:border-neutral-600 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}
                    >
                      {icon}
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-4 pt-2">
                  {colorPicker(nodeColors.fill, (color) => handleNodeColorChange('fill', color), '背景颜色')}
                  {colorPicker(nodeColors.stroke, (color) => handleNodeColorChange('stroke', color), '边框颜色')}
                  {colorPicker(nodeColors.textColor, (color) => handleNodeColorChange('textColor', color), '文字颜色')}
                  {colorPicker(nodeColors.titleBackgroundColor, (color) => handleNodeColorChange('titleBackgroundColor', color), '标题背景色')}
                  {colorPicker(nodeColors.titleTextColor, (color) => handleNodeColorChange('titleTextColor', color), '标题文字色')}
                </div>
              </div>
            </Section>
          </div>
        )}

        {selectedEdge && (
          <div className="space-y-6 p-1">
            <Section title="连接基本信息" color="orange">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">连接类别</label>
                  <input
                    name="type"
                    type="text"
                    value={localEdgeState.type}
                    onChange={handleEdgeChange}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    placeholder="输入连接类别"
                    className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:border-orange-200 dark:hover:border-orange-400 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                  />
                </div>
              </div>
            </Section>

            <Section title="连接线样式" color="teal">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">连接线样式</label>
                  <select
                    name="curveType"
                    value={localEdgeState.curveType}
                    onChange={handleEdgeChange}
                    className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 hover:border-teal-200 dark:hover:border-teal-400 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                  >
                    <option value="default">Bezier曲线</option>
                    <option value="straight">直线</option>
                    <option value="smoothstep">平滑阶梯线</option>
                    <option value="simplebezier">简单Bezier曲线</option>
                  </select>
                </div>
              </div>
            </Section>

            <Section title="连接外观" color="purple">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">连接宽度</label>
                  <input
                    name="strokeWidth"
                    type="number"
                    min={0}
                    value={localEdgeState.strokeWidth}
                    onChange={handleEdgeChange}
                    className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-purple-200 dark:hover:border-purple-400 text-center bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                  />
                </div>

                <div className="space-y-4 pt-2">
                  {colorPicker(edgeColors.stroke, (color) => handleEdgeColorChange('stroke', color), '连接颜色')}
                  {colorPicker(edgeColors.arrowColor, (color) => handleEdgeColorChange('arrowColor', color), '箭头颜色')}
                  {colorPicker(edgeColors.labelBackgroundColor, (color) => handleEdgeColorChange('labelBackgroundColor', color), '标签背景色')}
                  {colorPicker(edgeColors.labelTextColor, (color) => handleEdgeColorChange('labelTextColor', color), '标签文字色')}
                </div>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphControlPanel;
