export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { moves, games } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const [game] = await db.select().from(games).where(eq(games.id, params.gameId));
    if (!game) {
      return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 });
    }

    const gameMoves = await db.select()
      .from(moves)
      .where(eq(moves.gameId, params.gameId))
      .orderBy(asc(moves.moveNumber));

    return NextResponse.json({
      success: true,
      data: {
        game: {
          id: game.id,
          difficulty: game.difficulty,
          result: game.result,
          endReason: game.endReason,
          initialBoard: game.initialBoard,
          whiteKnightPositions: JSON.parse(game.whiteKnightPositions),
          blackKnightPositions: JSON.parse(game.blackKnightPositions),
          createdAt: game.createdAt,
        },
        moves: gameMoves,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
