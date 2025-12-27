/**
 * 管理面板组件
 * 合并节点和连接管理功能，通过标签页切换
 */
import React, { useState } from 'react';
import { Database, Link as LinkIcon } from 'lucide-react';
import type { GraphNode, GraphConnection, GraphActions } from './GraphTypes';
import { NodeManagement } from './NodeManagement';
import { LinkManagement } from './LinkManagement';

export interface ManagePanelProps {
  nodes: GraphNode[];
  connections: GraphConnection[];
  setNodes: (_nodes: GraphNode[]) => void;
  setConnections: (_connections: GraphConnection[]) => void;
  selectedNode: GraphNode | null;
  setSelectedNode: (_node: GraphNode | null) => void;
  selectedNodes: GraphNode[];
  setSelectedNodes: (_nodes: GraphNode[]) => void;
  selectedConnections: GraphConnection[];
  setSelectedConnections: (_connections: GraphConnection[]) => void;
  isAddingConnection: boolean;
  setIsAddingConnection: (_isAddingConnection: boolean) => void;
  connectionSourceNode: GraphNode | null;
  setConnectionSourceNode: (_node: GraphNode | null) => void;
  showNotification: (_message: string, _type: 'success' | 'error' | 'info') => void;
  onAddNode?: (_node: GraphNode) => void;
  onDeleteNodes?: (_nodes: GraphNode[], _connections: GraphConnection[]) => void;
  actions: GraphActions;
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
  showNotification,
  onAddNode,
  actions
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
            onDeleteNodes={(nodesToDelete, connectionsToDelete) => {
              nodesToDelete.forEach(n => actions.deleteNode(n.id));
              connectionsToDelete.forEach(c => actions.deleteConnection(c.id));
            }}
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
            showNotification={showNotification}
            selectedConnections={selectedConnections}
            setSelectedConnections={setSelectedConnections}
          />
        )}
      </div>
    </div>
  );
};
