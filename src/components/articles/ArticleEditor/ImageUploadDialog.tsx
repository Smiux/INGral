import React, { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { fileService } from '@/services/fileService';

interface ImageUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUploaded: (_imageUrl: string) => void;
  showNotification: (_message: string, _type: 'success' | 'info' | 'error') => void;
}

/**
 * 图片上传对话框组件
 * 提供拖放上传和文件选择功能
 */
export function ImageUploadDialog ({ isOpen, onClose, onImageUploaded, showNotification }: ImageUploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  if (!isOpen) {
    return null;
  }

  /**
   * 处理文件选择
   */
  const processSingleImage = async (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      showNotification(`文件 ${file.name} 不是图片，请选择图片文件`, 'error');
      return;
    }

    // 验证文件大小（最大5MB）
    if (file.size > 5 * 1024 * 1024) {
      showNotification(`文件 ${file.name} 大小超过5MB限制`, 'error');
      return;
    }

    try {
      // 上传文件
      const imageUrl = await fileService.uploadFile(file, 'images', 'articles');

      if (imageUrl) {
        // 生成预览
        const previewUrl = URL.createObjectURL(file);
        setPreviewUrls(prev => [...prev, previewUrl]);

        // 通知父组件图片已上传
        onImageUploaded(imageUrl);
        showNotification(`图片 ${file.name} 上传成功`, 'success');
      } else {
        showNotification(`图片 ${file.name} 上传失败`, 'error');
      }
    } catch (error) {
      console.error(`图片 ${file.name} 上传失败:`, error);
      showNotification(`图片 ${file.name} 上传失败`, 'error');
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (file) {
          await processSingleImage(file);
        }
      }
    } catch (error) {
      console.error('图片上传失败:', error);
      showNotification('图片上传失败，请重试', 'error');
    } finally {
      setUploading(false);
    }
  };

  /**
   * 处理文件输入变化
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 处理拖放事件 - 进入
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  /**
   * 处理拖放事件 - 离开
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  /**
   * 处理拖放事件 - 悬停
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * 处理拖放事件 - 放下
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  /**
   * 触发文件选择对话框
   */
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* 对话框标题 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">上传图片</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 对话框内容 */}
        <div className="px-6 py-4 overflow-y-auto flex-grow">
          {/* 拖放区域 */}
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
            }`}
          >
            <div className="flex flex-col items-center justify-center">
              <Upload size={48} className="text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                拖放图片到此处或点击上传
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                支持 JPG、PNG、WebP 格式，单个文件不超过 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleInputChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={triggerFileInput}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                选择图片
              </button>
            </div>
          </div>

          {/* 上传状态 */}
          {uploading && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <p className="text-blue-700 dark:text-blue-300">图片上传中，请稍候...</p>
              </div>
            </div>
          )}

          {/* 预览区域 */}
          {previewUrls.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                已上传图片
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`预览 ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-md transition-all duration-200 flex items-center justify-center">
                      <button
                        onClick={() => {
                          onImageUploaded(url);
                          showNotification('图片已插入编辑器', 'success');
                        }}
                        className="opacity-0 group-hover:opacity-100 bg-white text-blue-600 px-2 py-1 rounded text-xs transition-opacity duration-200"
                      >
                        插入
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
              提示：
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
              <li>• 上传的图片将自动插入到编辑器当前光标位置</li>
              <li>• 支持多张图片同时上传</li>
              <li>• 上传后可以调整图片大小和对齐方式</li>
              <li>• 图片将存储在安全的云存储服务中</li>
            </ul>
          </div>
        </div>

        {/* 对话框底部 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              triggerFileInput();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
          >
            <Upload size={16} />
            上传更多
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageUploadDialog;
