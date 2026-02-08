export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { games } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deductGameStake } from '@/lib/token/service';
import { createInitialBoard, getRandomKnightPositions } from '@/lib/chess/board';
import { TIME_CONTROLS } from '@/lib/chess/constants';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    const body = await request.json();
    const { difficulty = 'medium', playerColor = 'white' } = body;

    // Validate difficulty
    if (!['easy', 'medium', 'difficult'].includes(difficulty)) {
      return NextResponse.json({ success: false, error: 'Invalid difficulty' }, { status: 400 });
    }

    // Generate knight positions
    const whiteKnightPositions = getRandomKnightPositions();
    const blackKnightPositions = getRandomKnightPositions();
    const initialBoard = createInitialBoard(whiteKnightPositions, blackKnightPositions);
    const timeControl = TIME_CONTROLS[difficulty];

    // Create game record
    const [game] = await db.insert(games).values({
      whitePlayerId: playerColor === 'white' ? sessionUser.id : null,
      blackPlayerId: playerColor === 'black' ? sessionUser.id : null,
      gameType: 'vs_computer',
      difficulty,
      timeControlBase: timeControl.base,
      timeControlIncrement: timeControl.increment,
      stakeAmount: 1,
      stakesCollected: true,
      status: 'active',
      initialBoard: initialBoard,
      currentBoard: initialBoard,
      whiteKnightPositions: JSON.stringify(whiteKnightPositions),
      blackKnightPositions: JSON.stringify(blackKnightPositions),
      whiteTimeRemaining: timeControl.base * 1000,
      blackTimeRemaining: timeControl.base * 1000,
      startedAt: new Date(),
    }).returning();

    // Deduct token stake
    const stakeDeducted = await deductGameStake(sessionUser.id, game.id);
    if (!stakeDeducted) {
      // Rollback game creation
      await db.delete(games).where(eq(games.id, game.id));
      return NextResponse.json({ success: false, error: 'Insufficient tokens' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        gameId: game.id,
        board: initialBoard,
        whiteKnightPositions,
        blackKnightPositions,
        timeControl: { base: timeControl.base, increment: timeControl.increment },
        difficulty,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
