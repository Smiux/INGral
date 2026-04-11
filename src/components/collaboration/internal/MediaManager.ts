import Peer, { type MediaConnection } from 'peerjs';

export type MediaType = 'video' | 'screen' | 'audio-call' | 'audio-share';

export interface MediaState {
  type: MediaType;
  stream: MediaStream;
  peerId: string;
  userName: string;
  userColor: string;
}

export interface MediaSession {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaState>;
  type: MediaType | null;
  isActive: boolean;
}

export interface AudioTrack {
  id: string;
  file: File;
  fileUrl: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string | null;
}

type MediaUpdateCallback = (sessions: Map<string, MediaState>) => void;
type LocalStreamCallback = (stream: MediaStream | null, type: MediaType | null) => void;

export interface AudioShareResult {
  stream: MediaStream;
  audioElement: HTMLAudioElement;
  audioContext: AudioContext;
}

export interface AudioEnhancementConfig {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  highPassFilter: boolean;
  compressor: boolean;
}

const DEFAULT_AUDIO_CONFIG: AudioEnhancementConfig = {
  'echoCancellation': true,
  'noiseSuppression': true,
  'autoGainControl': true,
  'highPassFilter': true,
  'compressor': true
};

class MediaManager {
  private peer: Peer | null = null;

  private myPeerId: string | null = null;

  private calls: Map<string, MediaConnection> = new Map();

  private localStreams: Map<MediaType, MediaStream> = new Map();

  private remoteStreams: Map<string, MediaState> = new Map();

  private onMediaUpdate: MediaUpdateCallback | null = null;

  private onLocalStreamUpdate: LocalStreamCallback | null = null;

  private myUserData: { userName: string; userColor: string } | null = null;

  private audioContexts: Map<MediaType, AudioContext> = new Map();

  private audioConfig: AudioEnhancementConfig = DEFAULT_AUDIO_CONFIG;

  private getIceServers (): RTCIceServer[] {
    const iceServers: RTCIceServer[] = [];

    iceServers.push({ 'urls': 'stun:global.stun.twilio.com:3478' });

    const customIceServers = import.meta.env.VITE_TURN_ICE_SERVERS;
    if (customIceServers) {
      try {
        const parsed = JSON.parse(customIceServers);
        if (Array.isArray(parsed)) {
          iceServers.push(...parsed);
        }
      } catch {
        // 忽略解析错误
      }
    }

    iceServers.push(
      { 'urls': 'stun:stun.l.google.com:19302' },
      { 'urls': 'stun:stun.cloudflare.com:3478' },
      { 'urls': 'stun:stun1.l.google.com:19302' },
      { 'urls': 'stun:stun2.l.google.com:19302' }
    );

    return iceServers;
  }

  async initialize (userName: string, userColor: string): Promise<string> {
    this.myUserData = { userName, userColor };

    if (this.peer && this.myPeerId) {
      return this.myPeerId;
    }

    return new Promise((resolve, reject) => {
      const iceServers = this.getIceServers();

      this.peer = new Peer({
        'debug': 0,
        'config': { iceServers }
      });

      const openTimeout = setTimeout(() => {
        if (!this.myPeerId) {
          this.peer?.destroy();
          this.peer = null;
          reject(new Error('MediaManager initialization timeout'));
        }
      }, 15000);

      this.peer.on('open', (id) => {
        clearTimeout(openTimeout);
        this.myPeerId = id;
        resolve(id);
      });

      this.peer.on('call', (call) => {
        this.handleIncomingCall(call);
      });

      this.peer.on('error', (err) => {
        clearTimeout(openTimeout);
        if (err.type === 'peer-unavailable') {
          return;
        }
        reject(err);
      });

      this.peer.on('disconnected', () => {
        this.peer?.reconnect();
      });
    });
  }

