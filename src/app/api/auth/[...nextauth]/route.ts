export const dynamic = 'force-dynamic';

import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth/options';

// NextAuth v4 with App Router expects the handler to receive (req, context)
// where context = { params: { nextauth: string[] } }.
// It uses context.params to detect App Router and to extract the auth action.
const handler = NextAuth(getAuthOptions());

export { handler as GET, handler as POST };
