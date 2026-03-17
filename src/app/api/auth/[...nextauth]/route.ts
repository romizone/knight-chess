export const dynamic = 'force-dynamic';

import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth/options';

// Lazy handler creation - ensures env vars are available at request time, not build time
let _handler: ReturnType<typeof NextAuth> | null = null;
function getHandler() {
  if (!_handler) {
    _handler = NextAuth(getAuthOptions());
  }
  return _handler;
}

export async function GET(...args: Parameters<ReturnType<typeof NextAuth>>) {
  return getHandler()(...args);
}

export async function POST(...args: Parameters<ReturnType<typeof NextAuth>>) {
  return getHandler()(...args);
}
