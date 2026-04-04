declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_WEBSOCKET_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_LIVEBLOCKS_PUBLIC_KEY: string;
  readonly VITE_LIVEBLOCKS_SECRET_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
