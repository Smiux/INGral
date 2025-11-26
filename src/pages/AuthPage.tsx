/**
 * 认证页面
 * 提供用户登录和注册功能
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

export function AuthPage() {
  const navigate = useNavigate();
  const { signUp, signIn, isLoading: authIsLoading, user } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * 处理表单提交
   * @param e - 表单提交事件
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        setError('Email and password are required');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      // 执行认证操作
      await (isSignUp ? signUp(email, password) : signIn(email, password));
      
      // 认证成功，重置表单
      setEmail('');
      setPassword('');
      
      if (isSignUp) {
        // 注册成功，显示成功消息
        setSuccessMessage('Registration successful! Please check your email.');
        
        // 5秒后清除成功消息
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      } else {
        // 登录成功，重定向到首页
        navigate('/');
      }
    } catch (err) {
      // 处理认证错误
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(`${isSignUp ? 'Sign up' : 'Sign in'} failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 检查用户是否已登录，如果是则重定向到首页
   */
  useEffect(() => {
    if (!authIsLoading && user) {
      navigate('/');
    }
  }, [authIsLoading, user, navigate]);
  
  /**
   * 自动清除错误消息
   */
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (error) {
      timer = setTimeout(() => {
        setError('');
      }, 5000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center px-4">
      <Link
        to="/"
        className="absolute top-6 left-6 text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="w-6 h-6" />
      </Link>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <LogIn className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm" role="alert">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  minLength={6}
                  required
                />
                {!isSignUp && (
                  <small className="text-xs text-gray-500 block mt-1">Password must be at least 6 characters</small>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccessMessage('');
                setEmail('');
                setPassword('');
              }}
              disabled={isLoading}
              className="ml-1 text-blue-600 hover:text-blue-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSignUp ? 'Sign In' : 'Create One'}
              </button>
            </p>
          </div>
        </div>

        <div className="text-center mt-6 text-gray-600 text-sm">
          <p>Demo credentials for testing:</p>
          <p className="text-gray-500 mt-2">Email: test@example.com | Password: test123</p>
        </div>
        
        {/* Add manual redirect button in case auto-redirect fails */}
        {!isLoading && !authIsLoading && user && (
          <div className="text-center mt-4">
            <button 
              type="button" 
              className="text-blue-600 hover:text-blue-700 font-medium transition"
              onClick={() => navigate('/')}
            >
              Click to continue to home page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
