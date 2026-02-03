'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Lock, Globe, Home, HelpCircle, Bell, Info, LogOut, Shield, Headphones } from 'lucide-react';
import Image from 'next/image';

export default function SettingsPage() {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSignOut = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 glass border-b border-white/10">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft size={24} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-lg">Settings</h1>
        <div className="w-10 h-10" />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-accent">
              KG
            </div>
            <div className="flex-1">
              <p className="text-white text-lg font-semibold">KG</p>
              <p className="text-gray-400 text-xs">Premium Member</p>
            </div>
          </div>

          {/* UID and Referral */}
          <div className="mt-6 space-y-3">
            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">UID</p>
                  <p className="text-white font-semibold">1106103</p>
                </div>
                <button
                  onClick={() => handleCopy('1106103', 'uid')}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Copy size={18} className={copied === 'uid' ? 'text-success' : 'text-gray-400'} />
                </button>
              </div>
            </div>

            <div className="glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">Referral Code</p>
                  <p className="text-white font-semibold">REF1234567</p>
                </div>
                <button
                  onClick={() => handleCopy('REF1234567', 'referral')}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Copy size={18} className={copied === 'referral' ? 'text-success' : 'text-gray-400'} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Menu */}
        <div className="p-4 space-y-6 pb-20">
        {/* Account Section */}
        <div className="space-y-1">
          <button className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors">
            <Shield size={20} className="text-blue-400" />
            <div className="flex-1 text-left">
              <p className="text-white font-medium">Authentication</p>
            </div>
            <span className="text-xs bg-success/20 text-success px-3 py-1 rounded-full font-semibold">Certified</span>
          </button>

          <button className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors">
            <Globe size={20} className="text-purple-400" />
            <div className="flex-1 text-left">
              <p className="text-white font-medium">Language</p>
            </div>
            <span className="text-gray-400 text-sm">English</span>
          </button>

          <button className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors">
            <Home size={20} className="text-cyan-400" />
            <div className="flex-1 text-left">
              <p className="text-white font-medium">Withdrawal Address</p>
            </div>
          </button>

          <button className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors">
            <Lock size={20} className="text-orange-400" />
            <div className="flex-1 text-left">
              <p className="text-white font-medium">Password Setting</p>
            </div>
          </button>
        </div>

        {/* Support Section */}
        <div className="border-t border-white/10 pt-6 space-y-1">
          <button className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors">
            <HelpCircle size={20} className="text-green-400" />
            <div className="flex-1 text-left">
              <p className="text-white font-medium">Help Center</p>
            </div>
          </button>

          <button className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors">
            <Bell size={20} className="text-yellow-400" />
            <div className="flex-1 text-left">
              <p className="text-white font-medium">Notification</p>
            </div>
            <span className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full font-semibold">New</span>
          </button>

          <button className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors">
            <Info size={20} className="text-pink-400" />
            <div className="flex-1 text-left">
              <p className="text-white font-medium">About Us</p>
            </div>
          </button>

          <button className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-white/5 transition-colors">
            <Headphones size={20} className="text-indigo-400" />
            <div className="flex-1 text-left">
              <p className="text-white font-medium">MSB Certification</p>
            </div>
          </button>
        </div>
        {/* Sign Out */}
        <div className="border-t border-white/10 pt-6">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-danger/20 transition-colors text-danger"
          >
            <LogOut size={20} />
            <p className="font-medium">Sign Out</p>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
