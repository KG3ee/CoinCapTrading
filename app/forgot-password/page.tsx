'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email');
        setIsLoading(false);
        return;
      }

      setSubmitted(true);
      setEmail('');
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
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
          <p className="text-gray-400">Reset your password</p>
        </div>

        {/* Forgot Password Form */}
        <div className="glass-card">
          {!submitted ? (
            <>
              <h2 className="text-2xl font-bold mb-2">Forgot Password?</h2>
              <p className="text-sm text-gray-400 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Email Input */}
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Email Address</label>
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 rounded-lg font-semibold transition-all min-h-[44px] ${
                    isLoading
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80'
                  }`}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full flex items-center justify-center">
                  <Mail size={32} className="text-green-400" />
                </div>
                <h2 className="text-2xl font-bold">Check Your Email</h2>
                <p className="text-gray-400">
                  We've sent a password reset link to <span className="font-semibold text-white">{email}</span>
                </p>
                <p className="text-gray-500 text-sm">
                  The link will expire in 1 hour. If you don't see the email, check your spam folder.
                </p>
              </div>
            </>
          )}

          {/* Back to Login Link */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <Link href="/login" className="flex items-center gap-2 text-accent hover:text-accent/80 text-sm font-semibold">
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8">
          © 2024 CryptoTrade. All rights reserved.
        </p>
      </div>
    </div>
  );
}
