import { lazy, Suspense } from 'react';
import { Loader } from '../Loader';

// 定义PieChartProps接口
interface PieChartData {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartData[];
  height?: number;
  options?: Record<string, any>;
  className?: string;
  showLabels?: boolean;
  showPercentages?: boolean;
}

// 动态导入PieChart组件
const PieChartComponent = lazy(() => import('../charts/PieChart'));

// 创建懒加载的PieChart组件
export const LazyPieChart = (props: PieChartProps) => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[300px] w-full">
          <Loader size="medium" text="加载饼图..." />
        </div>
      }
    >
      <PieChartComponent {...props} />
    </Suspense>
  );
};
