# Email Setup Guide

This guide explains how to set up and test the email functionality for account verification and password reset.

## Overview

The app uses [Resend](https://resend.com) for sending transactional emails. Resend offers:
- ✅ Free tier: 100 emails/day, 3,000 emails/month
- ✅ Built-in test domain (`onboarding@resend.dev`) - works immediately
- ✅ Custom domain support
- ✅ Email analytics and logs

## Quick Start (Test Mode)

### 1. Get Your Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Navigate to **API Keys** in your dashboard
3. Click **Create API Key**
4. Copy your API key (starts with `re_`)

### 2. Configure Environment Variables

Add to your `.env.local`:

```bash
# Email Configuration (Resend)
RESEND_API_KEY=re_your_api_key_here

# Public URL for email links
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Test Email Sending

The app is already configured to use Resend's test domain (`onboarding@resend.dev`) which works without domain verification.

**Test the flow:**

1. Start your app: `npm run dev`
2. Register a new account
3. Check the Resend dashboard for sent emails
4. Click the verification link (or copy from dashboard if email doesn't arrive)

## Production Setup (Custom Domain)

### 1. Add Your Domain to Resend

1. Go to **Domains** in your Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow DNS verification steps

### 2. Update Email Configuration

In `lib/email.ts`, change the `from` address:

```typescript
// Development (test domain)
from: 'onboarding@resend.dev',

// Production (your verified domain)
from: 'noreply@yourdomain.com',
```

Or use environment variable:

```bash
EMAIL_FROM=noreply@yourdomain.com
```

Then update `lib/email.ts`:

```typescript
from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
```

### 3. Update Public URL

In production, set the public URL in `.env.local` or your hosting platform:

```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

## Email Features

### 1. Email Verification (Registration)

**Flow:**
1. User registers → Verification email sent automatically
2. User clicks link → Account verified → Redirected to login
3. If link expires → User can request a new verification email

**Endpoint:** `POST /api/auth/resend-verification`
```json
{
  "email": "user@example.com"
}
```

**Token expires:** 24 hours

### 2. Password Reset

**Flow:**
1. User requests reset → Reset email sent
2. User clicks link → Sets new password
3. User redirected to login with new password

**Endpoint:** `POST /api/auth/forgot-password`
```json
{
  "email": "user@example.com"
}
```

**Token expires:** 1 hour

## Security Features

### ✅ Token Hashing
- All tokens are hashed (SHA-256) before storing in database
- Plain tokens are sent via email
- Prevents token theft if database is compromised

### ✅ Rate Limiting
- Registration: 3 attempts per hour per IP
- Forgot password: 3 attempts per hour per IP
- Resend verification: 3 attempts per hour per IP
- Reset password: 5 attempts per hour per IP

### ✅ Token Expiration
- Verification tokens: 24 hours
- Reset tokens: 1 hour
- Expired tokens are automatically rejected

### ✅ Privacy Protection
- Forgot password never reveals if email exists
- Always returns success message to prevent email enumeration

## Testing Without Email

If you don't want to set up email yet, you can:

1. **Check MongoDB directly:**
   - View `verificationToken` and `resetToken` in user documents
   - Copy the hashed token (won't work - need the plain token)

2. **Manually verify users:**
   ```javascript
   // In MongoDB or API endpoint
   user.isVerified = true;
   user.verificationToken = null;
   user.verificationTokenExpires = null;
   await user.save();
   ```

3. **Skip verification (dev only):**
   - In `lib/models/User.ts`, change default:
   ```typescript
   isVerified: { type: Boolean, default: true }
   ```

## Troubleshooting

### Email Not Sending

**Check these:**

1. ✅ `RESEND_API_KEY` is set in `.env.local`
2. ✅ API key is valid (starts with `re_`)
3. ✅ Check Resend dashboard → Logs for errors
4. ✅ Check server console for error messages

**Common errors:**

- `Email service not configured` → API key not set
- `Invalid API key` → Check key format and validity
- `Domain not verified` → Use test domain or verify your domain

### Verification Link Not Working

1. ✅ Check token hasn't expired
2. ✅ Verify `NEXT_PUBLIC_API_URL` is correct
3. ✅ Check browser console for errors
4. ✅ Try resending verification email

### Rate Limit Errors

- **Error:** `Too many requests`
- **Solution:** Wait 1 hour or disable rate limiting in development:
  ```bash
  RATE_LIMIT_ENABLED=false
  ```

## Email Templates

### Verification Email

- **Subject:** "Verify your CoinCapTrading email"
- **Button:** "Verify Email"
- **Expiration:** 24 hours
- **Link format:** `{NEXT_PUBLIC_API_URL}/verify-email?token={token}`

### Password Reset Email

- **Subject:** "Reset your CoinCapTrading password"
- **Button:** "Reset Password"
- **Expiration:** 1 hour
- **Link format:** `{NEXT_PUBLIC_API_URL}/reset-password?token={token}`

## Custom Email Templates

To customize email templates, edit `lib/email.ts`:

```typescript
export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_API_URL}/verify-email?token=${token}`;

  const response = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to: email,
    subject: 'Your Custom Subject',
    html: `
      <!-- Your custom HTML template -->
      <div style="...">
        <h1>Welcome!</h1>
        <a href="${verificationUrl}">Verify Email</a>
      </div>
    `,
  });
}
```

## API Endpoints Summary

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/api/auth/register` | POST | Create account + send verification | 3/hour |
| `/api/auth/verify-email` | POST | Verify email with token | None |
| `/api/auth/resend-verification` | POST | Resend verification email | 3/hour |
| `/api/auth/forgot-password` | POST | Request password reset | 3/hour |
| `/api/auth/reset-password` | POST | Reset password with token | 5/hour |

## Monitoring

### Resend Dashboard

Monitor your emails at [resend.com/emails](https://resend.com/emails):

- ✅ Delivery status
- ✅ Open rates
- ✅ Click rates
- ✅ Bounce rates
- ✅ Error logs

### Application Logs

Check server logs for email-related activity:

```bash
# Success
[RegisterRoute] User registered successfully { userId: '...', email: '...' }
[ResendVerificationRoute] Verification email resent successfully { email: '...' }

# Warnings
[RegisterRoute] Failed to send verification email { email: '...', error: '...' }
```

## Next Steps

1. ✅ Set up Resend account and API key
2. ✅ Test registration flow
3. ✅ Test password reset flow
4. ✅ Test resend verification
5. ✅ Verify email links work correctly
6. ✅ Configure custom domain (production)
7. ✅ Customize email templates (optional)

## Support

- **Resend Docs:** [resend.com/docs](https://resend.com/docs)
- **Rate Limiting:** See `IMPROVEMENTS.md`
- **Security:** See `IMPROVEMENTS.md`

---

**Note:** Email functionality is optional for development. The app works fine without it, but users won't be able to verify their accounts or reset passwords.
