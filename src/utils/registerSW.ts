// Service Worker 注册脚本
import { registerSW } from 'virtual:pwa-register';

// 用于处理Service Worker更新的回调函数
type UpdateSWCallback = (reloadPage?: boolean) => Promise<void>;

let updateSW: UpdateSWCallback | undefined;

// 移除不必要的类型扩展，使用标准的navigator类型

/**
 * 注册Service Worker
 * @returns 用于触发更新的函数
 */
export function registerServiceWorker(): UpdateSWCallback | undefined {
  // 确保navigator在浏览器环境中可用
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      // 确保registerSW返回的类型与UpdateSWCallback兼容
      const swCallback = registerSW({
        onNeedRefresh() {
          // 当有新的Service Worker版本可用时
          console.log('发现新版本，请刷新页面');
          // 这里可以触发一个提示，让用户选择是否刷新
        },
        onOfflineReady() {
          // 当应用准备好离线使用时
          console.log('应用已准备好离线使用');
        },
        onRegistered(registration: ServiceWorkerRegistration | undefined) {
            console.log('Service Worker 已注册:', registration);
            // 检查更新 - 确保registration存在
            setInterval(() => {
              registration?.update();
            }, 1000 * 60 * 60); // 每小时检查一次更新
          },
        onRegisterError(error: Error) {
          console.error('Service Worker 注册失败:', error);
        },
      });
      
      updateSW = swCallback as UpdateSWCallback;
    } catch (error) {
      console.error('Service Worker 注册过程出错:', error);
    }
  }
  
  return updateSW;
}

/**
 * 检查Service Worker更新
 * @returns Promise<void> - 更新操作的Promise
 */
export function checkForUpdates(): Promise<void> {
  // 返回一个Promise以确保调用者可以知道操作何时完成
  return new Promise((resolve) => {
    if (updateSW) {
      updateSW(true)
        .catch(error => {
          console.error('更新Service Worker失败:', error);
        })
        .finally(() => resolve());
    } else {
      // 如果没有updateSW函数可用，直接resolve
      resolve();
    }
  });
}
