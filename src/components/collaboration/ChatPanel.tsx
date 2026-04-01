import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Image,
  Mic,
  Send,
  X,
  Play,
  Pause,
  Check,
  MessageSquare,
  Hash,
  Edit2,
  Trash2,
  User,
  Users
} from 'lucide-react';
import {
  useChatMessages,
  useChatThreads,
  useSendMessage,
  useSendReply,
  useCreateThread,
  useRenameThread,
  useDeleteThread,
  useDeleteMessage,
  useEditMessage,
  useMessageCount,
  useMainThreadTitle,
  useRenameMainThread,
  type ChatMessage,
  type MediaAttachment
} from './useChat';
import { Avatar } from './Avatar';
import { useMyPresence } from './liveblocks.config';

interface ChatPanelProps {
  onShowProfile?: () => void;
  onShowUsers?: () => void;
  showProfile?: boolean;
  showUsers?: boolean;
}

function formatTime (timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('zh-CN', { 'hour': '2-digit', 'minute': '2-digit' });

  if (isToday) {
    return `今天 ${timeStr}`;
  }
  if (isYesterday) {
    return `昨天 ${timeStr}`;
  }
  return date.toLocaleDateString('zh-CN', { 'month': 'short', 'day': 'numeric', 'hour': '2-digit', 'minute': '2-digit' });
}

