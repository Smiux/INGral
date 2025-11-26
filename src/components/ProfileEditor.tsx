import React, { useState, useRef } from 'react';
import { X, Save, Camera, ZoomIn, ZoomOut } from 'lucide-react';
import { UserProfile } from '../types';
import { userService } from '../services/userService';
import { fileService } from '../services/fileService';
import Dropzone from 'react-dropzone';
import Cropper from 'react-easy-crop';

interface ProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onProfileUpdate: () => void;
}

export function ProfileEditor({ isOpen, onClose, profile, onProfileUpdate }: ProfileEditorProps) {
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // 裁剪相关状态
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImage, setCropImage] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const cropRef = useRef<HTMLCanvasElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // 处理文件上传
  const handleFileUpload = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      // 检查文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      // 读取文件并显示裁剪界面
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCropImage(result);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理裁剪完成
  const handleCropComplete = async () => {
    if (!cropImage || !cropRef.current || !profile) return;

    try {
      // 创建裁剪后的图片
      const image = new Image();
      image.src = cropImage;
      await new Promise((resolve) => (image.onload = resolve));

      const canvas = cropRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cropSize = 300;
      canvas.width = cropSize;
      canvas.height = cropSize;

      // 计算裁剪区域
      const cropX = crop.x * zoom;
      const cropY = crop.y * zoom;
      const cropWidth = image.width * zoom;
      const cropHeight = image.height * zoom;

      ctx.drawImage(
        image,
        -cropX,
        -cropY,
        cropWidth,
        cropHeight
      );

      // 转换为Blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          
          // 上传到Supabase存储
          setIsLoading(true);
          const avatarUrl = await fileService.uploadAvatar(croppedFile, profile.id);
          setIsLoading(false);

          if (avatarUrl) {
            setFormData(prev => ({ ...prev, avatar_url: avatarUrl }));
            setSuccess('Avatar uploaded successfully');
          } else {
            setError('Failed to upload avatar');
          }
        }
      }, 'image/jpeg', 0.9);

      setIsCropModalOpen(false);
    } catch (err) {
      console.error('Error cropping image:', err);
      setError('Failed to crop image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // 验证用户名
      if (formData.username.trim() === '') {
        throw new Error('Username is required');
      }

      if (formData.username.length > 50) {
        throw new Error('Username must be less than 50 characters');
      }

      // 更新用户资料
      const profileUpdates: Partial<Pick<UserProfile, 'username' | 'bio' | 'avatar_url'>> = {
        username: formData.username.trim(),
      };
      
      // 只添加非空的可选字段
      if (formData.bio.trim()) {
        profileUpdates.bio = formData.bio.trim();
      }
      if (formData.avatar_url.trim()) {
        profileUpdates.avatar_url = formData.avatar_url.trim();
      }
      
      const result = await userService.updateUserProfile(profile.id, profileUpdates);

      if (result) {
        setSuccess('Profile updated successfully!');
        // 重新加载用户资料
        setTimeout(() => {
          onProfileUpdate();
          onClose();
        }, 1000);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">
              {success}
            </div>
          )}

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              maxLength={50}
            />
            <p className="mt-1 text-xs text-gray-500">Visible to other users</p>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              rows={4}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-gray-500">{formData.bio.length}/500 characters</p>
          </div>

          {/* Avatar Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avatar (Optional)
            </label>
            
            {/* Avatar Preview */}
            {formData.avatar_url && (
              <div className="mt-2 flex items-center mb-3">
                <img 
                  src={formData.avatar_url} 
                  alt="Preview" 
                  className="h-16 w-16 rounded-full object-cover border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <p className="ml-2 text-xs text-gray-500">Current Avatar</p>
              </div>
            )}
            
            {/* Local File Upload */}
            <Dropzone onDrop={handleFileUpload} accept={{ 'image/*': [] }}>
              {({ getRootProps, getInputProps }) => (
                <div 
                  {...getRootProps()} 
                  className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:border-blue-500 transition cursor-pointer"
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center">
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-700">Upload Avatar from Computer</p>
                    <p className="text-xs text-gray-500 mt-1">Drag and drop or click to upload</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                  </div>
                </div>
              )}
            </Dropzone>
            
            {/* Avatar URL Input */}
            <div className="mt-3">
              <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700 mb-1">
                Or enter Avatar URL
              </label>
              <input
                type="url"
                id="avatar_url"
                name="avatar_url"
                value={formData.avatar_url}
                onChange={handleChange}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center">
                  <Save className="w-4 h-4 mr-1" />
                  Save Changes
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Crop Modal */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Crop Avatar</h2>
              <button
                onClick={() => setIsCropModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Crop Content */}
            <div className="p-6">
              <div className="relative w-full h-80 mb-4">
                <Cropper
                  image={cropImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  cropSize={{ width: 300, height: 300 }}
                />
              </div>
              
              {/* Zoom Controls */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <button
                  onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                  disabled={zoom <= 1}
                  className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ZoomOut className="w-4 h-4" />
                  Zoom Out
                </button>
                <span className="text-sm font-medium text-gray-700">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                  disabled={zoom >= 3}
                  className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ZoomIn className="w-4 h-4" />
                  Zoom In
                </button>
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCropComplete}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="w-4 h-4 mr-1" />
                      Crop & Upload
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
          <canvas ref={cropRef} style={{ display: 'none' }} />
        </div>
      )}
    </div>
  );
}