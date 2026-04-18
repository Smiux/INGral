import { X, Settings } from 'lucide-react';
import type { RendererType } from './types';
import {
  type ForceGraphSettings,
  type CosmosGLSettings,
  type DeckGLSettings,
  type DagMode,
  DAG_MODE_OPTIONS,
  DEFAULT_FORCE_GRAPH_SETTINGS,
  DEFAULT_COSMOS_GL_SETTINGS,
  DEFAULT_DECK_GL_SETTINGS
} from './settingsTypes';

interface RendererSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentRenderer: RendererType;
  forceGraphSettings: ForceGraphSettings;
  cosmosGLSettings: CosmosGLSettings;
  deckGLSettings: DeckGLSettings;
  onForceGraphSettingsChange: (settings: ForceGraphSettings) => void;
  onCosmosGLSettingsChange: (settings: CosmosGLSettings) => void;
  onDeckGLSettingsChange: (settings: DeckGLSettings) => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  description?: string;
  displayValue?: string;
}

const Slider = ({ label, value, min, max, step, onChange, description, displayValue }: SliderProps) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <label className="text-xs text-neutral-300">{label}</label>
      <span className="text-xs text-neutral-500 font-mono">{displayValue ?? value.toFixed(step < 1 ? 2 : 0)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
    />
    {description && <p className="text-[10px] text-neutral-500">{description}</p>}
  </div>
);

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

