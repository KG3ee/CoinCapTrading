import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        card: '#111111',
        border: '#1f1f1f',
        accent: '#3b82f6',
        success: '#10b981',
        danger: '#ef4444',
      },
      backdropBlur: {
        xs: '2px',
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-left))',
        'safe-r': 'max(1rem, env(safe-area-inset-right))',
      },
      minHeight: {
        touch: '44px',
        'touch-sm': '40px',
      },
      minWidth: {
        touch: '44px',
        'touch-sm': '40px',
      },
    },
  },
  plugins: [],
}
export default config
