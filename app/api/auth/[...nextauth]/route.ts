import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export const { handlers, auth } = NextAuth(authConfig);

export { handlers as GET, handlers as POST };
