#!/bin/bash

# Mailtrap Setup Script
echo "================================"
echo "🔧 Mailtrap Email Setup"
echo "================================"
echo ""
echo "This script will add Mailtrap SMTP credentials to your .env.local file"
echo ""
echo "📋 First, get your Mailtrap credentials:"
echo "   1. Go to https://mailtrap.io (sign up if needed)"
echo "   2. Navigate to Email Testing → Inboxes"
echo "   3. Click on your inbox"
echo "   4. Go to SMTP Settings tab"
echo "   5. Copy the credentials"
echo ""

# Prompt for credentials
read -p "Enter SMTP Host (default: sandbox.smtp.mailtrap.io): " SMTP_HOST
SMTP_HOST=${SMTP_HOST:-sandbox.smtp.mailtrap.io}

read -p "Enter SMTP Port (default: 2525): " SMTP_PORT
SMTP_PORT=${SMTP_PORT:-2525}

read -p "Enter SMTP Username: " SMTP_USER

read -sp "Enter SMTP Password: " SMTP_PASS
echo ""

read -p "Enter Email FROM address (default: noreply@coincaptrading.com): " EMAIL_FROM
EMAIL_FROM=${EMAIL_FROM:-noreply@coincaptrading.com}

# Backup existing .env.local
if [ -f .env.local ]; then
    cp .env.local .env.local.backup-$(date +%Y%m%d-%H%M%S)
    echo "✅ Backed up existing .env.local"
fi

# Add or update Mailtrap credentials
echo ""
echo "# Mailtrap SMTP Configuration (for testing)" >> .env.local
echo "SMTP_HOST=$SMTP_HOST" >> .env.local
echo "SMTP_PORT=$SMTP_PORT" >> .env.local
echo "SMTP_USER=$SMTP_USER" >> .env.local
echo "SMTP_PASS=$SMTP_PASS" >> .env.local
echo "EMAIL_FROM=$EMAIL_FROM" >> .env.local

echo ""
echo "================================"
echo "✅ Mailtrap configured successfully!"
echo "================================"
echo ""
echo "📧 All emails will now be caught by Mailtrap"
echo "   View them at: https://mailtrap.io/inboxes"
echo ""
echo "🔄 Restart your dev server to apply changes:"
echo "   npm run dev"
echo ""
