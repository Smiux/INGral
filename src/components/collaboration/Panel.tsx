import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Users,
  Wifi,
  Loader2,
  X,
  RefreshCw,
  Send,
  Hash,
  Plus,
  Trash2,
  Edit3,
  Image as ImageIcon,
  Music,
  PanelRight,
  ChevronRight,
  Play,
  Pause,
  ChevronDown,
  Clock,
  Reply,
  Pin,
  PinOff,
  MessageSquare,
  Video
} from 'lucide-react';
import { useCollaboration } from './ContextDef';
import { Avatar } from './internal/Avatar';
import { MediaPanel } from './internal/MediaPanel';
import {
  useStorage,
  useMutation,
  useMyPresence,
  useOthers,
  shallow,
  LiveObject,
  type Message as MessageType,
  type Channel,
  type Thread as ThreadType,
  type PinnedMessage as PinnedMessageType,
  type MessageAttachment
} from './liveblocks.config';

function formatTime (timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString('zh-CN', { 'hour': '2-digit', 'minute': '2-digit' });

  if (isToday) {
    return timeStr;
  }
  return date.toLocaleDateString('zh-CN', { 'month': 'short', 'day': 'numeric', 'hour': '2-digit', 'minute': '2-digit' });
}

function formatAudioTime (seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function AudioPlayer ({ src, isOwn }: { src: string; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) {
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) {
      return;
    }
    setCurrentTime(audioRef.current.currentTime);
    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress((newTime / audioRef.current.duration) * 100);
  };

  const bgColor = isOwn ? 'bg-sky-600/30 dark:bg-sky-600/30' : 'bg-neutral-200 dark:bg-neutral-700';
  const progressColor = isOwn ? 'bg-sky-300 dark:bg-sky-300' : 'bg-sky-400 dark:bg-sky-400';
  const textColor = isOwn ? 'text-sky-100 dark:text-sky-100' : 'text-neutral-700 dark:text-neutral-200';
  const iconColor = isOwn ? 'text-sky-200 dark:text-sky-200' : 'text-sky-500 dark:text-sky-400';

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${bgColor} min-w-[200px] max-w-[280px]`}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        onClick={togglePlay}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isOwn ? 'bg-sky-500/50 hover:bg-sky-500/70 dark:bg-sky-500/50 dark:hover:bg-sky-500/70' : 'bg-sky-500/30 hover:bg-sky-500/50 dark:bg-sky-500/30 dark:hover:bg-sky-500/50'} transition-colors`}
      >
        {isPlaying ? (
          <Pause size={16} className={iconColor} />
        ) : (
          <Play size={16} className={iconColor} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className="h-1.5 bg-neutral-300/50 dark:bg-neutral-600/50 rounded-full cursor-pointer overflow-hidden"
          onClick={handleProgressClick}
        >
          <div
            className={`h-full ${progressColor} rounded-full transition-all duration-100`}
            style={{ 'width': `${progress}%` }}
          />
        </div>
        <div className={`text-[10px] ${textColor} mt-1 flex justify-between`}>
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function formatLastAccessed (timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return '刚刚';
  }
  if (minutes < 60) {
    return `${minutes}分钟前`;
  }
  if (hours < 24) {
    return `${hours}小时前`;
  }
  if (days < 7) {
    return `${days}天前`;
  }
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

interface RoomInputProps {
  value: string;
  onChange: (value: string) => void;
  recentRooms: Array<{ id: string; lastAccessed: number }>;
  isLoadingRooms: boolean;
  refreshRooms: () => Promise<void>;
  onConnect: () => void;
}

function RoomInput ({
  value,
  onChange,
  recentRooms,
  isLoadingRooms,
  refreshRooms,
  onConnect
}: RoomInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredRooms = useMemo(() => {
    if (!value.trim()) {
      return recentRooms;
    }
    return recentRooms.filter((room) =>
      room.id.toLowerCase().includes(value.toLowerCase())
    );
  }, [recentRooms, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectRoom = (roomId: string) => {
    onChange(roomId);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onConnect();
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="输入房间ID或选择已有房间"
          className="w-full px-4 py-3 pr-16 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              refreshRooms();
            }}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            title="刷新房间列表"
          >
            {isLoadingRooms ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
          <button
            type="button"
            onClick={toggleDropdown}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && filteredRooms.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
        >
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer group"
              onClick={() => handleSelectRoom(room.id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Hash size={16} className="text-neutral-400 flex-shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-200 truncate">{room.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                  <Clock size={12} />
                  {formatLastAccessed(room.lastAccessed)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && value.trim() && filteredRooms.length === 0 && recentRooms.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl"
        >
          <div className="px-4 py-3 text-neutral-400 dark:text-neutral-500 text-sm">
            未找到匹配的房间
          </div>
        </div>
      )}

      {isOpen && recentRooms.length === 0 && !isLoadingRooms && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl"
        >
          <div className="px-4 py-3 text-neutral-400 dark:text-neutral-500 text-sm">
            暂无房间，请输入新的房间ID
          </div>
        </div>
      )}
    </div>
  );
}

function generateId (): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;
}

interface MessageItemProps {
  message: MessageType;
  isOwn: boolean;
  replyToMessage: MessageType | null;
  onEdit: (message: MessageType) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: MessageType) => void;
  onThread: (message: MessageType) => void;
  onPin: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  isPinned: boolean;
  hasThread: boolean;
  threadReplyCount: number;
  onOpenThread: (messageId: string) => void;
}

function MessageItem ({
  message,
  isOwn,
  replyToMessage,
  onEdit,
  onDelete,
  onReply,
  onThread,
  onPin,
  onUnpin,
  isPinned,
  hasThread,
  threadReplyCount,
  onOpenThread
}: MessageItemProps) {
  return (
    <div className={`group flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar userId={message.userId} size={32} />
      <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          {!isOwn && (
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              {message.userName}
            </span>
          )}
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{formatTime(message.createdAt)}</span>
          {message.editedAt !== null && (
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 italic">(已编辑)</span>
          )}
          {isPinned && (
            <Pin size={12} className="text-yellow-500" />
          )}
          {isOwn && (
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              你
            </span>
          )}
        </div>

        {replyToMessage && (
          <div className={`mb-1 px-2 py-1 rounded text-xs ${isOwn ? 'bg-sky-100 dark:bg-sky-600/20' : 'bg-neutral-200/50 dark:bg-neutral-700/50'} border-l-2 ${isOwn ? 'border-sky-400' : 'border-neutral-300 dark:border-neutral-500'}`}>
            <span className="text-neutral-500 dark:text-neutral-400">{replyToMessage.userName}: </span>
            <span className="text-neutral-600 dark:text-neutral-300 truncate max-w-[200px] inline-block align-bottom">
              {replyToMessage.content || '附件'}
            </span>
          </div>
        )}

        {message.content && (
          <div
            className={`px-3 py-2 rounded-lg text-sm break-words break-all ${
              isOwn
                ? 'bg-sky-500 text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100'
            }`}
          >
            {message.content}
          </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.attachments.map((attachment) => (
              <div key={attachment.id}>
                {attachment.type === 'image' && (
                  <img
                    src={attachment.data}
                    alt={attachment.fileName || '图片'}
                    className="max-w-[250px] rounded-lg border border-neutral-300 dark:border-neutral-600"
                  />
                )}
                {attachment.type === 'audio' && (
                  <AudioPlayer src={attachment.data} isOwn={isOwn} />
                )}
              </div>
            ))}
          </div>
        )}

        {hasThread && (
          <button
            onClick={() => onOpenThread(message.id)}
            className={`mt-1 flex items-center gap-1 text-xs ${isOwn ? 'text-sky-500 dark:text-sky-300' : 'text-sky-500 dark:text-sky-400'} hover:underline`}
          >
            <MessageSquare size={12} />
            {threadReplyCount} 条讨论
          </button>
        )}

        <div className={`opacity-0 group-hover:opacity-100 transition-opacity mt-1 ${isOwn ? 'flex-row-reverse' : ''} flex items-center gap-0.5`}>
          <button
            onClick={() => onReply(message)}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600/50 text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors"
            title="回复"
          >
            <Reply size={14} />
          </button>

          {!hasThread && (
            <button
              onClick={() => onThread(message)}
              className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600/50 text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors"
              title="创建讨论串"
            >
              <MessageSquare size={14} />
            </button>
          )}

          {isOwn && (
            <>
              <button
                onClick={() => onEdit(message)}
                className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600/50 text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors"
                title="编辑"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-600/50 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}

          {isPinned ? (
            <button
              onClick={() => onUnpin(message.id)}
              className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600/50 text-yellow-500 hover:text-yellow-400 transition-colors"
              title="取消置顶"
            >
              <PinOff size={14} />
            </button>
          ) : (
            <button
              onClick={() => onPin(message.id)}
              className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600/50 text-neutral-400 hover:text-yellow-500 transition-colors"
              title="置顶"
            >
              <Pin size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadPanel ({
  messages,
  currentUserId,
  onClose,
  onSendMessage
}: {
  messages: MessageType[];
  currentUserId: string;
  onClose: () => void;
  onSendMessage: (content: string) => void;
}) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ 'behavior': 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="w-80 bg-neutral-50 dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-sky-500 dark:text-sky-400" />
          <span className="text-neutral-900 dark:text-white font-medium text-sm">讨论串</span>
          <span className="text-xs text-neutral-400 dark:text-neutral-400">({messages.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-neutral-400 dark:text-neutral-500 py-6">
            开始讨论吧
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.userId === currentUserId;
          return (
            <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <Avatar userId={msg.userId} size={24} />
              <div className={`max-w-[80%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1 mb-0.5">
                  {!isOwn && (
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{msg.userName}</span>
                  )}
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{formatTime(msg.createdAt)}</span>
                </div>
                {msg.content && (
                  <div className={`px-2 py-1.5 rounded-lg text-xs ${isOwn ? 'bg-sky-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100'}`}>
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="发送回复..."
            className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ConnectedPanelContent ({
  userName,
  userColor,
  userId,
  onDisconnect
}: {
  userName: string;
  userColor: string;
  userId: string;
  onDisconnect: () => void;
}) {
  const [activeChannelId, setActiveChannelId] = useState('main');
  const [messageInput, setMessageInput] = useState('');
  const [showUserList, setShowUserList] = useState(true);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [channelEditInput, setChannelEditInput] = useState('');
  const [showUserColorPicker, setShowUserColorPicker] = useState(false);
  const [tempUserColor, setTempUserColor] = useState(userColor);
  const [showUserNameEdit, setShowUserNameEdit] = useState(false);
  const [tempUserName, setTempUserName] = useState(userName);

  const [editingMessage, setEditingMessage] = useState<MessageType | null>(null);
  const [editInput, setEditInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);

  const channelsRaw = useStorage((root) => root.channels, shallow);
  const allMessagesRaw = useStorage((root) => root.messages, shallow);
  const threadsRaw = useStorage((root) => root.threads, shallow);
  const pinnedMessagesRaw = useStorage((root) => root.pinnedMessages, shallow);
  const others = useOthers();

  const channels = useMemo(() => channelsRaw || [], [channelsRaw]);
  const allMessages = useMemo(() => allMessagesRaw || [], [allMessagesRaw]);
  const threads = useMemo(() => threadsRaw || [], [threadsRaw]);
  const pinnedMessages = useMemo(() => pinnedMessagesRaw || [], [pinnedMessagesRaw]);
  const {
    collaborators,
    'setUserName': contextSetUserName,
    'setUserColor': contextSetUserColor
  } = useCollaboration();
  const [myPresence] = useMyPresence();
  const currentUserId = userId;

  const collaboratorsWithPeerId = useMemo(() => {
    return collaborators.map((c) => {
      const other = others.find((o) => o.presence?.userId === c.id);
      return {
        'id': c.id,
        'name': c.name,
        'peerId': other?.presence?.mediaPeerId ?? null,
        'mediaType': other?.presence?.mediaType ?? null
      };
    });
  }, [collaborators, others]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const isShareChannel = activeChannel?.type === 'share';
  const channelMessages = useMemo(() => allMessages.filter((m) => m.channelId === activeChannelId && m.threadId === null) as MessageType[], [allMessages, activeChannelId]);
  const activeThread = threads.find((t) => t.id === activeThreadId);
  const threadMessages = useMemo(() => allMessages.filter((m) => m.threadId === activeThreadId) as MessageType[], [allMessages, activeThreadId]);
  const channelPinnedMessages = useMemo(() => pinnedMessages.filter((p) => p.channelId === activeChannelId) as PinnedMessageType[], [pinnedMessages, activeChannelId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ 'behavior': 'smooth' });
  }, [channelMessages.length]);

  useEffect(() => {
    setTempUserColor(userColor);
  }, [userColor]);

  useEffect(() => {
    setTempUserName(userName);
  }, [userName]);

  useEffect(() => {
    if (editingMessage && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessage]);

  const sendMessage = useMutation(
    ({ storage }, { content, attachments, replyToId, threadId }: {
      content: string;
      attachments: MessageAttachment[];
      replyToId?: string;
      threadId?: string;
    }) => {
      const msgs = storage.get('messages');
      msgs.push(new LiveObject<MessageType>({
        'id': generateId(),
        'channelId': activeChannelId,
        userId,
        'userName': myPresence.userName ?? 'Anonymous',
        'userColor': myPresence.userColor ?? '#888888',
        'content': content.trim(),
        attachments,
        'createdAt': Date.now(),
        'editedAt': null,
        'replyToId': replyToId ?? null,
        'threadId': threadId ?? null
      }));
    },
    [userId, myPresence.userName, myPresence.userColor, activeChannelId]
  );

  const editMessage = useMutation(
    ({ storage }, { messageId, newContent }: { messageId: string; newContent: string }) => {
      const msgs = storage.get('messages');
      for (let i = 0; i < msgs.length; i += 1) {
        const msg = msgs.get(i);
        if (msg && msg.get('id') === messageId) {
          msg.set('content', newContent);
          msg.set('editedAt', Date.now());
          break;
        }
      }
    },
    []
  );

  const deleteMessage = useMutation(
    ({ storage }, messageId: string) => {
      const msgs = storage.get('messages');
      for (let i = 0; i < msgs.length; i += 1) {
        const msg = msgs.get(i);
        if (msg && msg.get('id') === messageId) {
          msgs.delete(i);
          break;
        }
      }
    },
    []
  );

  const createThread = useMutation(
    ({ storage }, parentMessage: MessageType) => {
      const threadsStorage = storage.get('threads');
      const threadId = generateId();

      threadsStorage.push(new LiveObject<ThreadType>({
        'id': threadId,
        'channelId': activeChannelId,
        'parentMessageId': parentMessage.id,
        'createdAt': Date.now(),
        'createdBy': userId,
        'createdByUserName': myPresence.userName ?? 'Anonymous'
      }));

      setActiveThreadId(threadId);
    },
    [activeChannelId, userId, myPresence.userName]
  );

  const pinMessage = useMutation(
    ({ storage }, messageId: string) => {
      const pinnedStorage = storage.get('pinnedMessages');
      let alreadyPinned = false;
      for (let i = 0; i < pinnedStorage.length; i += 1) {
        const p = pinnedStorage.get(i);
        if (p && p.get('messageId') === messageId) {
          alreadyPinned = true;
          break;
        }
      }
      if (!alreadyPinned) {
        pinnedStorage.push(new LiveObject<PinnedMessageType>({
          'id': generateId(),
          messageId,
          'channelId': activeChannelId,
          'pinnedAt': Date.now(),
          'pinnedBy': userId,
          'pinnedByUserName': myPresence.userName ?? 'Anonymous'
        }));
      }
    },
    [activeChannelId, userId, myPresence.userName]
  );

  const unpinMessage = useMutation(
    ({ storage }, messageId: string) => {
      const pinnedStorage = storage.get('pinnedMessages');
      for (let i = 0; i < pinnedStorage.length; i += 1) {
        const p = pinnedStorage.get(i);
        if (p && p.get('messageId') === messageId) {
          pinnedStorage.delete(i);
          break;
        }
      }
    },
    []
  );

  const addChannel = useMutation(
    ({ storage }, { type }: { type: 'chat' | 'share' }) => {
      const channelsStorage = storage.get('channels');
      const newId = generateId();
      channelsStorage.push(new LiveObject<Channel>({
        'id': newId,
        'name': type === 'chat' ? `新频道 ${channelsStorage.length}` : `新共享 ${channelsStorage.length}`,
        type,
        'isDefault': false
      }));
      setActiveChannelId(newId);
    },
    []
  );

  const renameChannel = useMutation(
    ({ storage }, { channelId, newName }: { channelId: string; newName: string }) => {
      const channelsStorage = storage.get('channels');
      for (let i = 0; i < channelsStorage.length; i += 1) {
        const c = channelsStorage.get(i);
        if (c && c.get('id') === channelId) {
          c.set('name', newName);
          break;
        }
      }
    },
    []
  );

  const deleteChannel = useMutation(
    ({ storage }, channelId: string) => {
      const channelsStorage = storage.get('channels');
      let index = -1;
      let defaultChannelId: string | null = null;
      for (let i = 0; i < channelsStorage.length; i += 1) {
        const c = channelsStorage.get(i);
        if (c) {
          if (c.get('id') === channelId) {
            index = i;
          }
          if (c.get('isDefault')) {
            defaultChannelId = c.get('id');
          }
        }
      }
      if (index !== -1) {
        const targetChannel = channelsStorage.get(index);
        if (targetChannel && !targetChannel.get('isDefault')) {
          channelsStorage.delete(index);
          if (activeChannelId === channelId && defaultChannelId) {
            setActiveChannelId(defaultChannelId);
          }
        }
      }
    },
    [activeChannelId]
  );

  const handleSend = useCallback((attachments: MessageAttachment[] = []) => {
    if (!messageInput.trim() && attachments.length === 0) {
      return;
    }
    const msgData: {
      content: string;
      attachments: MessageAttachment[];
      replyToId?: string;
    } = {
      'content': messageInput.trim(),
      attachments
    };
    if (replyingTo?.id) {
      msgData.replyToId = replyingTo.id;
    }
    sendMessage(msgData);
    setMessageInput('');
    setReplyingTo(null);
  }, [messageInput, sendMessage, replyingTo]);

  const handleSendThreadMessage = useCallback((content: string) => {
    if (activeThreadId) {
      sendMessage({ content, 'attachments': [], 'threadId': activeThreadId });
    }
  }, [activeThreadId, sendMessage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const isAudio = file.type.startsWith('audio/');
        const attachment: MessageAttachment = {
          'id': generateId(),
          'type': isAudio ? 'audio' : 'image',
          'data': dataUrl,
          'mimeType': file.type,
          'fileName': file.name
        };
        handleSend([attachment]);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  }, [handleSend]);

  const handleUserNameSave = () => {
    if (tempUserName.trim()) {
      contextSetUserName(tempUserName.trim());
    }
    setShowUserNameEdit(false);
  };

  const handleUserColorSave = () => {
    contextSetUserColor(tempUserColor);
    setShowUserColorPicker(false);
  };

  const handleChannelRename = () => {
    if (editingChannelId && channelEditInput.trim()) {
      renameChannel({ 'channelId': editingChannelId, 'newName': channelEditInput.trim() });
    }
    setEditingChannelId(null);
    setChannelEditInput('');
  };

  const handleEditMessage = (message: MessageType) => {
    setEditingMessage(message);
    setEditInput(message.content);
  };

  const handleSaveEdit = () => {
    if (editingMessage && editInput.trim()) {
      editMessage({ 'messageId': editingMessage.id, 'newContent': editInput.trim() });
    }
    setEditingMessage(null);
    setEditInput('');
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditInput('');
  };

  const getMessageById = useCallback((messageId: string | null) => {
    if (!messageId) {
      return null;
    }
    return allMessages.find((m) => m.id === messageId) || null;
  }, [allMessages]);

  const isMessagePinned = useCallback((messageId: string) => {
    return pinnedMessages.some((p) => p.messageId === messageId);
  }, [pinnedMessages]);

  const hasThread = useCallback((message: MessageType) => {
    return threads.some((t) => t.parentMessageId === message.id);
  }, [threads]);

  const getThreadReplyCount = useCallback((message: MessageType) => {
    const thread = threads.find((t) => t.parentMessageId === message.id);
    if (thread) {
      return allMessages.filter((m) => m.threadId === thread.id).length;
    }
    return 0;
  }, [allMessages, threads]);

  return (
    <>
      <div className="flex h-[75vh] bg-neutral-50 dark:bg-neutral-900">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="w-48 bg-neutral-100 dark:bg-neutral-800 flex flex-col border-r border-neutral-200 dark:border-neutral-700">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-neutral-900 dark:text-white font-semibold flex items-center gap-2">
                <Hash size={18} />
              聊天分区
              </h2>
            </div>

            <div className="p-2 space-y-1">
              {channels.filter((c) => c.type === 'chat' || !c.type).map((channel) => (
                <div key={channel.id} className="group">
                  {editingChannelId === channel.id ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">
                      <input
                        type="text"
                        value={channelEditInput}
                        onChange={(e) => setChannelEditInput(e.target.value)}
                        className="flex-1 bg-transparent text-neutral-700 dark:text-neutral-200 text-sm focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleChannelRename();
                          } else if (e.key === 'Escape') {
                            setEditingChannelId(null);
                            setChannelEditInput('');
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={handleChannelRename}
                        className="text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        activeChannelId === channel.id
                          ? 'bg-neutral-200 dark:bg-neutral-600 text-neutral-900 dark:text-white'
                          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <button
                        onClick={() => setActiveChannelId(channel.id)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <Hash size={16} />
                        <span className="text-sm truncate">{channel.name}</span>
                      </button>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingChannelId(channel.id);
                            setChannelEditInput(channel.name);
                          }}
                          className="p-1 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded"
                        >
                          <Edit3 size={14} />
                        </button>
                        {!channel.isDefault && (
                          <button
                            onClick={() => deleteChannel(channel.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => addChannel({ 'type': 'chat' })}
                className="w-full flex items-center gap-2 px-3 py-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <Plus size={16} />
                <span className="text-sm">新建频道</span>
              </button>
            </div>

            <div className="p-4 border-t border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-neutral-900 dark:text-white font-semibold flex items-center gap-2">
                <Video size={18} />
              共享分区
              </h2>
            </div>

            <div className="p-2 space-y-1">
              {channels.filter((c) => c.type === 'share').map((channel) => (
                <div key={channel.id} className="group">
                  {editingChannelId === channel.id ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">
                      <input
                        type="text"
                        value={channelEditInput}
                        onChange={(e) => setChannelEditInput(e.target.value)}
                        className="flex-1 bg-transparent text-neutral-700 dark:text-neutral-200 text-sm focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleChannelRename();
                          } else if (e.key === 'Escape') {
                            setEditingChannelId(null);
                            setChannelEditInput('');
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={handleChannelRename}
                        className="text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        activeChannelId === channel.id
                          ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <button
                        onClick={() => setActiveChannelId(channel.id)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <Video size={16} />
                        <span className="text-sm truncate">{channel.name}</span>
                      </button>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingChannelId(channel.id);
                            setChannelEditInput(channel.name);
                          }}
                          className="p-1 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => deleteChannel(channel.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => addChannel({ 'type': 'share' })}
                className="w-full flex items-center gap-2 px-3 py-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <Plus size={16} />
                <span className="text-sm">新建共享</span>
              </button>
            </div>
          </div>

          <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
            <div className="flex items-center gap-3 mb-3">
              <Avatar userId={userId} size={36} />
              <div className="flex-1 min-w-0">
                {showUserNameEdit ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={tempUserName}
                      onChange={(e) => setTempUserName(e.target.value)}
                      placeholder="输入名字"
                      className="w-full px-2 py-1 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-700 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUserNameSave();
                        } else if (e.key === 'Escape') {
                          setShowUserNameEdit(false);
                          setTempUserName(userName);
                        }
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowUserNameEdit(true)}
                    className="text-sm font-medium text-neutral-900 dark:text-white hover:text-sky-500 dark:hover:text-sky-400 truncate text-left"
                  >
                    {userName}
                  </button>
                )}
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">在线</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full border border-neutral-300 dark:border-neutral-600 cursor-pointer"
                  style={{ 'backgroundColor': tempUserColor }}
                  onClick={() => setShowUserColorPicker(!showUserColorPicker)}
                />
                {showUserColorPicker && (
                  <div className="absolute bottom-32 left-4 bg-white dark:bg-neutral-700 p-3 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-600 z-50">
                    <input
                      type="color"
                      value={tempUserColor}
                      onChange={(e) => setTempUserColor(e.target.value)}
                      className="w-full h-8 rounded cursor-pointer mb-2"
                    />
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'].map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setTempUserColor(color);
                            contextSetUserColor(color);
                          }}
                          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                          style={{
                            'backgroundColor': color,
                            'borderColor': userColor === color ? 'white' : 'transparent',
                            'boxShadow': userColor === color ? `0 0 0 2px ${color}` : 'none'
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleUserColorSave}
                      className="w-full py-1 text-xs bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors"
                    >
                    保存
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={onDisconnect}
                className="px-3 py-1.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors text-xs font-medium"
              >
              离开房间
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isShareChannel ? <Video size={18} className="text-sky-500" /> : <Hash size={18} className="text-neutral-400" />}
              <h3 className="text-neutral-900 dark:text-white font-medium">{activeChannel?.name || '主聊天'}</h3>
            </div>
            <div className="flex items-center gap-1">
              {!isShareChannel && channelPinnedMessages.length > 0 && (
                <button
                  onClick={() => setShowPinnedPanel(!showPinnedPanel)}
                  className={`p-2 rounded-lg transition-colors ${
                    showPinnedPanel ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                  title="置顶消息"
                >
                  <Pin size={18} />
                </button>
              )}
              <button
                onClick={() => setShowUserList(!showUserList)}
                className={`p-2 rounded-lg transition-colors ${
                  showUserList ? 'bg-neutral-200 dark:bg-neutral-700 text-sky-500 dark:text-sky-400' : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title="在线成员"
              >
                <PanelRight size={18} />
              </button>
            </div>
          </div>

          {isShareChannel ? (
            <div className="flex-1 overflow-hidden">
              <MediaPanel
                isOpen={true}
                onClose={() => {}}
                userId={userId}
                userName={userName}
                userColor={userColor}
                collaborators={collaboratorsWithPeerId}
                isInline={true}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {channelMessages.length === 0 && (
                  <div className="text-center text-sm text-neutral-400 dark:text-neutral-500 py-12">
                  暂无消息，发送第一条消息开始协作吧
                  </div>
                )}
                {channelMessages.map((msg) => {
                  const isOwn = msg.userId === currentUserId;
                  return (
                    <MessageItem
                      key={msg.id}
                      message={msg}
                      isOwn={isOwn}
                      replyToMessage={getMessageById(msg.replyToId)}
                      onEdit={handleEditMessage}
                      onDelete={deleteMessage}
                      onReply={setReplyingTo}
                      onThread={createThread}
                      onPin={pinMessage}
                      onUnpin={unpinMessage}
                      isPinned={isMessagePinned(msg.id)}
                      hasThread={hasThread(msg)}
                      threadReplyCount={getThreadReplyCount(msg)}
                      onOpenThread={(messageId) => {
                        const thread = threads.find((t) => t.parentMessageId === messageId);
                        if (thread) {
                          setActiveThreadId(thread.id);
                        }
                      }}
                    />
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {editingMessage && (
                <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit3 size={14} className="text-sky-500 dark:text-sky-400" />
                    <span className="text-sm text-neutral-600 dark:text-neutral-300">编辑消息</span>
                    <button
                      onClick={handleCancelEdit}
                      className="ml-auto p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit();
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                    />
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editInput.trim()}
                      className="px-3 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                保存
                    </button>
                  </div>
                </div>
              )}

              {replyingTo && (
                <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <Reply size={14} className="text-sky-500 dark:text-sky-400" />
                    <span className="text-sm text-neutral-600 dark:text-neutral-300">
                回复 <span className="font-medium">{replyingTo.userName}</span>
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate max-w-[200px]">
                      {replyingTo.content || '附件'}
                    </span>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="ml-auto p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      title="发送图片"
                    >
                      <ImageIcon size={20} />
                    </button>
                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className="p-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      title="发送音频"
                    >
                      <Music size={20} />
                    </button>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={`在 #${activeChannel?.name || '主聊天'} 发送消息...`}
                      className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none max-h-32 min-h-[44px]"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!messageInput.trim()}
                      className="p-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {activeThreadId && activeThread && (
          <ThreadPanel
            messages={threadMessages}
            currentUserId={currentUserId}
            onClose={() => setActiveThreadId(null)}
            onSendMessage={handleSendThreadMessage}
          />
        )}

        {showPinnedPanel && channelPinnedMessages.length > 0 && !activeThreadId && (
          <div className="w-80 bg-neutral-100 dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pin size={16} className="text-yellow-500" />
                <span className="text-neutral-900 dark:text-white font-medium text-sm">置顶消息</span>
                <span className="text-xs text-neutral-400 dark:text-neutral-400">({channelPinnedMessages.length})</span>
              </div>
              <button
                onClick={() => setShowPinnedPanel(false)}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {channelPinnedMessages.map((pinned) => {
                const msg = allMessages.find((m) => m.id === pinned.messageId);
                if (!msg) {
                  return null;
                }
                return (
                  <div key={pinned.id} className="bg-neutral-200/50 dark:bg-neutral-700/50 rounded-lg p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar userId={msg.userId} size={20} />
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{msg.userName}</span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{formatTime(msg.createdAt)}</span>
                    </div>
                    {msg.content && (
                      <p className="text-sm text-neutral-700 dark:text-neutral-200 line-clamp-3">{msg.content}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showUserList && !activeThreadId && !showPinnedPanel && (
          <div className="w-46 bg-neutral-100 dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-neutral-900 dark:text-white font-medium flex items-center gap-2">
                <Users size={16} />
              在线成员
                <span className="text-sm text-neutral-400 dark:text-neutral-400">
                ({collaborators.length + 1})
                </span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-200/50 dark:bg-neutral-700/50">
                <Avatar userId={userId} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">{userName}</div>
                  <div className="flex items-center gap-1 text-[10px] text-green-500 dark:text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
                  你
                  </div>
                </div>
              </div>

              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-700/30 transition-colors"
                >
                  <Avatar userId={collaborator.id} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">{collaborator.name}</div>
                    <div className="flex items-center gap-1 text-[10px] text-green-500 dark:text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
                    在线
                    </div>
                  </div>
                </div>
              ))}

              {collaborators.length === 0 && (
                <div className="text-center text-sm text-neutral-400 dark:text-neutral-500 py-6">
                暂无其他成员
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

interface CollaborationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CollaborationPanel ({ isOpen, onClose }: CollaborationPanelProps) {
  const {
    isConnected,
    isConnecting,
    connectionStatus,
    roomId,
    userName,
    userColor,
    userId,
    connect,
    disconnect,
    recentRooms,
    isLoadingRooms,
    refreshRooms,
    inputRoomId,
    setInputRoomId
  } = useCollaboration();

  const [inputUserName, setInputUserName] = useState(userName);
  const { setUserName } = useCollaboration();

  useEffect(() => {
    setInputUserName(userName);
  }, [userName]);

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
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/70" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-6xl mx-4 overflow-hidden max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-neutral-900 dark:text-white">协作</h3>
            {isConnected && roomId && (
              <code className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-xs font-mono text-neutral-600 dark:text-neutral-300">
                {roomId}
              </code>
            )}
            {(connectionStatus === 'reconnecting') && (
              <div className="flex items-center gap-2 text-sm text-orange-500 dark:text-orange-400">
                <RefreshCw size={14} className="animate-spin" />
                正在重新连接...
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {isConnected || connectionStatus === 'reconnecting' ? (
          <ConnectedPanelContent
            userName={userName}
            userColor={userColor}
            userId={userId}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-neutral-900">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mb-6">
              <Users size={32} className="text-neutral-400 dark:text-neutral-400" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">加入协作房间</h2>
            <p className="text-neutral-500 dark:text-neutral-400 mb-8 text-center max-w-md">
              输入房间ID或选择已有的房间
            </p>

            <div className="w-full max-w-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  房间ID
                </label>
                <RoomInput
                  value={inputRoomId}
                  onChange={setInputRoomId}
                  recentRooms={recentRooms}
                  isLoadingRooms={isLoadingRooms}
                  refreshRooms={refreshRooms}
                  onConnect={handleConnect}
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
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleConnect}
                disabled={!inputRoomId.trim() || isConnecting}
                className="w-full py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-neutral-400 dark:disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    连接中...
                  </>
                ) : (
                  <>
                    加入协作房间
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CollaborationControls () {
  const { isConnected, isConnecting, connectionStatus, collaborators, isPanelOpen, setPanelOpen } = useCollaboration();

  const getStatusIcon = () => {
    if (connectionStatus === 'reconnecting') {
      return <RefreshCw size={16} className="animate-spin text-orange-500" />;
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
        onClick={() => setPanelOpen(true)}
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

      <CollaborationPanel isOpen={isPanelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
