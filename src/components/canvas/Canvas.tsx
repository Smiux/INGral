import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';

interface CanvasProps {
  height?: number;
  width?: number;
  onDraw?: (_ctx: CanvasRenderingContext2D, _canvas: HTMLCanvasElement) => void;
  className?: string;
}

export interface CanvasRef {
  canvas: HTMLCanvasElement | null;
  getContext: () => CanvasRenderingContext2D | null;
  redraw: () => void;
}

export const Canvas = forwardRef<CanvasRef, CanvasProps>(({
  height = 300,
  width = '100%',
  onDraw,
  className = ''
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    'canvas': canvasRef.current,
    'getContext': () => canvasRef.current?.getContext('2d') || null,
    'redraw': () => {
      const canvas = canvasRef.current;
      if (canvas && onDraw) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 清空画布
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // 调用绘制函数
          onDraw(ctx, canvas);
        }
      }
    }
  }), [onDraw]);

  // 调整画布大小以匹配容器
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;

        // 设置画布的显示尺寸
        canvas.style.width = typeof width === 'number' ? `${width}px` : width;
        canvas.style.height = `${height}px`;

        // 设置画布的实际尺寸（考虑设备像素比）
        const displayWidth = typeof width === 'number' ? width : rect.width;
        canvas.width = displayWidth * devicePixelRatio;
        canvas.height = height * devicePixelRatio;

        // 缩放上下文
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(devicePixelRatio, devicePixelRatio);
        }
      }
    };

    resizeCanvas();

    // 监听窗口大小变化
    window.addEventListener('resize', resizeCanvas);

    // 清理函数
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [height, width]);

  // 绘制图表
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && onDraw) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        onDraw(ctx, canvas);
      }
    }
  }, [onDraw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        'display': 'block',
        width,
        height,
        'maxWidth': '100%',
        'maxHeight': '100%'
      }}
    />
  );
});

Canvas.displayName = 'Canvas';
