/**
 * 管理面板组件
 * 合并节点和连接管理功能，通过标签页切换
 */
import React, { useState } from 'react';
import { Database, Link as LinkIcon } from 'lucide-react';
import type { EnhancedNode, EnhancedGraphConnection } from './types';
import { NodeManagement } from './NodeManagement';
import { LinkManagement } from './LinkManagement';

/**
 * 管理面板组件属性
 */
export interface ManagePanelProps {
  // 节点数据
  nodes: EnhancedNode[];
  // 连接数据
  connections: EnhancedGraphConnection[];
  // 设置节点
  setNodes: (_nodes: EnhancedNode[]) => void;
  // 设置连接
  setConnections: (_connections: EnhancedGraphConnection[]) => void;
  // 选中的节点
  selectedNode: EnhancedNode | null;
  // 设置选中的节点
  setSelectedNode: (_node: EnhancedNode | null) => void;
  // 选中的节点列表
  selectedNodes: EnhancedNode[];
  // 设置选中的节点列表
  setSelectedNodes: (_nodes: EnhancedNode[]) => void;
  // 选中的连接
  selectedConnections: EnhancedGraphConnection[];
  // 设置选中的连接
  setSelectedConnections: (_connections: EnhancedGraphConnection[]) => void;
  // 是否正在添加连接
  isAddingConnection: boolean;
  // 设置是否正在添加连接
  setIsAddingConnection: (_isAddingConnection: boolean) => void;
  // 连接源节点
  connectionSourceNode: EnhancedNode | null;
  // 设置连接源节点
  setConnectionSourceNode: (_node: EnhancedNode | null) => void;
  // 设置鼠标位置
  setMousePosition: (_position: { x: number; y: number } | null) => void;
  // 显示通知
  showNotification: (_message: string, _type: 'success' | 'error' | 'info') => void;
  // 添加节点回调
  onAddNode?: (_node: EnhancedNode) => void;
  // 删除节点回调
  onDeleteNodes?: (_nodes: EnhancedNode[], _connections: EnhancedGraphConnection[]) => void;
}

/**
 * 管理面板组件
 * @param props - 组件属性
 */
export const ManagePanel: React.FC<ManagePanelProps> = ({
  nodes,
  connections,
  setNodes,
  setConnections,
  selectedNode,
  setSelectedNode,
  selectedNodes,
  setSelectedNodes,
  selectedConnections,
  setSelectedConnections,
  isAddingConnection,
  setIsAddingConnection,
  connectionSourceNode,
  setConnectionSourceNode,
  setMousePosition,
  showNotification,
  onAddNode,
  onDeleteNodes
}) => {
  // 初始选中的标签页
  const [activeTab, setActiveTab] = useState<'nodes' | 'connections'>('nodes');

  // 不再需要转换函数，直接使用GraphActions方法

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      {/* 标签页导航 */}
      <div className="mb-4">
        <div className="flex space-x-1 rounded-md bg-gray-100 p-1">
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${activeTab === 'nodes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('nodes')}
          >
            <div className="flex items-center justify-center gap-2">
              <Database size={16} />
              节点管理
            </div>
          </button>
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${activeTab === 'connections' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('connections')}
          >
            <div className="flex items-center justify-center gap-2">
              <LinkIcon size={16} />
              连接管理
            </div>
          </button>
        </div>
      </div>

      {/* 标签页内容 */}
      <div className="space-y-4">
        {activeTab === 'nodes' && (
          <NodeManagement
            nodes={nodes}
            connections={connections}
            setNodes={setNodes}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            selectedNodes={selectedNodes}
            setSelectedNodes={setSelectedNodes}
            showNotification={showNotification}
            onAddNode={onAddNode || (() => {})}
            onDeleteNodes={onDeleteNodes || (() => {})}
          />
        )}

        {activeTab === 'connections' && (
          <LinkManagement
            connections={connections}
            setConnections={setConnections}
            nodes={nodes}
            setNodes={setNodes}
            isAddingConnection={isAddingConnection}
            setIsAddingConnection={setIsAddingConnection}
            connectionSourceNode={connectionSourceNode}
            setConnectionSourceNode={setConnectionSourceNode}
            mousePosition={null}
            setMousePosition={setMousePosition}
            showNotification={showNotification}
            selectedConnections={selectedConnections}
            setSelectedConnections={setSelectedConnections}
          />
        )}
      </div>
    </div>
  );
};
