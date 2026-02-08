import { getServerSession } from 'next-auth';
import { getAuthOptions } from './options';

export async function getAuthSession() {
  return getServerSession(getAuthOptions());
}

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
  return session.user;
}