const Toggle = ({ label, checked, onChange, description }: ToggleProps) => (
  <div className="flex items-center justify-between">
    <div>
      <label className="text-xs text-neutral-300">{label}</label>
      {description && <p className="text-[10px] text-neutral-500">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? 'bg-sky-600' : 'bg-neutral-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

interface SelectProps {
  label: string;
  value: DagMode;
  options: { value: DagMode; label: string; description: string }[];
  onChange: (value: DagMode) => void;
}

const Select = ({ label, value, options, onChange }: SelectProps) => (
  <div className="space-y-1">
    <label className="text-xs text-neutral-300">{label}</label>
    <select
      value={value === null ? 'null' : value}
      onChange={(e) => onChange(e.target.value === 'null' ? null : e.target.value as DagMode)}
      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
    >
      {options.map((option) => (
        <option key={option.value === null ? 'null' : option.value} value={option.value === null ? 'null' : option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const formatTime = (ms: number): string => {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
};

const ForceGraphSettingsPanel = ({
  settings,
  onChange
}: {
  settings: ForceGraphSettings;
  onChange: (settings: ForceGraphSettings) => void;
}) => (
  <div className="space-y-4">
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider border-b border-neutral-700 pb-2">
        树形布局
      </h4>
      <Select
        label="DAG 模式"
        value={settings.dagMode}
        options={DAG_MODE_OPTIONS}
        onChange={(value) => onChange({ ...settings, 'dagMode': value })}
      />
      <Slider
        label="层级距离"
        value={settings.dagLevelDistance}
        min={20}
        max={2000}
        step={10}
        onChange={(value) => onChange({ ...settings, 'dagLevelDistance': value })}
        description="相邻层级之间的距离"
      />
    </div>

    <div className="space-y-3">
      <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider border-b border-neutral-700 pb-2">
        力导向模拟
      </h4>
      <Slider
        label="衰减率"
        value={settings.d3AlphaDecay}
        min={0}
        max={0.5}
        step={0.001}
        onChange={(value) => onChange({ ...settings, 'd3AlphaDecay': value })}
        description="模拟衰减速度，值越大停止越快"
      />
      <Slider
        label="速度衰减"
        value={settings.d3VelocityDecay}
        min={0}
        max={0.99}
        step={0.01}
        onChange={(value) => onChange({ ...settings, 'd3VelocityDecay': value })}
        description="节点移动速度衰减"
      />
      <Slider
        label="冷却时间"
        value={settings.cooldownTime}
        min={0}
        max={300000}
        step={1000}
        onChange={(value) => onChange({ ...settings, 'cooldownTime': value })}
        displayValue={formatTime(settings.cooldownTime)}
        description="模拟停止前的时间，0为立即停止"
      />
    </div>

    <div className="space-y-3">
      <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider border-b border-neutral-700 pb-2">
        视觉效果
      </h4>
      <Slider
        label="节点相对大小"
        value={settings.nodeRelSize}
        min={0.5}
        max={50}
        step={0.5}
        onChange={(value) => onChange({ ...settings, 'nodeRelSize': value })}
      />
      <Slider
        label="节点不透明度"
        value={settings.nodeOpacity}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) => onChange({ ...settings, 'nodeOpacity': value })}
      />
      <Slider
        label="连接宽度"
        value={settings.linkWidth}
        min={0}
        max={20}
        step={0.5}
        onChange={(value) => onChange({ ...settings, 'linkWidth': value })}
      />
      <Slider
        label="连接不透明度"
        value={settings.linkOpacity}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) => onChange({ ...settings, 'linkOpacity': value })}
      />
    </div>
  </div>
);

const CosmosGLSettingsPanel = ({
  settings,
  onChange
}: {
  settings: CosmosGLSettings;
  onChange: (settings: CosmosGLSettings) => void;
}) => (
  <div className="space-y-4">
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider border-b border-neutral-700 pb-2">
        力导向模拟
      </h4>
      <Toggle
        label="模拟暂停"
        checked={settings.simulationPaused}
        onChange={(checked) => onChange({ ...settings, 'simulationPaused': checked })}
        description="暂停/恢复力导向模拟"
      />
      <Slider
        label="摩擦力"
        value={settings.simulationFriction}
        min={0}
        max={1}
        step={0.01}
        onChange={(value) => onChange({ ...settings, 'simulationFriction': value })}
        description="节点运动的摩擦系数，越大越慢"
      />
      <Slider
        label="引力"
        value={settings.simulationGravity}
        min={0}
        max={2}
        step={0.01}
        onChange={(value) => onChange({ ...settings, 'simulationGravity': value })}
        description="将节点拉向中心的力"
      />
      <Slider
        label="斥力"
        value={settings.simulationRepulsion}
        min={0}
        max={10}
        step={0.1}
        onChange={(value) => onChange({ ...settings, 'simulationRepulsion': value })}
        description="节点之间的排斥力"
      />
    </div>

    <div className="space-y-3">
      <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider border-b border-neutral-700 pb-2">
        连接样式
      </h4>
      <Toggle
        label="曲线连接"
        checked={settings.curvedLinks}
        onChange={(checked) => onChange({ ...settings, 'curvedLinks': checked })}
        description="连接显示为曲线"
      />
      <Toggle
        label="显示箭头"
        checked={settings.linkDefaultArrows}
        onChange={(checked) => onChange({ ...settings, 'linkDefaultArrows': checked })}
        description="在连接上显示方向箭头"
      />
      <Slider
        label="连接宽度缩放"
        value={settings.linkWidthScale}
        min={0.1}
        max={10}
        step={0.1}
        onChange={(value) => onChange({ ...settings, 'linkWidthScale': value })}
      />
      <Slider
        label="连接不透明度"
        value={settings.linkOpacity}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) => onChange({ ...settings, 'linkOpacity': value })}
      />
    </div>

    <div className="space-y-3">
      <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider border-b border-neutral-700 pb-2">
        节点样式
      </h4>
      <Slider
        label="节点大小缩放"
        value={settings.pointSizeScale}
        min={0.1}
        max={10}
        step={0.1}
        onChange={(value) => onChange({ ...settings, 'pointSizeScale': value })}
      />
      <Slider
        label="节点不透明度"
        value={settings.pointOpacity}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) => onChange({ ...settings, 'pointOpacity': value })}
      />
    </div>
  </div>
);

