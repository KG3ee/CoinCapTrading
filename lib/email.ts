import { Resend } from 'resend';

// Check if API key is configured
if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY is not configured. Email functionality will not work.');
}

// Only initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Use custom email sender if configured, otherwise use Resend test domain
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_API_URL}/verify-email?token=${token}`;

  try {
    if (!process.env.RESEND_API_KEY || !resend) {
      console.error('RESEND_API_KEY is not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const response = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Verify your CoinCapTrading email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Welcome to CoinCapTrading!</h2>
          <p>Thank you for creating an account. Please verify your email to get started.</p>
          <p style="margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Verify Email
            </a>
          </p>
          <p style="color: #666;">Or copy this link: <code style="background: #f0f0f0; padding: 5px 10px;">${verificationUrl}</code></p>
          <p style="color: #999; font-size: 12px;">This link expires in 24 hours.</p>
        </div>
      `,
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_API_URL}/reset-password?token=${token}`;

  try {
    if (!process.env.RESEND_API_KEY || !resend) {
      console.error('RESEND_API_KEY is not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const response = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Reset your CoinCapTrading password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below to set a new password.</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </p>
          <p style="color: #666;">Or copy this link: <code style="background: #f0f0f0; padding: 5px 10px;">${resetUrl}</code></p>
          <p style="color: #999; font-size: 12px;">This link expires in 1 hour.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}
