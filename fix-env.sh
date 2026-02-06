#!/bin/bash
# Script to fix .env.local file

cd /Users/kyawlaymyint/Desktop/CoinCapTrading

echo "Backing up current .env.local..."
cp .env.local .env.local.backup

echo "Creating fixed .env.local..."
cat > .env.local << 'ENVEOF'
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/coincap-trading

# NextAuth Configuration
NEXTAUTH_SECRET=45c3f7a9d2e8b1c6f4a9e3d2c7f1a8b5e9d4c2f7a1b8e5d3c9f2a6e4b1c7d9
NEXTAUTH_URL=http://localhost:3000

# JWT Secret (for manual token generation)
JWT_SECRET=IDYnsJksbcZGWir+edpiEisq38wmq1KvlaxZ9kD3sjI=
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Email Configuration (Resend API for sending emails)
RESEND_API_KEY=re_8mbYz1qE_5UL4Xf62U6qQgprEAdJX7JKX
EMAIL_FROM=onboarding@resend.dev

# Rate Limiting
RATE_LIMIT_ENABLED=false

# Application Settings
NODE_ENV=development
LOG_LEVEL=debug

# Public URLs
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENVEOF

echo "✅ .env.local has been fixed!"
echo "📦 Backup saved to .env.local.backup"
echo ""
echo "Fixed issues:"
echo "  ✅ Uncommented RESEND_API_KEY"
echo "  ✅ Fixed database name: coincap-trading (was coincaptrading)"
echo "  ✅ Added EMAIL_FROM"
echo "  ✅ Added all missing environment variables"
