export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users, accounts, sessions } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  const checks: Record<string, unknown> = {};

  // Check env vars (existence only, not values)
  checks.env = {
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '(not set)',
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL,
  };

  const db = getDatabase();

  // Check database connection
  try {
    await db.execute(sql`SELECT 1 as ok`);
    checks.database = { connected: true };
  } catch (error) {
    checks.database = { connected: false, error: String(error) };
  }

  // Check if users table exists and is accessible
  try {
    const rows = await db.select({ count: sql<number>`count(*)` }).from(users);
    checks.usersTable = { accessible: true, count: rows[0]?.count };
  } catch (error) {
    checks.usersTable = { accessible: false, error: String(error) };
  }

  // Check if accounts table exists
  try {
    const rows = await db.select({ count: sql<number>`count(*)` }).from(accounts);
    checks.accountsTable = { accessible: true, count: rows[0]?.count };
  } catch (error) {
    checks.accountsTable = { accessible: false, error: String(error) };
  }

  // Check if sessions table exists
  try {
    const rows = await db.select({ count: sql<number>`count(*)` }).from(sessions);
    checks.sessionsTable = { accessible: true, count: rows[0]?.count };
  } catch (error) {
    checks.sessionsTable = { accessible: false, error: String(error) };
  }

  return NextResponse.json(checks, { status: 200 });
}
