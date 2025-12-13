import React, { useState, useRef } from 'react';
import { X, Upload, FileText, FileImage, FileCode, FileSpreadsheet, FileArchive, FileAudio, FileVideo, File } from 'lucide-react';
import { fileService } from '@/services/fileService';

interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUploaded: (fileUrl: string, fileName: string) => void;
  showNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

/**
 * 文件上传对话框组件
 * 提供拖放上传和文件选择功能，支持多种文件类型
 */
export function FileUploadDialog({ isOpen, onClose, onFileUploaded, showNotification }: FileUploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; size: number; type: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  /**
   * 处理文件选择
   */
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        // 验证文件大小（最大10MB）
        if (file.size > 10 * 1024 * 1024) {
          showNotification(`文件 ${file.name} 大小超过10MB限制`, 'error');
          continue;
        }

        // 上传文件
        const fileUrl = await fileService.uploadFile(file, 'files', 'articles');
        
        if (fileUrl) {
          // 保存上传的文件信息
          const fileInfo = {
            name: file.name,
            url: fileUrl,
            size: file.size,
            type: file.type
          };
          setUploadedFiles(prev => [...prev, fileInfo]);
          
          // 通知父组件文件已上传
          onFileUploaded(fileUrl, file.name);
          showNotification(`文件 ${file.name} 上传成功`, 'success');
        } else {
          showNotification(`文件 ${file.name} 上传失败`, 'error');
        }
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      showNotification('文件上传失败，请重试', 'error');
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

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  /**
   * 插入文件链接到编辑器
   */
  const handleInsertFile = (fileUrl: string, fileName: string) => {
    onFileUploaded(fileUrl, fileName);
    showNotification(`文件 ${fileName} 已插入到编辑器`, 'success');
  };

  /**
   * 获取文件类型对应的图标
   */
  const getFileIcon = (fileName: string, fileType: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return <FileImage size={20} className="text-blue-500" />;
    } else if (fileType.startsWith('application/pdf') || ext === 'pdf') {
      return <File size={20} className="text-red-500" />;
    } else if (fileType.startsWith('text/plain') || ['txt', 'md', 'markdown'].includes(ext)) {
      return <FileText size={20} className="text-gray-500" />;
    } else if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml', 'yaml', 'yml'].includes(ext)) {
      return <FileCode size={20} className="text-purple-500" />;
    } else if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
      return <FileSpreadsheet size={20} className="text-green-500" />;
    } else if (['doc', 'docx', 'odt'].includes(ext)) {
      return <File size={20} className="text-blue-600" />;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive size={20} className="text-yellow-500" />;
    } else if (fileType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      return <FileAudio size={20} className="text-pink-500" />;
    } else if (fileType.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
      return <FileVideo size={20} className="text-orange-500" />;
    }
    
    // 默认图标
    return <FileText size={20} className="text-gray-500" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* 对话框标题 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">上传文件</h3>
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
                拖放文件到此处或点击上传
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                支持多种文件类型，单个文件不超过 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleInputChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={triggerFileInput}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                选择文件
              </button>
            </div>
          </div>

          {/* 上传状态 */}
          {uploading && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <p className="text-blue-700 dark:text-blue-300">文件上传中...</p>
              </div>
            </div>
          )}

          {/* 已上传文件列表 */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                已上传文件
              </h4>
              <div className="space-y-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-650 transition-colors">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file.name, file.type)}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white truncate max-w-sm">
                          {file.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)} • {file.type || '未知类型'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleInsertFile(file.url, file.name)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      插入
                    </button>
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
              <li>• 上传的文件将自动生成链接插入到编辑器当前光标位置</li>
              <li>• 支持多种文件类型，包括文档、表格、演示文稿等</li>
              <li>• 支持多张文件同时上传</li>
              <li>• 文件将存储在安全的云存储服务中</li>
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

export default FileUploadDialog;
