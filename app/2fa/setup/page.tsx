'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, AlertCircle, CheckCircle, Shield } from 'lucide-react';

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'start' | 'qr' | 'verify' | 'success'>('start');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to setup 2FA');
        return;
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('qr');
    } catch (error) {
      console.error('2FA setup error:', error);
      setError('An error occurred while setting up 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      if (verificationCode.length !== 6) {
        setError('Verification code must be 6 digits');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          secret,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid verification code');
        return;
      }

      setBackupCodes(data.backupCodes);
      setStep('success');
    } catch (error) {
      console.error('2FA verify error:', error);
      setError('An error occurred while verifying the code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/10 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/profile')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          <h1 className="text-white font-semibold text-lg">Two-Factor Authentication</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="glass-card max-w-md mx-auto">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 mb-6">
              <p className="text-red-300 text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </p>
            </div>
          )}

          {/* Step 1: Start */}
          {step === 'start' && (
            <div className="text-center space-y-6">
              <Shield size={48} className="mx-auto text-accent" />
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Enable Two-Factor Authentication</h2>
                <p className="text-gray-400">
                  Enhance your account security with two-factor authentication. You'll need an authenticator app like Google Authenticator or Authy.
                </p>
              </div>
              <button
                onClick={handleStartSetup}
                disabled={isLoading}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 disabled:opacity-50 text-white font-semibold transition-all"
              >
                {isLoading ? 'Setting up...' : 'Start Setup'}
              </button>
            </div>
          )}

          {/* Step 2: QR Code */}
          {step === 'qr' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Scan QR Code</h2>
                <p className="text-gray-400 mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
                </p>
              </div>

              {/* QR Code */}
              {qrCode && (
                <div className="flex justify-center bg-white p-4 rounded-lg">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              )}

              {/* Manual Entry */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Can't scan? Enter this code manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono break-all">
                    {secret}
                  </code>
                  <button
                    onClick={handleCopySecret}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Copy size={18} className={copied ? 'text-green-400' : 'text-gray-400'} />
                  </button>
                </div>
              </div>

              {/* Verification Code Input */}
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white text-center text-2xl tracking-widest placeholder-gray-500"
                    inputMode="numeric"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code from your authenticator app</p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || verificationCode.length !== 6}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 disabled:opacity-50 text-white font-semibold transition-all"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
                </button>
              </form>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
                <h2 className="text-2xl font-bold text-white">2FA Enabled!</h2>
              </div>

              <div className="p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
                <p className="text-yellow-300 text-sm">
                  <strong>⚠️ Save your backup codes!</strong> You can use these if you lose access to your authenticator app.
                </p>
              </div>

              {/* Backup Codes */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">Backup Codes</label>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2 max-h-48 overflow-y-auto">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="text-white font-mono text-sm block">
                      {code}
                    </code>
                  ))}
                </div>
                <button
                  onClick={handleCopyBackupCodes}
                  className="w-full mt-2 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  Copy All Codes
                </button>
              </div>

              <button
                onClick={() => router.push('/profile')}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 text-white font-semibold transition-all"
              >
                Go Back to Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
