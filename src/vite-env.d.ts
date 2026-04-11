declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module 'parse-audio-metadata' {
  interface AudioMetadata {
    title?: string;
    artist?: string;
    album?: string;
    picture?: Blob;
    duration?: number;
  }

  function parseAudioMetadata (input: File | Blob | ArrayBuffer): Promise<AudioMetadata>;
  export default parseAudioMetadata;
}

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_LIVEBLOCKS_PUBLIC_KEY: string;
  readonly VITE_LIVEBLOCKS_SECRET_KEY: string;
  readonly VITE_TURN_ICE_SERVERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
