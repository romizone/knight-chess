// Chess Types for Knight Chess (8x9 board with 5 knights)

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';

export interface Piece {
    type: PieceType;
    color: PieceColor;
}

export interface Square {
    file: number; // 0-7 (a-h)
    rank: number; // 0-8 (1-9)
}

export interface Move {
    from: Square;
    to: Square;
    piece: Piece;
    captured?: Piece;
    promotion?: PieceType;
    isCheck?: boolean;
    isCheckmate?: boolean;
    isCastling?: 'kingside' | 'queenside';
    isEnPassant?: boolean;
    notation?: string;
}

export type BoardState = (Piece | null)[][];

export interface GameState {
    board: BoardState;
    turn: PieceColor;
    moveHistory: Move[];
    whiteKnightPositions: number[]; // Columns where pawns became knights
    blackKnightPositions: number[];
    castlingRights: {
        white: { kingside: boolean; queenside: boolean };
        black: { kingside: boolean; queenside: boolean };
    };
    enPassantTarget: Square | null;
    halfMoveClock: number; // For 50-move rule
    fullMoveNumber: number;
    isCheck: boolean;
    isCheckmate: boolean;
    isStalemate: boolean;
    isDraw: boolean;
}

export type GameDifficulty = 'easy' | 'medium' | 'difficult';
export type GameType = 'vs_computer' | 'pvp';
export type GameStatus = 'waiting' | 'active' | 'completed' | 'abandoned';
export type GameResult = 'white_wins' | 'black_wins' | 'draw' | null;
export type EndReason =
    | 'checkmate'
    | 'timeout'
    | 'resignation'
    | 'stalemate'
    | 'draw_agreement'
    | 'insufficient_material'
    | 'fifty_move'
    | 'threefold_repetition'
    | 'disconnect';

export interface TimeControl {
    base: number; // Seconds
    increment: number; // Seconds per move
}

export interface Game {
    id: string;
    gameType: GameType;
    difficulty?: GameDifficulty;
    timeControl: TimeControl;
    status: GameStatus;
    result: GameResult;
    endReason?: EndReason;
    whitePlayerId: string;
    blackPlayerId?: string;
    whiteTimeRemaining: number;
    blackTimeRemaining: number;
    gameState: GameState;
    createdAt: Date;
    startedAt?: Date;
    endedAt?: Date;
}

// User related types
export interface User {
    id: string;
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
    tokenBalance: number;
    totalTokensWon: number;
    totalTokensLost: number;
    rating: number;
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    isBanned: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface TokenTransaction {
    id: string;
    userId: string;
    type: 'signup_bonus' | 'game_stake' | 'game_win' | 'game_draw' | 'game_lose' | 'weekly_bonus' | 'admin_adjust';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    gameId?: string;
    description?: string;
    createdAt: Date;
}

export interface WeeklyBonusState {
    weekStartDate: Date;
    daysPlayed: number[]; // 0-6 (Mon-Sun)
    tokensEarned: number;
    tokensRemaining: number;
}

// Leaderboard
export interface LeaderboardEntry {
    rank: number;
    userId: string;
    name: string;
    avatarUrl?: string;
    rating: number;
    totalGames: number;
    wins: number;
    winRate: number;
    tokenBalance: number;
}

// API Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface CreateGameRequest {
    gameType: GameType;
    difficulty?: GameDifficulty;
    timeControl: 'easy' | 'medium' | 'difficult';
}

export interface MakeMoveRequest {
    from: string; // e.g., "e2"
    to: string; // e.g., "e4"
    promotion?: PieceType;
}

export interface MakeMoveResponse {
    move: Move;
    newBoard: BoardState;
    timeRemaining: number;
    gameOver?: {
        result: GameResult;
        reason: EndReason;
        tokensWon: number;
        newBalance: number;
    };
    aiMove?: {
        from: string;
        to: string;
        notation: string;
        thinkTime: number;
    };
}

// Multiplayer types

export type MatchmakingStatus = 'idle' | 'searching' | 'matched' | 'error';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface RealtimeGameEvent {
    type: 'move' | 'resign' | 'draw_offer' | 'draw_accept' | 'draw_decline' | 'timeout';
    payload: RealtimeMovePayload | RealtimeResignPayload | RealtimeDrawPayload;
}

export interface RealtimeMovePayload {
    moveNumber: number;
    from: string;
    to: string;
    promotion?: PieceType;
    piece: PieceType;
    captured?: PieceType;
    notation: string;
    whiteTimeRemaining: number;
    blackTimeRemaining: number;
    isCheck: boolean;
    isCheckmate: boolean;
    isStalemate: boolean;
    isDraw: boolean;
    boardState: BoardState;
    turn: PieceColor;
    timestamp: string;
}

export interface RealtimeResignPayload {
    resignedBy: PieceColor;
    result: GameResult;
    timestamp: string;
}

export interface RealtimeDrawPayload {
    offeredBy?: PieceColor;
    accepted?: boolean;
    result?: GameResult;
    timestamp: string;
}

export interface MatchmakingResult {
    matched: boolean;
    gameId?: string;
    playerColor?: PieceColor;
    opponent?: {
        id: string;
        name: string;
        avatarUrl?: string;
        rating: number;
    };
    queueId?: string;
}
