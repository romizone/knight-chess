export const dynamic = 'force-dynamic';

import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth/options';

// Lazy handler creation - ensures env vars are available at request time
let _handler: ReturnType<typeof NextAuth> | null = null;
function getHandler() {
  if (!_handler) {
    const options = getAuthOptions();
    // Enable debug in non-production or when explicitly set
    options.debug = process.env.NEXTAUTH_DEBUG === 'true';
    _handler = NextAuth(options);
  }
  return _handler;
}

// App Router passes (req, context) automatically when we export like this
export async function GET(...args: Parameters<ReturnType<typeof NextAuth>>) {
  try {
    return await getHandler()(...args);
  } catch (error) {
    console.error('[NextAuth] GET handler error:', error);
    throw error;
  }
}

export async function POST(...args: Parameters<ReturnType<typeof NextAuth>>) {
  try {
    return await getHandler()(...args);
  } catch (error) {
    console.error('[NextAuth] POST handler error:', error);
    throw error;
  }
}
