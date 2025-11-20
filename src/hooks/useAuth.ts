import { useEffect, useState } from 'react';
import { AuthState } from '@/types';
import { supabase } from '@/lib/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase client is not available');
      setAuth({ user: null, isLoading: false });
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
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
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
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
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      console.error('Supabase client is not available');
      return { data: null, error: { message: 'Authentication service not available' } };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    // 如果注册成功但没有自动登录，尝试手动登录
    if (!error && !data.session) {
      await signIn(email, password);
    }
    
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      console.error('Supabase client is not available');
      return { data: null, error: { message: 'Authentication service not available' } };
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    if (!supabase) {
      console.error('Supabase client is not available');
      setAuth({ user: null, isLoading: false });
      return;
    }
    
    await supabase.auth.signOut();
    setAuth({ user: null, isLoading: false });
  };

  return {
    ...auth,
    signUp,
    signIn,
    signOut,
  };
}
