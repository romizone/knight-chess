export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { settleGameResult } from '@/lib/token/service';
import { getPusher, CHANNELS, EVENTS } from '@/lib/pusher/server';

// POST /api/online/draw - Offer or respond to a draw
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json();
    const { gameId, action } = body; // action: 'offer' | 'accept' | 'decline'

    if (!gameId || !action) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
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
    const pusher = getPusher();

    if (action === 'offer') {
      // Send draw offer to opponent
      await pusher.trigger(CHANNELS.game(gameId), EVENTS.DRAW_OFFER, {
        offeredBy: playerColor,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, data: { action: 'offered' } });
    }

    if (action === 'accept') {
      // Accept draw
      await db.update(games)
        .set({
          status: 'completed',
          result: 'draw',
          endReason: 'draw_agreement',
          endedAt: new Date(),
        })
        .where(eq(games.id, gameId));

      // Settle results for both players
      await settleGameResult(sessionUser.id, gameId, 'draw');
      const opponentId = game.whitePlayerId === sessionUser.id ? game.blackPlayerId : game.whitePlayerId;
      if (opponentId) {
        await settleGameResult(opponentId, gameId, 'draw');
      }

      // Notify both players
      await pusher.trigger(CHANNELS.game(gameId), EVENTS.DRAW_RESPONSE, {
        accepted: true,
        result: 'draw',
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, data: { result: 'draw' } });
    }

    if (action === 'decline') {
      // Decline draw
      await pusher.trigger(CHANNELS.game(gameId), EVENTS.DRAW_RESPONSE, {
        accepted: false,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, data: { action: 'declined' } });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
