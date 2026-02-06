'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft, Copy, AlertTriangle, Check, Key, RefreshCw } from 'lucide-react';

export default function Manage2FAPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disable2FACode, setDisable2FACode] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const [hasPassword, setHasPassword] = useState(true); // Whether user has password (OAuth vs email/password)

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 404) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      const data = await response.json();
      
      // Store whether user has password
      setHasPassword(data.user.hasPassword !== false); // Default to true for backwards compatibility
      
      // If 2FA is not enabled, redirect to setup
      if (!data.user.isTwoFactorEnabled) {
        router.push('/2fa/setup');
        return;
      }

      // Load backup codes (we'll create this API endpoint)
      await loadBackupCodes();
      
      setIsLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setError('Failed to verify authentication');
      setIsLoading(false);
    }
  };

  const loadBackupCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/2fa/backup-codes', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backupCodes || []);
      }
    } catch (error) {
      console.error('Load backup codes error:', error);
      // Not critical if this fails
    }
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAllCodes = () => {
    const allCodes = backupCodes.join('\n');
    navigator.clipboard.writeText(allCodes);
    setSuccess('All backup codes copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRegenerateBackupCodes = async () => {
    if (!confirm('Are you sure you want to regenerate backup codes? Your old backup codes will no longer work.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/2fa/regenerate-backup-codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backupCodes);
        setSuccess('Backup codes regenerated successfully! Please save them in a safe place.');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to regenerate backup codes');
      }
    } catch (error) {
      console.error('Regenerate backup codes error:', error);
      setError('An error occurred while regenerating backup codes');
    }
  };

  const handleDisable2FA = async () => {
    // Check if user provided the required verification
    if (hasPassword && !disablePassword) {
      setError('Please enter your password to disable 2FA');
      return;
    }
    
    if (!hasPassword && !disable2FACode) {
      setError('Please enter your 2FA code to disable 2FA');
      return;
    }

    setIsDisabling(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Prepare request body based on user type
      const requestBody = hasPassword 
        ? { password: disablePassword }
        : { code: disable2FACode };
      
      console.log('Disabling 2FA with:', hasPassword ? 'password' : '2FA code');
      
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Disable 2FA response status:', response.status);

      if (response.ok) {
        setSuccess('2FA has been disabled successfully!');
        setTimeout(() => {
          router.push('/account');
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('Disable 2FA error:', errorData);
        setError(errorData.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      console.error('Disable 2FA error:', error);
      setError('An error occurred while disabling 2FA');
    } finally {
      setIsDisabling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push('/account')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Account
        </button>

        <div className="glass-card p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Shield size={24} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Manage 2FA</h1>
              <p className="text-gray-400 text-sm">Two-Factor Authentication is enabled</p>
            </div>
          </div>

          {/* Success/Error Messages */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
              <Check size={16} />
              {success}
            </div>
          )}

          {/* Backup Codes Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Key size={20} />
                  Backup Codes
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Use these codes if you lose access to your authenticator app
                </p>
              </div>
              <button
                onClick={handleRegenerateBackupCodes}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm transition-colors"
              >
                <RefreshCw size={16} />
                Regenerate
              </button>
            </div>

            {backupCodes.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <code className="text-sm font-mono text-white">{code}</code>
                      <button
                        onClick={() => handleCopyCode(code, index)}
                        className="p-2 hover:bg-white/10 rounded transition-colors"
                      >
                        {copiedIndex === index ? (
                          <Check size={16} className="text-green-400" />
                        ) : (
                          <Copy size={16} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCopyAllCodes}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition-colors"
                >
                  Copy All Codes
                </button>

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    <strong>Important:</strong> Save these backup codes in a safe place. Each code can only be used once.
                  </p>
                </div>
              </>
            ) : (
              <div className="p-6 text-center bg-white/5 border border-white/10 rounded-lg">
                <p className="text-gray-400">No backup codes available</p>
                <button
                  onClick={handleRegenerateBackupCodes}
                  className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
                >
                  Generate Backup Codes
                </button>
              </div>
            )}
          </div>

          {/* Disable 2FA Section */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-400" />
                Disable Two-Factor Authentication
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Disabling 2FA will make your account less secure
              </p>
            </div>

            {!showDisableConfirm ? (
              <button
                onClick={() => setShowDisableConfirm(true)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-colors"
              >
                Disable 2FA
              </button>
            ) : (
              <div className="space-y-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                {hasPassword ? (
                  <>
                    <p className="text-red-400 text-sm font-semibold">
                      Are you sure? Enter your password to confirm:
                    </p>
                    
                    <input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-red-400 text-sm font-semibold">
                      Are you sure? Enter your 2FA code to confirm:
                    </p>
                    <p className="text-yellow-400 text-xs">
                      Your account uses Google login and doesn't have a password. Use your authenticator app to get the code.
                    </p>
                    
                    <input
                      type="text"
                      value={disable2FACode}
                      onChange={(e) => setDisable2FACode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-2xl tracking-widest font-mono"
                    />
                  </>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleDisable2FA}
                    disabled={isDisabling}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 rounded-lg text-white font-semibold transition-colors"
                  >
                    {isDisabling ? 'Disabling...' : 'Confirm Disable'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDisableConfirm(false);
                      setDisablePassword('');
                      setDisable2FACode('');
                      setError('');
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
