'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  Lock,
  ShieldCheck,
  UserCheck,
  Wallet,
  Zap,
} from 'lucide-react';

const benefits = [
  { title: 'Easy To Use', description: 'Clean interface designed for first-time crypto users.', icon: UserCheck },
  { title: 'Secure By Default', description: 'Built-in account security with verified login flows.', icon: ShieldCheck },
  { title: 'Low Fees', description: 'Transparent pricing with no hidden surprises.', icon: CircleDollarSign },
  { title: 'Beginner Focused', description: 'Simple onboarding and guided actions.', icon: Zap },
];

const steps = [
  { title: 'Sign Up', description: 'Create your account in minutes with email or Google.' },
  { title: 'Deposit', description: 'Fund your wallet with the coin and network you prefer.' },
  { title: 'Start Trading', description: 'Buy and sell with clear controls and live market data.' },
];

const securityItems = [
  { title: 'Two-Factor Protection', description: 'Add extra protection with 2FA authentication.', icon: BadgeCheck },
  { title: 'Encryption', description: 'Sensitive account data is protected in transit and at rest.', icon: Lock },
  { title: 'Wallet Controls', description: 'Withdrawal confirmations and admin review safeguards.', icon: Wallet },
];

const pricingRows = [
  { label: 'Deposit Fee', value: '0%' },
  { label: 'Trading Fee', value: 'From 0.10%' },
  { label: 'Withdrawal Fee', value: 'Network-only or fixed by asset' },
  { label: 'Hidden Charges', value: 'None' },
];

const testimonials = [
  {
    name: 'Amy S.',
    role: 'Beginner Trader',
    quote: 'I started with zero experience. The step-by-step flow made it easy for me.',
  },
  {
    name: 'Michael T.',
    role: 'Part-time Investor',
    quote: 'The layout is clear, and I can check fees before making decisions.',
  },
  {
    name: 'Layla K.',
    role: 'New Crypto User',
    quote: 'I like that it feels simple and safe, not overwhelming like other platforms.',
  },
];

const faqs = [
  {
    question: 'Do I need trading experience?',
    answer: 'No. The platform is designed for beginners with simple controls and guided steps.',
  },
  {
    question: 'How do I start with small capital?',
    answer: 'Create an account, deposit the amount you are comfortable with, and begin with small trades.',
  },
  {
    question: 'Can I secure my account?',
    answer: 'Yes. Enable 2FA and use strong password practices for better account protection.',
  },
  {
    question: 'Where can I see fees?',
    answer: 'Fees are shown in the pricing section and before key actions like trading or withdrawals.',
  },
];

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--app-bg)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            CryptoTrade
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-gray-300 md:flex">
            <a href="#home" className="hover:text-white">Home</a>
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how-it-works" className="hover:text-white">How it Works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10">
              Log In
            </Link>
            <Link href="/register" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-black hover:bg-accent/85">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center md:px-6 md:py-20">
        <div>
          <p className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
            Beginner-Friendly Crypto Trading Platform
          </p>
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">
            Start Crypto Trading With Confidence, Not Confusion
          </h1>
          <p className="mt-4 text-sm text-gray-300 md:text-base">
            Learn, deposit, and trade in a simple interface built for new users. No complex terminals.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent/85">
              Create Free Account <ArrowRight size={14} />
            </Link>
            <a href="#how-it-works" className="rounded-lg border border-white/20 px-5 py-2.5 text-sm hover:bg-white/10">
              See How It Works
            </a>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-5">
          <div className="rounded-xl border border-white/10 bg-[var(--app-panel)] p-4">
            <p className="text-xs text-gray-400">Platform Preview</p>
            <div className="mt-3 grid gap-3">
              <div className="h-24 rounded-lg border border-dashed border-white/20 bg-white/5" />
              <div className="h-24 rounded-lg border border-dashed border-white/20 bg-white/5" />
              <div className="h-16 rounded-lg border border-dashed border-white/20 bg-white/5" />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits / Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h2 className="text-2xl font-bold md:text-3xl">Why Beginners Choose CryptoTrade</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((item) => (
            <article key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <item.icon size={18} className="text-accent" />
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs text-gray-400">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h2 className="text-2xl font-bold md:text-3xl">How It Works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs text-accent">Step {index + 1}</p>
              <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-gray-400">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h2 className="text-2xl font-bold md:text-3xl">Trust & Security</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {securityItems.map((item) => (
            <article key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <item.icon size={18} className="text-accent" />
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs text-gray-400">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h2 className="text-2xl font-bold md:text-3xl">Fees Transparency</h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs text-gray-400">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {pricingRows.map((row) => (
                <tr key={row.label} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 text-gray-300">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h2 className="text-2xl font-bold md:text-3xl">What New Users Say</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-gray-200">"{item.quote}"</p>
              <p className="mt-4 text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-gray-400">{item.role}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h2 className="text-2xl font-bold md:text-3xl">FAQ</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent" />
                  {faq.question}
                </span>
              </summary>
              <p className="mt-2 text-sm text-gray-300">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section id="contact" className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-accent/20 to-blue-500/20 p-6 md:p-8">
          <h2 className="text-2xl font-bold md:text-3xl">Ready To Start Your Crypto Journey?</h2>
          <p className="mt-2 text-sm text-gray-200 md:text-base">
            Create your account and start learning with a beginner-first experience.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent/85">
              Get Started Now <ArrowRight size={14} />
            </Link>
            <a href="mailto:support@cryptotrade.app" className="rounded-lg border border-white/20 px-5 py-2.5 text-sm hover:bg-white/10">
              Contact Support
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 text-sm text-gray-400 md:grid-cols-3 md:px-6">
          <p>© {new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
          <div className="flex gap-4 md:justify-center">
            <a href="#" className="hover:text-white">X</a>
            <a href="#" className="hover:text-white">Telegram</a>
            <a href="#" className="hover:text-white">Discord</a>
          </div>
          <div className="flex gap-4 md:justify-end">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
