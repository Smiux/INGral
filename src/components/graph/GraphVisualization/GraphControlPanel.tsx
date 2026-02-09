import React from 'react';
import { X, Palette, Square, SquareGantt, Type, Heading, Text as TextIcon, Edit3, Link2, Settings, Layout, Zap, User, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useStore, useReactFlow } from '@xyflow/react';

import { CustomNodeData } from './CustomNode';
import { CustomEdgeData } from './FloatingEdge';

type ColorType = 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink';

const colorConfig = {
  'blue': { 'bg': 'from-blue-50 to-indigo-50', 'border': 'border-blue-100', 'icon': 'text-blue-600', 'focus': 'focus:ring-blue-500' },
  'green': { 'bg': 'from-green-50 to-emerald-50', 'border': 'border-green-100', 'icon': 'text-green-600', 'focus': 'focus:ring-green-500' },
  'purple': { 'bg': 'from-purple-50 to-violet-50', 'border': 'border-purple-100', 'icon': 'text-purple-600', 'focus': 'focus:ring-purple-500' },
  'orange': { 'bg': 'from-orange-50 to-amber-50', 'border': 'border-orange-100', 'icon': 'text-orange-600', 'focus': 'focus:ring-orange-500' },
  'teal': { 'bg': 'from-teal-50 to-cyan-50', 'border': 'border-teal-100', 'icon': 'text-teal-600', 'focus': 'focus:ring-teal-500' },
  'pink': { 'bg': 'from-pink-50 to-rose-50', 'border': 'border-pink-100', 'icon': 'text-pink-600', 'focus': 'focus:ring-pink-500' }
} as const;