  private handleIncomingCall (call: MediaConnection): void {
    const metadata = call.metadata as {
      types?: MediaType[];
      userName?: string;
      userColor?: string;
    } | undefined;
    const types = metadata?.types || ['video'];
    const userName = metadata?.userName || 'Unknown';
    const userColor = metadata?.userColor || '#888888';

    const existingCall = this.calls.get(call.peer);
    if (existingCall) {
      existingCall.close();
    }

    types.forEach((type) => {
      const connectionId = `${call.peer}-${type}`;
      this.remoteStreams.delete(connectionId);
    });

    call.on('stream', (remoteStream) => {
      const streamTracks = remoteStream.getTracks();
      const trackTypes = new Map<string, MediaStreamTrack[]>();

      streamTracks.forEach((track) => {
        const trackLabel = track.label || '';
        let trackType: MediaType = 'video';

        if (trackLabel.includes('screen') || trackLabel.includes('monitor')) {
          trackType = 'screen';
        } else if (track.kind === 'audio') {
          if (types.includes('audio-call')) {
            trackType = 'audio-call';
          } else if (types.includes('audio-share')) {
            trackType = 'audio-share';
          } else {
            trackType = 'audio-call';
          }
        } else if (track.kind === 'video') {
          if (types.includes('screen')) {
            trackType = 'screen';
          } else {
            trackType = 'video';
          }
        }

        if (!trackTypes.has(trackType)) {
          trackTypes.set(trackType, []);
        }
        trackTypes.get(trackType)!.push(track);
      });

      if (trackTypes.size === 0) {
        types.forEach((type) => {
          const connectionId = `${call.peer}-${type}`;
          const stream = new MediaStream();

          this.remoteStreams.set(connectionId, {
            type,
            stream,
            'peerId': call.peer,
            userName,
            userColor
          });
        });
      } else {
        trackTypes.forEach((tracks, type) => {
          const connectionId = `${call.peer}-${type}`;
          const stream = new MediaStream(tracks);

          this.remoteStreams.set(connectionId, {
            'type': type as MediaType,
            stream,
            'peerId': call.peer,
            userName,
            userColor
          });
        });
      }

      this.notifyMediaUpdate();
    });

    call.on('close', () => {
      types.forEach((type) => {
        const connectionId = `${call.peer}-${type}`;
        this.remoteStreams.delete(connectionId);
      });
      this.calls.delete(call.peer);
      this.notifyMediaUpdate();
    });

    call.on('error', () => {
      types.forEach((type) => {
        const connectionId = `${call.peer}-${type}`;
        this.remoteStreams.delete(connectionId);
      });
      this.calls.delete(call.peer);
      this.notifyMediaUpdate();
    });

    const combinedStream = this.createCombinedStream();
    if (combinedStream) {
      call.answer(combinedStream);
    } else {
      call.answer();
    }

    this.calls.set(call.peer, call);
  }

  private async enhanceAudioStream (stream: MediaStream, type: MediaType): Promise<MediaStream> {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return stream;
    }

