import { lazy, Suspense } from 'react';
import { Loader } from '../Loader';

// 导入所需的类型定义
import { ChartData } from '../../types/analytics';

// 定义BarChartProps接口
interface BarChartProps {
  data: ChartData;
  height?: number;
  options?: Record<string, any>;
  className?: string;
  horizontal?: boolean;
}

// 动态导入BarChart组件
const BarChartComponent = lazy(() => import('../charts/BarChart'));

// 创建懒加载的BarChart组件
export const LazyBarChart = (props: BarChartProps) => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[300px] w-full">
          <Loader size="medium" text="加载柱状图..." />
        </div>
      }
    >
      <BarChartComponent {...props} />
    </Suspense>
  );
};
