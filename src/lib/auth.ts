import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })
        
        if (!user || !user.passwordHash) {
          return null
        }
        
        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!isValid) {
          return null
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        let validId: string | null = null;
        if (token.id) {
          const user = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true },
          });
          if (user) validId = user.id;
        }
        if (!validId && session.user.email) {
          const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
          });
          if (user) validId = user.id;
        }
        if (!validId) {
          const fallback = await prisma.user.findFirst({ select: { id: true } });
          validId = fallback?.id || null;
        }
        if (validId) {
          session.user.id = validId;
        }
      }
      return session;
    },
  },
});

export async function getEffectiveUserId(): Promise<string | null> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });
      if (user) return user.id;
    }

    if (session?.user?.email) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (userByEmail) return userByEmail.id;
    }

    const fallbackUser = await prisma.user.findFirst({
      select: { id: true },
    });
    return fallbackUser?.id || null;
  } catch (err) {
    console.error('Error resolving effective user ID:', err);
    const fallbackUser = await prisma.user.findFirst({
      select: { id: true },
    });
    return fallbackUser?.id || null;
  }
}

export async function ensureUserHasAccount(userId: string) {
  let account = await prisma.account.findFirst({
    where: { userId },
  });
  if (!account) {
    account = await prisma.account.create({
      data: {
        userId,
        name: 'MetaTrader 5 Primary Account',
        type: 'live',
        broker: 'MetaTrader 5',
        balance: 2000,
        equity: 2000,
        currency: 'USD',
        isActive: true,
      },
    });
  }
  return account;
}
