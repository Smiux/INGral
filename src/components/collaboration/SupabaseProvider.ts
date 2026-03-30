import * as Y from 'yjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import { supabase } from '@/services/supabaseClient';

const DOC_UPDATE_EVENT = 'doc-update';
const AWARENESS_EVENT = 'awareness-update';
const SYNC_REQUEST_EVENT = 'sync-request';
const SYNC_RESPONSE_EVENT = 'sync-response';

export class SupabaseProvider {
  awareness: Awareness;

  doc: Y.Doc;

  channel: RealtimeChannel | null = null;

  private isDestroyed = false;

  private statusCallback: ((status: { connected: boolean }) => void) | null = null;

  private pendingUpdates: Uint8Array[] = [];

  private syncedCallback: (() => void) | null = null;

  constructor (doc: Y.Doc, options: {
    channel: string;
    id: string;
  }) {
    this.doc = doc;
    this.awareness = new Awareness(doc);

    this.initChannel(options.channel);
    this.initDocumentListener();
  }

  private initChannel (channelName: string) {
    this.channel = supabase.channel(`collaboration:${channelName}`, {
      'config': {
        'broadcast': { 'self': false, 'ack': true }
      }
    });

    this.channel
      .on('broadcast', { 'event': DOC_UPDATE_EVENT }, (payload) => {
        if (payload.payload && payload.payload.update) {
          try {
            const update = this.base64ToUint8Array(payload.payload.update);
            Y.applyUpdate(this.doc, update, this);
          } catch (err) {
            console.error('Failed to apply doc update:', err);
          }
        }
      })
      .on('broadcast', { 'event': AWARENESS_EVENT }, (payload) => {
        if (payload.payload && payload.payload.update) {
          try {
            const update = this.base64ToUint8Array(payload.payload.update);
            applyAwarenessUpdate(this.awareness, update, this);
          } catch (err) {
            console.error('Failed to apply awareness update:', err);
          }
        }
      })
      .on('broadcast', { 'event': SYNC_REQUEST_EVENT }, () => {
        this.sendSyncResponse();
      })
      .on('broadcast', { 'event': SYNC_RESPONSE_EVENT }, (payload) => {
        if (payload.payload) {
          try {
            if (payload.payload.docUpdate) {
              const update = this.base64ToUint8Array(payload.payload.docUpdate);
              Y.applyUpdate(this.doc, update, this);
            }
            if (payload.payload.awarenessUpdate) {
              const update = this.base64ToUint8Array(payload.payload.awarenessUpdate);
              applyAwarenessUpdate(this.awareness, update, this);
            }
            this.syncedCallback?.();
          } catch (err) {
            console.error('Failed to apply sync response:', err);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.statusCallback?.({ 'connected': true });
          this.flushPendingUpdates();
          this.requestSyncState();
        }
      });
  }

  private base64ToUint8Array (base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    let i = 0;
    for (const char of binaryString) {
      bytes[i] = char.charCodeAt(0);
      i += 1;
    }
    return bytes;
  }

  private uint8ArrayToBase64 (bytes: Uint8Array): string {
    const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
    return btoa(binary);
  }

  private initDocumentListener () {
    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === this || this.isDestroyed) {
        return;
      }
      this.broadcastDocUpdate(update);
    });

    this.awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      if (this.isDestroyed) {
        return;
      }
      const changedClients = [...added, ...updated, ...removed];
      const update = encodeAwarenessUpdate(this.awareness, changedClients);
      this.broadcastAwarenessUpdate(update);
    });
  }

  private requestSyncState () {
    this.channel?.send({
      'type': 'broadcast',
      'event': SYNC_REQUEST_EVENT,
      'payload': {}
    });
  }

  private async sendSyncResponse () {
    const docUpdate = Y.encodeStateAsUpdate(this.doc);
    const awarenessUpdate = encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys()));

    await this.channel?.send({
      'type': 'broadcast',
      'event': SYNC_RESPONSE_EVENT,
      'payload': {
        'docUpdate': this.uint8ArrayToBase64(docUpdate),
        'awarenessUpdate': this.uint8ArrayToBase64(awarenessUpdate)
      }
    });
    this.syncedCallback?.();
  }

  private async broadcastDocUpdate (update: Uint8Array) {
    const updateStr = this.uint8ArrayToBase64(update);
    if (this.channel?.state === 'joined') {
      await this.channel.send({
        'type': 'broadcast',
        'event': DOC_UPDATE_EVENT,
        'payload': { 'update': updateStr }
      });
    } else {
      this.pendingUpdates.push(update);
    }
  }

  private async broadcastAwarenessUpdate (update: Uint8Array) {
    const updateStr = this.uint8ArrayToBase64(update);
    if (this.channel?.state === 'joined') {
      await this.channel.send({
        'type': 'broadcast',
        'event': AWARENESS_EVENT,
        'payload': { 'update': updateStr }
      });
    }
  }

  private flushPendingUpdates () {
    while (this.pendingUpdates.length > 0) {
      const update = this.pendingUpdates.shift();
      if (update) {
        this.broadcastDocUpdate(update);
      }
    }
  }

  setStatusCallback (callback: (status: { connected: boolean }) => void) {
    this.statusCallback = callback;
  }

  onSynced (callback: () => void) {
    this.syncedCallback = callback;
    return this;
  }

  on (event: string, callback: (...args: unknown[]) => void) {
    if (event === 'awareness') {
      this.awareness.on('change', callback);
    }
    return this;
  }

  connect () {
    return this;
  }

  disconnect () {
    this.channel?.unsubscribe();
  }

  destroy () {
    this.isDestroyed = true;
    this.pendingUpdates = [];
    this.awareness.destroy();
    this.channel?.unsubscribe();
    this.channel = null;
  }
}
