export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { games } from '@/lib/db/schema';
import { settleGameResult } from '@/lib/token/service';
import { eq } from 'drizzle-orm';

export async function POST(
  _request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const sessionUser = await requireAuth();

    const [game] = await db.select().from(games).where(eq(games.id, params.gameId));
    if (!game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }

    const isWhite = game.whitePlayerId === sessionUser.id;
    const result = isWhite ? 'black_wins' : 'white_wins';

    const newBalance = await settleGameResult(sessionUser.id, params.gameId, 'lose');

    await db.update(games).set({
      status: 'completed',
      result,
      endReason: 'resignation',
      stakesSettled: true,
      endedAt: new Date(),
    }).where(eq(games.id, params.gameId));

    return NextResponse.json({
      success: true,
      data: { result, newBalance, tokensWon: 0 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
