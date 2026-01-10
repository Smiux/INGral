import React, { useRef, useState, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// 定义可拖拽面板的属性
type DraggablePanelProps = {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
};

const DraggablePanel: React.FC<DraggablePanelProps> = ({
  id,
  title,
  children,
  className = '',
  style = {},
  onPositionChange,
  onSizeChange
}) => {
  // 面板引用，用于获取实际尺寸和位置
  const panelRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDraggingHeader, setIsDraggingHeader] = useState(false);
  const [position, setPosition] = useState({ 'x': 0, 'y': 0 });
  const [size, setSize] = useState({ 'width': 300, 'height': 400 });

  // 使用dnd-kit的useDraggable hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform
  } = useDraggable({ id });

  // 应用变换后的样式
  const draggableStyle = {
    'transform': CSS.Transform.toString(transform)
  };

  // 处理头部拖拽开始
  const handleHeaderMouseDown = useCallback(() => {
    setIsDraggingHeader(true);
  }, []);

  // 处理窗口鼠标移动（拖拽和调整大小）
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDraggingHeader) {
        // 计算新位置
        // 20是头部高度的一半
        const newPosition = {
          'x': e.clientX - size.width / 2,
          'y': e.clientY - 20
        };
        setPosition(newPosition);
        onPositionChange?.(newPosition);
      } else if (isResizing && panelRef.current) {
        // 计算新尺寸
        const rect = panelRef.current.getBoundingClientRect();
        const newSize = {
          'width': Math.max(200, e.clientX - rect.left),
          'height': Math.max(200, e.clientY - rect.top)
        };
        setSize(newSize);
        onSizeChange?.(newSize);
      }
    },
    [isDraggingHeader, isResizing, size.width, onPositionChange, onSizeChange]
  );

  // 处理窗口鼠标抬起
  const handleMouseUp = useCallback(() => {
    setIsDraggingHeader(false);
    setIsResizing(false);
  }, []);

  // 处理调整大小开始
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // 监听全局鼠标事件
  React.useEffect(() => {
    if (isDraggingHeader || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }

    return undefined;
  }, [isDraggingHeader, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
      }}
      className={`draggable-panel backdrop-blur-md bg-white/90 border border-white/20 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-3xl ${className}`}
      style={{
        'position': 'absolute',
        'left': position.x,
        'top': position.y,
        'width': size.width,
        'height': size.height,
        'zIndex': 10,
        ...style,
        ...draggableStyle
      }}
    >
      {/* 可拖拽头部 - 玻璃态效果 */}
      <div
        className="bg-gradient-to-r from-blue-500/80 to-purple-600/80 text-white p-3 font-semibold cursor-move flex justify-between items-center backdrop-blur-sm border-b border-white/20"
        onMouseDown={handleHeaderMouseDown}
        {...attributes}
        {...listeners}
      >
        <span className="text-sm tracking-wide">{title}</span>
        <div className="flex gap-2">
          {/* 窗口控制按钮 */}
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-400/80 hover:bg-red-500 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80 hover:bg-yellow-500 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-green-400/80 hover:bg-green-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* 内容区域 - 玻璃态背景 */}
      <div className="h-[calc(100%-48px)] overflow-auto p-3 bg-white/5 backdrop-blur-sm">
        {children}
      </div>

      {/* 调整大小手柄 - 玻璃态效果 */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 bg-gradient-to-br from-blue-400/60 to-purple-500/60 cursor-se-resize rounded-tl-lg border-t border-l border-white/30 hover:from-blue-500/80 hover:to-purple-600/80 transition-all duration-200"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
};

export default React.memo(DraggablePanel);
