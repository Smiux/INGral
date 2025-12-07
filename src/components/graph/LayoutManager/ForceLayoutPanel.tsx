import React, { useState } from 'react';
import type { ForceParameters } from '../GraphVisualization/types';

interface ForceLayoutPanelProps {
  forceParameters: ForceParameters | undefined;
  onForceParametersChange: (params: ForceParameters) => void;
  isSimulationRunning: boolean;
  onSimulationToggle: () => void;
}

interface SavedConfig {
  id: string;
  name: string;
  description: string;
  parameters: ForceParameters;
  createdAt: number;
}

export const ForceLayoutPanel: React.FC<ForceLayoutPanelProps> = ({
  forceParameters,
  onForceParametersChange,
  isSimulationRunning,
  onSimulationToggle
}) => {
  // 预设配置方案
  const presetConfigs = [
    {
      name: '密集布局',
      description: '适合节点数量较少的图谱，节点间距较小',
      parameters: { charge: -200, linkStrength: 0.2, linkDistance: 100, gravity: 0.2 }
    },
    {
      name: '稀疏布局',
      description: '适合节点数量较多的图谱，节点间距较大',
      parameters: { charge: -500, linkStrength: 0.05, linkDistance: 200, gravity: 0.05 }
    },
    {
      name: '平衡布局',
      description: '平衡的节点间距和连接强度，适合大多数场景',
      parameters: { charge: -300, linkStrength: 0.1, linkDistance: 150, gravity: 0.1 }
    },
    {
      name: '强连接布局',
      description: '链接强度较大，节点间连接紧密',
      parameters: { charge: -250, linkStrength: 0.3, linkDistance: 120, gravity: 0.15 }
    }
  ];

  // 保存的配置
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([
    // 初始示例配置
    {
      id: '1',
      name: '我的配置',
      description: '自定义的力导向布局配置',
      parameters: { charge: -400, linkStrength: 0.15, linkDistance: 180, gravity: 0.08 },
      createdAt: Date.now() - 86400000
    }
  ]);

  // 当前编辑的配置
  const [editingConfig, setEditingConfig] = useState<Partial<SavedConfig>>({
    name: '',
    description: ''
  });

  // 对话框状态
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);

  // 更新单个参数
  const updateParameter = (key: keyof ForceParameters, value: number) => {
    onForceParametersChange({
      ...forceParameters,
      [key]: value
    });
  };

  // 应用预设配置
  const applyPreset = (preset: typeof presetConfigs[0]) => {
    onForceParametersChange(preset.parameters);
  };

  // 保存配置
  const saveConfig = () => {
    if (!editingConfig.name) return;

    const newConfig: SavedConfig = {
      id: Date.now().toString(),
      name: editingConfig.name,
      description: editingConfig.description || '',
      parameters: forceParameters || {},
      createdAt: Date.now()
    };

    setSavedConfigs(prev => [...prev, newConfig]);
    setShowSaveDialog(false);
    setEditingConfig({ name: '', description: '' });
  };

  // 加载配置
  const loadConfig = (config: SavedConfig) => {
    onForceParametersChange(config.parameters);
    setShowLoadDialog(false);
  };

  // 删除配置
  const deleteConfig = (configId: string) => {
    setSavedConfigs(prev => prev.filter(config => config.id !== configId));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4">
      {/* 面板标题 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">力导向布局参数</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            模拟状态: 
            <span className={`font-medium ${isSimulationRunning ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {isSimulationRunning ? '运行中' : '已停止'}
            </span>
          </span>
          <button
            onClick={onSimulationToggle}
            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
          >
            {isSimulationRunning ? '暂停' : '启动'}
          </button>
        </div>
      </div>

      {/* 参数调整区 */}
      <div className="space-y-4">
        {/* 节点排斥力 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            节点排斥力: {forceParameters?.charge ?? -300}
          </label>
          <input
            type="range"
            min="-1000"
            max="100"
            step="10"
            value={forceParameters?.charge ?? -300}
            onChange={(e) => updateParameter('charge', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            控制节点之间的排斥力，值越小排斥力越强，节点间距越大
          </p>
        </div>

        {/* 链接强度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            链接强度: {(forceParameters?.linkStrength ?? 0.1).toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={forceParameters?.linkStrength ?? 0.1}
            onChange={(e) => updateParameter('linkStrength', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            控制链接的抗拉强度，值越大节点间连接越紧密
          </p>
        </div>

        {/* 链接距离 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            链接距离: {forceParameters?.linkDistance ?? 150}px
          </label>
          <input
            type="range"
            min="50"
            max="300"
            step="10"
            value={forceParameters?.linkDistance ?? 150}
            onChange={(e) => updateParameter('linkDistance', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            控制节点间连接的理想距离，影响整体布局的稀疏程度
          </p>
        </div>

        {/* 重力 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            重力: {(forceParameters?.gravity ?? 0.1).toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={forceParameters?.gravity ?? 0.1}
            onChange={(e) => updateParameter('gravity', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            控制节点向中心聚集的趋势，值越大布局越紧凑
          </p>
        </div>
      </div>

      {/* 预设配置区 */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">预设配置方案</h4>
        <div className="grid grid-cols-2 gap-2">
          {presetConfigs.map((preset, index) => (
            <button
              key={index}
              onClick={() => applyPreset(preset)}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors text-left"
            >
              <div className="font-medium text-gray-900 dark:text-white">{preset.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 配置管理区 */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">自定义配置管理</h4>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            保存配置
          </button>
          <button
            onClick={() => setShowLoadDialog(true)}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            加载配置
          </button>
        </div>
      </div>

      {/* 保存配置对话框 */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">保存配置</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  配置名称 *
                </label>
                <input
                  type="text"
                  value={editingConfig.name}
                  onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入配置名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  配置描述
                </label>
                <textarea
                  value={editingConfig.description}
                  onChange={(e) => setEditingConfig({ ...editingConfig, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="输入配置描述（可选）"
                ></textarea>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveConfig}
                disabled={!editingConfig.name}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${!editingConfig.name ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500 dark:text-gray-400' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white'}`}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 加载配置对话框 */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">加载配置</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {savedConfigs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{config.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {config.description || '无描述'}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      保存于: {new Date(config.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => loadConfig(config)}
                      className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-md transition-colors"
                    >
                      加载
                    </button>
                    <button
                      onClick={() => deleteConfig(config.id)}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-md transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowLoadDialog(false)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};