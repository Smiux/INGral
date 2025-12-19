/**
 * 懒加载图片组件
 * 实现图片的按需加载和渐进式加载，提高页面加载速度和用户体验
 */
import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  blurPlaceholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  aspectRatio?: string;
}

/**
 * 懒加载图片组件
 * @param props - 组件属性
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiI+PC9yZWN0Pjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LXNpemU9IjEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZmlsbD0iIzY2NiI+MjAwIHgyMDAgeD48L3RleHQ+PC9zdmc+',
  blurPlaceholder,
  onLoad,
  onError,
  aspectRatio,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(blurPlaceholder || placeholder);
  const [isBlurLoaded, setIsBlurLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const placeholderRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // 创建 IntersectionObserver 实例
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 图片进入视口，开始加载
            if (blurPlaceholder) {
              // 如果有模糊占位符，先加载占位符
              const placeholderImg = new Image();
              placeholderImg.src = blurPlaceholder;
              placeholderImg.onload = () => {
                setIsBlurLoaded(true);
                // 占位符加载完成后，加载真实图片
                setImageSrc(src);
              };
            } else {
              // 直接加载真实图片
              setImageSrc(src);
            }
            // 停止观察
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        // 提前 200px 开始加载
        'rootMargin': '200px 0px',
        // 当图片 10% 进入视口时开始加载
        'threshold': 0.1
      }
    );

    // 观察图片元素
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    // 清理函数
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, blurPlaceholder]);

  // 图片加载完成处理
  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad();
    }
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* 模糊占位符 */}
      {(blurPlaceholder || placeholder) && (
        <img
          ref={placeholderRef}
          src={blurPlaceholder || placeholder}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover ${isBlurLoaded ? 'blur-sm' : 'opacity-0'} transition-all duration-300`}
          style={{
            'filter': isLoaded ? 'blur(0px)' : 'blur(8px)',
            'opacity': isLoaded ? 0 : 1,
            'transition': isLoaded ? 'filter 0.5s ease-out, opacity 0.5s ease-out' : 'filter 0.3s ease-in, opacity 0.3s ease-in'
          }}
          aria-hidden={true}
        />
      )}
      {/* 真实图片 */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className="w-full h-full object-cover transition-all duration-500"
        style={{
          'opacity': isLoaded ? 1 : 0,
          'transition': 'opacity 0.5s ease-out'
        }}
        onLoad={handleLoad}
        onError={onError}
        {...rest}
      />
    </div>
  );
};

export default LazyImage;
