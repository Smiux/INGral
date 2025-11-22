import { lazy, Suspense } from 'react';
import { Loader } from '../Loader';

// 创建一个懒加载的图表可视化组件
const LazyGraphVisualizationComponent = lazy(() => 
  // 动态导入原始的GraphVisualization组件
  import('../GraphVisualization').then((module) => ({
    default: module.GraphVisualization
  }))
);

// 创建一个包装组件，包含加载状态和错误边界处理
export const LazyGraphVisualization = () => {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] w-full">
          <Loader size="large" text="加载图表可视化组件..." />
        </div>
      }
    >
      <LazyGraphVisualizationComponent />
    </Suspense>
  );
};
