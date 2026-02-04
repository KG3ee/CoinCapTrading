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
              <div className="space-y-2 mt-6">
                <p className="text-sm text-gray-500">The link may have expired.</p>
                <Link
                  href="/register"
                  className="inline-block bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 text-white font-semibold py-2 px-6 rounded-lg transition-all"
                >
                  Try Again
                </Link>
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
