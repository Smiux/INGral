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
  X,
  Play,
  Pause as PauseIcon,
  Upload,
  Volume2,
  VolumeX,
  Trash2,
  SkipForward,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { mediaManager, type MediaType, type MediaState, type AudioShareResult } from './MediaManager';
import { Avatar } from './Avatar';
import parseAudioMetadata from 'parse-audio-metadata';
import { useStorage, useMutation, useUpdateMyPresence, type AudioTrackData, LiveObject } from '../liveblocks.config';

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
    // 忽略元数据解析失败
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
    // 忽略时长获取失败
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

interface Participant {
  id: string;
  name: string;
  color: string;
  isLocal: boolean;
  micMuted: boolean;
  mediaTypes: MediaType[];
}

interface VideoStreamEntry {
  id: string;
  participantId: string;
  type: 'video' | 'screen';
  stream: MediaStream;
  isLocal: boolean;
  userName: string;
  userColor: string;
}

function MicIndicator ({ muted, hasAudio = true, size = 12 }: { muted: boolean; hasAudio?: boolean; size?: number }) {
  if (!hasAudio) {
    return (
      <div className="p-0.5 bg-slate-500/80 rounded-full">
        <Mic size={size} className="text-white" />
      </div>
    );
  }
  if (muted) {
    return (
      <div className="p-0.5 bg-red-500/80 rounded-full">
        <MicOff size={size} className="text-white" />
      </div>
    );
  }
  return (
    <div className="p-0.5 bg-green-500/80 rounded-full">
      <Mic size={size} className="text-white" />
    </div>
  );
}

function ParticipantAvatarTile ({
  participant,
  size = 'large'
}: {
  participant: Participant;
  size?: 'large' | 'small';
}) {
  const isLarge = size === 'large';
  const avatarSize = isLarge ? 64 : 28;
  const nameSize = isLarge ? 'text-sm' : 'text-[10px]';

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div className="relative">
        <Avatar userId={participant.id} size={avatarSize} color={participant.color} />
        <div className="absolute -bottom-0.5 -left-0.5">
          <MicIndicator muted={participant.micMuted} hasAudio={participant.mediaTypes.includes('audio-call')} size={isLarge ? 12 : 9} />
        </div>
      </div>
      <div className="text-center">
        <span className={`${nameSize} text-slate-400 truncate block max-w-[80px]`}>
          {participant.name}
          {participant.isLocal && ' (你)'}
        </span>
      </div>
    </div>
  );
}

function ParticipantGrid ({ participants }: { participants: Participant[] }) {
  const count = participants.length;
  let cols: number;
  if (count === 1) {
    cols = 1;
  } else if (count <= 2) {
    cols = 2;
  } else if (count <= 4) {
    cols = 2;
  } else if (count <= 9) {
    cols = 3;
  } else {
    cols = 4;
  }

  return (
    <div
      className="w-full h-full grid gap-4 p-4 place-items-center"
      style={{ 'gridTemplateColumns': `repeat(${cols}, 1fr)` }}
    >
      {participants.map((p) => (
        <ParticipantAvatarTile key={p.id} participant={p} size="large" />
      ))}
    </div>
  );
}

