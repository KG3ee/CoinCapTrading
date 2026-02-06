# 🚀 MAILTRAP QUICK SETUP GUIDE

## Step 1: Get Your Mailtrap Credentials (2 minutes)

1. **Open Mailtrap**: https://mailtrap.io/register/signup
2. **Sign up** (use Google for fastest signup)
3. After signup, click **"Email Testing"** in the sidebar
4. Click on **"My Inbox"** (or the default inbox)
5. Click the **"SMTP Settings"** tab
6. You'll see credentials like this:

```
Host: sandbox.smtp.mailtrap.io
Port: 2525
Username: abc123def456
Password: xyz789uvw012
```

## Step 2: Add to .env.local

Add these lines to your `.env.local` file (replace with your actual credentials):

```bash
# Mailtrap SMTP Configuration (for testing)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_username_here
SMTP_PASS=your_password_here
EMAIL_FROM=noreply@coincaptrading.com
```

## Step 3: Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Step 4: Test It!

Register a new user - the email will be caught by Mailtrap:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","password":"test123"}'
```

Then check your Mailtrap inbox at: https://mailtrap.io/inboxes

## Alternative: Use the Setup Script

```bash
./setup-mailtrap.sh
```

This will prompt you for credentials and automatically update your `.env.local` file.

## Benefits of Mailtrap

✅ Catch ALL emails (no domain needed)
✅ Test with any email address
✅ See exactly how emails look
✅ Free unlimited emails in development
✅ No risk of accidentally sending test emails to real users

## Viewing Emails

All emails sent by your app will appear in your Mailtrap inbox at:
https://mailtrap.io/inboxes

You can see:
- Email content (HTML preview)
- Email headers
- Spam score
- HTML/text versions
- And more!
