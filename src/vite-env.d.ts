// / <reference types="vite/client" />

// 声明CSS模块类型
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// 声明其他样式文件类型
declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.sass' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.less' {
  const content: Record<string, string>;
  export default content;
}

// 环境变量类型声明
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GITHUB_TOKEN?: string;
  readonly VITE_GITHUB_OWNER?: string;
  readonly VITE_GITHUB_REPO?: string;
  readonly VITE_GITHUB_BRANCH?: string;
  readonly VITE_GITHUB_PATH?: string;
  readonly VITE_GITHUB_RAW_BASE_URL?: string;
  readonly VITE_GITHUB_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
