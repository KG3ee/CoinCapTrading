'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLanguageSwitch } from '@/lib/useLanguageSwitch';
import {
  User,
  Lock,
  Copy,
  LogOut,
  ArrowLeft,
  Mail,
  Save,
  X,
  Globe,
  MapPin,
  Shield,
  Calendar,
  Award,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

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

type TabType = 'profile' | 'settings' | 'security';

export default function AccountPage() {
  const t = useTranslations('account');
  const router = useRouter();
  const { changeLanguage, locale } = useLanguageSwitch();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Profile edit states
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState('English');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [previewPicture, setPreviewPicture] = useState<string | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
          const errorData = await response.json();
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
  }, [router]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

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
    setSuccess('');

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
          profilePicture,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      setUser(data.user);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Save profile error:', error);
      setError('An error occurred while saving your profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        setIsSaving(false);
        return;
      }

      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters');
        setIsSaving(false);
        return;
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Change password error:', error);
      setError('An error occurred while changing your password');
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
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 glass border-b border-white/10 backdrop-blur-md">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            <h1 className="text-white font-semibold text-lg">Account</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="glass-card p-6 text-center">
            <p className="text-red-300 flex items-center justify-center gap-2">
              <AlertCircle size={18} />
              User not found
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/10 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push(`/`)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          <h1 className="text-white font-semibold text-lg">{t('title')}</h1>
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

        {success && (
          <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/50">
            <p className="text-green-300 text-sm flex items-center gap-2">
              <CheckCircle size={18} />
              {success}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          <button
            onClick={() => {
              setActiveTab('profile');
              setIsEditing(false);
              setError('');
              setSuccess('');
            }}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <User size={18} className="inline mr-2" />
            {t('tabs.profile')}
          </button>
          <button
            onClick={() => {
              setActiveTab('settings');
              setIsEditing(false);
              setError('');
              setSuccess('');
            }}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Globe size={18} className="inline mr-2" />
            {t('tabs.settings')}
          </button>
          <button
            onClick={() => {
              setActiveTab('security');
              setError('');
              setSuccess('');
            }}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'security'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Lock size={18} className="inline mr-2" />
            {t('tabs.security')}
          </button>
        </div>

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="glass-card">
              {!isEditing && (
                <div className="space-y-6">
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
                        <p className="text-gray-400 flex items-center gap-2">
                          <Mail size={16} />
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent font-semibold transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>

                  {/* Account Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Account Status</p>
                      <p className="text-white font-semibold capitalize flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-400" />
                        {user.accountStatus}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Email Verified</p>
                      <p className="text-white font-semibold flex items-center gap-2">
                        {user.isVerified ? (
                          <>
                            <CheckCircle size={16} className="text-green-400" />
                            Verified
                          </>
                        ) : (
                          <>
                            <AlertCircle size={16} className="text-yellow-400" />
                            Pending
                          </>
                        )}
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
                      <p className="text-gray-400 text-sm mb-1">2FA Status</p>
                      <p className="text-white font-semibold flex items-center gap-2">
                        <Shield size={16} className={user.isTwoFactorEnabled ? 'text-green-400' : 'text-gray-400'} />
                        {user.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Form */}
              {isEditing && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">Edit Profile</h3>

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

                  {/* Buttons */}
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1 py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 disabled:opacity-50 text-white font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setProfilePicture(user.profilePicture);
                        setPreviewPicture(user.profilePicture);
                        setFullName(user.fullName);
                      }}
                      className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <X size={18} />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* IDs Card */}
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
                      <Copy size={18} className={copied === 'userId' ? 'text-green-400' : ''} />
                    </button>
                  </div>
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
                      <Copy size={18} className={copied === 'uid' ? 'text-green-400' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Card */}
            <div className="glass-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Award size={20} className="text-accent" />
                Referral Code
              </h3>
              <p className="text-gray-400 text-sm mb-3">Share this code with friends to earn rewards!</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={user.referralCode}
                  readOnly
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-sm"
                />
                <button
                  onClick={() => handleCopy(user.referralCode, 'referral')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                >
                  <Copy size={18} className={copied === 'referral' ? 'text-green-400' : ''} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-lg font-bold text-white">{t('settings.title')}</h3>

            {/* Language */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">{t('settings.language')}</label>
              <select
                value={locale}
                onChange={(e) => {
                  changeLanguage(e.target.value);
                  const langMap: { [key: string]: string } = {
                    'en': 'English',
                    'es': 'Spanish',
                    'fr': 'French',
                    'de': 'German',
                    'zh': 'Chinese',
                    'ja': 'Japanese',
                  };
                  setLanguage(langMap[e.target.value] || 'English');
                }}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '36px',
                }}
              >
                <option value="en" className="bg-slate-800 text-white">English</option>
                <option value="es" className="bg-slate-800 text-white">Español</option>
                <option value="fr" className="bg-slate-800 text-white">Français</option>
                <option value="de" className="bg-slate-800 text-white">Deutsch</option>
                <option value="zh" className="bg-slate-800 text-white">中文</option>
                <option value="ja" className="bg-slate-800 text-white">日本語</option>
              </select>
            </div>

            {/* Withdrawal Address */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">{t('settings.withdrawalAddress')}</label>
              <input
                type="text"
                value={withdrawalAddress}
                onChange={(e) => setWithdrawalAddress(e.target.value)}
                placeholder={t('settings.withdrawalAddressPlaceholder')}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">{t('settings.withdrawalAddressHint')}</p>
              <p className="text-xs text-gray-500 mt-1">Used for withdrawals and payouts</p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 disabled:opacity-50 text-white font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-bold text-white mb-4">Change Password</h3>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full px-4 py-2 pr-10 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white placeholder-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      className="w-full px-4 py-2 pr-10 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white placeholder-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="w-full px-4 py-2 pr-10 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white placeholder-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 disabled:opacity-50 text-white font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={18} />
                  {isSaving ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>

            {/* Two-Factor Authentication */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Two-Factor Authentication</h3>
                  <p className="text-gray-400 text-sm">Add an extra layer of security to your account</p>
                </div>
                {user.isTwoFactorEnabled && (
                  <span className="px-3 py-1 rounded bg-green-500/20 text-green-300 text-xs font-semibold">
                    Enabled
                  </span>
                )}
              </div>

              <button
                onClick={() => router.push(user.isTwoFactorEnabled ? '/2fa/manage' : '/2fa/setup')}
                className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Shield size={18} />
                {user.isTwoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
              </button>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}
