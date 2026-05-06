import Peer, { type MediaConnection } from 'peerjs';

export type MediaType = 'video' | 'screen' | 'audio-call' | 'audio-share';

export interface MediaState {
  type: MediaType;
  stream: MediaStream;
  peerId: string;
  userName: string;
  userColor: string;
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

const MAX_RECONNECT_RETRIES = 3;
const RECONNECT_BASE_DELAY = 1000;

class MediaManager {
  private peer: Peer | null = null;

  private myPeerId: string | null = null;

  private outgoingCalls: Map<string, MediaConnection> = new Map();

  private incomingCalls: Map<string, MediaConnection> = new Map();

  private localStreams: Map<MediaType, MediaStream> = new Map();

  private remoteStreams: Map<string, MediaState> = new Map();

  private knownPeers: Map<string, { userName: string; userColor: string }> = new Map();

  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private retryCounts: Map<string, number> = new Map();

  private onMediaUpdate: MediaUpdateCallback | null = null;

  private onLocalStreamUpdate: LocalStreamCallback | null = null;

  private myUserData: { userName: string; userColor: string } | null = null;

  private audioContexts: Map<MediaType, AudioContext> = new Map();

  private audioConfig: AudioEnhancementConfig = DEFAULT_AUDIO_CONFIG;

  private getConnectionKey (peerId: string, type: MediaType): string {
    return `${peerId}-${type}`;
  }

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
      type?: MediaType;
      userName?: string;
      userColor?: string;
    } | undefined;
    const type = metadata?.type || 'video';
    const userName = metadata?.userName || 'Unknown';
    const userColor = metadata?.userColor || '#888888';
    const connectionKey = this.getConnectionKey(call.peer, type);

    this.knownPeers.set(call.peer, { userName, userColor });
    this.retryCounts.delete(connectionKey);

    const existingIncoming = this.incomingCalls.get(connectionKey);
    if (existingIncoming) {
      existingIncoming.close();
    }
    this.incomingCalls.set(connectionKey, call);

    call.on('stream', (remoteStream) => {
      if (remoteStream.getTracks().length > 0) {
        this.remoteStreams.set(connectionKey, {
          'type': type as MediaType,
          'stream': remoteStream,
          'peerId': call.peer,
          userName,
          userColor
        });
        this.notifyMediaUpdate();
      }
    });

    call.on('close', () => {
      if (this.incomingCalls.get(connectionKey) === call) {
        this.incomingCalls.delete(connectionKey);
        this.remoteStreams.delete(connectionKey);
        this.notifyMediaUpdate();
      }
    });

    call.on('error', () => {
      if (this.incomingCalls.get(connectionKey) === call) {
        this.incomingCalls.delete(connectionKey);
        this.remoteStreams.delete(connectionKey);
        this.notifyMediaUpdate();
      }
    });

