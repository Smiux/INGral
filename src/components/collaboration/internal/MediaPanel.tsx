import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Music,
  Music2,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Users,
  X,
  Play,
  Pause as PauseIcon,
  Upload,
  Volume2,
  VolumeX,
  Trash2,
  SkipForward
} from 'lucide-react';
import { motion } from 'framer-motion';
import { mediaManager, type MediaType, type MediaState, type AudioShareResult } from './MediaManager';
import { Avatar } from './Avatar';
import parseAudioMetadata from 'parse-audio-metadata';
import { useStorage, useMutation, type AudioTrackData, LiveObject } from '../liveblocks.config';

function formatTime (seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function parseTrackMetadata (file: File, userId: string, userName: string): Promise<AudioTrackData> {
  let metadata: Record<string, unknown> = {};
  let coverUrl: string | null = null;

  try {
    metadata = await parseAudioMetadata(file) as Record<string, unknown>;
    if (metadata.picture) {
      const pictureBlob = metadata.picture as Blob;
      coverUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pictureBlob);
      });
    }
  } catch {
    // 忽略元数据解析失败，继续处理
  }

  let duration = 0;
  try {
    duration = await new Promise<number>((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = () => {
        resolve(0);
      };
      audio.src = URL.createObjectURL(file);
    });
  } catch {
    // 忽略时长获取失败，继续处理
  }

  return {
    'id': crypto.randomUUID(),
    'title': (metadata.title as string) || file.name.replace(/\.[^/.]+$/, ''),
    'artist': (metadata.artist as string) || '未知艺术家',
    'album': (metadata.album as string) || '',
    duration,
    coverUrl,
    'addedBy': userId,
    'addedByName': userName,
    'addedAt': Date.now()
  };
}

function VideoItem ({
  mediaState,
  isLocal,
  userId,
  userName,
  userColor,
  isMuted
}: {
  mediaState: MediaState;
  isLocal?: boolean;
  userId?: string;
  userName?: string;
  userColor?: string;
  isMuted?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = mediaState.stream;
    }
  }, [mediaState.stream]);

  const displayUserId = isLocal ? userId : mediaState.peerId;
  const displayUserName = isLocal ? userName : mediaState.userName;
  const displayUserColor = isLocal ? userColor : mediaState.userColor;

  return (
    <div className="w-full h-full relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-contain"
      />
      <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1 bg-black/50 rounded-full">
        <Avatar userId={displayUserId!} size={16} color={displayUserColor!} />
        <span className="text-white text-xs">
          {displayUserName}
          {isLocal && ' (你)'}
        </span>
        <span className="text-xs text-neutral-300 px-1.5 py-0.5 bg-neutral-700 rounded">
          {mediaState.type === 'video' && '视频'}
          {mediaState.type === 'screen' && '屏幕'}
        </span>
      </div>
      {isLocal && isMuted && (
        <div className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full">
          <MicOff size={12} className="text-white" />
        </div>
      )}
    </div>
  );
}

function VideoGrid ({
  localVideoStreams,
  remoteVideoStreams,
  userId,
  userName,
  userColor,
  isMuted
}: {
  localVideoStreams: Array<{ type: MediaType; stream: MediaStream }>;
  remoteVideoStreams: Array<[string, MediaState]>;
  userId: string;
  userName: string;
  userColor: string;
  isMuted: boolean;
}) {
  const allStreams: Array<{ id: string; isLocal: boolean; state: MediaState }> = [];

  localVideoStreams.forEach(({ type, stream }) => {
    allStreams.push({
      'id': `local-${type}`,
      'isLocal': true,
      'state': { type, stream, 'peerId': userId, userName, userColor }
    });
  });

  remoteVideoStreams.forEach(([id, state]) => {
    allStreams.push({ id, 'isLocal': false, state });
  });

  if (allStreams.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-neutral-400">
        <div className="text-center">
          <Video size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">开始视频通话或共享屏幕</p>
          <p className="text-sm mt-2">选择下方的媒体类型开始</p>
        </div>
      </div>
    );
  }

  const gridCols = allStreams.length <= 2 ? 1 : 2;
  const gridRows = allStreams.length <= 2 ? allStreams.length : Math.ceil(allStreams.length / 2);

  return (
    <div className="w-full h-full grid gap-1 p-1" style={{
      'gridTemplateColumns': `repeat(${gridCols}, 1fr)`,
      'gridTemplateRows': `repeat(${gridRows}, 1fr)`
    }}>
      {allStreams.map((stream) => (
        <div key={stream.id} className="w-full h-full bg-neutral-800 rounded">
          <VideoItem
            mediaState={stream.state}
            isLocal={stream.isLocal}
            userId={userId}
            userName={userName}
            userColor={userColor}
            isMuted={isMuted}
          />
        </div>
      ))}
    </div>
  );
}

