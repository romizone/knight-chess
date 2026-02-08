export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const sessionUser = await requireAuth();
    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id));

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        tokenBalance: user.tokenBalance,
        rating: user.rating,
        totalGames: user.totalGames,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        totalTokensWon: user.totalTokensWon,
        totalTokensLost: user.totalTokensLost,
        createdAt: user.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
}
