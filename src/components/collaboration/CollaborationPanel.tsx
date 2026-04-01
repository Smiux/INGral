import { useState, useEffect } from 'react';
import { Users, Wifi, Loader2, X, Palette, AlertTriangle, RefreshCw, ChevronLeft } from 'lucide-react';
import { useCollaboration } from '../collaboration';
import { ChatPanel } from './ChatPanel';
import { Avatar } from './Avatar';

interface CollaborationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SidePanelType = 'profile' | 'users' | null;

export function CollaborationPanel ({ isOpen, onClose }: CollaborationPanelProps) {
  const {
    isConnected,
    isConnecting,
    connectionStatus,
    roomId,
    userName,
    userColor,
    collaborators,
    connect,
    disconnect,
    setUserName,
    setUserColor
  } = useCollaboration();

  const [inputRoomId, setInputRoomId] = useState('');
  const [inputUserName, setInputUserName] = useState(userName);
  const [showNameInput, setShowNameInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tempColor, setTempColor] = useState(userColor);
  const [sidePanel, setSidePanel] = useState<SidePanelType>(null);

  useEffect(() => {
    setInputUserName(userName);
  }, [userName]);

  useEffect(() => {
    setTempColor(userColor);
  }, [userColor]);

  const handleConnect = () => {
    if (inputUserName.trim() && inputUserName.trim() !== userName) {
      setUserName(inputUserName.trim());
    }
    if (inputRoomId.trim()) {
      connect(inputRoomId.trim());
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setInputRoomId('');
  };

  const handleNameSave = () => {
    if (inputUserName.trim()) {
      setUserName(inputUserName.trim());
    }
    setShowNameInput(false);
  };

  const handleColorChange = (color: string) => {
    setTempColor(color);
  };

  const handleColorSave = () => {
    setUserColor(tempColor);
    setShowColorPicker(false);
  };

  const handleColorCancel = () => {
    setTempColor(userColor);
    setShowColorPicker(false);
  };

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connecting':
        return { 'text': '连接中...', 'color': 'text-yellow-500', 'icon': <Loader2 size={14} className="animate-spin" /> };
      case 'connected':
        return { 'text': '已连接', 'color': 'text-green-500', 'icon': <Wifi size={14} /> };
      case 'reconnecting':
        return { 'text': '重连中...', 'color': 'text-orange-500', 'icon': <RefreshCw size={14} className="animate-spin" /> };
      case 'error':
        return { 'text': '连接错误', 'color': 'text-red-500', 'icon': <AlertTriangle size={14} /> };
      case 'disconnected':
      default:
        return { 'text': '未连接', 'color': 'text-neutral-500', 'icon': <Wifi size={14} /> };
    }
  };

  const statusDisplay = getConnectionStatusDisplay();

  if (!isOpen) {
    return null;
  }

  const toggleSidePanel = (panel: SidePanelType) => {
    setSidePanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">协作管理</h3>
            {isConnected && (
              <code className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs font-mono">
                {roomId}
              </code>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <X size={18} className="text-neutral-500" />
          </button>
        </div>

        {isConnected || connectionStatus === 'reconnecting' ? (
          <>
            {(connectionStatus === 'reconnecting' || connectionStatus === 'error') && (
              <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                  <RefreshCw size={14} className={connectionStatus === 'reconnecting' ? 'animate-spin' : ''} />
                  {connectionStatus === 'reconnecting' ? '连接已断开，正在重新连接...' : '连接出现问题，请检查网络'}
                </div>
              </div>
            )}

            <div className="flex flex-1 overflow-hidden">
              {sidePanel && (
                <div className="w-64 border-r border-neutral-200 dark:border-neutral-700 flex flex-col bg-neutral-50 dark:bg-neutral-900/30">
                  <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                    <span className="font-medium text-sm text-neutral-800 dark:text-neutral-200">
                      {sidePanel === 'profile' ? '个人信息' : '在线列表'}
                    </span>
                    <button
                      onClick={() => setSidePanel(null)}
                      className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                    >
                      <ChevronLeft size={16} className="text-neutral-500" />
                    </button>
                  </div>

                  {sidePanel === 'profile' && (
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">连接状态</span>
                        <div className={`flex items-center gap-1 text-xs ${statusDisplay.color}`}>
                          {statusDisplay.icon}
                          {statusDisplay.text}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">你的颜色</span>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full border border-white dark:border-neutral-800 shadow"
                            style={{ 'backgroundColor': tempColor }}
                          />
                          <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                          >
                            <Palette size={14} className="text-neutral-500" />
                          </button>
                        </div>
                      </div>

                      {showColorPicker && (
                        <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg space-y-2">
                          <input
                            type="color"
                            value={tempColor}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="w-full h-8 rounded cursor-pointer"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleColorCancel}
                              className="flex-1 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            >
                              取消
                            </button>
                            <button
                              onClick={handleColorSave}
                              className="flex-1 py-1 text-xs bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors"
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">你的名字</span>
                        <button
                          onClick={() => {
                            setInputUserName(userName);
                            setShowNameInput(true);
                          }}
                          className="text-xs text-sky-500 hover:text-sky-600"
                        >
                          {userName}
                        </button>
                      </div>

                      {showNameInput && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={inputUserName}
                            onChange={(e) => setInputUserName(e.target.value)}
                            placeholder="输入你的名字"
                            className="flex-1 px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-sky-400 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleNameSave();
                              }
                            }}
                          />
                          <button
                            onClick={handleNameSave}
                            className="px-2 py-1.5 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors text-xs"
                          >
                            保存
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {sidePanel === 'users' && (
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-neutral-800">
                        <Avatar userId={userName} size={28} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs text-neutral-800 dark:text-neutral-200 truncate">{userName}</div>
                          <div className="flex items-center gap-1 text-[10px] text-green-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            你
                          </div>
                        </div>
                      </div>

                      {collaborators.map((collaborator) => (
                        <div key={collaborator.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-neutral-800 transition-colors">
                          <Avatar userId={collaborator.id} size={28} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs text-neutral-800 dark:text-neutral-200 truncate">{collaborator.name}</div>
                            <div className="flex items-center gap-1 text-[10px] text-green-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              在线
                            </div>
                          </div>
                        </div>
                      ))}

                      {collaborators.length === 0 && (
                        <div className="text-center text-xs text-neutral-500 py-4">
                          暂无其他协作者
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 flex flex-col overflow-hidden">
                <ChatPanel
                  onShowProfile={() => toggleSidePanel('profile')}
                  onShowUsers={() => toggleSidePanel('users')}
                  showProfile={sidePanel === 'profile'}
                  showUsers={sidePanel === 'users'}
                />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={handleDisconnect}
                className="w-full py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium"
              >
                离开房间
              </button>
            </div>
          </>
        ) : (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  房间ID
                </label>
                <input
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  placeholder="输入房间ID或创建新房间"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConnect();
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  你的名字
                </label>
                <input
                  type="text"
                  value={inputUserName}
                  onChange={(e) => setInputUserName(e.target.value)}
                  placeholder={userName}
                  className={`w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                    inputUserName ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-400'
                  }`}
                />
              </div>
            </div>

            <button
              onClick={handleConnect}
              disabled={!inputRoomId.trim() || isConnecting}
              className="w-full py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isConnecting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  连接中...
                </span>
              ) : (
                '加入协作'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CollaborationControls () {
  const { isConnected, isConnecting, connectionStatus, collaborators } = useCollaboration();
  const [showPanel, setShowPanel] = useState(false);

  const getStatusIcon = () => {
    if (connectionStatus === 'reconnecting') {
      return <RefreshCw size={16} className="animate-spin text-orange-500" />;
    }
    if (connectionStatus === 'error') {
      return <AlertTriangle size={16} className="text-red-500" />;
    }
    if (isConnecting) {
      return <Loader2 size={16} className="animate-spin text-sky-400" />;
    }
    if (isConnected) {
      return <Wifi size={16} className="text-green-500" />;
    }
    return <Users size={16} className="text-sky-400" />;
  };

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        className="font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg focus:outline-none text-neutral-600 dark:text-neutral-300 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all duration-200"
      >
        {getStatusIcon()}
        <span className="text-sm">协作</span>
        {isConnected && collaborators.length > 0 && (
          <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-green-500 rounded-full">
            {collaborators.length + 1}
          </span>
        )}
      </button>

      <CollaborationPanel isOpen={showPanel} onClose={() => setShowPanel(false)} />
    </>
  );
}
