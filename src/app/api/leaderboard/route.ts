export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const leaderboard = await db.select({
      id: users.id,
      name: users.name,
      image: users.image,
      rating: users.rating,
      totalGames: users.totalGames,
      wins: users.wins,
      losses: users.losses,
      draws: users.draws,
      tokenBalance: users.tokenBalance,
    })
    .from(users)
    .where(sql`${users.isBanned} = false`)
    .orderBy(desc(users.rating), desc(users.wins))
    .limit(100);

    const data = leaderboard.map((user, index) => ({
      rank: index + 1,
      ...user,
      winRate: user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
