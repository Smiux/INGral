import Peer, { type DataConnection } from 'peerjs';

export interface CursorData {
  x: number;
  y: number;
  userName: string;
  userColor: string;
  currentPath: string | null;
  scrollX: number;
  scrollY: number;
}

type CursorUpdateCallback = (connectionId: number, data: CursorData) => void;
type PeerDisconnectedCallback = (connectionId: number) => void;

interface ConnectionState {
  connectionId: number;
  peerId: string;
  retries: number;
}

class CursorManager {
  private peer: Peer | null = null;

  private myPeerId: string | null = null;

  private connections: Map<number, DataConnection> = new Map();

  private peerUserMap: Map<string, number> = new Map();

  private onCursorUpdate: CursorUpdateCallback | null = null;

  private onPeerDisconnected: PeerDisconnectedCallback | null = null;

  private myUserData: { userName: string; userColor: string; currentPath: string | null } | null = null;

  private pendingConnections: Map<string, ConnectionState> = new Map();

  private refCount = 0;

  private isDestroyed = false;

  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private maxRetries = 5;

  private baseRetryDelay = 1000;

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
      } catch (error) {
        console.error('Error parsing custom ice servers:', error);
      }
    }

    iceServers.push(
      { 'urls': 'stun:stun.l.google.com:19302' },
      { 'urls': 'stun:stun.cloudflare.com:3478' },
      { 'urls': 'stun:stun1.l.google.com:19302' },
      { 'urls': 'stun:stun2.l.google.com:19302' },
      { 'urls': 'stun:stun3.l.google.com:19302' },
      { 'urls': 'stun:stun4.l.google.com:19302' }
    );

    return iceServers;
  }

  async initialize (userName: string, userColor: string): Promise<string> {
    this.refCount += 1;

    if (this.peer && this.myPeerId) {
      this.myUserData = { userName, userColor, 'currentPath': this.myUserData?.currentPath ?? null };
      return this.myPeerId;
    }

    return new Promise((resolve, reject) => {
      this.isDestroyed = false;

      const iceServers = this.getIceServers();

      this.peer = new Peer({
        'debug': 0,
        'config': {
          iceServers
        }
      });

      const openTimeout = setTimeout(() => {
        if (!this.myPeerId) {
          this.peer?.destroy();
          this.peer = null;
          reject(new Error('Peer connection timeout'));
        }
      }, 10000);

      this.peer.on('open', (id) => {
        clearTimeout(openTimeout);
        this.myPeerId = id;
        this.myUserData = { userName, userColor, 'currentPath': null };
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        clearTimeout(openTimeout);
        console.error('PeerJS error:', err);

        if (!this.myPeerId) {
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        if (this.peer && !this.isDestroyed) {
          setTimeout(() => {
            if (this.peer && !this.isDestroyed) {
              this.peer.reconnect();
            }
          }, 2000);
        }
      });
    });
  }

  private handleIncomingConnection (conn: DataConnection): void {
    const peerId = conn.peer;

    conn.on('open', () => {
      if (this.myUserData) {
        conn.send({
          'type': 'user-info',
          'userName': this.myUserData.userName,
          'userColor': this.myUserData.userColor,
          'currentPath': this.myUserData.currentPath
        });
      }

      conn.on('data', (data) => {
        this.handleData(peerId, data);
      });

      conn.on('close', () => {
        this.handleConnectionClose(peerId);
      });

      conn.on('error', () => {
        this.handleConnectionClose(peerId);
      });
    });
  }

  private handleData (peerId: string, data: unknown): void {
    if (typeof data !== 'object' || data === null) {
      return;
    }

    const msg = data as Record<string, unknown>;
    const connectionId = this.peerUserMap.get(peerId);

    if (msg.type === 'user-info' && connectionId !== undefined) {
      return;
    }

    if (msg.type === 'cursor' && connectionId !== undefined && this.onCursorUpdate) {
      this.onCursorUpdate(connectionId, {
        'x': msg.x as number,
        'y': msg.y as number,
        'userName': msg.userName as string,
        'userColor': msg.userColor as string,
        'currentPath': msg.currentPath as string | null,
        'scrollX': (msg.scrollX as number) || 0,
        'scrollY': (msg.scrollY as number) || 0
      });
    }
  }

  private handleConnectionClose (peerId: string): void {
    const connectionId = this.peerUserMap.get(peerId);
    if (connectionId !== undefined) {
      this.connections.delete(connectionId);
      this.peerUserMap.delete(peerId);
      this.onPeerDisconnected?.(connectionId);
    }

    this.pendingConnections.delete(peerId);
    this.clearRetryTimeout(peerId);
  }

  private clearRetryTimeout (peerId: string): void {
    const timeout = this.retryTimeouts.get(peerId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(peerId);
    }
  }

  private scheduleRetry (connectionId: number, peerId: string): void {
    const state = this.pendingConnections.get(peerId);
    if (!state) {
      return;
    }

    if (state.retries >= this.maxRetries) {
      this.pendingConnections.delete(peerId);
      this.retryTimeouts.delete(peerId);
      return;
    }

    const delay = this.baseRetryDelay * Math.pow(2, state.retries);
    const timeout = setTimeout(() => {
      if (!this.isDestroyed && this.peer) {
        this.connectToPeerInternal(connectionId, peerId);
      }
    }, delay);

    this.retryTimeouts.set(peerId, timeout);
    state.retries += 1;
  }

  connectToPeer (connectionId: number, peerId: string): void {
    if (this.connections.has(connectionId) || this.pendingConnections.has(peerId) || !this.peer) {
      return;
    }

    this.connectToPeerInternal(connectionId, peerId);
  }

  private connectToPeerInternal (connectionId: number, peerId: string): void {
    if (this.connections.has(connectionId) || !this.peer) {
      return;
    }

    this.pendingConnections.set(peerId, {
      connectionId,
      peerId,
      'retries': this.pendingConnections.get(peerId)?.retries ?? 0
    });

    const conn = this.peer.connect(peerId, {
      'serialization': 'json',
      'reliable': true
    });

    const openTimeout = setTimeout(() => {
      if (this.pendingConnections.has(peerId)) {
        conn.close();
        this.scheduleRetry(connectionId, peerId);
      }
    }, 5000);

    conn.on('open', () => {
      clearTimeout(openTimeout);
      this.pendingConnections.delete(peerId);
      this.clearRetryTimeout(peerId);
      this.connections.set(connectionId, conn);
      this.peerUserMap.set(peerId, connectionId);

      if (this.myUserData) {
        conn.send({
          'type': 'user-info',
          'userName': this.myUserData.userName,
          'userColor': this.myUserData.userColor,
          'currentPath': this.myUserData.currentPath
        });
      }

      conn.on('data', (data) => {
        this.handleData(peerId, data);
      });

      conn.on('close', () => {
        this.handleConnectionClose(peerId);
      });

      conn.on('error', () => {
        this.handleConnectionClose(peerId);
      });
    });

    conn.on('error', () => {
      clearTimeout(openTimeout);
      if (this.pendingConnections.has(peerId)) {
        this.scheduleRetry(connectionId, peerId);
      }
    });
  }

  disconnectFromPeer (connectionId: number): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.close();
      this.connections.delete(connectionId);

      for (const [peerId, cid] of this.peerUserMap.entries()) {
        if (cid === connectionId) {
          this.peerUserMap.delete(peerId);
          this.clearRetryTimeout(peerId);
          break;
        }
      }
    }
  }

  sendCursorUpdate (pageX: number, pageY: number, scrollX: number, scrollY: number): void {
    if (!this.myUserData) {
      return;
    }

    const data = {
      'type': 'cursor',
      'x': pageX,
      'y': pageY,
      'userName': this.myUserData.userName,
      'userColor': this.myUserData.userColor,
      'currentPath': this.myUserData.currentPath,
      scrollX,
      scrollY
    };

    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(data);
      }
    }
  }

  updateUserData (userName?: string, userColor?: string, currentPath?: string | null): void {
    if (!this.myUserData) {
      return;
    }

    if (userName !== undefined) {
      this.myUserData.userName = userName;
    }
    if (userColor !== undefined) {
      this.myUserData.userColor = userColor;
    }
    if (currentPath !== undefined) {
      this.myUserData.currentPath = currentPath;
    }
  }

  setCallbacks (onCursorUpdate: CursorUpdateCallback, onPeerDisconnected: PeerDisconnectedCallback): void {
    this.onCursorUpdate = onCursorUpdate;
    this.onPeerDisconnected = onPeerDisconnected;
  }

  getPeerId (): string | null {
    return this.myPeerId;
  }

  release (): void {
    this.refCount = Math.max(0, this.refCount - 1);

    if (this.refCount === 0) {
      this.destroy();
    }
  }

  private destroy (): void {
    this.isDestroyed = true;

    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();

    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    this.peerUserMap.clear();
    this.pendingConnections.clear();

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.myPeerId = null;
    this.myUserData = null;
    this.onCursorUpdate = null;
    this.onPeerDisconnected = null;
  }
}

export const cursorManager = new CursorManager();
