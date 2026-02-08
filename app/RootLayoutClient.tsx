'use client';

import { Home, TrendingUp, ArrowLeftRight, Wallet, Menu, X, User, BarChart3, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { SessionProvider, useSession } from 'next-auth/react';
import ChatWidget from '@/lib/components/ChatWidget';

interface RootLayoutClientProps {
  children: React.ReactNode;
  locale: string;
  messages: any;
}

type AppTheme = 'dark' | 'light';
const THEME_STORAGE_KEY = 'coincap-theme';

function applyThemeClass(theme: AppTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('theme-dark', 'theme-light');
  root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
}

function RootLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { status } = useSession();
  const [portfolioValue, setPortfolioValue] = useState<string | null>(null);
  const [appTheme, setAppTheme] = useState<AppTheme>('dark');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const nextTheme: AppTheme =
      storedTheme === 'light' || storedTheme === 'dark'
        ? storedTheme
        : prefersLight
          ? 'light'
          : 'dark';
    setAppTheme(nextTheme);
    applyThemeClass(nextTheme);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handleThemeChange = (event: MediaQueryListEvent) => {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === 'light' || storedTheme === 'dark') return;
      const nextTheme: AppTheme = event.matches ? 'light' : 'dark';
      setAppTheme(nextTheme);
      applyThemeClass(nextTheme);
    };
    media.addEventListener('change', handleThemeChange);
    return () => media.removeEventListener('change', handleThemeChange);
  }, []);

  useEffect(() => {
    applyThemeClass(appTheme);
  }, [appTheme]);
  
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/dashboard')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.portfolio?.accountBalance != null) {
            const total = (data.portfolio.accountBalance ?? 0) +
              (data.portfolio.holdings ?? []).reduce((sum: number, h: any) => sum + (h.totalValue ?? 0), 0);
            setPortfolioValue(total.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
          }
        })
        .catch(() => {});
    }
  }, [status]);
  // Check if current page is auth page or admin page (these get their own layout)
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password' || pathname === '/verify-email';
  const isAdminPage = pathname.startsWith('/admin');

  const navItems = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Markets', icon: BarChart3, href: '/markets' },
    { name: 'Trade', icon: ArrowLeftRight, href: '/trade' },
    { name: 'History', icon: Clock, href: '/trade-history' },
    { name: 'Wallet', icon: Wallet, href: '/wallet' },
  ];

  const accountLink = { name: 'Account', icon: User, href: '/account' };

  if (isAuthPage || isAdminPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 glass border-r border-white/10">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            CryptoTrade
          </h1>
        </div>
        
        <nav className="flex-1 p-2.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isActive ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-2.5 space-y-1 border-t border-white/10">
          <Link
            href={accountLink.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              pathname === accountLink.href ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <User size={18} />
            <span className="font-medium text-sm">{accountLink.name}</span>
          </Link>
          
          <div className="glass-card p-2">
            <p className="text-[10px] text-gray-400 mb-0.5">Portfolio Value</p>
            <p className="text-base font-bold">{portfolioValue ?? '—'}</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-white/10" style={{paddingTop: 'env(safe-area-inset-top)'}}>
        <div className="flex items-center justify-between px-3 py-3">
          <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent truncate">
            CryptoTrade
          </h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-white/5 active:bg-white/10 min-h-touch min-w-touch flex items-center justify-center transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[35] bg-black/80 backdrop-blur-sm overflow-y-auto" style={{top: 'calc(60px + env(safe-area-inset-top))'}} onClick={() => setMobileMenuOpen(false)}>
          <div className="glass-card m-2.5 mt-3 max-h-[calc(100vh-100px)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg min-h-touch transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium text-sm">{item.name}</span>
                  </Link>
                );
              })}
              <div className="border-t border-white/10 pt-1">
                <Link
                  href={accountLink.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg min-h-touch transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    pathname === accountLink.href ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <User size={18} />
                  <span className="font-medium text-sm">{accountLink.name}</span>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main 
        className="flex-1 overflow-auto md:pt-0 md:pb-0 min-h-screen mobile-content-padding"
      >
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10" style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 min-h-touch min-w-touch rounded-lg transition-smooth ${
                  isActive ? 'text-accent' : 'text-gray-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-[11px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Chat Widget */}
      {!isAuthPage && <ChatWidget />}
    </div>
  );
}

export function RootLayoutClient({
  children,
  locale,
  messages,
}: RootLayoutClientProps) {
  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <RootLayoutContent>{children}</RootLayoutContent>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
