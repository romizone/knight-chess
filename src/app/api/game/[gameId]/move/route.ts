export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { moves, games } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    await requireAuth();
    const body = await request.json();

    await db.insert(moves).values({
      gameId: params.gameId,
      moveNumber: body.moveNumber,
      player: body.player,
      fromSquare: body.from,
      toSquare: body.to,
      piece: body.piece,
      captured: body.captured || null,
      promotion: body.promotion || null,
      isCheck: body.isCheck || false,
      isCheckmate: body.isCheckmate || false,
      isCastling: body.isCastling || null,
      isEnPassant: body.isEnPassant || false,
      notation: body.notation,
      timeSpentMs: body.timeSpentMs,
      timeRemainingMs: body.timeRemainingMs,
      boardState: body.boardState,
    });

    await db.update(games).set({
      moveCount: sql`${games.moveCount} + 1`,
      currentBoard: body.boardState,
    }).where(eq(games.id, params.gameId));

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
