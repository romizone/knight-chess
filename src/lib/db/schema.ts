import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';

// ========== ENUMS ==========

export const gameTypeEnum = pgEnum('game_type', ['vs_computer', 'pvp']);
export const gameDifficultyEnum = pgEnum('game_difficulty', ['easy', 'medium', 'difficult']);
export const gameStatusEnum = pgEnum('game_status', ['waiting', 'active', 'completed', 'abandoned']);
export const gameResultEnum = pgEnum('game_result', ['white_wins', 'black_wins', 'draw']);
export const endReasonEnum = pgEnum('end_reason', [
  'checkmate', 'timeout', 'resignation', 'stalemate',
  'draw_agreement', 'insufficient_material', 'fifty_move',
  'threefold_repetition', 'disconnect',
]);
export const transactionTypeEnum = pgEnum('transaction_type', [
  'signup_bonus', 'game_stake', 'game_win', 'game_draw',
  'game_lose', 'weekly_bonus', 'admin_adjust',
]);
export const playerColorEnum = pgEnum('player_color', ['white', 'black']);

// ========== NEXTAUTH TABLES ==========

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),

  // Game profile
  tokenBalance: integer('token_balance').default(1000).notNull(),
  totalTokensWon: integer('total_tokens_won').default(0).notNull(),
  totalTokensLost: integer('total_tokens_lost').default(0).notNull(),
  rating: integer('rating').default(1200).notNull(),
  totalGames: integer('total_games').default(0).notNull(),
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  draws: integer('draws').default(0).notNull(),

  // Weekly bonus
  currentWeekStart: varchar('current_week_start', { length: 10 }),
  daysPlayedThisWeek: text('days_played_this_week').default(''),
  weeklyBonusEarned: integer('weekly_bonus_earned').default(0).notNull(),

  // Anti-abuse
  gamesToday: integer('games_today').default(0).notNull(),
  lastGameDate: varchar('last_game_date', { length: 10 }),
  isBanned: boolean('is_banned').default(false).notNull(),
  banReason: text('ban_reason'),

  lastLoginAt: timestamp('last_login_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull().$type<AdapterAccount['type']>(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  id_token: text('id_token'),
  session_state: varchar('session_state', { length: 255 }),
}, (account) => ({
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}));

export const sessions = pgTable('sessions', {
  sessionToken: varchar('session_token', { length: 255 }).notNull().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}));

// ========== GAME TABLES ==========

export const tokenTransactions = pgTable('token_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: transactionTypeEnum('type').notNull(),
  amount: integer('amount').notNull(),
  balanceBefore: integer('balance_before').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  gameId: uuid('game_id'),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const games = pgTable('games', {
  id: uuid('id').defaultRandom().primaryKey(),
  whitePlayerId: uuid('white_player_id').references(() => users.id),
  blackPlayerId: uuid('black_player_id').references(() => users.id),
  gameType: gameTypeEnum('game_type').notNull(),
  difficulty: gameDifficultyEnum('difficulty'),
  timeControlBase: integer('time_control_base').notNull(),
  timeControlIncrement: integer('time_control_increment').default(0).notNull(),
  stakeAmount: integer('stake_amount').default(1).notNull(),
  stakesCollected: boolean('stakes_collected').default(false),
  stakesSettled: boolean('stakes_settled').default(false),
  status: gameStatusEnum('status').default('active'),
  result: gameResultEnum('result'),
  winnerId: uuid('winner_id').references(() => users.id),
  endReason: endReasonEnum('end_reason'),
  initialBoard: jsonb('initial_board').notNull(),
  currentBoard: jsonb('current_board'),
  finalBoard: jsonb('final_board'),
  whiteKnightPositions: text('white_knight_positions').notNull(),
  blackKnightPositions: text('black_knight_positions').notNull(),
  whiteTimeRemaining: integer('white_time_remaining'),
  blackTimeRemaining: integer('black_time_remaining'),
  moveCount: integer('move_count').default(0),
  startedAt: timestamp('started_at', { mode: 'date' }),
  endedAt: timestamp('ended_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const moves = pgTable('moves', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  moveNumber: integer('move_number').notNull(),
  player: playerColorEnum('player').notNull(),
  fromSquare: varchar('from_square', { length: 3 }).notNull(),
  toSquare: varchar('to_square', { length: 3 }).notNull(),
  piece: varchar('piece', { length: 10 }).notNull(),
  captured: varchar('captured', { length: 10 }),
  promotion: varchar('promotion', { length: 10 }),
  isCheck: boolean('is_check').default(false),
  isCheckmate: boolean('is_checkmate').default(false),
  isCastling: varchar('is_castling', { length: 10 }),
  isEnPassant: boolean('is_en_passant').default(false),
  notation: varchar('notation', { length: 10 }).notNull(),
  timeSpentMs: integer('time_spent_ms'),
  timeRemainingMs: integer('time_remaining_ms'),
  boardState: jsonb('board_state').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  boardTheme: varchar('board_theme', { length: 50 }).default('classic'),
  pieceSet: varchar('piece_set', { length: 50 }).default('standard'),
  soundEnabled: boolean('sound_enabled').default(true),
  soundVolume: integer('sound_volume').default(70),
  showLegalMoves: boolean('show_legal_moves').default(true),
  showCoordinates: boolean('show_coordinates').default(true),
  autoPromoteQueen: boolean('auto_promote_queen').default(false),
  enablePremoves: boolean('enable_premoves').default(true),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ========== RELATIONS ==========

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  tokenTransactions: many(tokenTransactions),
  gamesAsWhite: many(games, { relationName: 'whitePlayer' }),
  gamesAsBlack: many(games, { relationName: 'blackPlayer' }),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  whitePlayer: one(users, { fields: [games.whitePlayerId], references: [users.id], relationName: 'whitePlayer' }),
  blackPlayer: one(users, { fields: [games.blackPlayerId], references: [users.id], relationName: 'blackPlayer' }),
  moves: many(moves),
}));

export const movesRelations = relations(moves, ({ one }) => ({
  game: one(games, { fields: [moves.gameId], references: [games.id] }),
}));

// ========== MATCHMAKING QUEUE ==========

export const matchmakingQueueStatusEnum = pgEnum('matchmaking_queue_status', ['waiting', 'matched', 'cancelled', 'expired']);

export const matchmakingQueue = pgTable('matchmaking_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: matchmakingQueueStatusEnum('status').default('waiting').notNull(),
  rating: integer('rating').notNull(),
  gameId: uuid('game_id').references(() => games.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  matchedAt: timestamp('matched_at', { mode: 'date' }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
});

export const matchmakingQueueRelations = relations(matchmakingQueue, ({ one }) => ({
  user: one(users, { fields: [matchmakingQueue.userId], references: [users.id] }),
  game: one(games, { fields: [matchmakingQueue.gameId], references: [games.id] }),
}));
