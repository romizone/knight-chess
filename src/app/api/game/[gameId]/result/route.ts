export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { games } from '@/lib/db/schema';
import { settleGameResult } from '@/lib/token/service';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json();
    const { result, endReason } = body;

    // Validate
    if (!['white_wins', 'black_wins', 'draw'].includes(result)) {
      return NextResponse.json({ success: false, error: 'Invalid result' }, { status: 400 });
    }

    // Get game
    const [game] = await db.select().from(games).where(eq(games.id, params.gameId));
    if (!game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }

    if (game.stakesSettled) {
      return NextResponse.json({ success: false, error: 'Already settled' }, { status: 400 });
    }

    // Determine player result
    const isWhite = game.whitePlayerId === sessionUser.id;
    const isBlack = game.blackPlayerId === sessionUser.id;

    let playerResult: 'win' | 'draw' | 'lose';
    if (result === 'draw') {
      playerResult = 'draw';
    } else if ((result === 'white_wins' && isWhite) || (result === 'black_wins' && isBlack)) {
      playerResult = 'win';
    } else {
      playerResult = 'lose';
    }

    // Settle tokens
    const newBalance = await settleGameResult(sessionUser.id, params.gameId, playerResult);

    // Update game record
    await db.update(games).set({
      status: 'completed',
      result,
      endReason,
      stakesSettled: true,
      endedAt: new Date(),
    }).where(eq(games.id, params.gameId));

    return NextResponse.json({
      success: true,
      data: {
        result: playerResult,
        newBalance,
        tokensWon: playerResult === 'win' ? 2 : playerResult === 'draw' ? 1 : 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
