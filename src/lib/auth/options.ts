import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { getDatabase } from '@/lib/db';
import { users, tokenTransactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export function getAuthOptions(): NextAuthOptions {
  const db = getDatabase();

  return {
    adapter: DrizzleAdapter(db) as NextAuthOptions['adapter'],
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ],
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider === 'google' && user.email) {
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, user.email),
          });

          if (existingUser && existingUser.tokenBalance === 1000 && existingUser.totalGames === 0) {
            const hasBonusTx = await db.query.tokenTransactions.findFirst({
              where: eq(tokenTransactions.userId, existingUser.id),
            });

            if (!hasBonusTx) {
              await db.insert(tokenTransactions).values({
                userId: existingUser.id,
                type: 'signup_bonus',
                amount: 1000,
                balanceBefore: 0,
                balanceAfter: 1000,
                description: 'Welcome bonus - 1000 tokens',
              });
            }
          }
        }
        return true;
      },

      async session({ session, user }) {
        if (session.user && user) {
          session.user.id = user.id;

          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, user.id),
          });

          if (dbUser) {
            session.user.tokenBalance = dbUser.tokenBalance;
            session.user.rating = dbUser.rating;
            session.user.totalGames = dbUser.totalGames;
            session.user.wins = dbUser.wins;
          }
        }
        return session;
      },
    },
    pages: {
      signIn: '/login',
    },
    session: {
      strategy: 'database',
    },
  };
}

// Backward compat - lazy
let _authOptions: NextAuthOptions | null = null;
export const authOptions: NextAuthOptions = new Proxy({} as NextAuthOptions, {
  get(_target, prop) {
    if (!_authOptions) {
      _authOptions = getAuthOptions();
    }
    const value = Reflect.get(_authOptions, prop, _authOptions);
    if (typeof value === 'function') {
      return value.bind(_authOptions);
    }
    return value;
  },
});
