import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Check if using Mailtrap (SMTP) or Resend
const useMailtrap = !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);

// Initialize Resend if API key is available and not using Mailtrap
const resend = !useMailtrap && process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize Nodemailer transport for Mailtrap
const transporter = useMailtrap
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '2525'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

// Use custom email sender if configured
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@coincaptrading.com';

// Log configuration on startup
if (useMailtrap) {
  console.log('✅ Email configured with Mailtrap SMTP');
} else if (resend) {
  console.log('✅ Email configured with Resend');
} else {
  console.warn('⚠️ Email service not configured. Emails will not be sent.');
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_API_URL}/verify-email?token=${token}`;

  const htmlContent = `
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
  `;

  try {
    // Use Mailtrap SMTP if configured
    if (useMailtrap && transporter) {
      const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: 'Verify your CoinCapTrading email',
        html: htmlContent,
      });
      console.log('📧 Verification email sent via Mailtrap:', info.messageId);
      return { success: true, data: info };
    }

    // Fall back to Resend
    if (resend) {
      const response = await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: 'Verify your CoinCapTrading email',
        html: htmlContent,
      });
      console.log('📧 Verification email sent via Resend');
      return { success: true, data: response };
    }

    console.error('No email service configured');
    return { success: false, error: 'Email service not configured' };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_API_URL}/reset-password?token=${token}`;

  const htmlContent = `
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
  `;

  try {
    // Use Mailtrap SMTP if configured
    if (useMailtrap && transporter) {
      const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: 'Reset your CoinCapTrading password',
        html: htmlContent,
      });
      console.log('📧 Password reset email sent via Mailtrap:', info.messageId);
      return { success: true, data: info };
    }

    // Fall back to Resend
    if (resend) {
      const response = await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: 'Reset your CoinCapTrading password',
        html: htmlContent,
      });
      console.log('📧 Password reset email sent via Resend');
      return { success: true, data: response };
    }

    console.error('No email service configured');
    return { success: false, error: 'Email service not configured' };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}
