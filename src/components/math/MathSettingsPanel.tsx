import { X, Settings, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type CosmosGLSettings, DEFAULT_COSMOS_GL_SETTINGS } from './settings';

interface MathSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CosmosGLSettings;
  onSettingsChange: (settings: CosmosGLSettings) => void;
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
      <label className="text-xs text-slate-500 dark:text-slate-400">{label}</label>
      <span className="text-xs text-slate-300 dark:text-slate-600 font-mono">{displayValue ?? value.toFixed(step < 1 ? 2 : 0)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-200/60 dark:bg-slate-700/60 rounded appearance-none cursor-pointer accent-sky-500"
    />
    {description && <p className="text-[10px] text-slate-300 dark:text-slate-600">{description}</p>}
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
      <label className="text-xs text-slate-500 dark:text-slate-400">{label}</label>
      {description && <p className="text-[10px] text-slate-300 dark:text-slate-600">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? 'bg-sky-500/15' : 'bg-slate-200/60 dark:bg-slate-700/60'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
        style={{ 'backgroundColor': checked ? '#38bdf8' : '#94a3b8' }}
      />
    </button>
  </div>
);

export default function MathSettingsPanel ({ isOpen, onClose, settings, onSettingsChange }: MathSettingsPanelProps) {
  const update = (partial: Partial<CosmosGLSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ 'x': 320, 'opacity': 0 }}
          animate={{ 'x': 0, 'opacity': 1 }}
          exit={{ 'x': 320, 'opacity': 0 }}
          transition={{ 'type': 'spring', 'damping': 25, 'stiffness': 250 }}
          className="fixed right-0 top-0 h-full w-80 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm border-l border-slate-200/60 dark:border-slate-700/60 z-50 flex flex-col"
        >
          <div className="flex items-center justify-between p-3 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              <h2 className="text-sm font-medium text-slate-600 dark:text-slate-300">渲染设置</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                力导向模拟
              </h4>
              <Toggle
                label="模拟暂停"
                checked={settings.simulationPaused}
                onChange={(checked) => update({ 'simulationPaused': checked })}
                description="暂停/恢复力导向模拟"
              />
              <Slider
                label="摩擦力"
                value={settings.simulationFriction}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => update({ 'simulationFriction': v })}
                description="节点运动的摩擦系数"
              />
              <Slider
                label="引力"
                value={settings.simulationGravity}
                min={0}
                max={2}
                step={0.01}
                onChange={(v) => update({ 'simulationGravity': v })}
                description="将节点拉向中心的力"
              />
              <Slider
                label="斥力"
                value={settings.simulationRepulsion}
                min={0}
                max={10}
                step={0.1}
                onChange={(v) => update({ 'simulationRepulsion': v })}
                description="节点之间的排斥力"
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                连接样式
              </h4>
              <Slider
                label="连接宽度缩放"
                value={settings.linkWidthScale}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(v) => update({ 'linkWidthScale': v })}
              />
              <Slider
                label="连接不透明度"
                value={settings.linkOpacity}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => update({ 'linkOpacity': v })}
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                节点样式
              </h4>
              <Slider
                label="节点大小缩放"
                value={settings.pointSizeScale}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(v) => update({ 'pointSizeScale': v })}
              />
              <Slider
                label="节点不透明度"
                value={settings.pointOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => update({ 'pointOpacity': v })}
              />
            </div>
          </div>

          <div className="p-3 border-t border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => onSettingsChange(DEFAULT_COSMOS_GL_SETTINGS)}
              className="w-full py-2 px-4 bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置为默认值
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
