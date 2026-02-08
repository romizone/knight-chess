export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { games, users } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Use raw SQL for enum comparisons (Drizzle eq() with Neon HTTP has issues with enums)
    const whereClause = sql`${games.difficulty} = 'difficult' AND ${games.result} = 'white_wins' AND ${games.status} = 'completed' AND ${users.isBanned} = false`;

    // Query games where difficulty = 'difficult' and result = 'white_wins' (player always plays white vs computer)
    const wins = await db
      .select({
        gameId: games.id,
        playerId: games.whitePlayerId,
        playerName: users.name,
        playerImage: users.image,
        playerRating: users.rating,
        endReason: games.endReason,
        moveCount: games.moveCount,
        endedAt: games.endedAt,
        createdAt: games.createdAt,
      })
      .from(games)
      .innerJoin(users, eq(games.whitePlayerId, users.id))
      .where(whereClause)
      .orderBy(desc(games.endedAt))
      .limit(100);

    // Also get summary stats
    const [stats] = await db
      .select({
        totalWins: sql<number>`count(*)::int`,
        uniquePlayers: sql<number>`count(distinct ${games.whitePlayerId})::int`,
      })
      .from(games)
      .innerJoin(users, eq(games.whitePlayerId, users.id))
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: {
        wins,
        stats: stats || { totalWins: 0, uniquePlayers: 0 },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
