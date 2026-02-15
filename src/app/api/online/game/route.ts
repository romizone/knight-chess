export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { games, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/online/game?gameId=xxx - Get online game data
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const gameId = request.nextUrl.searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json({ success: false, error: 'Missing gameId' }, { status: 400 });
    }

    const [game] = await db.select().from(games).where(eq(games.id, gameId));
    if (!game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }

    if (game.whitePlayerId !== sessionUser.id && game.blackPlayerId !== sessionUser.id) {
      return NextResponse.json({ success: false, error: 'Not a player in this game' }, { status: 403 });
    }

    const playerColor = game.whitePlayerId === sessionUser.id ? 'white' : 'black';
    const opponentId = playerColor === 'white' ? game.blackPlayerId : game.whitePlayerId;

    let opponent = null;
    if (opponentId) {
      const [opp] = await db.select({
        id: users.id,
        name: users.name,
        image: users.image,
        rating: users.rating,
      }).from(users).where(eq(users.id, opponentId));

      if (opp) {
        opponent = {
          id: opp.id,
          name: opp.name,
          avatarUrl: opp.image,
          rating: opp.rating,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        gameId: game.id,
        board: game.initialBoard,
        currentBoard: game.currentBoard,
        whiteKnightPositions: JSON.parse(game.whiteKnightPositions),
        blackKnightPositions: JSON.parse(game.blackKnightPositions),
        playerColor,
        opponent,
        status: game.status,
        result: game.result,
        moveCount: game.moveCount,
        whiteTimeRemaining: game.whiteTimeRemaining,
        blackTimeRemaining: game.blackTimeRemaining,
        timeControl: {
          base: game.timeControlBase,
          increment: game.timeControlIncrement,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
