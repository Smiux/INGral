/**
 * 懒加载图片组件
 * 实现图片的按需加载，提高页面加载速度
 */
import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
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
  onLoad,
  onError,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // 创建 IntersectionObserver 实例
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 图片进入视口，开始加载
            setImageSrc(src);
            // 停止观察
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '200px 0px', // 提前 200px 开始加载
        threshold: 0.1, // 当图片 10% 进入视口时开始加载
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
  }, [src]);

  // 图片加载完成处理
  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad();
    }
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onLoad={handleLoad}
      onError={onError}
      {...rest}
    />
  );
};

export default LazyImage;
