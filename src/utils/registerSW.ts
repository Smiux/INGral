// Service Worker 注册脚本
// 暂时注释掉PWA相关导入以解决构建问题
// import { registerSW } from 'virtual:pwa-register';

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
      // 暂时使用模拟实现，避免PWA相关错误
      console.log('Service Worker 功能暂时禁用，用于构建测试');
      
      // 创建一个模拟的回调函数
      const mockCallback = async (reloadPage?: boolean) => {
        console.log('模拟Service Worker更新检查');
        if (reloadPage) {
          window.location.reload();
        }
      };
      
      updateSW = mockCallback;
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
