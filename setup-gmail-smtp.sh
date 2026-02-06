#!/bin/bash

# Gmail SMTP Setup Script
echo "================================"
echo "📧 Gmail SMTP Setup"
echo "================================"
echo ""
echo "This will configure Gmail SMTP for sending real emails"
echo ""
echo "Prerequisites:"
echo "  1. Gmail account with 2-Step Verification enabled"
echo "  2. App Password generated (16 characters)"
echo ""
echo "Get your App Password at:"
echo "  https://myaccount.google.com/apppasswords"
echo ""

# Prompt for credentials
read -p "Enter your Gmail address (e.g., you@gmail.com): " GMAIL_ADDRESS

read -sp "Enter your Gmail App Password (16 chars, no spaces): " GMAIL_APP_PASSWORD
echo ""

# Remove spaces from app password
GMAIL_APP_PASSWORD=$(echo "$GMAIL_APP_PASSWORD" | tr -d ' ')

# Backup .env.local if it exists
if [ -f .env.local ]; then
    cp .env.local .env.local.backup-$(date +%Y%m%d-%H%M%S)
    echo "✅ Backed up existing .env.local"
fi

# Remove old Mailtrap config if exists
if grep -q "SMTP_HOST=sandbox.smtp.mailtrap.io" .env.local 2>/dev/null; then
    echo ""
    echo "📝 Removing old Mailtrap configuration..."
    # Remove Mailtrap lines
    sed -i.bak '/# Mailtrap SMTP/d' .env.local
    sed -i.bak '/SMTP_HOST=sandbox.smtp.mailtrap.io/d' .env.local
    sed -i.bak '/SMTP_PORT=2525/d' .env.local
    sed -i.bak '/SMTP_USER=/d' .env.local
    sed -i.bak '/SMTP_PASS=/d' .env.local
    rm -f .env.local.bak
fi

# Add Gmail SMTP config
echo "" >> .env.local
echo "# Gmail SMTP Configuration (Real Emails)" >> .env.local
echo "SMTP_HOST=smtp.gmail.com" >> .env.local
echo "SMTP_PORT=587" >> .env.local
echo "SMTP_USER=$GMAIL_ADDRESS" >> .env.local
echo "SMTP_PASS=$GMAIL_APP_PASSWORD" >> .env.local
echo "EMAIL_FROM=$GMAIL_ADDRESS" >> .env.local

echo ""
echo "================================"
echo "✅ Gmail SMTP configured successfully!"
echo "================================"
echo ""
echo "📧 Emails will now be sent from: $GMAIL_ADDRESS"
echo "📨 Recipients will receive REAL emails"
echo ""
echo "⚠️  Important Limits:"
echo "   - 500 emails per day"
echo "   - May be flagged as spam initially"
echo ""
echo "🔄 Restart your dev server to apply changes"
echo ""