    const localStream = this.localStreams.get(type);
    if (localStream) {
      call.answer(localStream);
    } else {
      call.answer();
    }
  }

  private scheduleReconnect (peerId: string, type: MediaType): void {
    if (!this.localStreams.has(type) || !this.knownPeers.has(peerId)) {
      return;
    }

    const connectionKey = this.getConnectionKey(peerId, type);
    const currentRetries = this.retryCounts.get(connectionKey) ?? 0;

    if (currentRetries >= MAX_RECONNECT_RETRIES) {
      return;
    }

    this.cancelReconnect(connectionKey);
    const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, currentRetries), 10000);
    this.retryCounts.set(connectionKey, currentRetries + 1);

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(connectionKey);
      this.callPeerForType(peerId, type);
    }, delay);

    this.reconnectTimers.set(connectionKey, timer);
  }

  private cancelReconnect (connectionKey: string): void {
    const timer = this.reconnectTimers.get(connectionKey);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(connectionKey);
    }
    this.retryCounts.delete(connectionKey);
  }

  private callPeerForType (peerId: string, type: MediaType): void {
    if (!this.peer || !this.myUserData || !this.myPeerId || !peerId) {
      return;
    }

    const stream = this.localStreams.get(type);
    if (!stream) {
      return;
    }

    const connectionKey = this.getConnectionKey(peerId, type);

    const existingCall = this.outgoingCalls.get(connectionKey);
    if (existingCall) {
      this.cancelReconnect(connectionKey);
      existingCall.close();
      this.outgoingCalls.delete(connectionKey);
    }

    const call = this.peer.call(peerId, stream, {
      'metadata': {
        type,
        'userName': this.myUserData.userName,
        'userColor': this.myUserData.userColor
      }
    });

    this.outgoingCalls.set(connectionKey, call);
    this.retryCounts.delete(connectionKey);

    call.on('stream', (remoteStream) => {
      if (remoteStream.getTracks().length > 0) {
        const peerData = this.knownPeers.get(peerId);
        this.remoteStreams.set(connectionKey, {
          type,
          'stream': remoteStream,
          peerId,
          'userName': peerData?.userName ?? 'Unknown',
          'userColor': peerData?.userColor ?? '#888888'
        });
        this.notifyMediaUpdate();
      }
    });

    call.on('close', () => {
      if (this.outgoingCalls.get(connectionKey) === call) {
        this.outgoingCalls.delete(connectionKey);
        this.scheduleReconnect(peerId, type);
      }
    });

    call.on('error', () => {
      if (this.outgoingCalls.get(connectionKey) === call) {
        this.outgoingCalls.delete(connectionKey);
        this.scheduleReconnect(peerId, type);
      }
    });
  }

  private updateConnectionsForType (type: MediaType): void {
    if (!this.localStreams.has(type)) {
      const keysToRemove: string[] = [];
      this.outgoingCalls.forEach((call, key) => {
        if (key.endsWith(`-${type}`)) {
          this.cancelReconnect(key);
          call.close();
          keysToRemove.push(key);
        }
      });
      keysToRemove.forEach((key) => this.outgoingCalls.delete(key));
      return;
    }

    this.knownPeers.forEach((_, peerId) => {
      this.callPeerForType(peerId, type);
    });
  }

  addKnownPeer (peerId: string, userName: string, userColor: string): void {
    if (!peerId || peerId === this.myPeerId) {
      return;
    }

    this.knownPeers.set(peerId, { userName, userColor });

    this.localStreams.forEach((_, type) => {
      this.callPeerForType(peerId, type);
    });
  }

  removeKnownPeer (peerId: string): void {
    if (!peerId) {
      return;
    }

    this.knownPeers.delete(peerId);

    const outgoingKeysToRemove: string[] = [];
    this.outgoingCalls.forEach((call, key) => {
      if (key.startsWith(`${peerId}-`)) {
        this.cancelReconnect(key);
        call.close();
        outgoingKeysToRemove.push(key);
      }
    });
    outgoingKeysToRemove.forEach((key) => this.outgoingCalls.delete(key));

    const incomingKeysToRemove: string[] = [];
    this.incomingCalls.forEach((call, key) => {
      if (key.startsWith(`${peerId}-`)) {
        call.close();
        incomingKeysToRemove.push(key);
      }
    });
    incomingKeysToRemove.forEach((key) => this.incomingCalls.delete(key));

    const streamKeysToRemove: string[] = [];
    this.remoteStreams.forEach((_, key) => {
      if (key.startsWith(`${peerId}-`)) {
        streamKeysToRemove.push(key);
      }
    });
    streamKeysToRemove.forEach((key) => this.remoteStreams.delete(key));

    this.notifyMediaUpdate();
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
    } catch {
      return stream;
    }
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
      this.stopLocalStreamTracks(type);
    }

    this.localStreams.set(type, stream);
    this.onLocalStreamUpdate?.(stream, type);

    this.updateConnectionsForType(type);
  }

  private stopLocalStreamTracks (type: MediaType): void {
    const stream = this.localStreams.get(type);
    if (!stream) {
      return;
    }

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
  }

  stopLocalStream (type?: MediaType): void {
    if (type) {
      this.stopLocalStreamTracks(type);
      this.updateConnectionsForType(type);
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

      for (const call of this.outgoingCalls.values()) {
        call.close();
      }
      this.outgoingCalls.clear();

      for (const call of this.incomingCalls.values()) {
        call.close();
      }
      this.incomingCalls.clear();

      this.remoteStreams.clear();

      this.reconnectTimers.forEach((timer) => clearTimeout(timer));
      this.reconnectTimers.clear();
      this.retryCounts.clear();
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

  getActiveMediaTypes (): MediaType[] {
    return Array.from(this.localStreams.keys());
  }

  private notifyMediaUpdate (): void {
    this.onMediaUpdate?.(this.remoteStreams);
  }

  disconnect (): void {
    this.stopLocalStream();
    this.knownPeers.clear();

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.myPeerId = null;
  }
}

export const mediaManager = new MediaManager();
