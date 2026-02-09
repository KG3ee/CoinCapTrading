'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Lock, Copy, LogOut, ArrowLeft, Mail, Save, X, 
  Globe, MapPin, Shield, Calendar, Award, CheckCircle, AlertCircle 
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

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
  profilePicture: string | null;
  isTwoFactorEnabled: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { status } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Edit form states
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState('English');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [previewPicture, setPreviewPicture] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load user profile
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
  }, [status, router]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (status !== 'authenticated') {
          return;
        }

        const response = await fetch('/api/auth/me', {
          method: 'GET',
        });

        // Handle authentication errors (401) and user not found (404)
        if (response.status === 401 || response.status === 404) {
          // Show message if user was deleted
          if (response.status === 404) {
            alert('Your account was not found. Please register or log in again.');
          }

          await signOut({ redirect: false });
          router.push('/login');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Profile API error:', errorData);
          setError(errorData.error || 'Failed to load profile');
          return;
        }

        const data = await response.json();
        setUser(data.user);
        setFullName(data.user.fullName);
        setLanguage(data.user.language || 'English');
        setWithdrawalAddress(data.user.withdrawalAddress || '');
        setProfilePicture(data.user.profilePicture || null);
        setPreviewPicture(data.user.profilePicture || null);
      } catch (error) {
        console.error('Load profile error:', error);
        setError('An error occurred while loading your profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router, status]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setProfilePicture(base64);
      setPreviewPicture(base64);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          language,
          withdrawalAddress,
          profilePicture,
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
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('rememberedPassword');
    void signOut({ redirect: false });
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[50vh] bg-background flex items-center justify-center p-4">
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
    <div className="bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/10 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center sm:justify-between gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors absolute left-4 sm:relative sm:left-0"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          <h1 className="text-white font-semibold text-lg">My Profile</h1>
          <div className="w-10 hidden sm:block" />
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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.fullName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-accent"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold border-2 border-accent">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{user.fullName}</h2>
                <p className="text-gray-400 flex items-center gap-2 text-sm sm:text-base">
                  <Mail size={16} />
                  {user.email}
                </p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent font-semibold transition-colors whitespace-nowrap"
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

            {/* Profile Picture */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Profile Picture</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {previewPicture ? (
                  <img
                    src={previewPicture}
                    alt="Profile preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-accent"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold border-2 border-accent flex-shrink-0">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <label className="flex-1 min-w-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-accent/50 cursor-pointer text-center text-gray-400 hover:text-accent transition-colors">
                    Choose Image
                  </div>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">Max 5MB. JPG, PNG, GIF</p>
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
            <button
              onClick={() => router.push('/change-password')}
              className="w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors flex items-center gap-2"
            >
              <Lock size={18} className="text-accent" />
              Change Password
            </button>
            <button
              onClick={() => router.push(user.isTwoFactorEnabled ? '/2fa/manage' : '/2fa/setup')}
              className="w-full px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Shield size={18} className="text-accent" />
                Two-Factor Authentication
              </span>
              {user.isTwoFactorEnabled && (
                <span className="px-2 py-1 rounded bg-green-500/20 text-green-300 text-xs font-semibold">
                  Enabled
                </span>
              )}
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
