export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { games, moves } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getPusher, CHANNELS, EVENTS } from '@/lib/pusher/server';

// POST /api/online/move - Send a move in a PvP game
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json();
    const {
      gameId,
      moveNumber,
      from,
      to,
      piece,
      captured,
      promotion,
      notation,
      isCheck,
      isCheckmate,
      isStalemate,
      isDraw,
      isCastling,
      isEnPassant,
      boardState,
      turn,
      whiteTimeRemaining,
      blackTimeRemaining,
      timeSpentMs,
    } = body;

    if (!gameId || !from || !to || !piece || !notation) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is in the game
    const [game] = await db.select().from(games).where(eq(games.id, gameId));
    if (!game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }

    if (game.whitePlayerId !== sessionUser.id && game.blackPlayerId !== sessionUser.id) {
      return NextResponse.json({ success: false, error: 'Not a player in this game' }, { status: 403 });
    }

    if (game.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Game is not active' }, { status: 400 });
    }

    const playerColor = game.whitePlayerId === sessionUser.id ? 'white' : 'black';

    // Record move in database
    await db.insert(moves).values({
      gameId,
      moveNumber: moveNumber || (game.moveCount || 0) + 1,
      player: playerColor,
      fromSquare: from,
      toSquare: to,
      piece,
      captured: captured || null,
      promotion: promotion || null,
      isCheck: isCheck || false,
      isCheckmate: isCheckmate || false,
      isCastling: isCastling || null,
      isEnPassant: isEnPassant || false,
      notation,
      timeSpentMs: timeSpentMs || null,
      timeRemainingMs: playerColor === 'white' ? whiteTimeRemaining : blackTimeRemaining,
      boardState: boardState || {},
    });

    // Update game state
    await db.update(games)
      .set({
        currentBoard: boardState,
        moveCount: (game.moveCount || 0) + 1,
        whiteTimeRemaining: whiteTimeRemaining,
        blackTimeRemaining: blackTimeRemaining,
      })
      .where(eq(games.id, gameId));

    // Broadcast move to opponent via Pusher
    const pusher = getPusher();
    await pusher.trigger(CHANNELS.game(gameId), EVENTS.MOVE, {
      moveNumber: moveNumber || (game.moveCount || 0) + 1,
      from,
      to,
      piece,
      captured,
      promotion,
      notation,
      isCheck,
      isCheckmate,
      isStalemate,
      isDraw,
      isCastling,
      isEnPassant,
      boardState,
      turn,
      whiteTimeRemaining,
      blackTimeRemaining,
      timestamp: new Date().toISOString(),
      playerId: sessionUser.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
