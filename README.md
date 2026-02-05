# CoinCap Trading Dashboard

A fully responsive crypto trading dashboard built with Next.js 14, Tailwind CSS, and Lucide React.

## Features

- ✅ **Fully Responsive Design**: Premium mobile app experience with bottom navigation, professional desktop layout with sidebar
- ✅ **Dark Theme**: Sleek dark mode (#0a0a0a) with glassmorphism effects
- ✅ **Real-time Price Ticker**: Scrollable ticker showing live crypto prices
- ✅ **Trading Chart**: TradingView integration placeholder (100% width on mobile)
- ✅ **Quick Trade**: Buy/Sell form with easy access on all devices
- ✅ **Market Prices**: 2-column grid on mobile, expandable on desktop
- ✅ **Transactions**: List view on mobile, table view on desktop
- ✅ **Touch Optimized**: All buttons are minimum 44x44px for mobile usability

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Language**: TypeScript
- **Database**: MongoDB
- **Email Service**: Resend
- **Authentication**: NextAuth.js

## Environment Setup

1. Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

2. Configure the required environment variables in `.env.local`:

### Required Variables:
- **MONGODB_URI**: MongoDB connection string (local or cloud)
- **RESEND_API_KEY**: Get from [Resend.com](https://resend.com) for email functionality
- **NEXT_PUBLIC_API_URL**: Your application URL (e.g., `http://localhost:3000`)
- **JWT_SECRET**: A secure random string for token signing

### Optional Variables:
- **GOOGLE_CLIENT_ID**: For Google OAuth sign-in
- **GOOGLE_CLIENT_SECRET**: For Google OAuth sign-in

### Email Service Setup:
To enable password reset and email verification:
1. Sign up at [Resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add it to `.env.local` as `RESEND_API_KEY`
4. For development, emails will be sent to your Resend sandbox (check email logs in Resend dashboard)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
app/
├── layout.tsx          # Root layout with responsive navigation
├── page.tsx            # Main dashboard with all components
├── globals.css         # Global styles and Tailwind utilities
├── markets/
│   └── page.tsx        # Markets page
├── trade/
│   └── page.tsx        # Trade page
└── wallet/
    └── page.tsx        # Wallet page
```

## Responsive Breakpoints

- **Mobile**: < 768px (Bottom Navigation)
- **Desktop**: ≥ 768px (Side Navigation)

## Customization

### Colors
Edit `tailwind.config.ts` to customize the color scheme:
- `background`: Main background color
- `card`: Card background
- `border`: Border colors
- `accent`: Primary accent color
- `success`/`danger`: Status colors

### Navigation
Modify the `navItems` array in `layout.tsx` to add/remove navigation items.

## Future Enhancements

- Connect to live crypto API (CoinGecko, Binance, etc.)
- Integrate real TradingView charts
- Add authentication and user profiles
- Implement real trading functionality
- Add portfolio tracking
- WebSocket for real-time price updates

## License

MIT
