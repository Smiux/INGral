import { userService } from '../services/userService';
import { UserProfile, Article } from '../types';

// 获取用户档案
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // 直接返回userService的结果，因为它已经返回UserProfile类型
    const userProfile = await userService.getUserProfile(userId);
    return userProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// 获取用户创建的文章
export async function fetchUserArticles(userId: string): Promise<Article[]> {
  try {
    // 调用userService的getUserArticles方法获取用户创建的文章
    const userArticles = await userService.getUserArticles(userId);
    return userArticles as Article[];
  } catch (error) {
    console.error('Error fetching user articles:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

// 获取用户贡献的文章
export async function fetchUserContributions(userId: string): Promise<Article[]> {
  try {
    // 调用userService的getUserContributions方法获取用户贡献的文章
    const userContributions = await userService.getUserContributions(userId);
    return userContributions as Article[];
  } catch (error) {
    console.error('Error fetching user contributions:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

// 更新用户档案
export async function updateUserProfile(
  userId: string,
  profileData: Partial<Pick<UserProfile, 'username' | 'bio' | 'avatar_url'>>
): Promise<boolean> {
  // 使用userService更新用户档案，它内部已经有错误处理和重试逻辑
  try {
    return await userService.updateUserProfile(userId, profileData);
  } catch (error) {
    console.error('Error updating user profile:', error instanceof Error ? error.message : String(error));
    return false;
  }
}