const DeckGLSettingsPanel = ({
  settings,
  onChange
}: {
  settings: DeckGLSettings;
  onChange: (settings: DeckGLSettings) => void;
}) => (
  <div className="space-y-4">
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider border-b border-neutral-700 pb-2">
        辐射布局
      </h4>
      <Slider
        label="基础半径"
        value={settings.baseRadius}
        min={100}
        max={2000}
        step={50}
        onChange={(value) => onChange({ ...settings, 'baseRadius': value })}
        description="第一层节点的圆环半径"
      />
      <Slider
        label="半径增量"
        value={settings.radiusStep}
        min={100}
        max={1000}
        step={50}
        onChange={(value) => onChange({ ...settings, 'radiusStep': value })}
        description="每层节点之间的半径增量"
      />
    </div>

    <div className="space-y-3">
      <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider border-b border-neutral-700 pb-2">
        节点样式
      </h4>
      <Slider
        label="节点大小"
        value={settings.nodeSize}
        min={1}
        max={30}
        step={1}
        onChange={(value) => onChange({ ...settings, 'nodeSize': value })}
      />
      <Slider
        label="节点不透明度"
        value={settings.nodeOpacity}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) => onChange({ ...settings, 'nodeOpacity': value })}
      />
      <Slider
        label="节点边框宽度"
        value={settings.nodeStrokeWidth}
        min={0}
        max={5}
        step={0.5}
        onChange={(value) => onChange({ ...settings, 'nodeStrokeWidth': value })}
      />
    </div>

    <div className="space-y-3">
      <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider border-b border-neutral-700 pb-2">
        连接样式
      </h4>
      <Slider
        label="连接宽度"
        value={settings.linkWidth}
        min={0.5}
        max={10}
        step={0.5}
        onChange={(value) => onChange({ ...settings, 'linkWidth': value })}
      />
      <Slider
        label="连接不透明度"
        value={settings.linkOpacity}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) => onChange({ ...settings, 'linkOpacity': value })}
      />
    </div>
  </div>
);

export default function RendererSettingsPanel ({
  isOpen,
  onClose,
  currentRenderer,
  forceGraphSettings,
  cosmosGLSettings,
  deckGLSettings,
  onForceGraphSettingsChange,
  onCosmosGLSettingsChange,
  onDeckGLSettingsChange
}: RendererSettingsPanelProps) {
  if (!isOpen) {
    return null;
  }

  const isForceGraph = currentRenderer === 'force-graph-3d' || currentRenderer === 'force-graph-2d';
  const isCosmosGL = currentRenderer === 'cosmos-gl';
  const isDeckGL = currentRenderer === 'deck-gl';

  const handleReset = () => {
    if (isForceGraph) {
      onForceGraphSettingsChange(DEFAULT_FORCE_GRAPH_SETTINGS);
    } else if (isCosmosGL) {
      onCosmosGLSettingsChange(DEFAULT_COSMOS_GL_SETTINGS);
    } else if (isDeckGL) {
      onDeckGLSettingsChange(DEFAULT_DECK_GL_SETTINGS);
    }
  };

  const hasSettings = isForceGraph || isCosmosGL || isDeckGL;

  return (
    <div className="fixed right-0 top-16 h-[calc(100vh-64px)] w-80 bg-neutral-800 border-l border-neutral-700 shadow-2xl z-40 flex flex-col animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b border-neutral-700">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-neutral-400" />
          <h2 className="text-sm font-medium text-neutral-100">渲染器设置</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-700 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isForceGraph && (
          <ForceGraphSettingsPanel
            settings={forceGraphSettings}
            onChange={onForceGraphSettingsChange}
          />
        )}
        {isCosmosGL && (
          <CosmosGLSettingsPanel
            settings={cosmosGLSettings}
            onChange={onCosmosGLSettingsChange}
          />
        )}
        {isDeckGL && (
          <DeckGLSettingsPanel
            settings={deckGLSettings}
            onChange={onDeckGLSettingsChange}
          />
        )}
        {!hasSettings && (
          <div className="text-center text-neutral-500 text-sm py-8">
            当前渲染器暂无可配置参数
          </div>
        )}
      </div>

      {hasSettings && (
        <div className="p-4 border-t border-neutral-700">
          <button
            onClick={handleReset}
            className="w-full py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition-colors text-sm font-medium"
          >
            重置为默认值
          </button>
        </div>
      )}
    </div>
  );
}

export type { ForceGraphSettings, CosmosGLSettings, DeckGLSettings };
