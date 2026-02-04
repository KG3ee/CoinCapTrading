import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_API_URL}/verify-email?token=${token}`;

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev', // Resend test domain - works without verification
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
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}