function VideoDisplay ({
  streams,
  currentIdx,
  onPrev,
  onNext
}: {
  streams: VideoStreamEntry[];
  currentIdx: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const current = streams[currentIdx];

  useEffect(() => {
    if (videoRef.current && current) {
      videoRef.current.srcObject = current.stream;
    }
  }, [current]);

  if (!current) {
    return null;
  }

  const hasMultiple = streams.length > 1;

  return (
    <div className="w-full h-full relative bg-black rounded overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={current.isLocal}
        className="w-full h-full object-contain"
      />

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-slate-900/40 dark:bg-black/60 rounded-full">
        <Avatar userId={current.participantId} size={16} color={current.userColor} />
        <span className="text-white text-xs">
          {current.userName}
          {current.isLocal && ' (你)'}
        </span>
        <span className="text-[10px] text-slate-400 px-1 py-px bg-slate-800/80 rounded">
          {current.type === 'video' ? '视频' : '屏幕'}
        </span>
      </div>

      {hasMultiple && (
        <>
          <button
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900/30 dark:bg-black/50 hover:bg-slate-900/50 dark:hover:bg-black/70 rounded-full transition-colors text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900/30 dark:bg-black/50 hover:bg-slate-900/50 dark:hover:bg-black/70 rounded-full transition-colors text-white"
          >
            <ChevronRight size={20} />
          </button>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900/30 dark:bg-black/50 rounded-full text-white text-xs">
            {currentIdx + 1} / {streams.length}
          </div>
        </>
      )}
    </div>
  );
}

function ParticipantStrip ({ participants }: { participants: Participant[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
    }
    return () => {
      if (el) {
        el.removeEventListener('scroll', checkScroll);
      }
    };
  }, [checkScroll, participants]);

  useEffect(() => {
    checkScroll();
  }, [participants, checkScroll]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const itemWidth = 76;
    const scrollAmount = itemWidth * 4;
    el.scrollBy({
      'left': direction === 'left' ? -scrollAmount : scrollAmount,
      'behavior': 'smooth'
    });
  }, []);

  return (
    <div className="relative flex-shrink-0" style={{ 'height': '88px' }}>
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-slate-900/40 dark:bg-black/60 hover:bg-slate-900/60 dark:hover:bg-black/80 rounded-full text-white transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 px-3 h-full overflow-x-auto scrollbar-none"
        style={{ 'scrollbarWidth': 'none' }}
      >
        {participants.map((p) => (
          <div key={p.id} className="flex-shrink-0" style={{ 'width': '76px' }}>
            <ParticipantAvatarTile participant={p} size="small" />
          </div>
        ))}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-slate-900/40 dark:bg-black/60 hover:bg-slate-900/60 dark:hover:bg-black/80 rounded-full text-white transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

interface MediaPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userColor: string;
  collaborators: Array<{ id: string; name: string; color: string; peerId: string | null; mediaTypes: MediaType[]; micMuted: boolean }>;
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoStreamIdx, setVideoStreamIdx] = useState(0);

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
  const previousPeerIdsRef = useRef<Set<string>>(new Set());

  const updateMyPresence = useUpdateMyPresence();
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
    const currentPeerIds = new Set<string>();

    collaborators.forEach((c) => {
      if (c.peerId) {
        currentPeerIds.add(c.peerId);
        mediaManager.addKnownPeer(c.peerId, c.name, c.color);
      }
    });

    previousPeerIdsRef.current.forEach((peerId) => {
      if (!currentPeerIds.has(peerId)) {
        mediaManager.removeKnownPeer(peerId);
      }
    });

    previousPeerIdsRef.current = currentPeerIds;
  }, [collaborators]);

  const hasVideo = localStreams.has('video');
  const hasAudioCall = localStreams.has('audio-call');
  const hasScreenShare = localStreams.has('screen');
  const hasAudioShare = localStreams.has('audio-share');

  useEffect(() => {
    const types = mediaManager.getActiveMediaTypes();
    updateMyPresence({ 'mediaTypes': types, 'micMuted': false });
  }, [localStreams, updateMyPresence]);

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

  const toggleVideo = useCallback(async () => {
    if (hasVideo) {
      mediaManager.stopLocalStream('video');
    } else {
      try {
        await mediaManager.startVideo();
      } catch {
        // 视频启动失败
      }
    }
  }, [hasVideo]);

  const toggleAudioCall = useCallback(async () => {
    if (hasAudioCall) {
      mediaManager.stopLocalStream('audio-call');
    } else {
      try {
        await mediaManager.startAudioCall();
      } catch {
        // 语音启动失败
      }
    }
  }, [hasAudioCall]);

  const toggleScreenShare = useCallback(async () => {
    if (hasScreenShare) {
      mediaManager.stopLocalStream('screen');
    } else {
      try {
        await mediaManager.startScreenShare();
      } catch {
        // 屏幕共享启动失败
      }
    }
  }, [hasScreenShare]);

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
    } catch {
      // 添加音频URL失败
    }
  }, [audioUrl, userId, userName, addToPlaylist]);

  const removeTrack = useCallback((index: number, trackId: string) => {
    audioFilesRef.current.delete(trackId);
    removeFromPlaylist(index);
  }, [removeFromPlaylist]);

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
    } catch {
      // 音频共享启动失败
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

  const currentTrackIndex = audioPlaybackState?.currentTrackIndex ?? 0;
  const currentTrack = audioPlaylist?.[currentTrackIndex];

  const allParticipants: Participant[] = [
    {
      'id': userId,
      'name': userName,
      'color': userColor,
      'isLocal': true,
      'micMuted': false,
      'mediaTypes': Array.from(localStreams.keys())
    },
    ...collaborators.map((c) => ({
      'id': c.id,
      'name': c.name,
      'color': c.color,
      'isLocal': false,
      'micMuted': c.micMuted,
      'mediaTypes': c.mediaTypes
    }))
  ];

  const videoStreams: VideoStreamEntry[] = [];

  const localVideoStream = localStreams.get('video');
  if (localVideoStream) {
    videoStreams.push({
      'id': 'local-video',
      'participantId': userId,
      'type': 'video',
      'stream': localVideoStream,
      'isLocal': true,
      userName,
      userColor
    });
  }

  const localScreenStream = localStreams.get('screen');
  if (localScreenStream) {
    videoStreams.push({
      'id': 'local-screen',
      'participantId': userId,
      'type': 'screen',
      'stream': localScreenStream,
      'isLocal': true,
      userName,
      userColor
    });
  }

  remoteStreams.forEach((state, key) => {
    if (state.type === 'video' || state.type === 'screen') {
      videoStreams.push({
        'id': key,
        'participantId': state.peerId,
        'type': state.type,
        'stream': state.stream,
        'isLocal': false,
        'userName': state.userName,
        'userColor': state.userColor
      });
    }
  });

  const hasVideoStreams = videoStreams.length > 0;

  const safeVideoIdx = videoStreamIdx >= videoStreams.length
    ? Math.max(0, videoStreams.length - 1)
    : videoStreamIdx;

  const handlePrevVideo = useCallback(() => {
    setVideoStreamIdx((prev) => (prev - 1 + videoStreams.length) % videoStreams.length);
  }, [videoStreams.length]);

  const handleNextVideo = useCallback(() => {
    setVideoStreamIdx((prev) => (prev + 1) % videoStreams.length);
  }, [videoStreams.length]);

  if (!isOpen) {
    return null;
  }

  const playlistArray = audioPlaylist ? Array.from(audioPlaylist) : [];

  const content = (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 relative bg-slate-100 dark:bg-slate-900 rounded overflow-hidden">
          {hasVideoStreams ? (
            <div className="w-full h-full flex flex-col">
              <div className="flex-1 min-h-0">
                <VideoDisplay
                  streams={videoStreams}
                  currentIdx={safeVideoIdx}
                  onPrev={handlePrevVideo}
                  onNext={handleNextVideo}
                />
              </div>
              <ParticipantStrip participants={allParticipants} />
            </div>
          ) : (
            <ParticipantGrid participants={allParticipants} />
          )}

          {!isInline && (
            <div className="absolute top-2 right-2">
              <button
                onClick={toggleFullscreen}
                className="p-1.5 bg-slate-900/30 dark:bg-black/50 hover:bg-slate-900/50 dark:hover:bg-black/70 rounded-full transition-colors text-white"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-3 py-2 border-t border-slate-200/60 dark:border-slate-700/50 bg-slate-50/90 dark:bg-slate-800/90">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={toggleVideo}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded transition-colors ${
                hasVideo
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-slate-100/40 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700'
              }`}
            >
              {hasVideo ? <VideoOff size={16} /> : <Video size={16} />}
              <span className="text-[10px]">视频</span>
            </button>
            <button
              onClick={toggleAudioCall}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded transition-colors ${
                hasAudioCall
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-slate-100/40 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700'
              }`}
            >
              {hasAudioCall ? <MicOff size={16} /> : <Mic size={16} />}
              <span className="text-[10px]">语音</span>
            </button>
            <button
              onClick={toggleScreenShare}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded transition-colors ${
                hasScreenShare
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-slate-100/40 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700'
              }`}
            >
              {hasScreenShare ? <MonitorOff size={16} /> : <Monitor size={16} />}
              <span className="text-[10px]">共享</span>
            </button>
            <button
              onClick={() => setShowAudioPanel(true)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded transition-colors ${
                hasAudioShare
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-slate-100/40 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700'
              }`}
            >
              {hasAudioShare ? <Music2 size={16} /> : <Music size={16} />}
              <span className="text-[10px]">音频</span>
            </button>
          </div>
        </div>
      </div>

      {showAudioPanel && (
        <motion.div
          initial={{ 'opacity': 0 }}
          animate={{ 'opacity': 1 }}
          exit={{ 'opacity': 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/30 dark:bg-black/50"
          onClick={() => setShowAudioPanel(false)}
        >
          <motion.div
            initial={{ 'scale': 0.95, 'opacity': 0 }}
            animate={{ 'scale': 1, 'opacity': 1 }}
            exit={{ 'scale': 0.95, 'opacity': 0 }}
            className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <Music size={20} className="text-orange-500" />
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">音频共享</h3>
              </div>
              <button
                onClick={() => setShowAudioPanel(false)}
                className="p-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/80 transition-colors text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col h-[600px]">
              {currentTrack && (
                <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-stretch gap-4">
                    <div className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-slate-100/40 dark:bg-slate-800/40">
                      {currentTrack.coverUrl ? (
                        <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full" />
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
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate leading-tight">
                          {currentTrack.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {currentTrack.artist}
                          {currentTrack.album && <span className="text-slate-400"> · {currentTrack.album}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlayPause}
                          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-sky-50 dark:bg-sky-900/30 text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                        >
                          {(audioPlaybackState?.isPlaying ?? false) ? <PauseIcon size={18} strokeWidth={2.5} /> : <Play size={18} className="ml-0.5" strokeWidth={2.5} />}
                        </button>
                        <button
                          onClick={playNext}
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          <SkipForward size={16} />
                        </button>

                        <div className="flex-1 flex items-center gap-2">
                          <span className="flex-shrink-0 text-[11px] text-slate-400 font-mono tabular-nums min-w-[50px] text-right">
                            {formatTime(audioPlaybackState?.currentTime ?? 0)}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={currentTrack?.duration || duration || 100}
                            value={audioPlaybackState?.currentTime ?? 0}
                            onChange={handleSeek}
                            className="flex-1 h-1.5 bg-slate-200/50 dark:bg-slate-800/80 rounded appearance-none cursor-pointer"
                            disabled={!currentTrack}
                          />
                          <span className="flex-shrink-0 text-[11px] text-slate-400 font-mono tabular-nums min-w-[50px]">
                            {formatTime(currentTrack?.duration || duration || 0)}
                          </span>
                        </div>

                        <div className="flex-shrink-0 flex items-center gap-1">
                          <button
                            onClick={() => adjustVolume(volume > 0 ? 0 : 1)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    播放列表 ({playlistArray.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded transition-colors"
                    >
                      <Upload size={14} />
                      上传
                    </button>
                    <button
                      onClick={() => setShowUrlInput(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded transition-colors"
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
                  <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/90 rounded">
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        placeholder="输入音频URL..."
                        className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button onClick={handleUrlSubmit} className="px-3 py-1.5 text-sm bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors">添加</button>
                      <button
                        onClick={() => {
                          setShowUrlInput(false);
                          setAudioUrl('');
                        }}
                        className="px-3 py-1.5 text-sm bg-slate-200/50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                {playlistArray.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Music size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">播放列表为空</p>
                    <p className="text-xs mt-1">点击"上传"按钮添加音频文件</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {playlistArray.map((track, index) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-2 p-2 rounded transition-colors ${
                          index === currentTrackIndex
                            ? 'bg-orange-50 dark:bg-orange-500/10'
                            : 'hover:bg-slate-100/40 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-slate-100/40 dark:bg-slate-800/40">
                          {track.coverUrl ? (
                            <img src={track.coverUrl} alt={track.title} className="w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-400 to-sky-600">
                              <Music size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{track.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {track.artist}
                            {track.addedByName && <span className="text-slate-400"> · {track.addedByName}</span>}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400 font-mono tabular-nums flex-shrink-0">
                          {track.duration > 0 ? formatTime(track.duration) : '--:--'}
                        </span>
                        <button
                          onClick={() => removeTrack(index, track.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/90">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">自动连播</span>
                  <button
                    onClick={toggleAutoPlayNext}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      (audioPlaybackState?.autoPlayNext ?? false) ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'
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
      <div className="flex h-full bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ 'opacity': 0 }}
      animate={{ 'opacity': 1 }}
      exit={{ 'opacity': 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 dark:bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ 'scale': 0.95, 'opacity': 0 }}
        animate={{ 'scale': 1, 'opacity': 1 }}
        exit={{ 'scale': 0.95, 'opacity': 0 }}
        ref={containerRef}
        className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <Video size={18} className="text-sky-500" />
            <h3 className="font-semibold text-slate-700 dark:text-white text-sm">媒体中心</h3>
            {localStreams.size > 0 && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">进行中</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/80 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden min-h-0">
          {content}
        </div>
      </motion.div>
    </motion.div>
  );
}