interface GraphControlPanelProps {
  panelPosition?: 'left' | 'right';
}

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  color: ColorType;
  children: React.ReactNode;
}> = ({ title, icon, color, children }) => {
  const config = colorConfig[color];
  return (
    <div className={`rounded-xl p-4 shadow-sm border bg-gradient-to-br ${config.bg} ${config.border}`}>
      <h3 className={`text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2 ${config.icon}`}>
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
};

export const GraphControlPanel: React.FC<GraphControlPanelProps> = ({ panelPosition = 'right' }) => {
  const selectedNode = useStore(
    (state) => state.nodes.find((node) => node.selected) as { id: string; data: CustomNodeData } | null,
    (a, b) => a?.id === b?.id
  );
  const selectedEdge = useStore(
    (state) => state.edges.find((edge) => edge.selected) as { id: string; source: string; target: string; data: CustomEdgeData } | null,
    (a, b) => a?.id === b?.id
  );

  const reactFlowInstance = useReactFlow();
  const [activePanel, setActivePanel] = React.useState<'node' | 'appearance' | 'edge' | 'edgeAppearance'>('node');

  const [nodeFill, setNodeFill] = React.useState('#fff');
  const [nodeStroke, setNodeStroke] = React.useState('#4ECDC4');
  const [nodeTextColor, setNodeTextColor] = React.useState('#666');
  const [nodeTitleBackgroundColor, setNodeTitleBackgroundColor] = React.useState('#4ECDC4');
  const [nodeTitleTextColor, setNodeTitleTextColor] = React.useState('#FFFFFF');

  const [edgeStroke, setEdgeStroke] = React.useState('#3b82f6');
  const [edgeArrowColor, setEdgeArrowColor] = React.useState('#3b82f6');
  const [edgeLabelBackgroundColor, setEdgeLabelBackgroundColor] = React.useState('#3b82f6');
  const [edgeLabelTextColor, setEdgeLabelTextColor] = React.useState('#FFFFFF');

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

  const handleNodeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!selectedNode) {
      return;
    }
    const { name, value } = e.target;

    switch (name) {
      case 'handleCount': {
        const numValue = parseInt(value, 10);
        updateNode({ 'handleCount': Math.max(0, Math.min(20, isNaN(numValue) ? 0 : numValue)) });
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

  const handleEdgeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!selectedEdge) {
      return;
    }
    const { name, value } = e.target;

    switch (name) {
      case 'weight':
        updateEdge({ 'weight': parseFloat(value) || 1 });
        break;
      case 'strokeWidth':
        updateEdge({ 'style': { 'strokeWidth': parseFloat(value) || 2 } });
        break;
      default:
        updateEdge({ [name]: value });
    }
  };

  const isNode = Boolean(selectedNode);
  const title = isNode ? '编辑节点' : '编辑连接';
  const subtitle = isNode ? '调整节点属性和连接点配置' : '修改连接样式和属性';

  const panelClass = `w-72 bg-white flex flex-col overflow-hidden h-full transition-all duration-300 ease-in-out ${panelPosition === 'left' ? 'border-r border-gray-200 absolute left-0 top-0 z-10' : 'border-l border-gray-200 absolute right-0 top-0 z-10'}`;

  const header = (
    <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ 'background': 'linear-gradient(to right, var(--bg-hover), var(--bg-primary))' }}>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ 'color': 'var(--text-primary)' }}>
          <Edit3 className="w-5 h-5" style={{ 'color': 'var(--primary-color)' }} />
          {title}
        </h2>
        <p className="text-sm mt-1" style={{ 'color': 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      </div>
      <button
        onClick={clearSelection}
        className="p-1 rounded-full hover:bg-gray-100 transition-colors hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title="关闭面板"
        style={{ 'color': 'var(--text-secondary)' }}
      >
        <X size={20} />
      </button>
    </div>
  );

  if (!selectedNode && !selectedEdge) {
    return (
      <div className={panelClass} style={{ 'boxShadow': 'var(--shadow-md)' }}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ 'background': 'linear-gradient(to right, var(--bg-hover), var(--bg-primary))' }}>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ 'color': 'var(--text-primary)' }}>
            <Edit3 className="w-5 h-5" style={{ 'color': 'var(--primary-color)' }} />
            编辑面板
          </h2>
          <button
            onClick={clearSelection}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title="关闭面板"
            style={{ 'color': 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-neutral-50 text-neutral-500">
          <div className="text-center">
            <Layout className="w-16 h-16 mx-auto mb-3 text-neutral-300" />
            <p className="text-sm">请选择一个节点或连接来编辑</p>
          </div>
        </div>
      </div>
    );
  }

  const tabButton = (panel: string, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => {
        setActivePanel(panel as 'node' | 'appearance' | 'edge' | 'edgeAppearance');
        if (panel === 'appearance' && selectedNode) {
          setNodeFill(selectedNode.data.style?.fill || '#fff');
          setNodeStroke(selectedNode.data.style?.stroke || '#4ECDC4');
          setNodeTextColor(selectedNode.data.style?.textColor || '#666');
          setNodeTitleBackgroundColor(selectedNode.data.style?.titleBackgroundColor || '#4ECDC4');
          setNodeTitleTextColor(selectedNode.data.style?.titleTextColor || '#FFFFFF');
        }
        if (panel === 'edgeAppearance' && selectedEdge) {
          setEdgeStroke(selectedEdge.data?.style?.stroke || '#3b82f6');
          setEdgeArrowColor(selectedEdge.data?.style?.arrowColor || (selectedEdge.data?.style?.stroke || '#3b82f6'));
          setEdgeLabelBackgroundColor(selectedEdge.data?.style?.labelBackgroundColor || (selectedEdge.data?.style?.stroke || '#3b82f6'));
          setEdgeLabelTextColor(selectedEdge.data?.style?.labelTextColor || '#FFFFFF');
        }
      }}
      className={`px-4 py-3 flex items-center gap-2 text-sm font-medium transition-all duration-200 ease-in-out whitespace-nowrap ${activePanel === panel ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-500'}`}
      style={{ 'backgroundColor': activePanel === panel ? 'var(--primary-color-light)' : 'transparent' }}
    >
      {icon}
      {label}
    </button>
  );

  const inputField = ({ name, value, placeholder, type = 'text', min, max, step }: { name: string; value: string; placeholder: string; type?: 'text' | 'number'; min?: number; max?: number; step?: number }) => (
    <input
      name={name}
      type={type}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={handleNodeChange}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-200"
    />
  );



  const colorPicker = (color: string, onColorChange: (color: string) => void, label: string, icon: React.ReactNode) => (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="flex items-center gap-3 h-10 rounded-lg border border-gray-300 overflow-hidden">
        <div className="relative w-8 h-8 ml-1 flex-shrink-0">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-300 bg-transparent opacity-0 absolute inset-0"
          />
          <div className="w-8 h-8 rounded border border-gray-300" style={{ 'backgroundColor': color }} />
        </div>
        <input
          type="text"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="flex-1 text-sm px-2 py-0 bg-gray-50 text-gray-700 border-0 focus:outline-none h-full"
        />
      </div>
    </div>
  );

  const shapeOptions = [
    { 'value': 'circle', 'label': '圆形', 'icon': <circle cx="12" cy="12" r="10" /> },
    { 'value': 'square', 'label': '方形', 'icon': <rect x="3" y="3" width="18" height="18" rx="2" /> },
    { 'value': 'rectangle', 'label': '矩形', 'icon': <rect x="2" y="4" width="20" height="16" rx="2" /> }
  ];

  return (
    <div className={panelClass} style={{ 'boxShadow': 'var(--shadow-md)' }}>
      {header}

      <div className="border-b border-gray-200 bg-white overflow-x-auto">
        <div className="flex min-w-max">
          {isNode ? (
            <>
              {tabButton('node', '节点编辑', <User className="w-4 h-4" />)}
              {tabButton('appearance', '节点外观', <Palette className="w-4 h-4" />)}
            </>
          ) : (
            <>
              {tabButton('edge', '连接编辑', <Link2 className="w-4 h-4" />)}
              {tabButton('edgeAppearance', '连接外观', <Settings className="w-4 h-4" />)}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" style={{ 'backgroundColor': 'var(--bg-primary)' }}>
        {activePanel === 'node' && selectedNode && (
          <div className="space-y-6 p-1">
            <Section title="节点基本信息" icon={<User className="w-4 h-4" />} color="blue">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">节点标题</label>
                  {inputField({ 'name': 'title', 'value': selectedNode.data.title || '', 'placeholder': '输入节点标题' })}
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">节点类别</label>
                  {inputField({ 'name': 'category', 'value': selectedNode.data.category || '', 'placeholder': '输入节点类别（如：概念、理论等）' })}
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">节点内容</label>
                  <textarea
                    name="content"
                    value={selectedNode.data.metadata?.content || ''}
                    onChange={handleNodeChange}
                    placeholder="输入节点内容"
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-200 resize-y"
                  />
                </div>
              </div>
            </Section>

            <Section title="连接点配置" icon={<Zap className="w-4 h-4" />} color="green">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">连接点数量</label>
                  {inputField({ 'name': 'handleCount', 'value': String(selectedNode.data.handleCount ?? 0), 'placeholder': '', 'type': 'number', 'min': 0, 'max': 20 })}
                  <p className="text-xs text-gray-500 mt-1 italic">连接点会均匀分布在节点外围</p>
                </div>
              </div>
            </Section>
          </div>
        )}

        {activePanel === 'edge' && selectedEdge && (
          <div className="space-y-6 p-1">
            <Section title="连接基本信息" icon={<ArrowRight className="w-4 h-4" />} color="orange">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">连接类别</label>
                  <input
                    name="type"
                    type="text"
                    value={selectedEdge.data?.type || 'related'}
                    onChange={handleEdgeChange}
                    placeholder="输入连接类别"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:border-orange-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">连接权重</label>
                  <input
                    type="number"
                    name="weight"
                    min={0.1}
                    max={10}
                    step={0.1}
                    value={selectedEdge.data?.weight || 1}
                    onChange={handleEdgeChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:border-orange-200"
                  />
                </div>
              </div>
            </Section>

            <Section title="连接线样式" icon={<Layers className="w-4 h-4" />} color="teal">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">连接线样式</label>
                  <select
                    name="curveType"
                    value={selectedEdge.data?.curveType || 'default'}
                    onChange={handleEdgeChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 hover:border-teal-200"
                  >
                    <option value="default">Bezier曲线</option>
                    <option value="straight">直线</option>
                    <option value="smoothstep">平滑阶梯线</option>
                    <option value="simplebezier">简单Bezier曲线</option>
                  </select>
                </div>
              </div>
            </Section>
          </div>
        )}

        {activePanel === 'edgeAppearance' && selectedEdge && (
          <div className="space-y-6 p-1">
            <Section title="连接外观" icon={<Palette className="w-4 h-4" />} color="purple">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">连接宽度</label>
                  <input
                    name="strokeWidth"
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={selectedEdge.data?.style?.strokeWidth || 2}
                    onChange={handleEdgeChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-purple-200 text-center"
                  />
                </div>

                <div className="space-y-4 pt-2">
                  {colorPicker(edgeStroke, (color) => {
                    setEdgeStroke(color);
                    updateEdge({ 'style': { 'stroke': color } });
                  }, '连接颜色', <Square className="w-4 h-4 text-gray-500" />)}
                  {colorPicker(edgeArrowColor, (color) => {
                    setEdgeArrowColor(color);
                    updateEdge({ 'style': { 'arrowColor': color } }, { 'type': 'arrowclosed', color });
                  }, '箭头颜色', <CheckCircle2 className="w-4 h-4 text-gray-500" />)}
                  {colorPicker(edgeLabelBackgroundColor, (color) => {
                    setEdgeLabelBackgroundColor(color);
                    updateEdge({ 'style': { 'labelBackgroundColor': color } });
                  }, '标签背景色', <SquareGantt className="w-4 h-4 text-gray-500" />)}
                  {colorPicker(edgeLabelTextColor, (color) => {
                    setEdgeLabelTextColor(color);
                    updateEdge({ 'style': { 'labelTextColor': color } });
                  }, '标签文字色', <TextIcon className="w-4 h-4 text-gray-500" />)}
                </div>
              </div>
            </Section>
          </div>
        )}

        {activePanel === 'appearance' && selectedNode && (
          <div className="space-y-6 p-1">
            <Section title="节点外观" icon={<Palette className="w-4 h-4" />} color="purple">
              <div className="space-y-3">
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">节点形状</label>
                <div className="grid grid-cols-3 gap-3">
                  {shapeOptions.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateNode({ 'shape': value as 'circle' | 'square' | 'rectangle' })}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${selectedNode.data.shape === value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        {icon}
                      </svg>
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-4 pt-2">
                  {colorPicker(nodeFill, (color) => {
                    setNodeFill(color);
                    updateNode({ 'style': { 'fill': color } });
                  }, '背景颜色', <Square className="w-4 h-4 text-gray-500" />)}
                  {colorPicker(nodeStroke, (color) => {
                    setNodeStroke(color);
                    updateNode({ 'style': { 'stroke': color } });
                  }, '边框颜色', <SquareGantt className="w-4 h-4 text-gray-500" />)}
                  {colorPicker(nodeTextColor, (color) => {
                    setNodeTextColor(color);
                    updateNode({ 'style': { 'textColor': color } });
                  }, '文字颜色', <Type className="w-4 h-4 text-gray-500" />)}
                  {colorPicker(nodeTitleBackgroundColor, (color) => {
                    setNodeTitleBackgroundColor(color);
                    updateNode({ 'style': { 'titleBackgroundColor': color } });
                  }, '标题背景色', <Heading className="w-4 h-4 text-gray-500" />)}
                  {colorPicker(nodeTitleTextColor, (color) => {
                    setNodeTitleTextColor(color);
                    updateNode({ 'style': { 'titleTextColor': color } });
                  }, '标题文字色', <TextIcon className="w-4 h-4 text-gray-500" />)}
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
