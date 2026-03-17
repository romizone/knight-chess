import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { getDatabase } from '@/lib/db';
import { users, accounts, sessions, verificationTokens, tokenTransactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export function getAuthOptions(): NextAuthOptions {
  const db = getDatabase();

  const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ||
    !!process.env.VERCEL_URL;

  return {
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }) as NextAuthOptions['adapter'],
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            prompt: 'consent',
            access_type: 'offline',
            response_type: 'code',
          },
        },
      }),
    ],
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider === 'google' && user.email) {
          try {
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
          } catch (error) {
            console.error('[Auth] signIn callback error (non-fatal):', error);
            // Don't block login if bonus check fails
          }
        }
        return true;
      },

      async session({ session, user }) {
        if (session.user && user) {
          session.user.id = user.id;

          try {
            const dbUser = await db.query.users.findFirst({
              where: eq(users.id, user.id),
            });

            if (dbUser) {
              session.user.tokenBalance = dbUser.tokenBalance;
              session.user.rating = dbUser.rating;
              session.user.totalGames = dbUser.totalGames;
              session.user.wins = dbUser.wins;
            }
          } catch (error) {
            console.error('[Auth] session callback error:', error);
          }
        }
        return session;
      },
    },
    pages: {
      signIn: '/login',
      error: '/login',
    },
    session: {
      strategy: 'database',
    },
    cookies: {
      sessionToken: {
        name: useSecureCookies
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: useSecureCookies,
        },
      },
      callbackUrl: {
        name: useSecureCookies
          ? '__Secure-next-auth.callback-url'
          : 'next-auth.callback-url',
        options: {
          sameSite: 'lax',
          path: '/',
          secure: useSecureCookies,
        },
      },
      csrfToken: {
        name: useSecureCookies
          ? '__Host-next-auth.csrf-token'
          : 'next-auth.csrf-token',
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: useSecureCookies,
        },
      },
      pkceCodeVerifier: {
        name: useSecureCookies
          ? '__Secure-next-auth.pkce.code_verifier'
          : 'next-auth.pkce.code_verifier',
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 900,
          secure: useSecureCookies,
        },
      },
      state: {
        name: useSecureCookies
          ? '__Secure-next-auth.state'
          : 'next-auth.state',
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 900,
          secure: useSecureCookies,
        },
      },
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
