'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    setRequiresTwoFactor(false);
    setTwoFactorToken('');
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setVerificationRequired(false);
    
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        token: twoFactorToken || undefined,
      });

      if (result?.error) {
        if (result.error === 'EMAIL_NOT_VERIFIED') {
          setVerificationRequired(true);
          setError('Please verify your email');
        } else if (result.error === 'TWO_FACTOR_REQUIRED') {
          setRequiresTwoFactor(true);
          setError('Two-factor authentication required');
        } else if (result.error === 'INVALID_2FA') {
          setRequiresTwoFactor(true);
          setError('Invalid two-factor authentication code');
        } else if (result.error === 'RATE_LIMITED') {
          setError('Too many login attempts. Please try again later.');
        } else if (result.error === 'CredentialsSignin') {
          setError('Invalid credentials');
        } else {
          setError('Login failed');
        }
        setIsLoading(false);
        return;
      }

      // Save credentials if "Remember me" is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        // Clear saved credentials if not checked
        localStorage.removeItem('rememberedEmail');
      }

      localStorage.removeItem('rememberedPassword');

      // Redirect to authenticated app on successful login
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        alert('Verification email sent! Please check your inbox.');
      } else {
        alert('Failed to resend verification email');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold leading-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            CryptoTrade
          </h1>
          <p className="text-gray-400">Welcome back! Please login to your account.</p>
        </div>

        {/* Login Form */}
        <div className="glass-card">
          <h2 className="text-2xl font-bold mb-6">Login</h2>

          {error && (
            <div className={`mb-4 p-4 rounded-lg ${verificationRequired ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
              <p className={verificationRequired ? 'text-orange-300 text-sm' : 'text-red-300 text-sm'}>{error}</p>
              {verificationRequired && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="mt-3 text-sm text-accent hover:text-accent/80 font-semibold"
                >
                  Resend Verification Email
                </button>
              )}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            {requiresTwoFactor && (
              <div>
                <label className="text-sm text-gray-400 block mb-2">Two-Factor Code</label>
                <input
                  type="text"
                  placeholder="6-digit code or backup code"
                  value={twoFactorToken}
                  onChange={(e) => {
                    const sanitized = e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9-]/g, '')
                      .slice(0, 10);
                    setTwoFactorToken(sanitized);
                  }}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none min-h-[44px] text-center tracking-widest"
                  inputMode="text"
                />
              </div>
            )}

            {/* Password Input */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-white/5 border-white/10 accent-accent"
                />
                <span className="text-sm text-gray-400">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-accent hover:text-accent/80">
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 font-semibold transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              )}
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-black/50 text-gray-500">Or</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="w-full py-3 rounded-lg font-semibold transition-all min-h-[44px] bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center mt-6 text-sm text-gray-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-accent hover:text-accent/80 font-semibold">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
