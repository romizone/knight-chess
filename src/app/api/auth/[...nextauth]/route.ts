export const dynamic = 'force-dynamic';

import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth/options';

// Lazy handler - getAuthOptions() is only called when a request comes in
function getHandler() {
  return NextAuth(getAuthOptions());
}

export async function GET(request: Request) {
  const handler = getHandler();
  return handler(request);
}

export async function POST(request: Request) {
  const handler = getHandler();
  return handler(request);
}