function formatDuration (seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize (bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaPreview ({ media = [] }: { media?: MediaAttachment[] }) {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayAudio = useCallback((url: string) => {
    if (playingAudio === url) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(url);
    }
  }, [playingAudio]);

  useEffect(() => {
    if (audioRef.current) {
      if (playingAudio) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [playingAudio]);

  if (!media || media.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {media.map((item) => {
        if (item.type === 'image' || item.type === 'gif') {
          return (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-[200px] rounded-lg overflow-hidden"
            >
              <img
                src={item.url}
                alt={item.filename}
                className="max-w-full h-auto rounded-lg"
                style={{ 'maxHeight': '200px' }}
              />
            </a>
          );
        }

        if (item.type === 'audio') {
          const isPlaying = playingAudio === item.url;
          return (
            <div
              key={item.url}
              className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg"
            >
              <button
                onClick={() => handlePlayAudio(item.url)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-600 transition-colors"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-neutral-800 dark:text-neutral-200">
                  {item.filename}
                </div>
                <div className="text-xs text-neutral-500">
                  {item.duration ? formatDuration(item.duration) : '音频'} • {formatFileSize(item.size)}
                </div>
              </div>
              {isPlaying && (
                <audio
                  ref={audioRef}
                  src={item.url}
                  onEnded={() => setPlayingAudio(null)}
                />
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

function MessageItem ({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete
}: {
  message: ChatMessage;
  isOwn: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar
        userId={message.userId}
        size={36}
      />
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {isOwn ? '你' : message.userName}
          </span>
          <span className="text-xs text-neutral-400">
            {formatTime(message.createdAt)}
          </span>
          {message.isEdited && (
            <span className="text-xs text-neutral-400">(已编辑)</span>
          )}
        </div>
        <div
          className={`relative px-3 py-2 rounded-lg text-sm ${
            isOwn
              ? 'bg-sky-500 text-white'
              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
          }`}
        >
          {message.content}
          <MediaPreview media={message.media} />
        </div>
        <div className="flex items-center gap-1 mt-1">
          <button
            onClick={onReply}
            className="p-1 text-neutral-400 hover:text-sky-500 transition-colors"
            title="回复"
          >
            <MessageSquare size={14} />
          </button>
          {isOwn && (
            <>
              <button
                onClick={onEdit}
                className="p-1 text-neutral-400 hover:text-sky-500 transition-colors"
                title="编辑"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadItem ({
  thread,
  onSelect,
  isActive,
  onDelete
}: {
  thread: { id: string; thread: NonNullable<ReturnType<typeof useChatThreads>[0]> };
  onSelect: () => void;
  isActive: boolean;
  onDelete?: () => void;
}) {
  const messageCount = useMessageCount(thread.id);

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors group ${
        isActive
          ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
          : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
      }`}
    >
      <Hash size={16} />
      <span className="flex-1 truncate text-sm">
        {thread.thread.title ?? '未命名话题'}
      </span>
      <span className="text-xs text-neutral-400">
        {messageCount}
      </span>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
          title="删除话题"
        >
          <Trash2 size={12} className="text-red-500" />
        </button>
      )}
    </button>
  );
}

export function ChatPanel ({
  onShowProfile,
  onShowUsers,
  showProfile = false,
  showUsers = false
}: ChatPanelProps): JSX.Element {
  const [myPresence] = useMyPresence();
  const currentUserId = myPresence.userName ?? 'anonymous';

  const threads = useChatThreads();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const mainMessages = useChatMessages();
  const threadMessages = useChatMessages(activeThreadId ?? undefined);

  const sendMessage = useSendMessage();
  const sendReply = useSendReply();
  const createThread = useCreateThread();
  const renameThread = useRenameThread();
  const deleteThread = useDeleteThread();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const mainThreadTitle = useMainThreadTitle();
  const renameMainThread = useRenameMainThread();

  const [inputValue, setInputValue] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pendingMedia, setPendingMedia] = useState<MediaAttachment[]>([]);
  const [showThreadList, setShowThreadList] = useState(true);
  const [editingThreadTitle, setEditingThreadTitle] = useState(false);
  const [threadTitleInput, setThreadTitleInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    if (activeThreadId) {
      return threadMessages;
    }
    return mainMessages.filter((msg) => !msg.threadId);
  }, [activeThreadId, mainMessages, threadMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ 'behavior': 'smooth' });
  }, [messages]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const newMedia: MediaAttachment[] = [];

    const validFiles = Array.from(files).filter((file) => {
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      return isImage || isAudio;
    });

    for (const file of validFiles) {
      const isImage = file.type.startsWith('image/');
      const isGif = file.type === 'image/gif';
      const isAudio = file.type.startsWith('audio/');

      const readFileAsBase64 = (): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const base64Url = await readFileAsBase64();

      let mediaType: 'image' | 'gif' | 'audio' = 'audio';
      if (isGif) {
        mediaType = 'gif';
      } else if (isImage) {
        mediaType = 'image';
      }
      const media: MediaAttachment = {
        'type': mediaType,
        'url': base64Url,
        'filename': file.name,
        'mimeType': file.type,
        'size': file.size
      };

      if (isImage) {
        const img = new window.Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            media.width = img.width;
            media.height = img.height;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = base64Url;
        });
      }

      if (isAudio) {
        const audio = new Audio(base64Url);
        await new Promise<void>((resolve) => {
          audio.onloadedmetadata = () => {
            media.duration = audio.duration;
            resolve();
          };
          audio.onerror = () => resolve();
        });
      }

      newMedia.push(media);
    }

    setPendingMedia((prev) => [...prev, ...newMedia]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() && pendingMedia.length === 0) {
      return;
    }

    if (replyTo) {
      sendReply({
        'messageId': replyTo.id,
        'content': inputValue.trim(),
        'media': pendingMedia,
        ...(activeThreadId ? { 'threadId': activeThreadId } : {})
      });
      setReplyTo(null);
    } else {
      sendMessage({
        'content': inputValue.trim(),
        'media': pendingMedia,
        ...(activeThreadId ? { 'threadId': activeThreadId } : {})
      });
    }

    setInputValue('');
    setPendingMedia([]);
  }, [inputValue, pendingMedia, replyTo, sendReply, sendMessage, activeThreadId]);

  const handleCreateThread = useCallback(() => {
    const threadId = createThread();
    if (threadId) {
      setActiveThreadId(threadId);
    }
  }, [createThread]);

  const handleEditSave = useCallback(() => {
    if (editingMessage && editValue.trim()) {
      editMessage(editingMessage.id, editValue.trim());
      setEditingMessage(null);
      setEditValue('');
    }
  }, [editingMessage, editValue, editMessage]);

  const activeThread = useMemo(() => {
    if (!activeThreadId) {
      return null;
    }
    return threads.find((t) => t.id === activeThreadId);
  }, [activeThreadId, threads]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-700 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowThreadList(!showThreadList)}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
          >
            <Hash size={18} className="text-neutral-500" />
          </button>
          {editingThreadTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={threadTitleInput}
                onChange={(e) => setThreadTitleInput(e.target.value)}
                className="px-2 py-0.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-sky-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (activeThreadId === null) {
                      renameMainThread(threadTitleInput);
                    } else if (activeThread) {
                      renameThread(activeThread.id, threadTitleInput);
                    }
                    setEditingThreadTitle(false);
                  }
                  if (e.key === 'Escape') {
                    setEditingThreadTitle(false);
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => {
                  if (activeThreadId === null) {
                    renameMainThread(threadTitleInput);
                  } else if (activeThread) {
                    renameThread(activeThread.id, threadTitleInput);
                  }
                  setEditingThreadTitle(false);
                }}
                className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (activeThreadId === null) {
                  setThreadTitleInput(mainThreadTitle);
                } else if (activeThread) {
                  setThreadTitleInput(activeThread.title ?? '');
                }
                setEditingThreadTitle(true);
              }}
              className="font-medium text-sm text-neutral-800 dark:text-neutral-200 hover:text-sky-500 transition-colors"
            >
              {activeThread ? activeThread.title ?? '未命名话题' : mainThreadTitle}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {activeThread && (
            <button
              onClick={() => {
                setThreadTitleInput(activeThread.title ?? '');
                setEditingThreadTitle(true);
              }}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors text-neutral-500"
              title="重命名话题"
            >
              <Edit2 size={16} />
            </button>
          )}
          <button
            onClick={onShowProfile}
            className={`p-1.5 rounded transition-colors ${
              showProfile
                ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-500'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500'
            }`}
            title="个人信息"
          >
            <User size={16} />
          </button>
          <button
            onClick={onShowUsers}
            className={`p-1.5 rounded transition-colors ${
              showUsers
                ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-500'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500'
            }`}
            title="在线列表"
          >
            <Users size={16} />
          </button>
          <button
            onClick={handleCreateThread}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors text-neutral-500"
            title="新话题"
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {showThreadList && (
          <div className="w-44 border-r border-neutral-200 dark:border-neutral-700 flex flex-col overflow-y-auto">
            <div className="p-2 space-y-1">
              <button
                onClick={() => setActiveThreadId(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeThreadId === null
                    ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Hash size={16} />
                <span className="flex-1 truncate text-sm">{mainThreadTitle}</span>
              </button>
              {threads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={{ 'id': thread.id, thread }}
                  onSelect={() => {
                    setActiveThreadId(thread.id);
                    setEditingThreadTitle(false);
                  }}
                  isActive={activeThreadId === thread.id}
                  onDelete={() => {
                    if (activeThreadId === thread.id) {
                      setActiveThreadId(null);
                    }
                    deleteThread(thread.id);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-sm text-neutral-500 py-8">
                暂无消息
              </div>
            )}
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                isOwn={msg.userId === currentUserId}
                onReply={() => setReplyTo(msg)}
                onEdit={() => {
                  setEditingMessage(msg);
                  setEditValue(msg.content);
                }}
                onDelete={() => deleteMessage(msg.id)}
              />
            ))}
            <div ref={chatEndRef} />
          </div>

          {editingMessage && (
            <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-sky-600 dark:text-sky-400">
                  编辑消息
                </span>
                <button
                  onClick={() => setEditingMessage(null)}
                  className="text-xs text-neutral-500 hover:text-neutral-700"
                >
                  取消
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEditSave();
                    }
                  }}
                />
                <button
                  onClick={handleEditSave}
                  className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm"
                >
                  <Check size={16} />
                </button>
              </div>
            </div>
          )}

          {replyTo && (
            <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-sky-50 dark:bg-sky-900/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-sky-600 dark:text-sky-400">
                  回复 {replyTo.userId === currentUserId ? '你' : replyTo.userName}
                </span>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-xs text-neutral-500 hover:text-neutral-700"
                >
                  取消
                </button>
              </div>
              <div className="text-xs text-neutral-500 truncate">
                {replyTo.content}
              </div>
            </div>
          )}

          {pendingMedia.length > 0 && (
            <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex flex-wrap gap-2">
                {pendingMedia.map((media, index) => (
                  <div
                    key={index}
                    className="relative group"
                  >
                    {media.type === 'image' || media.type === 'gif' ? (
                      <img
                        src={media.url}
                        alt={media.filename}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 flex items-center justify-center bg-neutral-100 dark:bg-neutral-700 rounded">
                        <Mic size={20} className="text-neutral-500" />
                      </div>
                    )}
                    <button
                      onClick={() => setPendingMedia((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,audio/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-neutral-500 hover:text-sky-500 transition-colors"
                title="添加媒体"
              >
                <Image size={20} />
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="输入消息..."
                className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() && pendingMedia.length === 0}
                className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
