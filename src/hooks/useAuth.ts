/**
 * 身份验证钩子
 * 管理用户认证状态，提供注册、登录和登出功能
 */
import { useEffect, useState } from 'react';
import { AuthState } from '../types';
import { supabase } from '../lib/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { userService } from '../services/userService';

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isLoading: true,
  });

  /**
   * 初始化认证状态和设置认证状态变化监听器
   */
  useEffect(() => {
    if (!supabase) {
      setAuth({ user: null, isLoading: false });
      return;
    }
    
    // 获取初始会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      // 检查会话是否有效
      if (session?.user) {
        setAuth({
          user: {
            id: session.user.id,
            email: session.user.email || '',
          },
          isLoading: false,
        });
      } else {
        setAuth({ user: null, isLoading: false });
      }
    }).catch(() => {
      // 确保在错误情况下也将loading设置为false
      setAuth({ user: null, isLoading: false });
    });

    // 设置认证状态变化监听器
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      try {
        // 检查会话是否有效
        if (session?.user) {
          // 立即更新用户基本信息，结束loading状态
          setAuth({
            user: {
              id: session.user.id,
              email: session.user.email || '',
            },
            isLoading: false,
          });
          
          // 异步获取完整的用户资料，不阻塞登录流程
          try {
            // 使用forceRefresh: true确保从数据库获取最新资料
            const result = await userService.getUserProfile(session.user.id, true);
            const userProfile = result || {};
            
            // 更新用户资料，不改变loading状态
            setAuth(prev => ({
              user: {
                ...prev.user!,
                ...userProfile, // 合并用户资料
              },
              isLoading: false,
            }));
          } catch {
            // 忽略资料获取错误，保持已有的用户基本信息
          }
        } else {
          setAuth({ user: null, isLoading: false });
        }
      } catch {
        // 确保在任何异常情况下都将loading设置为false
        setAuth(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  /**
   * 用户注册
   * @param email - 用户邮箱
   * @param password - 用户密码
   * @returns 注册结果
   */
  const signUp = async (email: string, password: string) => {
    try {
      if (!supabase) {
        return { data: null, error: { message: 'Authentication service not available' } };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        // 注册失败，错误信息将在返回值中处理
      } else {
        // 如果注册成功但没有自动登录，尝试手动登录
        if (!data.session) {
          await signIn(email, password);
        }
      }
      
      return { data, error };
    } catch (err) {
      console.error('Unexpected error during sign up:', err);
      return { 
        data: null, 
        error: { message: typeof err === 'string' ? err : 'An unexpected error occurred during sign up' } 
      };
    }
  };

  /**
   * 用户登录
   * @param email - 用户邮箱
   * @param password - 用户密码
   * @returns 登录结果
   */
  const signIn = async (email: string, password: string) => {
    try {
      if (!supabase) {
        return { data: null, error: { message: 'Authentication service not available' } };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // 登录失败，错误信息将在返回值中处理
      }
      
      return { data, error };
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      return { 
        data: null, 
        error: { message: typeof err === 'string' ? err : 'An unexpected error occurred during sign in' } 
      };
    }
  };

  /**
   * 用户登出
   * @returns 登出结果
   */
  const signOut = async () => {
    try {
      if (!supabase) {
        setAuth({ user: null, isLoading: false });
        return { error: { message: 'Authentication service not available' } };
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        // 登出失败，错误信息将在返回值中处理
      }
      
      // Always reset auth state regardless of signOut result
      setAuth({ user: null, isLoading: false });
      return { error };
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      // Ensure auth state is reset even if there's an exception
      setAuth({ user: null, isLoading: false });
      return { 
        error: { message: typeof err === 'string' ? err : 'An unexpected error occurred during sign out' } 
      };
    }
  };

  return {
    ...auth,
    signUp,
    signIn,
    signOut,
  };
}
