# 📧 Gmail SMTP Setup Guide

## Quick Setup (2 minutes)

### Step 1: Get Gmail App Password

1. **Enable 2-Step Verification** (if not already enabled):
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow the setup wizard

2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other (Custom name)" as device
   - Name it: "CoinCapTrading"
   - Click "Generate"
   - **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)
   - ⚠️ **Remove all spaces** when copying

### Step 2: Configure Your App

**Option A: Use the setup script**

```bash
./setup-gmail-smtp.sh
```

It will prompt you for:
- Your Gmail address (e.g., `you@gmail.com`)
- Your App Password (16 characters)

**Option B: Manual setup**

Open `.env.local` and replace the Mailtrap config with:

```bash
# Remove these lines (Mailtrap):
# SMTP_HOST=sandbox.smtp.mailtrap.io
# SMTP_PORT=2525
# SMTP_USER=...
# SMTP_PASS=...

# Add these lines (Gmail):
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password-no-spaces
EMAIL_FROM=your-email@gmail.com
```

### Step 3: Restart Server

```bash
# Stop current server (Ctrl+C or let me do it)
npm run dev
```

### Step 4: Test It!

Register with a real email address and check that inbox:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"friend@example.com","password":"test123"}'
```

The email will be sent to `friend@example.com` for real!

## 📊 Gmail SMTP Limits

- **500 emails per day** - Good for testing and small apps
- **May be flagged as spam** initially - Check recipient spam folders
- **Free** - No cost at all
- **Real emails** - Recipients actually receive them

## 🔧 Troubleshooting

### "Invalid credentials" error

1. Make sure you're using the **App Password**, not your Gmail password
2. Remove all spaces from the App Password
3. Ensure 2-Step Verification is enabled

### Emails going to spam

1. Ask recipients to mark as "Not Spam"
2. Add SPF records (advanced) - Google will guide you
3. For production, consider using a custom domain with Resend

### "Less secure app" error

- This shouldn't happen with App Passwords
- If it does, enable "Less secure app access" at: https://myaccount.google.com/lesssecureapps

## 🔐 Security Notes

- ✅ App Password is NOT your Gmail password
- ✅ App Password only works for this app
- ✅ You can revoke it anytime at: https://myaccount.google.com/apppasswords
- ✅ Never commit `.env.local` to Git

## 🎯 Quick Reference

| Setting | Value |
|---------|-------|
| SMTP Host | `smtp.gmail.com` |
| SMTP Port | `587` |
| SMTP User | Your Gmail address |
| SMTP Password | 16-char App Password |
| EMAIL_FROM | Your Gmail address |

## ⚡ Next Steps

After setup:
1. Test registration with a real email
2. Check if email arrives (check spam folder)
3. Click verification link
4. Celebrate! 🎉

---

**Need help?** Just ask!
