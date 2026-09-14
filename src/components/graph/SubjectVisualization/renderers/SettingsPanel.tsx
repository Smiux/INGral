import { Settings, X } from 'lucide-react';
import type { RendererType } from './types';
import {
  type ForceGraphSettings,
  type CosmosGLSettings,
  type DagMode,
  DAG_MODE_OPTIONS,
  DEFAULT_FORCE_GRAPH_SETTINGS,
  DEFAULT_COSMOS_GL_SETTINGS
} from './settingsTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentRenderer: RendererType;
  forceGraphSettings: ForceGraphSettings;
  cosmosGLSettings: CosmosGLSettings;
  onForceGraphSettingsChange: (settings: ForceGraphSettings) => void;
  onCosmosGLSettingsChange: (settings: CosmosGLSettings) => void;
}

function Slider ({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-xs text-slate-700 dark:text-slate-300"><span>{label}</span><span>{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-sky-500" />
    </label>
  );
}

function ForceGraphSettings ({ settings, onChange }: { settings: ForceGraphSettings; onChange: (settings: ForceGraphSettings) => void }) {
  return <div className="space-y-4">
    <select value={settings.dagMode === null ? 'null' : settings.dagMode} onChange={(event) => onChange({ ...settings, 'dagMode': event.target.value === 'null' ? null : event.target.value as DagMode })} className="w-full rounded border border-slate-200/60 bg-slate-100/50 px-2 py-1.5 text-xs dark:border-slate-700/60 dark:bg-slate-800/50">
      {DAG_MODE_OPTIONS.map((option) => <option key={option.value ?? 'null'} value={option.value ?? 'null'}>{option.label}</option>)}
    </select>
    <Slider label="层级距离" value={settings.dagLevelDistance} min={20} max={2000} step={10} onChange={(value) => onChange({ ...settings, 'dagLevelDistance': value })} />
    <Slider label="节点大小" value={settings.nodeRelSize} min={0.5} max={50} step={0.5} onChange={(value) => onChange({ ...settings, 'nodeRelSize': value })} />
    <Slider label="节点不透明度" value={settings.nodeOpacity} min={0} max={1} step={0.05} onChange={(value) => onChange({ ...settings, 'nodeOpacity': value })} />
    <Slider label="连接宽度" value={settings.linkWidth} min={0} max={20} step={0.5} onChange={(value) => onChange({ ...settings, 'linkWidth': value })} />
    <Slider label="连接不透明度" value={settings.linkOpacity} min={0} max={1} step={0.05} onChange={(value) => onChange({ ...settings, 'linkOpacity': value })} />
  </div>;
}

function CosmosSettings ({ settings, onChange }: { settings: CosmosGLSettings; onChange: (settings: CosmosGLSettings) => void }) {
  return <div className="space-y-4">
    <label className="flex justify-between text-xs text-slate-700 dark:text-slate-300"><span>模拟暂停</span><input type="checkbox" checked={settings.simulationPaused} onChange={(event) => onChange({ ...settings, 'simulationPaused': event.target.checked })} /></label>
    <Slider label="摩擦力" value={settings.simulationFriction} min={0} max={1} step={0.01} onChange={(value) => onChange({ ...settings, 'simulationFriction': value })} />
    <Slider label="引力" value={settings.simulationGravity} min={0} max={2} step={0.01} onChange={(value) => onChange({ ...settings, 'simulationGravity': value })} />
    <Slider label="斥力" value={settings.simulationRepulsion} min={0} max={10} step={0.1} onChange={(value) => onChange({ ...settings, 'simulationRepulsion': value })} />
    <Slider label="节点大小缩放" value={settings.pointSizeScale} min={0.1} max={10} step={0.1} onChange={(value) => onChange({ ...settings, 'pointSizeScale': value })} />
    <Slider label="节点不透明度" value={settings.pointOpacity} min={0} max={1} step={0.05} onChange={(value) => onChange({ ...settings, 'pointOpacity': value })} />
    <Slider label="连接宽度缩放" value={settings.linkWidthScale} min={0.1} max={10} step={0.1} onChange={(value) => onChange({ ...settings, 'linkWidthScale': value })} />
    <Slider label="连接不透明度" value={settings.linkOpacity} min={0} max={1} step={0.05} onChange={(value) => onChange({ ...settings, 'linkOpacity': value })} />
  </div>;
}

export default function RendererSettingsPanel ({ isOpen, onClose, currentRenderer, forceGraphSettings, cosmosGLSettings, onForceGraphSettingsChange, onCosmosGLSettingsChange }: Props) {
  if (!isOpen) {
    return null;
  }
  const isForceGraph = currentRenderer === 'force-graph-3d';
  return <div className="fixed right-0 top-14 z-40 flex h-[calc(100vh-56px)] w-80 flex-col border-l border-slate-200/60 bg-slate-100/90 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/90">
    <div className="flex items-center justify-between border-b border-slate-200/60 p-4 dark:border-slate-700/60"><div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><Settings className="h-4 w-4" />渲染器设置</div><button onClick={onClose}><X className="h-4 w-4" /></button></div>
    <div className="flex-1 overflow-y-auto p-4">{isForceGraph ? <ForceGraphSettings settings={forceGraphSettings} onChange={onForceGraphSettingsChange} /> : <CosmosSettings settings={cosmosGLSettings} onChange={onCosmosGLSettingsChange} />}</div>
    <div className="border-t border-slate-200/60 p-4 dark:border-slate-700/60"><button onClick={() => isForceGraph ? onForceGraphSettingsChange(DEFAULT_FORCE_GRAPH_SETTINGS) : onCosmosGLSettingsChange(DEFAULT_COSMOS_GL_SETTINGS)} className="w-full rounded bg-slate-200/60 px-4 py-2 text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">重置为默认值</button></div>
  </div>;
}

export type { ForceGraphSettings, CosmosGLSettings };
