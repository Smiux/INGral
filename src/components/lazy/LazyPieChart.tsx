import { lazy, Suspense } from 'react';
import { Loader } from '../ui/Loader';

// 定义PieChartProps接口
interface PieChartData {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

// 定义更具体的PieChartOptions接口
interface PieChartOptions {
  colors?: string[];
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  [key: string]: unknown;
}

interface PieChartProps {
  data: PieChartData[];
  height?: number;
  options?: PieChartOptions;
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
