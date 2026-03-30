import { useState, useEffect, useRef } from 'react';
import { Users, Wifi, Loader2, X, Palette, User, MessageCircle, List } from 'lucide-react';
import { useCollaboration } from '../collaboration';

type TabType = 'profile' | 'users' | 'chat';

interface CollaborationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CollaborationPanel ({ isOpen, onClose }: CollaborationPanelProps) {
  const {
    isConnected,
    isConnecting,
    roomId,
    userName,
    userColor,
    collaborators,
    messages,
    connect,
    disconnect,
    setUserName,
    setUserColor,
    sendMessage
  } = useCollaboration();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [inputRoomId, setInputRoomId] = useState('');
  const [inputUserName, setInputUserName] = useState(userName);
  const [showNameInput, setShowNameInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tempColor, setTempColor] = useState(userColor);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputUserName(userName);
  }, [userName]);

  useEffect(() => {
    setTempColor(userColor);
  }, [userColor]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ 'behavior': 'smooth' });
  }, [messages]);

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

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      sendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[80vh]"
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

        {isConnected ? (
          <>
            <div className="flex border-b border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'profile'
                    ? 'text-sky-500 border-b-2 border-sky-500'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <User size={16} />
                个人信息
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'text-sky-500 border-b-2 border-sky-500'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <List size={16} />
                在线列表
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                  {collaborators.length + 1}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'chat'
                    ? 'text-sky-500 border-b-2 border-sky-500'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <MessageCircle size={16} />
                聊天室
                {messages.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full">
                    {messages.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">你的颜色</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-neutral-800 shadow"
                        style={{ 'backgroundColor': tempColor }}
                      />
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <Palette size={16} className="text-neutral-500" />
                      </button>
                    </div>
                  </div>

                  {showColorPicker && (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg space-y-3">
                      <input
                        type="color"
                        value={tempColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-full h-10 rounded cursor-pointer"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleColorCancel}
                          className="flex-1 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleColorSave}
                          className="flex-1 py-1.5 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">你的名字</span>
                    <button
                      onClick={() => {
                        setInputUserName(userName);
                        setShowNameInput(true);
                      }}
                      className="text-sm text-sky-500 hover:text-sky-600"
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
                        className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleNameSave();
                          }
                        }}
                      />
                      <button
                        onClick={handleNameSave}
                        className="px-3 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm"
                      >
                        保存
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-700/50">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ 'backgroundColor': userColor }}
                    >
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-neutral-800 dark:text-neutral-200">{userName}</div>
                      <div className="flex items-center gap-1.5 text-xs text-green-500">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        你
                      </div>
                    </div>
                  </div>

                  {collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ 'backgroundColor': collaborator.color }}
                      >
                        {collaborator.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-neutral-800 dark:text-neutral-200">{collaborator.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-green-500">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          在线
                        </div>
                      </div>
                    </div>
                  ))}

                  {collaborators.length === 0 && (
                    <div className="text-center text-sm text-neutral-500 py-4">
                      暂无其他协作者
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-[200px]">
                    {messages.length === 0 && (
                      <div className="text-center text-sm text-neutral-500 py-8">
                        暂无消息
                      </div>
                    )}
                    {messages.map((msg) => {
                      const isOwn = msg.userId === 'self' || msg.userId === userName;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                        >
                          <div className="text-xs text-neutral-500 mb-1">{msg.userName}</div>
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                              isOwn
                                ? 'bg-sky-500 text-white'
                                : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                            }`}
                            style={!isOwn && msg.userColor ? { 'borderLeft': `3px solid ${msg.userColor}` } : undefined}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="输入消息..."
                      className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm"
                    >
                      发送
                    </button>
                  </div>
                </div>
              )}
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
  const { isConnected, isConnecting, collaborators } = useCollaboration();
  const [showPanel, setShowPanel] = useState(false);

  const getStatusIcon = () => {
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
