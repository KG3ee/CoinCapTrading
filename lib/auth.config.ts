import { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import speakeasy from 'speakeasy';
import { connectDB } from './mongodb';
import User from './models/User';
import { checkStrictRateLimit } from './middleware/rateLimit';
import { consumeBackupCode } from './utils/twoFactor';
import { applyDefaultNewUserTradeOverride } from './utils/tradeDefaults';

// Only include Google provider if credentials are configured
const providers: NextAuthConfig['providers'] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
} else {
  console.warn('[NextAuth] Google OAuth disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set');
}

providers.push(
  Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        token: { label: 'Two-factor code', type: 'text' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const identifier =
          request?.headers?.get('x-forwarded-for') ||
          request?.headers?.get('x-real-ip') ||
          credentials.email ||
          'anonymous';

        const rateLimit = await checkStrictRateLimit(`login:${identifier}`, 5, '15 m');
        if (!rateLimit.success) {
          throw new Error('RATE_LIMITED');
        }

        await connectDB();
        const user = await User.findOne({ email: credentials.email }).select(
          '+password +twoFactorSecret +twoFactorBackupCodes'
        );

        if (!user) {
          return null;
        }

        if (user.accountStatus === 'banned') {
          throw new Error('ACCOUNT_BANNED');
        }

        // Check if email is verified
        if (!user.isVerified) {
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        const isPasswordValid = await user.matchPassword(
          credentials.password as string
        );

        if (!isPasswordValid) {
          return null;
        }

        if (user.isTwoFactorEnabled) {
          const twoFactorToken = (credentials as Record<string, string | undefined>)?.token?.trim();

          if (!twoFactorToken) {
            throw new Error('TWO_FACTOR_REQUIRED');
          }

          if (!user.twoFactorSecret) {
            throw new Error('INVALID_2FA');
          }

          const isValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: twoFactorToken,
            window: 2,
          });

          if (!isValid) {
            const { matched, nextCodes } = consumeBackupCode(
              user.twoFactorBackupCodes,
              twoFactorToken
            );

            if (!matched) {
              throw new Error('INVALID_2FA');
            }

            user.twoFactorBackupCodes = nextCodes;
            await user.save();
          }
        }

        user.lastActiveAt = new Date();
        await user.save();

        return {
          id: user._id.toString(),
          name: user.fullName,
          email: user.email,
          image: null,
        };
      },
    }),
);

export const authConfig = {
  providers,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth sign in
      if (account?.provider === 'google') {
        await connectDB();

        let dbUser = await User.findOne({ email: user.email });

        if (!dbUser) {
          // Create new user from Google OAuth
          dbUser = await User.create({
            fullName: user.name || user.email,
            email: user.email,
            googleId: user.id,
            isVerified: true, // Auto-verify Google users
            password: Math.random().toString(36), // Random password for OAuth users
            lastActiveAt: new Date(),
          });
          await applyDefaultNewUserTradeOverride(dbUser._id.toString());
        } else if (dbUser.accountStatus === 'banned') {
          return false;
        } else if (!dbUser.googleId) {
          // Link existing email account to Google
          dbUser.googleId = user.id;
          dbUser.isVerified = true;
          dbUser.lastActiveAt = new Date();
          await dbUser.save();
        } else {
          dbUser.lastActiveAt = new Date();
          await dbUser.save();
        }

        user.id = dbUser._id.toString();
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig;
