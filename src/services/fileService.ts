import { supabase } from '../lib/supabase';

/**
 * 文件服务类
 * 提供统一的文件上传、下载和管理接口
 */
export class FileService {
  private static instance: FileService;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  /**
   * 检查存储桶是否存在
   * @param bucketName 存储桶名称
   * @returns 是否存在
   */
  private async checkBucketExists(bucketName: string): Promise<boolean> {
    try {
      if (!supabase) return false;
      
      // 尝试列出存储桶内容，如果成功则说明存储桶存在
      // 注意：这将返回404错误如果存储桶不存在，而不是空数据
      const { error } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: 1,
          offset: 0
        });
      
      return !error;
    } catch (error) {
      console.error('Error checking bucket existence:', error);
      return false;
    }
  }

  /**
   * 上传文件到Supabase存储
   * @param file 文件对象
   * @param bucketName 存储桶名称
   * @param folderPath 文件夹路径
   * @returns 上传后的文件URL
   */
  async uploadFile(
    file: File,
    bucketName: string = 'avatars',
    folderPath: string = ''
  ): Promise<string | null> {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return null;
      }

      // 检查存储桶是否存在
      const bucketExists = await this.checkBucketExists(bucketName);
      if (!bucketExists) {
        console.error(`Storage bucket '${bucketName}' not found. Please ensure the bucket exists in Supabase.`);
        console.error('To fix this issue:');
        console.error('1. Log in to your Supabase dashboard');
        console.error('2. Go to Storage section');
        console.error('3. Create a bucket named:', bucketName);
        console.error('4. Set appropriate permissions for the bucket');
        return null;
      }

      // 生成唯一文件名
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}-${file.name}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

      // 上传文件
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Failed to upload file:', error);
        // 如果是行级安全策略错误，提供更详细的调试信息
        if (error.message.includes('violates row-level security policy')) {
          console.error('Error details:', error);
          console.error('Debug information:');
          console.error('- Bucket:', bucketName);
          console.error('- File path:', filePath);
          console.error('- File name:', fileName);
          console.error('Please ensure:');
          console.error('1. You are authenticated (logged in)');
          console.error('2. The file path matches the RLS policy (e.g., users/{userId}/filename for avatars)');
          console.error('3. The RLS policies are correctly set up in Supabase');
        }
        return null;
      }

      // 获取公共URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadFile:', error);
      return null;
    }
  }

  /**
   * 上传用户头像
   * @param file 头像文件
   * @param userId 用户ID
   * @returns 头像URL
   */
  async uploadAvatar(file: File, userId: string): Promise<string | null> {
    return this.uploadFile(file, 'avatars', `users/${userId}`);
  }

  /**
   * 删除文件
   * @param filePath 文件路径
   * @param bucketName 存储桶名称
   * @returns 是否删除成功
   */
  async deleteFile(
    filePath: string,
    bucketName: string = 'avatars'
  ): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return false;
      }

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Failed to delete file:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteFile:', error);
      return false;
    }
  }

  /**
   * 获取文件URL
   * @param filePath 文件路径
   * @param bucketName 存储桶名称
   * @returns 文件URL
   */
  getFileUrl(
    filePath: string,
    bucketName: string = 'avatars'
  ): string | null {
    if (!supabase) {
      console.error('Supabase client is not initialized');
      return null;
    }

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}

// 导出单例实例
export const fileService = FileService.getInstance();
