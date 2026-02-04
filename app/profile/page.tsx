'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Lock, Copy, LogOut, ArrowLeft, Mail, Save, X, 
  Globe, MapPin, Shield, Calendar, Award, CheckCircle, AlertCircle 
} from 'lucide-react';
import Image from 'next/image';

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  uid: string;
  referralCode: string;
  isVerified: boolean;
  accountStatus: string;
  language: string;
  withdrawalAddress: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Edit form states
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState('English');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Get user ID from token (in production, decode properly)
        // For now, we'll make a request that includes the token
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (!response.ok) {
          setError('Failed to load profile');
          return;
        }

        const data = await response.json();
        setUser(data.user);
        setFullName(data.user.fullName);
        setLanguage(data.user.language || 'English');
        setWithdrawalAddress(data.user.withdrawalAddress || '');
      } catch (error) {
        console.error('Load profile error:', error);
        setError('An error occurred while loading your profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          fullName,
          language,
          withdrawalAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      setUser(data.user);
      setIsEditing(false);
    } catch (error) {
      console.error('Save profile error:', error);
      setError('An error occurred while saving your profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('rememberedPassword');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Profile Not Found</h2>
          <button
            onClick={() => router.push('/')}
            className="text-accent hover:text-accent/80"
          >
            Go Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/10 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          <h1 className="text-white font-semibold text-lg">My Profile</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50">
            <p className="text-red-300 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </p>
          </div>
        )}

        {/* Profile Card */}
        <div className="glass-card">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold border-2 border-accent">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{user.fullName}</h2>
                <p className="text-gray-400 flex items-center gap-2">
                  <Mail size={16} />
                  {user.email}
                </p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent font-semibold transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Account Status */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
            <div>
              <p className="text-gray-400 text-sm mb-1">Account Status</p>
              <p className="text-white font-semibold capitalize flex items-center gap-2">
                {user.accountStatus === 'active' ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <AlertCircle size={16} className="text-yellow-400" />
                )}
                {user.accountStatus}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Email Verified</p>
              <p className="text-white font-semibold flex items-center gap-2">
                {user.isVerified ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <AlertCircle size={16} className="text-yellow-400" />
                )}
                {user.isVerified ? 'Verified' : 'Pending'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Account Created</p>
              <p className="text-white font-semibold flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">User ID</p>
              <p className="text-white font-mono text-sm truncate">{user.uid}</p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="glass-card space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit Profile</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Full Name */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white"
              />
            </div>

            {/* Language */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Chinese">Chinese</option>
                <option value="Japanese">Japanese</option>
              </select>
            </div>

            {/* Withdrawal Address */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Withdrawal Address</label>
              <input
                type="text"
                value={withdrawalAddress}
                onChange={(e) => setWithdrawalAddress(e.target.value)}
                placeholder="Your crypto wallet address"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 disabled:opacity-50 text-white font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Referral Code Card */}
        <div className="glass-card">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Award size={20} className="text-accent" />
            Referral Code
          </h3>
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Share this code with friends to earn rewards!</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={user.referralCode}
                readOnly
                className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-sm"
              />
              <button
                onClick={() => handleCopy(user.referralCode, 'referral')}
                className="p-3 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent transition-colors"
                title="Copy referral code"
              >
                <Copy size={18} />
              </button>
            </div>
            {copied === 'referral' && (
              <p className="text-green-400 text-sm">Copied to clipboard!</p>
            )}
          </div>
        </div>

        {/* Account Security Card */}
        <div className="glass-card">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield size={20} className="text-accent" />
            Account Security
          </h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors flex items-center gap-2">
              <Lock size={18} className="text-accent" />
              Change Password
            </button>
            <button className="w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors flex items-center gap-2">
              <Shield size={18} className="text-accent" />
              Enable Two-Factor Authentication
            </button>
          </div>
        </div>

        {/* Account IDs Card */}
        <div className="glass-card">
          <h3 className="text-lg font-bold text-white mb-4">Account Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">User ID</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={user.id}
                  readOnly
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 font-mono text-sm"
                />
                <button
                  onClick={() => handleCopy(user.id, 'userId')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                >
                  <Copy size={18} />
                </button>
              </div>
              {copied === 'userId' && (
                <p className="text-green-400 text-sm mt-1">Copied!</p>
              )}
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-2">UID</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={user.uid}
                  readOnly
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 font-mono text-sm"
                />
                <button
                  onClick={() => handleCopy(user.uid, 'uid')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                >
                  <Copy size={18} />
                </button>
              </div>
              {copied === 'uid' && (
                <p className="text-green-400 text-sm mt-1">Copied!</p>
              )}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Logout
        </button>

        <div className="h-8" />
      </div>
    </div>
  );
}