    try {
      const audioContext = new AudioContext();
      this.audioContexts.set(type, audioContext);

      const source = audioContext.createMediaStreamSource(stream);

      let lastNode: AudioNode = source;

      if (this.audioConfig.highPassFilter) {
        const highPassFilter = audioContext.createBiquadFilter();
        highPassFilter.type = 'highpass';
        highPassFilter.frequency.value = 80;
        highPassFilter.Q.value = 0.7;
        lastNode.connect(highPassFilter);
        lastNode = highPassFilter;
      }

      if (this.audioConfig.compressor) {
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        lastNode.connect(compressor);
        lastNode = compressor;
      }

      const destination = audioContext.createMediaStreamDestination();
      lastNode.connect(destination);

      const processedStream = destination.stream;

      stream.getVideoTracks().forEach((track) => {
        processedStream.addTrack(track);
      });

      return processedStream;
    } catch (error) {
      console.error('音频增强失败:', error);
      return stream;
    }
  }

  private createCombinedStream (): MediaStream | null {
    if (this.localStreams.size === 0) {
      return null;
    }

    const combinedStream = new MediaStream();
    this.localStreams.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });
    });

    return combinedStream;
  }

  setCallbacks (
    onMediaUpdate: MediaUpdateCallback,
    onLocalStreamUpdate: LocalStreamCallback
  ): void {
    this.onMediaUpdate = onMediaUpdate;
    this.onLocalStreamUpdate = onLocalStreamUpdate;
  }

  async startVideo (): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        'video': { 'width': 1280, 'height': 720 },
        'audio': {
          'echoCancellation': this.audioConfig.echoCancellation,
          'noiseSuppression': this.audioConfig.noiseSuppression,
          'autoGainControl': this.audioConfig.autoGainControl
        }
      });

      const enhancedStream = await this.enhanceAudioStream(stream, 'video');
      await this.setLocalStream(enhancedStream, 'video');
      return enhancedStream;
    } catch (error) {
      throw new Error(`无法访问摄像头: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async startAudioCall (): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        'audio': {
          'echoCancellation': this.audioConfig.echoCancellation,
          'noiseSuppression': this.audioConfig.noiseSuppression,
          'autoGainControl': this.audioConfig.autoGainControl
        }
      });

      const enhancedStream = await this.enhanceAudioStream(stream, 'audio-call');
      await this.setLocalStream(enhancedStream, 'audio-call');
      return enhancedStream;
    } catch (error) {
      throw new Error(`无法访问麦克风: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async startScreenShare (): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        'video': true,
        'audio': true
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopLocalStream('screen');
        };
      }

      await this.setLocalStream(stream, 'screen');
      return stream;
    } catch (error) {
      throw new Error(`无法共享屏幕: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async startAudioShare (audioFile: File | string): Promise<AudioShareResult> {
    try {
      const audioUrl = typeof audioFile === 'string' ? audioFile : URL.createObjectURL(audioFile);
      const audioContext = new AudioContext();
      const audioElement = new Audio(audioUrl);
      audioElement.crossOrigin = 'anonymous';

      await audioElement.play();

      const source = audioContext.createMediaElementSource(audioElement);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioContext.destination);

      const stream = destination.stream;

      const cleanup = () => {
        audioElement.pause();
        audioElement.src = '';
        if (typeof audioFile !== 'string') {
          URL.revokeObjectURL(audioUrl);
        }
        audioContext.close();
      };

      audioElement.onended = () => {
        cleanup();
        this.stopLocalStream('audio-share');
      };

      (stream as MediaStream & {
        audioElement: HTMLAudioElement;
        audioContext: AudioContext;
        audioUrl: string;
        cleanup: () => void;
      }).audioElement = audioElement;
      (stream as MediaStream & {
        audioElement: HTMLAudioElement;
        audioContext: AudioContext;
        audioUrl: string;
        cleanup: () => void;
      }).audioContext = audioContext;
      (stream as MediaStream & {
        audioElement: HTMLAudioElement;
        audioContext: AudioContext;
        audioUrl: string;
        cleanup: () => void;
      }).audioUrl = audioUrl;
      (stream as MediaStream & {
        audioElement: HTMLAudioElement;
        audioContext: AudioContext;
        audioUrl: string;
        cleanup: () => void;
      }).cleanup = cleanup;

      await this.setLocalStream(stream, 'audio-share');
      return { stream, audioElement, audioContext };
    } catch (error) {
      throw new Error(`无法共享音频: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private async setLocalStream (stream: MediaStream, type: MediaType): Promise<void> {
    const existingStream = this.localStreams.get(type);
    if (existingStream) {
      this.stopLocalStream(type);
    }

    this.localStreams.set(type, stream);
    this.onLocalStreamUpdate?.(stream, type);

    this.updateAllConnections();
  }

  private updateAllConnections (): void {
    const combinedStream = this.createCombinedStream();
    const types = Array.from(this.localStreams.keys());

    this.calls.forEach((call, peerId) => {
      call.close();
      this.calls.delete(peerId);
    });

    if (combinedStream && this.peer && this.myUserData) {
      const peerIds = new Set<string>();
      this.remoteStreams.forEach((state) => {
        peerIds.add(state.peerId);
      });

      peerIds.forEach((peerId) => {
        this.callPeer(peerId, combinedStream, types);
      });
    }
  }

  stopLocalStream (type?: MediaType): void {
    if (type) {
      const stream = this.localStreams.get(type);
      if (stream) {
        if ((stream as MediaStream & { cleanup?: () => void }).cleanup) {
          (stream as MediaStream & { cleanup?: () => void }).cleanup?.();
        }
        stream.getTracks().forEach((track) => track.stop());
        this.localStreams.delete(type);
        this.onLocalStreamUpdate?.(null, type);

        const audioContext = this.audioContexts.get(type);
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
          this.audioContexts.delete(type);
        }

        this.updateAllConnections();
      }
    } else {
      for (const [, stream] of this.localStreams) {
        if ((stream as MediaStream & { cleanup?: () => void }).cleanup) {
          (stream as MediaStream & { cleanup?: () => void }).cleanup?.();
        }
        stream.getTracks().forEach((track) => track.stop());
      }
      this.localStreams.clear();
      this.onLocalStreamUpdate?.(null, null);

      this.audioContexts.forEach((audioContext) => {
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      });
      this.audioContexts.clear();

      for (const call of this.calls.values()) {
        call.close();
      }
      this.calls.clear();
      this.remoteStreams.clear();
    }
    this.notifyMediaUpdate();
  }

  getLocalStream (type: MediaType): MediaStream | undefined {
    return this.localStreams.get(type);
  }

  getAllLocalStreams (): Map<MediaType, MediaStream> {
    return new Map(this.localStreams);
  }

  hasLocalStream (type: MediaType): boolean {
    return this.localStreams.has(type);
  }

  private notifyMediaUpdate (): void {
    this.onMediaUpdate?.(this.remoteStreams);
  }

  setUserData (userName: string, userColor: string): void {
    this.myUserData = { userName, userColor };
  }

  setAudioEnhancementConfig (config: Partial<AudioEnhancementConfig>): void {
    this.audioConfig = { ...this.audioConfig, ...config };
  }

  getAudioEnhancementConfig (): AudioEnhancementConfig {
    return { ...this.audioConfig };
  }

  callPeer (peerId: string, stream?: MediaStream, types?: MediaType[]): void {
    if (!this.peer || !this.myUserData || !this.myPeerId) {
      return;
    }

    if (!peerId) {
      return;
    }

    const existingCall = this.calls.get(peerId);
    if (existingCall) {
      existingCall.close();
      this.calls.delete(peerId);
    }

    const callStream = stream || this.createCombinedStream();
    const callTypes = types || Array.from(this.localStreams.keys());

    if (!callStream || callTypes.length === 0) {
      return;
    }

    const call = this.peer.call(peerId, callStream, {
      'metadata': {
        'types': callTypes,
        'userName': this.myUserData.userName,
        'userColor': this.myUserData.userColor
      }
    });

    this.calls.set(peerId, call);

    call.on('close', () => {
      this.calls.delete(peerId);
    });

    call.on('error', () => {
      this.calls.delete(peerId);
    });
  }

  disconnect (): void {
    this.stopLocalStream();

    for (const call of this.calls.values()) {
      call.close();
    }
    this.calls.clear();

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.myPeerId = null;
  }
}

export const mediaManager = new MediaManager();
