import { db } from '@/lib/db';
import { users, tokenTransactions } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

export async function deductGameStake(userId: string, gameId: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.tokenBalance < 1) return false;

  await db.update(users)
    .set({ tokenBalance: sql`${users.tokenBalance} - 1` })
    .where(eq(users.id, userId));

  await db.insert(tokenTransactions).values({
    userId,
    type: 'game_stake',
    amount: -1,
    balanceBefore: user.tokenBalance,
    balanceAfter: user.tokenBalance - 1,
    gameId,
    description: 'Game stake',
  });

  return true;
}

export async function settleGameResult(
  userId: string,
  gameId: string,
  result: 'win' | 'draw' | 'lose'
): Promise<number> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return 0;

  const rewards = { win: 2, draw: 1, lose: 0 };
  const reward = rewards[result];

  if (reward > 0) {
    await db.update(users)
      .set({ tokenBalance: sql`${users.tokenBalance} + ${reward}` })
      .where(eq(users.id, userId));
  }

  // Update game stats
  const statsUpdate: Record<string, unknown> = {
    totalGames: sql`${users.totalGames} + 1`,
  };
  if (result === 'win') {
    statsUpdate.wins = sql`${users.wins} + 1`;
    statsUpdate.totalTokensWon = sql`${users.totalTokensWon} + 1`;
  } else if (result === 'lose') {
    statsUpdate.losses = sql`${users.losses} + 1`;
    statsUpdate.totalTokensLost = sql`${users.totalTokensLost} + 1`;
  } else {
    statsUpdate.draws = sql`${users.draws} + 1`;
  }
  await db.update(users).set(statsUpdate).where(eq(users.id, userId));

  const transactionType = result === 'win' ? 'game_win' : result === 'draw' ? 'game_draw' : 'game_lose';
  await db.insert(tokenTransactions).values({
    userId,
    type: transactionType,
    amount: reward,
    balanceBefore: user.tokenBalance,
    balanceAfter: user.tokenBalance + reward,
    gameId,
    description: result === 'win' ? 'Won game' : result === 'draw' ? 'Draw - stake refunded' : 'Lost game',
  });

  return user.tokenBalance + reward;
}

export async function claimDailyBonus(userId: string): Promise<{ bonus: number; newBalance: number }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { bonus: 0, newBalance: 0 };

  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0=Mon, 6=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);
  const weekStart = monday.toISOString().split('T')[0];

  let daysPlayed = user.daysPlayedThisWeek ? user.daysPlayedThisWeek.split(',').filter(Boolean) : [];
  let weeklyEarned = user.weeklyBonusEarned;

  // Reset if new week
  if (user.currentWeekStart !== weekStart) {
    daysPlayed = [];
    weeklyEarned = 0;
  }

  const todayStr = dayOfWeek.toString();
  if (daysPlayed.includes(todayStr) || weeklyEarned >= 70) {
    return { bonus: 0, newBalance: user.tokenBalance };
  }

  daysPlayed.push(todayStr);
  const bonus = 10;

  await db.update(users).set({
    tokenBalance: sql`${users.tokenBalance} + ${bonus}`,
    currentWeekStart: weekStart,
    daysPlayedThisWeek: daysPlayed.join(','),
    weeklyBonusEarned: weeklyEarned + bonus,
  }).where(eq(users.id, userId));

  await db.insert(tokenTransactions).values({
    userId,
    type: 'weekly_bonus',
    amount: bonus,
    balanceBefore: user.tokenBalance,
    balanceAfter: user.tokenBalance + bonus,
    description: 'Daily play bonus',
  });

  return { bonus, newBalance: user.tokenBalance + bonus };
}

export async function getTokenBalance(userId: string) {
  const [user] = await db.select({
    tokenBalance: users.tokenBalance,
    totalTokensWon: users.totalTokensWon,
    totalTokensLost: users.totalTokensLost,
  }).from(users).where(eq(users.id, userId));

  return user || { tokenBalance: 0, totalTokensWon: 0, totalTokensLost: 0 };
}

export async function getTransactionHistory(userId: string, limit = 20) {
  return db.select()
    .from(tokenTransactions)
    .where(eq(tokenTransactions.userId, userId))
    .orderBy(desc(tokenTransactions.createdAt))
    .limit(limit);
}
