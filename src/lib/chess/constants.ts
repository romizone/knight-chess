// Chess Constants for Knight Chess (8x9 board)

import { PieceType, TimeControl, PieceColor } from '@/types';

// Board configuration
export const BOARD_CONFIG = {
    FILES: 8, // Columns (a-h)
    RANKS: 9, // Rows (1-9)
    KNIGHTS_PER_PLAYER: 5, // 2 normal + 3 replace pawns
    PAWNS_REPLACED: 3,
};

// File letters
export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// Square size in pixels
export const SQUARE_SIZE = {
    desktop: 64,
    tablet: 52,
    mobile: 40,
};

// Piece values for evaluation
export const PIECE_VALUES: Record<PieceType, number> = {
    pawn: 100,
    knight: 320, // Higher value due to 5 knights variant
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000,
};

// Unicode chess pieces
export const PIECE_UNICODE: Record<PieceColor, Record<PieceType, string>> = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙',
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟',
    },
};

// Time controls
export const TIME_CONTROLS: Record<string, TimeControl & { name: string; label: string; category: string }> = {
    difficult: {
        name: 'Difficult',
        base: 600, // 10 minutes
        increment: 0, // No increment - pure countdown
        label: '10+0',
        category: 'Rapid',
    },
};

// AI configuration
export const AI_CONFIG = {
    difficult: {
        name: 'Difficult',
        description: 'Strong opponent - few mistakes',
        searchDepth: 5,
        blunderChance: 0.03,
        thinkTime: { min: 1500, max: 4000, avg: 2500 },
    },
};

// Token configuration
export const TOKEN_CONFIG = {
    signupBonus: 1000,
    stakePerGame: 1,
    rewards: {
        win: 2, // stake back + 1
        draw: 1, // stake refund
        lose: 0,
    },
    netResult: {
        win: +1,
        draw: 0,
        lose: -1,
    },
    weeklyBonus: {
        enabled: true,
        totalBonus: 70,
        tokensPerDay: 10,
        maxDaysPerWeek: 7,
    },
    minimumToPlay: 1,
};

// Colors
export const COLORS = {
    board: {
        light: '#F0D9B5',
        dark: '#B58863',
        selected: '#829769',
        lastMove: '#CDD26A',
        legalMove: '#646D4080',
        check: '#FF6B6B',
    },
    ui: {
        background: '#312E2B',
        surface: '#272522',
        primary: '#81B64C',
        secondary: '#E5C47E',
        text: '#FFFFFF',
        textMuted: '#999999',
        danger: '#E53935',
        warning: '#FB8C00',
    },
    timer: {
        normal: '#81B64C',
        warning: '#FB8C00',
        critical: '#E53935',
    },
};

// Idle warning thresholds (seconds)
export const IDLE_CONFIG = {
    difficult: {
        gentleReminder: 45,
        warningThreshold: 90,
        urgentThreshold: 150,
        criticalThreshold: 180,
    },
};

// Low time warning thresholds (seconds)
export const LOW_TIME_CONFIG = {
    difficult: {
        warning: 120,
        critical: 60,
        urgent: 20,
    },
};

// Knight position bonuses (for AI evaluation) - 9 rows for 8x9 board
export const KNIGHT_POSITION_TABLE = [
    [-50, -40, -30, -30, -30, -30, -40, -50], // Row 1
    [-40, -20, 0, 0, 0, 0, -20, -40], // Row 2
    [-30, 0, 10, 15, 15, 10, 0, -30], // Row 3
    [-30, 5, 15, 20, 20, 15, 5, -30], // Row 4
    [-30, 0, 15, 25, 25, 15, 0, -30], // Row 5 (center)
    [-30, 5, 15, 20, 20, 15, 5, -30], // Row 6
    [-30, 0, 10, 15, 15, 10, 0, -30], // Row 7
    [-40, -20, 0, 5, 5, 0, -20, -40], // Row 8
    [-50, -40, -30, -30, -30, -30, -40, -50], // Row 9
];

// Pawn position bonuses for 8x9 board
export const PAWN_POSITION_TABLE = [
    [0, 0, 0, 0, 0, 0, 0, 0], // Row 1 (promotion)
    [50, 50, 50, 50, 50, 50, 50, 50], // Row 2
    [10, 10, 20, 30, 30, 20, 10, 10], // Row 3
    [5, 5, 10, 25, 25, 10, 5, 5], // Row 4
    [0, 0, 0, 20, 20, 0, 0, 0], // Row 5
    [5, -5, -10, 0, 0, -10, -5, 5], // Row 6
    [5, 10, 10, -20, -20, 10, 10, 5], // Row 7
    [0, 0, 0, 0, 0, 0, 0, 0], // Row 8 (starting)
    [0, 0, 0, 0, 0, 0, 0, 0], // Row 9
];

// Initial board setup (before knight randomization)
export const INITIAL_BACK_ROW: PieceType[] = [
    'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'
];

// Sound paths
export const SOUNDS = {
    move: '/sounds/move.mp3',
    capture: '/sounds/capture.mp3',
    castle: '/sounds/castle.mp3',
    promote: '/sounds/promote.mp3',
    check: '/sounds/check.mp3',
    checkmate: '/sounds/checkmate.mp3',
    gameStart: '/sounds/game-start.mp3',
    gameEnd: '/sounds/game-end.mp3',
    draw: '/sounds/draw.mp3',
    lowTime: '/sounds/low-time.mp3',
    notify: '/sounds/notify.mp3',
    illegal: '/sounds/illegal.mp3',
    click: '/sounds/click.mp3',
};
