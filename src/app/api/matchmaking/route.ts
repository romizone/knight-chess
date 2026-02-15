export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { matchmakingQueue, games, users } from '@/lib/db/schema';
import { eq, and, ne, lte, gte } from 'drizzle-orm';
import { deductGameStake } from '@/lib/token/service';
import { createInitialBoard, getRandomKnightPositions } from '@/lib/chess/board';
import { TIME_CONTROLS } from '@/lib/chess/constants';
import { getPusher, CHANNELS, EVENTS } from '@/lib/pusher/server';

// POST /api/matchmaking - Join the matchmaking queue
export async function POST() {
  try {
    const sessionUser = await requireAuth();

    // Check if user has enough tokens
    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id));
    if (!user || user.tokenBalance < 1) {
      return NextResponse.json({ success: false, error: 'Insufficient tokens' }, { status: 400 });
    }

    // Check if user is already in queue
    const existingEntry = await db.select()
      .from(matchmakingQueue)
      .where(
        and(
          eq(matchmakingQueue.userId, sessionUser.id),
          eq(matchmakingQueue.status, 'waiting')
        )
      );

    if (existingEntry.length > 0) {
      return NextResponse.json({
        success: true,
        data: { status: 'searching', queueId: existingEntry[0].id },
      });
    }

    // Clean up expired entries (older than 5 minutes)
    await db.update(matchmakingQueue)
      .set({ status: 'expired' })
      .where(
        and(
          eq(matchmakingQueue.status, 'waiting'),
          lte(matchmakingQueue.expiresAt, new Date())
        )
      );

    // Look for a match (find someone already waiting, within 400 rating range)
    const ratingRange = 400;
    const opponents = await db.select({
      queueId: matchmakingQueue.id,
      opponentId: matchmakingQueue.userId,
      opponentRating: matchmakingQueue.rating,
      opponentName: users.name,
      opponentImage: users.image,
    })
      .from(matchmakingQueue)
      .innerJoin(users, eq(matchmakingQueue.userId, users.id))
      .where(
        and(
          eq(matchmakingQueue.status, 'waiting'),
          ne(matchmakingQueue.userId, sessionUser.id),
          gte(matchmakingQueue.rating, user.rating - ratingRange),
          lte(matchmakingQueue.rating, user.rating + ratingRange)
        )
      )
      .limit(1);

    if (opponents.length > 0) {
      // Match found! Create a PvP game
      const opponent = opponents[0];

      // Randomly assign colors
      const isWhite = Math.random() < 0.5;
      const whitePlayerId = isWhite ? sessionUser.id : opponent.opponentId;
      const blackPlayerId = isWhite ? opponent.opponentId : sessionUser.id;

      // Generate board
      const whiteKnightPositions = getRandomKnightPositions();
      const blackKnightPositions = getRandomKnightPositions();
      const initialBoard = createInitialBoard(whiteKnightPositions, blackKnightPositions);
      const timeControl = TIME_CONTROLS.medium; // PvP uses medium time control

      // Create game
      const [game] = await db.insert(games).values({
        whitePlayerId,
        blackPlayerId,
        gameType: 'pvp',
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

      // Deduct stakes from both players
      await deductGameStake(sessionUser.id, game.id);
      await deductGameStake(opponent.opponentId, game.id);

      // Update opponent's queue entry
      await db.update(matchmakingQueue)
        .set({ status: 'matched', gameId: game.id, matchedAt: new Date() })
        .where(eq(matchmakingQueue.id, opponent.queueId));

      // Notify opponent via Pusher
      const pusher = getPusher();
      await pusher.trigger(CHANNELS.matchmaking, EVENTS.MATCH_FOUND, {
        gameId: game.id,
        targetUserId: opponent.opponentId,
        playerColor: isWhite ? 'black' : 'white',
        opponent: {
          id: sessionUser.id,
          name: user.name,
          avatarUrl: user.image,
          rating: user.rating,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          matched: true,
          gameId: game.id,
          playerColor: isWhite ? 'white' : 'black',
          opponent: {
            id: opponent.opponentId,
            name: opponent.opponentName,
            avatarUrl: opponent.opponentImage,
            rating: opponent.opponentRating,
          },
        },
      });
    }

    // No match found - add to queue
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const [queueEntry] = await db.insert(matchmakingQueue).values({
      userId: sessionUser.id,
      rating: user.rating,
      expiresAt,
    }).returning();

    return NextResponse.json({
      success: true,
      data: {
        matched: false,
        status: 'searching',
        queueId: queueEntry.id,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/matchmaking - Cancel matchmaking
export async function DELETE() {
  try {
    const sessionUser = await requireAuth();

    await db.update(matchmakingQueue)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(matchmakingQueue.userId, sessionUser.id),
          eq(matchmakingQueue.status, 'waiting')
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// GET /api/matchmaking - Check queue status
export async function GET() {
  try {
    const sessionUser = await requireAuth();

    const entries = await db.select()
      .from(matchmakingQueue)
      .where(
        and(
          eq(matchmakingQueue.userId, sessionUser.id),
          eq(matchmakingQueue.status, 'waiting')
        )
      );

    if (entries.length === 0) {
      // Check if we have a recent match
      const recentMatch = await db.select()
        .from(matchmakingQueue)
        .where(
          and(
            eq(matchmakingQueue.userId, sessionUser.id),
            eq(matchmakingQueue.status, 'matched')
          )
        )
        .limit(1);

      if (recentMatch.length > 0 && recentMatch[0].gameId) {
        // Get game details
        const [game] = await db.select().from(games).where(eq(games.id, recentMatch[0].gameId));
        if (game) {
          const isWhite = game.whitePlayerId === sessionUser.id;
          const opponentId = isWhite ? game.blackPlayerId : game.whitePlayerId;

          let opponentInfo = null;
          if (opponentId) {
            const [opp] = await db.select({
              id: users.id,
              name: users.name,
              image: users.image,
              rating: users.rating,
            }).from(users).where(eq(users.id, opponentId));
            opponentInfo = opp;
          }

          return NextResponse.json({
            success: true,
            data: {
              matched: true,
              gameId: game.id,
              playerColor: isWhite ? 'white' : 'black',
              opponent: opponentInfo ? {
                id: opponentInfo.id,
                name: opponentInfo.name,
                avatarUrl: opponentInfo.image,
                rating: opponentInfo.rating,
              } : null,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: { status: 'idle' },
      });
    }

    // Check if expired
    if (entries[0].expiresAt < new Date()) {
      await db.update(matchmakingQueue)
        .set({ status: 'expired' })
        .where(eq(matchmakingQueue.id, entries[0].id));

      return NextResponse.json({
        success: true,
        data: { status: 'expired' },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'searching',
        queueId: entries[0].id,
        createdAt: entries[0].createdAt,
        expiresAt: entries[0].expiresAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