interface MediaPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userColor: string;
  collaborators: Array<{ id: string; name: string; peerId: string | null; mediaType: MediaType | null }>;
  isInline?: boolean;
}

export function MediaPanel ({
  isOpen,
  onClose,
  userId,
  userName,
  userColor,
  collaborators,
  isInline = false
}: MediaPanelProps) {
  const [localStreams, setLocalStreams] = useState<Map<MediaType, MediaStream>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaState>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');

  const audioFilesRef = useRef<Map<string, File>>(new Map());
  const audioUrlsRef = useRef<Map<string, string>>(new Map());
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const playTrackRef = useRef<((trackId: string, index: number) => Promise<void>) | null>(null);

  const audioPlaylist = useStorage((root) => root.audioPlaylist);
  const audioPlaybackState = useStorage((root) => root.audioPlaybackState);

  const addToPlaylist = useMutation(({ storage }, trackData: AudioTrackData) => {
    const playlist = storage.get('audioPlaylist');
    playlist.push(new LiveObject(trackData));
  }, []);

  const removeFromPlaylist = useMutation(({ storage }, index: number) => {
    const playlist = storage.get('audioPlaylist');
    if (index >= 0 && index < playlist.length) {
      playlist.delete(index);
    }
  }, []);

  const updatePlaybackState = useMutation(({ storage }, updates: Partial<{
    currentTrackIndex: number;
    isPlaying: boolean;
    currentTime: number;
    autoPlayNext: boolean;
  }>) => {
    const state = storage.get('audioPlaybackState');
    if (updates.currentTrackIndex !== undefined) {
      state.set('currentTrackIndex', updates.currentTrackIndex);
    }
    if (updates.isPlaying !== undefined) {
      state.set('isPlaying', updates.isPlaying);
    }
    if (updates.currentTime !== undefined) {
      state.set('currentTime', updates.currentTime);
    }
    if (updates.autoPlayNext !== undefined) {
      state.set('autoPlayNext', updates.autoPlayNext);
    }
  }, []);

  const updateTrackDuration = useMutation(({ storage }, trackId: string, durationValue: number) => {
    const playlist = storage.get('audioPlaylist');
    for (let i = 0; i < playlist.length; i += 1) {
      const track = playlist.get(i);
      if (track && track.get('id') === trackId) {
        track.set('duration', durationValue);
        break;
      }
    }
  }, []);

  useEffect(() => {
    remoteStreams.forEach((state, key) => {
      if (state.type === 'audio-share' || state.type === 'audio-call') {
        const existingAudio = document.querySelector(`audio[data-stream-key="${key}"]`);
        if (!existingAudio) {
          const audioEl = document.createElement('audio');
          audioEl.dataset.streamKey = key;
          audioEl.srcObject = state.stream;
          audioEl.autoplay = true;
          audioEl.style.display = 'none';
          document.body.appendChild(audioEl);
        }
      }
    });

    document.querySelectorAll('audio[data-stream-key]').forEach((el) => {
      const streamKey = el.getAttribute('data-stream-key');
      if (streamKey && !remoteStreams.has(streamKey)) {
        (el as HTMLAudioElement).srcObject = null;
        el.remove();
      }
    });
  }, [remoteStreams]);

  useEffect(() => {
    mediaManager.setCallbacks(
      (streams) => setRemoteStreams(new Map(streams)),
      (stream, type) => {
        if (stream && type) {
          setLocalStreams((prev) => new Map(prev).set(type, stream));
        } else if (type) {
          setLocalStreams((prev) => {
            const next = new Map(prev);
            next.delete(type);
            return next;
          });
        }
      }
    );

    return () => {
      document.querySelectorAll('audio[data-stream-key]').forEach((el) => {
        el.remove();
      });
    };
  }, []);

  useEffect(() => {
    if (localStreams.size > 0) {
      collaborators.forEach((collaborator) => {
        if (collaborator.peerId) {
          mediaManager.callPeer(collaborator.peerId);
        }
      });
    }
  }, [collaborators, localStreams]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const startVideo = useCallback(async () => {
    try {
      await mediaManager.startVideo();
      setIsVideoOff(false);
    } catch (error) {
      console.error('Failed to start video:', error);
    }
  }, []);

  const stopVideo = useCallback(() => {
    mediaManager.stopLocalStream('video');
  }, []);

  const startAudioCall = useCallback(async () => {
    try {
      await mediaManager.startAudioCall();
    } catch (error) {
      console.error('Failed to start audio call:', error);
    }
  }, []);

  const stopAudioCall = useCallback(() => {
    mediaManager.stopLocalStream('audio-call');
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      await mediaManager.startScreenShare();
    } catch (error) {
      console.error('Failed to start screen share:', error);
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    mediaManager.stopLocalStream('screen');
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      if (file) {
        const trackData = await parseTrackMetadata(file, userId, userName);
        audioFilesRef.current.set(trackData.id, file);
        addToPlaylist(trackData);
      }
    }

    if (e.target) {
      e.target.value = '';
    }
  }, [userId, userName, addToPlaylist]);

  const handleUrlSubmit = useCallback(async () => {
    if (!audioUrl.trim()) {
      return;
    }

    try {
      const url = audioUrl.trim();
      const trackId = crypto.randomUUID();

      const trackData: AudioTrackData = {
        'id': trackId,
        'title': url.split('/').pop() || '网络音频',
        'artist': '网络资源',
        'album': '',
        'duration': 0,
        'coverUrl': null,
        'addedBy': userId,
        'addedByName': userName,
        'addedAt': Date.now()
      };

      audioUrlsRef.current.set(trackId, url);
      addToPlaylist(trackData);
      setAudioUrl('');
      setShowUrlInput(false);
    } catch (error) {
      console.error('添加音频URL失败:', error);
    }
  }, [audioUrl, userId, userName, addToPlaylist]);

  const removeTrack = useCallback((index: number, trackId: string) => {
    audioFilesRef.current.delete(trackId);
    removeFromPlaylist(index);
  }, [removeFromPlaylist]);

  const toggleMute = useCallback(() => {
    const videoStream = localStreams.get('video');
    const audioCallStream = localStreams.get('audio-call');

    if (videoStream) {
      const audioTrack = videoStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }

    if (audioCallStream) {
      const audioTrack = audioCallStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }

    setIsMuted(!isMuted);
  }, [localStreams, isMuted]);

  const toggleVideo = useCallback(() => {
    const videoStream = localStreams.get('video');
    if (videoStream) {
      const videoTrack = videoStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, [localStreams]);

  const togglePlayPause = useCallback(() => {
    if (!audioPlaybackState) {
      return;
    }
    updatePlaybackState({
      'isPlaying': !audioPlaybackState.isPlaying
    });
  }, [audioPlaybackState, updatePlaybackState]);

  const seekAudio = useCallback((seekTime: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = seekTime;
      updatePlaybackState({
        'currentTime': seekTime
      });
    }
  }, [updatePlaybackState]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = Number(e.target.value);
    seekAudio(seekTime);
  }, [seekAudio]);

  const adjustVolume = useCallback((newVolume: number) => {
    document.querySelectorAll('audio[data-stream-key]').forEach((el) => {
      const audioEl = el as HTMLAudioElement;
      audioEl.volume = newVolume;
    });

    if (audioElementRef.current) {
      audioElementRef.current.volume = newVolume;
    }

    setVolume(newVolume);
  }, []);

  const playTrackById = useCallback(async (trackId: string, index: number) => {
    const file = audioFilesRef.current.get(trackId);
    const url = audioUrlsRef.current.get(trackId);

    if (!file && !url) {
      return;
    }

    try {
      const audioSource: File | string = file || url!;
      const result: AudioShareResult = await mediaManager.startAudioShare(audioSource);
      audioElementRef.current = result.audioElement;
      audioContextRef.current = result.audioContext;

      updatePlaybackState({
        'currentTrackIndex': index,
        'currentTime': 0
      });

      result.audioElement.onloadedmetadata = () => {
        const audioDuration = result.audioElement.duration;
        setDuration(audioDuration);
        updateTrackDuration(trackId, audioDuration);
      };

      result.audioElement.ontimeupdate = () => {
        updatePlaybackState({
          'currentTime': result.audioElement.currentTime
        });
      };

      result.audioElement.onended = () => {
        const playlist = audioPlaylist;
        if (playlist && index < playlist.length - 1) {
          const nextIndex = index + 1;
          const nextTrack = playlist[nextIndex];
          if (nextTrack && playTrackRef.current) {
            removeFromPlaylist(index);
            playTrackRef.current(nextTrack.id, nextIndex - 1);
          }
        } else {
          if (audioPlaybackState?.autoPlayNext) {
            updatePlaybackState({
              'currentTrackIndex': 0,
              'currentTime': 0
            });
          } else {
            updatePlaybackState({
              'isPlaying': false,
              'currentTime': 0
            });
          }
          removeFromPlaylist(index);
        }
      };
    } catch (error) {
      console.error('Failed to start audio share:', error);
    }
  }, [updatePlaybackState, updateTrackDuration, audioPlaylist, removeFromPlaylist, audioPlaybackState?.autoPlayNext]);

  useEffect(() => {
    playTrackRef.current = playTrackById;
  }, [playTrackById]);

  const toggleAutoPlayNext = useCallback(() => {
    if (!audioPlaybackState) {
      return;
    }
    updatePlaybackState({
      'autoPlayNext': !audioPlaybackState.autoPlayNext
    });
  }, [audioPlaybackState, updatePlaybackState]);

  const hasAudioShare = localStreams.has('audio-share');

  const playNext = useCallback(() => {
    if (!audioPlaybackState || !audioPlaylist) {
      return;
    }
    const currentIndex = audioPlaybackState.currentTrackIndex;
    const playlistLength = audioPlaylist.length;

    if (playlistLength === 0) {
      updatePlaybackState({
        'currentTrackIndex': 0,
        'isPlaying': false,
        'currentTime': 0
      });
      return;
    }

    if (playlistLength === 1) {
      if (audioElementRef.current) {
        audioElementRef.current.currentTime = 0;
        audioElementRef.current.play().catch(() => {});
        updatePlaybackState({
          'currentTime': 0,
          'isPlaying': true
        });
      }
      return;
    }

    const nextIndex = (currentIndex + 1) % playlistLength;
    const nextTrack = audioPlaylist[nextIndex];
    if (nextTrack && playTrackRef.current) {
      removeFromPlaylist(currentIndex);
      const adjustedIndex = currentIndex < nextIndex ? nextIndex - 1 : 0;
      playTrackRef.current(nextTrack.id, adjustedIndex);
    }
  }, [audioPlaybackState, audioPlaylist, updatePlaybackState, removeFromPlaylist]);

  useEffect(() => {
    if (!audioPlaylist || audioPlaylist.length === 0) {
      if (hasAudioShare) {
        mediaManager.stopLocalStream('audio-share');
      }
      updatePlaybackState({
        'currentTrackIndex': 0,
        'isPlaying': false,
        'currentTime': 0
      });
      return;
    }

    const currentTrack = audioPlaylist[audioPlaybackState?.currentTrackIndex ?? 0];
    if (!currentTrack) {
      return;
    }

    if (!hasAudioShare) {
      if (playTrackRef.current && currentTrack.addedBy === userId) {
        playTrackRef.current(currentTrack.id, audioPlaybackState?.currentTrackIndex ?? 0);
      }
    }
  }, [audioPlaylist, audioPlaybackState?.currentTrackIndex, hasAudioShare, userId, updatePlaybackState]);

  useEffect(() => {
    if (!audioElementRef.current || !audioPlaybackState) {
      return;
    }

    if (audioPlaybackState.isPlaying && hasAudioShare) {
      audioElementRef.current.play().catch(() => {});
    } else if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
  }, [audioPlaybackState, hasAudioShare]);

  useEffect(() => {
    if (!audioPlaylist) {
      return;
    }

    const playlist = Array.from(audioPlaylist);
    playlist.forEach((track, index) => {
      const isProviderOnline = collaborators.some((c) => c.id === track.addedBy);
      if (!isProviderOnline && index < (audioPlaybackState?.currentTrackIndex ?? 0)) {
        removeFromPlaylist(index);
      }
    });
  }, [collaborators, audioPlaybackState?.currentTrackIndex, audioPlaylist, removeFromPlaylist]);

  const hasVideo = localStreams.has('video');
  const hasAudioCall = localStreams.has('audio-call');
  const hasScreenShare = localStreams.has('screen');

  const currentTrackIndex = audioPlaybackState?.currentTrackIndex ?? 0;
  const currentTrack = audioPlaylist?.[currentTrackIndex];

  if (!isOpen) {
    return null;
  }

  const playlistArray = audioPlaylist ? Array.from(audioPlaylist) : [];

  const localVideoStreams = Array.from(localStreams.entries())
    .filter(([type]) => type === 'video' || type === 'screen')
    .map(([type, stream]) => ({ type, stream }));

  const remoteVideoStreams = Array.from(remoteStreams.entries())
    .filter(([, state]) => state.type === 'video' || state.type === 'screen');

  const audioCallStreamsByUser = new Map<string, Array<{ id: string; state: MediaState }>>();
  remoteStreams.forEach((state, id) => {
    if (state.type === 'audio-call') {
      const userStreams = audioCallStreamsByUser.get(state.peerId) || [];
      userStreams.push({ id, state });
      audioCallStreamsByUser.set(state.peerId, userStreams);
    }
  });

  const content = (
    <>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative bg-neutral-900">
          <VideoGrid
            localVideoStreams={localVideoStreams}
            remoteVideoStreams={remoteVideoStreams}
            userId={userId}
            userName={userName}
            userColor={userColor}
            isMuted={isMuted}
          />

          {hasVideo && !isInline && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors text-white"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
        </div>

        <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={hasVideo ? stopVideo : startVideo}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                hasVideo
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
              }`}
            >
              {hasVideo ? <VideoOff size={18} /> : <Video size={18} />}
              <span className="text-xs">视频</span>
            </button>
            <button
              onClick={hasAudioCall ? stopAudioCall : startAudioCall}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                hasAudioCall
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
              }`}
            >
              {hasAudioCall ? <MicOff size={18} /> : <Mic size={18} />}
              <span className="text-xs">语音</span>
            </button>
            <button
              onClick={hasScreenShare ? stopScreenShare : startScreenShare}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                hasScreenShare
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
              }`}
            >
              {hasScreenShare ? <MonitorOff size={18} /> : <Monitor size={18} />}
              <span className="text-xs">共享</span>
            </button>
            <button
              onClick={() => setShowAudioPanel(true)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                hasAudioShare
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
              }`}
            >
              {hasAudioShare ? <Music2 size={18} /> : <Music size={18} />}
              <span className="text-xs">音频</span>
            </button>
          </div>

          {(hasVideo || hasAudioCall) && (
            <div className="flex items-center justify-center gap-3 mt-2">
              <button
                onClick={toggleMute}
                className={`p-2 rounded-full transition-colors ${
                  isMuted
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                }`}
                title={isMuted ? '取消静音' : '静音'}
              >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              {hasVideo && (
                <button
                  onClick={toggleVideo}
                  className={`p-2 rounded-full transition-colors ${
                    isVideoOff
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                  }`}
                  title={isVideoOff ? '开启视频' : '关闭视频'}
                >
                  {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
                </button>
              )}
            </div>
          )}

          <div className="px-4 pt-3 pb-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 mt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-neutral-500" />
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {collaborators.length + 1} 位参与者
                </span>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto">
                <div className="relative">
                  <Avatar userId={userId} size={20} color={userColor} />
                  {localStreams.size > 0 && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-neutral-800" />
                  )}
                </div>
                {collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="relative">
                    <Avatar userId={collaborator.id} size={20} />
                    {Array.from(remoteStreams.values()).some(
                      (s) => s.peerId === collaborator.peerId
                    ) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-neutral-800" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 border-l border-neutral-200 dark:border-neutral-700 pl-4">
                {remoteVideoStreams.length > 0 && (
                  <>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">视频:</span>
                    {remoteVideoStreams.map(([id, state]) => (
                      <div
                        key={id}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                      >
                        <Avatar userId={state.peerId} size={14} color={state.userColor} />
                        {state.userName}
                        <span className="text-[10px] text-neutral-400">
                          {state.type === 'video' ? '视' : '屏'}
                        </span>
                      </div>
                    ))}
                  </>
                )}

                {audioCallStreamsByUser.size > 0 && (
                  <>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">语音:</span>
                    {Array.from(audioCallStreamsByUser.entries()).map(([peerId, streams]) => {
                      const state = streams[0]?.state;
                      if (!state) {
                        return null;
                      }
                      return (
                        <div
                          key={peerId}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                        >
                          <Avatar userId={peerId} size={14} color={state.userColor} />
                          {state.userName}
                          <Mic size={10} className="text-green-500" />
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAudioPanel && (
        <motion.div
          initial={{ 'opacity': 0 }}
          animate={{ 'opacity': 1 }}
          exit={{ 'opacity': 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 dark:bg-black/70"
          onClick={() => setShowAudioPanel(false)}
        >
          <motion.div
            initial={{ 'scale': 0.95, 'opacity': 0 }}
            animate={{ 'scale': 1, 'opacity': 1 }}
            exit={{ 'scale': 0.95, 'opacity': 0 }}
            className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              <div className="flex items-center gap-3">
                <Music size={20} className="text-orange-500" />
                <h3 className="font-semibold text-neutral-900 dark:text-white">音频共享</h3>
              </div>
              <button
                onClick={() => setShowAudioPanel(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col h-[600px]">
              {currentTrack && (
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-stretch gap-4">
                    <div className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-700">
                      {currentTrack.coverUrl ? (
                        <img
                          src={currentTrack.coverUrl}
                          alt={currentTrack.title}
                          className="w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-400 to-sky-600">
                          <Music size={32} className="text-white" />
                        </div>
                      )}
                      {(audioPlaybackState?.isPlaying ?? false) && (
                        <div className="absolute bottom-1.5 right-1.5 flex gap-0.5 items-end">
                          <span className="flex w-0.5 h-3 bg-white/80 rounded-full animate-bounce" style={{ 'animationDelay': '0ms' }} />
                          <span className="flex w-0.5 h-4 bg-white/80 rounded-full animate-bounce" style={{ 'animationDelay': '150ms' }} />
                          <span className="flex w-0.5 h-2.5 bg-white/80 rounded-full animate-bounce" style={{ 'animationDelay': '300ms' }} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                      <div className="mb-2.5">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate leading-tight" title={currentTrack.title}>
                          {currentTrack.title}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5" title={`${currentTrack.artist}${currentTrack.album ? ` · ${currentTrack.album}` : ''}`}>
                          {currentTrack.artist}
                          {currentTrack.album && <span className="text-neutral-400 dark:text-neutral-500"> · {currentTrack.album}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlayPause}
                          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-sky-50 dark:bg-sky-900/30 text-sky-500 hover:text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                        >
                          {(audioPlaybackState?.isPlaying ?? false) ? (
                            <PauseIcon size={18} strokeWidth={2.5} />
                          ) : (
                            <Play size={18} className="ml-0.5" strokeWidth={2.5} />
                          )}
                        </button>
                        <button
                          onClick={playNext}
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                          <SkipForward size={16} />
                        </button>

                        <div className="flex-1 flex items-center gap-2">
                          <span className="flex-shrink-0 text-[11px] text-neutral-400 dark:text-neutral-500 font-mono tabular-nums min-w-[60px] text-right">
                            {formatTime(audioPlaybackState?.currentTime ?? 0)}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={currentTrack?.duration || duration || 100}
                            value={audioPlaybackState?.currentTime ?? 0}
                            onChange={handleSeek}
                            className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer"
                            disabled={!currentTrack}
                          />
                          <span className="flex-shrink-0 text-[11px] text-neutral-400 dark:text-neutral-500 font-mono tabular-nums min-w-[60px]">
                            {formatTime(currentTrack?.duration || duration || 0)}
                          </span>
                        </div>

                        <div className="flex-shrink-0 flex items-center gap-1">
                          <button
                            onClick={() => adjustVolume(volume > 0 ? 0 : 1)}
                            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                          >
                            {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={volume}
                            onChange={(e) => adjustVolume(Number(e.target.value))}
                            className="w-14 h-1 accent-sky-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-white">
                    播放列表 ({playlistArray.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors"
                    >
                      <Upload size={14} />
                      上传
                    </button>
                    <button
                      onClick={() => setShowUrlInput(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors"
                    >
                      <Music size={14} />
                      URL
                    </button>
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>

                {showUrlInput && (
                  <div className="mb-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        placeholder="输入音频URL..."
                        className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        onClick={handleUrlSubmit}
                        className="px-3 py-1.5 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                      >
                        添加
                      </button>
                      <button
                        onClick={() => {
                          setShowUrlInput(false);
                          setAudioUrl('');
                        }}
                        className="px-3 py-1.5 text-sm bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                {playlistArray.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400">
                    <Music size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">播放列表为空</p>
                    <p className="text-xs mt-1">点击"添加"按钮上传音频文件</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {playlistArray.map((track, index) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          index === currentTrackIndex
                            ? 'bg-orange-50 dark:bg-orange-500/10'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-700">
                          {track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-400 to-sky-600">
                              <Music size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate" title={track.title}>
                            {track.title}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate" title={`${track.artist}${track.addedByName ? ` · ${track.addedByName}` : ''}`}>
                            {track.artist}
                            {track.addedByName && <span className="text-neutral-400 dark:text-neutral-500"> · {track.addedByName}</span>}
                          </p>
                        </div>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono tabular-nums flex-shrink-0">
                          {track.duration > 0 ? formatTime(track.duration) : '--:--'}
                        </span>
                        <button
                          onClick={() => removeTrack(index, track.id)}
                          className="p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">自动连播</span>
                  <button
                    onClick={toggleAutoPlayNext}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      (audioPlaybackState?.autoPlayNext ?? false)
                        ? 'bg-orange-500'
                        : 'bg-neutral-300 dark:bg-neutral-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        (audioPlaybackState?.autoPlayNext ?? false) ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );

  if (isInline) {
    return (
      <div className="flex h-full bg-white dark:bg-neutral-900 rounded-xl overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ 'opacity': 0 }}
      animate={{ 'opacity': 1 }}
      exit={{ 'opacity': 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ 'scale': 0.95, 'opacity': 0 }}
        animate={{ 'scale': 1, 'opacity': 1 }}
        exit={{ 'scale': 0.95, 'opacity': 0 }}
        ref={containerRef}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-6xl mx-4 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
          <div className="flex items-center gap-3">
            <Video size={20} className="text-sky-500" />
            <h3 className="font-semibold text-neutral-900 dark:text-white">媒体中心</h3>
            {localStreams.size > 0 && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                进行中
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {content}
        </div>
      </motion.div>
    </motion.div>
  );
}
