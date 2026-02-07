'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Lock, Globe, Home, HelpCircle, Bell, Info, Shield, Headphones, Loader2, BadgeCheck } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

interface UserData {
  fullName: string;
  uid: string;
  referralCode: string;
  isTwoFactorEnabled: boolean;
  language: string;
  kycStatus?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [copied, setCopied] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchUser();
    }
  }, [status]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.status === 401) {
        signOut({ redirect: false });
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleBack = () => {
    router.push('/');
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  if (isLoading || status === 'loading') {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 glass border-b border-white/10">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft size={24} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-lg">Account Settings</h1>
        <div className="w-10 h-10" />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="p-6 space-y-4">
          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-accent">
                {initials}
              </div>
              <div className="flex-1">
                <p className="text-white text-lg font-semibold">{user?.fullName || 'User'}</p>
                <p className="text-xs text-gray-400">Member</p>
              </div>
            </div>
          </div>

          {/* UID and Referral */}
          <div className="space-y-3">
            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">UID</p>
                  <p className="text-white font-semibold">{user?.uid || '—'}</p>
                </div>
                {user?.uid && (
                  <button
                    onClick={() => handleCopy(user.uid, 'uid')}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Copy size={18} className={copied === 'uid' ? 'text-success' : 'text-gray-400'} />
                  </button>
                )}
              </div>
            </div>

            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Referral Code</p>
                  <p className="text-white font-semibold">{user?.referralCode || '—'}</p>
                </div>
                {user?.referralCode && (
                  <button
                    onClick={() => handleCopy(user.referralCode, 'referral')}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Copy size={18} className={copied === 'referral' ? 'text-success' : 'text-gray-400'} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Menu */}
        <div className="p-6 space-y-6 pb-20">
          {/* Account Section */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-semibold px-2">ACCOUNT</p>
            <div className="space-y-2">
              <button onClick={() => router.push('/2fa/manage')} className="w-full glass-card flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-accent" />
                  <p className="text-white font-medium text-sm">Two-Factor Auth</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${user?.isTwoFactorEnabled ? 'bg-success/20 text-success' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {user?.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </button>

              <button onClick={() => router.push('/account')} className="w-full glass-card flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <BadgeCheck size={18} className="text-emerald-400" />
                  <p className="text-white font-medium text-sm">Identity Verification</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  user?.kycStatus === 'approved' ? 'bg-success/20 text-success' :
                  user?.kycStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  user?.kycStatus === 'rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {user?.kycStatus === 'approved' ? 'Verified' :
                   user?.kycStatus === 'pending' ? 'Pending' :
                   user?.kycStatus === 'rejected' ? 'Rejected' : 'Unverified'}
                </span>
              </button>

              <button onClick={() => router.push('/account')} className="w-full glass-card flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-purple-400" />
                  <p className="text-white font-medium text-sm">Language</p>
                </div>
                <span className="text-xs text-gray-400">{user?.language || 'English'}</span>
              </button>

              <button onClick={() => router.push('/account')} className="w-full glass-card flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Home size={18} className="text-cyan-400" />
                  <p className="text-white font-medium text-sm">Withdrawal Address</p>
                </div>
              </button>

              <button onClick={() => router.push('/change-password')} className="w-full glass-card flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Lock size={18} className="text-orange-400" />
                  <p className="text-white font-medium text-sm">Password Setting</p>
                </div>
              </button>
            </div>
          </div>

          {/* Support Section */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-semibold px-2">SUPPORT</p>
            <div className="space-y-2">
              <button className="w-full glass-card flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <HelpCircle size={18} className="text-green-400" />
                  <p className="text-white font-medium text-sm">Help Center</p>
                </div>
              </button>

              <button className="w-full glass-card flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-yellow-400" />
                  <p className="text-white font-medium text-sm">Notification</p>
                </div>
              </button>

              <button className="w-full glass-card flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Info size={18} className="text-pink-400" />
                  <p className="text-white font-medium text-sm">About Us</p>
                </div>
              </button>

              <button className="w-full glass-card flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Headphones size={18} className="text-indigo-400" />
                  <p className="text-white font-medium text-sm">MSB Certification</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
