#!/bin/bash

# Quick command to add Mailtrap credentials
# Usage: ./add-mailtrap-env.sh <username> <password>

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./add-mailtrap-env.sh <username> <password>"
    echo ""
    echo "Example:"
    echo "  ./add-mailtrap-env.sh abc123def456 xyz789uvw012"
    echo ""
    echo "Get your credentials from: https://mailtrap.io/inboxes"
    echo "  → Click your inbox → SMTP Settings tab"
    exit 1
fi

SMTP_USER="$1"
SMTP_PASS="$2"

# Backup .env.local if it exists
if [ -f .env.local ]; then
    cp .env.local .env.local.backup-$(date +%Y%m%d-%H%M%S)
fi

# Add Mailtrap config
echo "" >> .env.local
echo "# Mailtrap SMTP (Testing)" >> .env.local
echo "SMTP_HOST=sandbox.smtp.mailtrap.io" >> .env.local
echo "SMTP_PORT=2525" >> .env.local
echo "SMTP_USER=$SMTP_USER" >> .env.local
echo "SMTP_PASS=$SMTP_PASS" >> .env.local
echo "EMAIL_FROM=noreply@coincaptrading.com" >> .env.local

echo "✅ Mailtrap credentials added to .env.local"
echo ""
echo "🔄 Now restart your dev server:"
echo "   1. Stop the current server (look for the running terminal)"
echo "   2. Run: npm run dev"
echo ""
echo "📧 Test registration - emails will appear at:"
echo "   https://mailtrap.io/inboxes"
