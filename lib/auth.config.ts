import { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { connectDB } from './mongodb';
import User from './models/User';

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectDB();
        const user = await User.findOne({ email: credentials.email }).select(
          '+password'
        );

        if (!user) {
          return null;
        }

        // Check if email is verified
        if (!user.isVerified) {
          throw new Error('Please verify your email first');
        }

        const isPasswordValid = await user.matchPassword(
          credentials.password as string
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.fullName,
          email: user.email,
          image: null,
        };
      },
    }),
  ],
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
          });
        } else if (!dbUser.googleId) {
          // Link existing email account to Google
          dbUser.googleId = user.id;
          dbUser.isVerified = true;
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
} satisfies NextAuthConfig;
