import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Upload, X, Crop, Check, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { getCoverImageUrl } from '@/services/articleService';

interface CoverManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoverPath: string | null;
  onCoverChange: (file: File | Blob | null) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ASPECT_RATIO = 16 / 9;
const MIN_CROP_SIZE = 100;

export const CoverManager: React.FC<CoverManagerProps> = ({
  isOpen,
  onClose,
  currentCoverPath,
  onCoverChange
}) => {
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ 'x': 0, 'y': 0, 'width': 300, 'height': 169 });
  const [isCropping, setIsCropping] = useState(false);
  const [dragStart, setDragStart] = useState<{ 'x': number; 'y': number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCoverUrl = useMemo(() => {
    return currentCoverPath ? getCoverImageUrl(currentCoverPath) : null;
  }, [currentCoverPath]);

  const imageSrc = uploadedImageSrc || currentCoverUrl;

  React.useEffect(() => {
    if (currentCoverUrl && !originalImageSrc && !uploadedImageSrc) {
      setOriginalImageSrc(currentCoverUrl);
    }
  }, [currentCoverUrl, originalImageSrc, uploadedImageSrc]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setOriginalImageSrc(result);
      setUploadedImageSrc(result);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleImageLoad = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth || 400;
    const displayHeight = containerWidth / ASPECT_RATIO;

    setCropArea({
      'x': 0,
      'y': 0,
      'width': containerWidth,
      'height': displayHeight
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragStart({ 'x': e.clientX, 'y': e.clientY });
    if (handle) {
      setResizeHandle(handle);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart) {
      return;
    }

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (resizeHandle) {
      let newWidth = cropArea.width;
      let newHeight = cropArea.height;
      let newX = cropArea.x;
      let newY = cropArea.y;

      if (resizeHandle.includes('e')) {
        newWidth = Math.max(MIN_CROP_SIZE, cropArea.width + deltaX);
        newHeight = newWidth / ASPECT_RATIO;
      }
      if (resizeHandle.includes('w')) {
        const possibleWidth = cropArea.width - deltaX;
        if (possibleWidth >= MIN_CROP_SIZE) {
          newX = cropArea.x + deltaX;
          newWidth = possibleWidth;
          newHeight = newWidth / ASPECT_RATIO;
        }
      }
      if (resizeHandle.includes('s')) {
        newHeight = Math.max(MIN_CROP_SIZE, cropArea.height + deltaY);
        newWidth = newHeight * ASPECT_RATIO;
      }
      if (resizeHandle.includes('n')) {
        const possibleHeight = cropArea.height - deltaY;
        if (possibleHeight >= MIN_CROP_SIZE) {
          newY = cropArea.y + deltaY;
          newHeight = possibleHeight;
          newWidth = newHeight * ASPECT_RATIO;
        }
      }

      const containerWidth = containerRef.current?.clientWidth || 400;
      const containerHeight = imageRef.current?.clientHeight || 300;

      newWidth = Math.min(newWidth, containerWidth - newX);
      newHeight = Math.min(newHeight, containerHeight - newY);
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);

      setCropArea({ 'x': newX, 'y': newY, 'width': newWidth, 'height': newHeight });
    } else {
      const containerWidth = containerRef.current?.clientWidth || 400;
      const containerHeight = imageRef.current?.clientHeight || 300;

      let newX = cropArea.x + deltaX;
      let newY = cropArea.y + deltaY;

      newX = Math.max(0, Math.min(newX, containerWidth - cropArea.width));
      newY = Math.max(0, Math.min(newY, containerHeight - cropArea.height));

      setCropArea(prev => ({ ...prev, 'x': newX, 'y': newY }));
    }

    setDragStart({ 'x': e.clientX, 'y': e.clientY });
  }, [dragStart, resizeHandle, cropArea]);

  const handleMouseUp = useCallback(() => {
    setDragStart(null);
    setResizeHandle(null);
  }, []);

  const handleCropConfirm = useCallback(async () => {
    if (!imageRef.current) {
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const img = imageRef.current;
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    const cropX = cropArea.x * scaleX;
    const cropY = cropArea.y * scaleY;
    const cropWidth = cropArea.width * scaleX;
    const cropHeight = cropArea.height * scaleY;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const tempImg = new window.Image();
    tempImg.crossOrigin = 'anonymous';

    await new Promise<void>((resolve) => {
      tempImg.onload = () => {
        ctx.drawImage(tempImg, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        resolve();
      };
      tempImg.src = originalImageSrc || imageSrc || '';
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const croppedUrl = URL.createObjectURL(blob);
        setUploadedImageSrc(croppedUrl);
        onCoverChange(blob);
      }
      setIsCropping(false);
    }, 'image/webp', 0.9);
  }, [cropArea, imageSrc, originalImageSrc, onCoverChange]);

  const handleReset = useCallback(() => {
    if (isCropping) {
      const containerWidth = containerRef.current?.clientWidth || 400;
      const displayHeight = containerWidth / ASPECT_RATIO;

      setCropArea({
        'x': 0,
        'y': 0,
        'width': containerWidth,
        'height': displayHeight
      });
    } else {
      setUploadedImageSrc(null);
      setOriginalImageSrc(null);
      setCropArea({ 'x': 0, 'y': 0, 'width': 300, 'height': 169 });
    }
  }, [isCropping]);

  const handleStartRecrop = useCallback(() => {
    if (originalImageSrc) {
      setUploadedImageSrc(originalImageSrc);
    }
    setIsCropping(true);
  }, [originalImageSrc]);

  const handleRemoveCover = useCallback(() => {
    onCoverChange(null);
    setUploadedImageSrc(null);
    setOriginalImageSrc(null);
    setIsCropping(false);
  }, [onCoverChange]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6 relative z-10 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-sky-500" />
            文章封面管理
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {!imageSrc ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20'
                : 'border-neutral-300 dark:border-neutral-600 hover:border-sky-400 dark:hover:border-sky-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
            <p className="text-neutral-600 dark:text-neutral-300 mb-2">
              点击或拖拽图片到此处上传
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              支持 JPEG、PNG、WebP、GIF 格式
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div
              ref={containerRef}
              className="relative bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="封面预览"
                className="w-full h-auto"
                onLoad={handleImageLoad}
                draggable={false}
              />

              {isCropping && (
                <>
                  <div className="absolute inset-0 bg-black/50" />
                  <div
                    className="absolute border-2 border-sky-400 bg-transparent cursor-move"
                    style={{
                      'left': cropArea.x,
                      'top': cropArea.y,
                      'width': cropArea.width,
                      'height': cropArea.height
                    }}
                    onMouseDown={(e) => handleMouseDown(e)}
                  >
                    <div className="absolute inset-0 border border-white/30" />

                    <div
                      className="absolute -top-1 -left-1 w-3 h-3 bg-white border border-sky-400 cursor-nw-resize"
                      onMouseDown={(e) => handleMouseDown(e, 'nw')}
                    />
                    <div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-sky-400 cursor-ne-resize"
                      onMouseDown={(e) => handleMouseDown(e, 'ne')}
                    />
                    <div
                      className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border border-sky-400 cursor-sw-resize"
                      onMouseDown={(e) => handleMouseDown(e, 'sw')}
                    />
                    <div
                      className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-sky-400 cursor-se-resize"
                      onMouseDown={(e) => handleMouseDown(e, 'se')}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {isCropping ? '拖动裁剪框调整位置和大小' : '封面已设置'}
              </div>
              <div className="flex gap-2">
                {isCropping ? (
                  <>
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      重置
                    </button>
                    <button
                      onClick={handleCropConfirm}
                      className="inline-flex items-center px-3 py-2 text-sm text-white bg-sky-500 rounded-md hover:bg-sky-600 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      确认裁剪
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      更换图片
                    </button>
                    <button
                      onClick={handleStartRecrop}
                      className="inline-flex items-center px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                    >
                      <Crop className="w-4 h-4 mr-1" />
                      重新裁剪
                    </button>
                    <button
                      onClick={handleRemoveCover}
                      className="inline-flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <X className="w-4 h-4 mr-1" />
                      移除封面
                    </button>
                  </>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
