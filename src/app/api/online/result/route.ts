export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { settleGameResult } from '@/lib/token/service';
// Pusher not needed for result - moves already broadcast

// POST /api/online/result - End a PvP game (checkmate, timeout, stalemate, etc.)
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json();
    const { gameId, result, endReason } = body;

    if (!gameId || !result || !endReason) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const [game] = await db.select().from(games).where(eq(games.id, gameId));
    if (!game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }

    if (game.whitePlayerId !== sessionUser.id && game.blackPlayerId !== sessionUser.id) {
      return NextResponse.json({ success: false, error: 'Not a player in this game' }, { status: 403 });
    }

    // Prevent double settlement
    if (game.status === 'completed') {
      return NextResponse.json({ success: true, data: { alreadySettled: true } });
    }

    // Determine winner
    let winnerId = null;
    if (result === 'white_wins') winnerId = game.whitePlayerId;
    if (result === 'black_wins') winnerId = game.blackPlayerId;

    // Update game
    await db.update(games)
      .set({
        status: 'completed',
        result,
        winnerId,
        endReason,
        endedAt: new Date(),
        finalBoard: game.currentBoard,
      })
      .where(eq(games.id, gameId));

    // Settle results for both players
    const playerColor = game.whitePlayerId === sessionUser.id ? 'white' : 'black';
    const opponentId = playerColor === 'white' ? game.blackPlayerId : game.whitePlayerId;

    let playerResult: 'win' | 'lose' | 'draw' = 'draw';
    let opponentResult: 'win' | 'lose' | 'draw' = 'draw';

    if (result === 'draw') {
      playerResult = 'draw';
      opponentResult = 'draw';
    } else if (
      (result === 'white_wins' && playerColor === 'white') ||
      (result === 'black_wins' && playerColor === 'black')
    ) {
      playerResult = 'win';
      opponentResult = 'lose';
    } else {
      playerResult = 'lose';
      opponentResult = 'win';
    }

    await settleGameResult(sessionUser.id, gameId, playerResult);
    if (opponentId) {
      await settleGameResult(opponentId, gameId, opponentResult);
    }

    return NextResponse.json({ success: true, data: { result } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
