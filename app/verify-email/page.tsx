'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
          return;
        }

        setStatus('success');
        setMessage('Email verified successfully!');

        // Redirect to login after 2 seconds
        setTimeout(() => router.push('/login'), 2000);
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification');
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResending(true);
    setResendMessage('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResendMessage(data.error || 'Failed to resend verification email');
        setIsResending(false);
        return;
      }

      setResendMessage('Verification email sent! Please check your inbox.');
      setResendEmail('');
    } catch (error) {
      setResendMessage('An error occurred. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold leading-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            CryptoTrade
          </h1>
          <p className="text-gray-400">Email Verification</p>
        </div>

        <div className="glass-card text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader size={48} className="mx-auto text-accent animate-spin" />
              <p className="text-gray-400">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle size={48} className="mx-auto text-success" />
              <h2 className="text-2xl font-bold text-white">Verified!</h2>
              <p className="text-gray-400">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to login...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <AlertCircle size={48} className="mx-auto text-danger" />
              <h2 className="text-2xl font-bold text-white">Verification Failed</h2>
              <p className="text-gray-400">{message}</p>
              <div className="space-y-4 mt-6">
                <p className="text-sm text-gray-500">The link may have expired. Enter your email to resend the verification link.</p>
                
                <form onSubmit={handleResendVerification} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none min-h-[44px]"
                    />
                  </div>
                  
                  {resendMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                      resendMessage.includes('sent') 
                        ? 'bg-success/20 text-success border border-success/50' 
                        : 'bg-danger/20 text-danger border border-danger/50'
                    }`}>
                      {resendMessage}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isResending}
                    className={`w-full py-3 rounded-lg font-semibold transition-all min-h-[44px] ${
                      isResending
                        ? 'bg-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80'
                    }`}
                  >
                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {status !== 'loading' && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <Link href="/login" className="text-accent hover:text-accent/80 text-sm font-semibold">
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
