import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';
import parseAudioMetadata from 'parse-audio-metadata';

interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  picture: Blob | undefined;
}

function formatTime (seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function parseMetadata (src: string): Promise<Partial<AudioMetadata>> {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const metadata = await parseAudioMetadata(blob) as Record<string, unknown>;
    return {
      'title': (metadata.title as string) || '',
      'artist': (metadata.artist as string) || '',
      'album': (metadata.album as string) || '',
      'picture': metadata.picture as Blob | undefined
    };
  } catch {
    return {};
  }
}

function createBlobUrl (blob: Blob): string {
  return URL.createObjectURL(blob);
}

export const AudioNodeView: React.FC<NodeViewProps> = ({ node }) => {
  const src = node.attrs.src as string;
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [metadata, setMetadata] = useState<Partial<AudioMetadata>>({});
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    parseMetadata(src).then((data) => {
      if (!cancelled) {
        setMetadata(data);
        if (data.picture) {
          const url = createBlobUrl(data.picture);
          setCoverUrl(url);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    return () => {
      if (coverUrl) {
        URL.revokeObjectURL(coverUrl);
      }
    };
  }, [coverUrl]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) {
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) {
      return;
    }
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    setCurrentTime(current);
    if (isFinite(total) && total > 0) {
      setProgress((current / total) * 100);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !isFinite(audioRef.current.duration)) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) {
      return;
    }
    if (isMuted) {
      audioRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const displayTitle = metadata.title || '未知曲目';
  const displayArtist = metadata.artist || '未知作者';
  const displayAlbum = metadata.album;

  return (
    <NodeViewWrapper
      className="audio-node-wrapper my-6 mx-auto"
      contentEditable={false}
    >
      <div className="group flex items-stretch w-full max-w-[600px] rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-neutral-100dark:bg-neutral-700">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={displayTitle}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-400 to-sky-600">
              <Music size={32} className="text-white" />
            </div>
          )}
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              {isPlaying ? (
                <Pause size={18} className="text-neutral-800" strokeWidth={2.5} />
              ) : (
                <Play size={18} className="text-neutral-800 ml-0.5" strokeWidth={2.5} />
              )}
            </div>
          </button>
          {isPlaying && (
            <div className="absolute bottom-1.5 right-1.5 flex gap-0.5 items-end">
              <span className="flex w-0.5 h-3 bg-white/80 rounded-full animate-bounce" style={{ 'animationDelay': '0ms' }} />
              <span className="flex w-0.5 h-4 bg-white/80 rounded-full animate-bounce" style={{ 'animationDelay': '150ms' }} />
              <span className="flex w-0.5 h-2.5 bg-white/80 rounded-full animate-bounce" style={{ 'animationDelay': '300ms' }} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center py-3 px-4">
          <div className="mb-2.5">
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate leading-tight">
              {displayTitle}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {displayArtist}
              {displayAlbum && <span className="text-neutral-400 dark:text-neutral-500"> · {displayAlbum}</span>}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-sky-50 dark:bg-sky-900/30 text-sky-500 hover:text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
            >
              {isPlaying ? (
                <Pause size={15} strokeWidth={2.5} />
              ) : (
                <Play size={15} className="ml-0.5" strokeWidth={2.5} />
              )}
            </button>

            <div className="flex-1 flex items-center gap-2">
              <div
                ref={progressRef}
                className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-600 rounded-full cursor-pointer group/progress overflow-hidden"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-sky-500 rounded-full relative"
                  style={{ 'width': `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-sky-500 rounded-full shadow-sm opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="flex-shrink-0 text-[11px] text-neutral-400 dark:text-neutral-500 font-mono tabular-nums min-w-[60px] text-right">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex-shrink-0 flex items-center gap-1">
              <button
                onClick={toggleMute}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 accent-sky-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
        />
      </div>
    </NodeViewWrapper>
  );
};
