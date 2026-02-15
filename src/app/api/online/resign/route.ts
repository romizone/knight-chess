export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { settleGameResult } from '@/lib/token/service';
import { getPusher, CHANNELS, EVENTS } from '@/lib/pusher/server';

// POST /api/online/resign - Resign from a PvP game
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json();
    const { gameId } = body;

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

    if (game.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Game is not active' }, { status: 400 });
    }

    const playerColor = game.whitePlayerId === sessionUser.id ? 'white' : 'black';
    const result = playerColor === 'white' ? 'black_wins' : 'white_wins';
    const winnerId = playerColor === 'white' ? game.blackPlayerId : game.whitePlayerId;

    // Update game
    await db.update(games)
      .set({
        status: 'completed',
        result,
        winnerId,
        endReason: 'resignation',
        endedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    // Settle results for both players
    await settleGameResult(sessionUser.id, gameId, 'lose');
    if (winnerId) {
      await settleGameResult(winnerId, gameId, 'win');
    }

    // Notify opponent via Pusher
    const pusher = getPusher();
    await pusher.trigger(CHANNELS.game(gameId), EVENTS.RESIGN, {
      resignedBy: playerColor,
      result,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: { result },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
