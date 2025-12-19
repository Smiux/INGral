// 为virtual:pwa-register添加类型声明
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: () => void;
    onRegisterError?: () => void;
  }

  export function registerSW(): () => Promise<void>;
}
