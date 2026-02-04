'use client';

import { Home, TrendingUp, ArrowLeftRight, Wallet, Menu, X, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useLanguageSwitch } from '@/lib/useLanguageSwitch';

export function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const { changeLanguage } = useLanguageSwitch();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Remove locale from pathname for auth page check
  const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
  const isAuthPage = pathWithoutLocale === '/login' || pathWithoutLocale === '/register' || pathWithoutLocale === '/forgot-password' || pathWithoutLocale === '/reset-password' || pathWithoutLocale === '/verify-email';

  const navItems = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Dashboard', icon: TrendingUp, href: '/dashboard' },
    { name: 'Trade', icon: ArrowLeftRight, href: '/trade' },
    { name: 'Wallet', icon: Wallet, href: '/wallet' },
  ];

  const accountLink = { name: 'Account', icon: User, href: '/account' };
  
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
  ];

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 glass border-r border-white/10">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            CryptoTrade
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-2 border-t border-white/10">
          <Link
            href={accountLink.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              pathname === accountLink.href ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <User size={20} />
            <span className="font-medium">{accountLink.name}</span>
          </Link>
          
          {/* Language Selector */}
          <div className="border-t border-white/10 pt-2">
            <p className="text-xs text-gray-500 px-4 py-2">Language</p>
            <select
              value={locale}
              onChange={(e) => changeLanguage(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-white appearance-none cursor-pointer hover:bg-white/10 transition-colors"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '36px',
              }}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-800 text-white">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="glass-card">
            <p className="text-xs text-gray-400 mb-1">Portfolio Value</p>
            <p className="text-xl font-bold">$24,567.89</p>
            <p className="text-xs text-success">+12.5% Today</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            CryptoTrade
          </h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-white/5 active:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setMobileMenuOpen(false)}>
          <div className="glass-card m-4 mt-20" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg min-h-[44px] ${
                      isActive ? 'bg-accent text-white' : 'text-gray-400'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
              <div className="border-t border-white/10 pt-2">
                <Link
                  href={accountLink.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg min-h-[44px] ${
                    pathname === accountLink.href ? 'bg-accent text-white' : 'text-gray-400'
                  }`}
                >
                  <User size={20} />
                  <span className="font-medium">{accountLink.name}</span>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-4 py-2 min-w-[44px] min-h-[44px] ${
                  isActive ? 'text-accent' : 'text-gray-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
