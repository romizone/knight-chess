// Board initialization and utilities for Knight Chess (8x9 board with 5 knights)

import { BoardState, Piece, PieceColor, Square, GameState } from '@/types';
import { BOARD_CONFIG, INITIAL_BACK_ROW, FILES } from './constants';

/**
 * Get random positions for the 3 pawns that become knights
 * Returns array of column indices (0-7)
 */
export function getRandomKnightPositions(): number[] {
    const positions = [0, 1, 2, 3, 4, 5, 6, 7];
    const shuffled = positions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).sort((a, b) => a - b);
}

/**
 * Create the initial board setup for Knight Chess
 * - 8 columns x 9 rows
 * - 5 knights per side (2 in back row + 3 replacing random pawns)
 */
export function createInitialBoard(
    whiteKnightPositions: number[],
    blackKnightPositions: number[]
): BoardState {
    // Create empty 9x8 board (9 rows, 8 columns)
    const board: BoardState = Array(BOARD_CONFIG.RANKS)
        .fill(null)
        .map(() => Array(BOARD_CONFIG.FILES).fill(null));

    // Setup white pieces (rows 0-1)
    // Row 0: Back row
    for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
        board[0][file] = {
            type: INITIAL_BACK_ROW[file],
            color: 'white',
        };
    }

    // Row 1: Pawns with some knights
    for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
        if (whiteKnightPositions.includes(file)) {
            board[1][file] = { type: 'knight', color: 'white' };
        } else {
            board[1][file] = { type: 'pawn', color: 'white' };
        }
    }

    // Setup black pieces (rows 7-8)
    // Row 8: Back row
    for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
        board[8][file] = {
            type: INITIAL_BACK_ROW[file],
            color: 'black',
        };
    }

    // Row 7: Pawns with some knights
    for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
        if (blackKnightPositions.includes(file)) {
            board[7][file] = { type: 'knight', color: 'black' };
        } else {
            board[7][file] = { type: 'pawn', color: 'black' };
        }
    }

    return board;
}

/**
 * Create initial game state
 */
export function createInitialGameState(): GameState {
    const whiteKnightPositions = getRandomKnightPositions();
    const blackKnightPositions = getRandomKnightPositions();

    return {
        board: createInitialBoard(whiteKnightPositions, blackKnightPositions),
        turn: 'white',
        moveHistory: [],
        whiteKnightPositions,
        blackKnightPositions,
        castlingRights: {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true },
        },
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveNumber: 1,
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
        isDraw: false,
    };
}

/**
 * Get piece at a square
 */
export function getPieceAt(board: BoardState, square: Square): Piece | null {
    if (!isValidSquare(square)) return null;
    return board[square.rank][square.file];
}

/**
 * Set piece at a square
 */
export function setPieceAt(
    board: BoardState,
    square: Square,
    piece: Piece | null
): BoardState {
    const newBoard = board.map(row => [...row]);
    newBoard[square.rank][square.file] = piece;
    return newBoard;
}

/**
 * Check if a square is valid (within board bounds)
 */
export function isValidSquare(square: Square): boolean {
    return (
        square.file >= 0 &&
        square.file < BOARD_CONFIG.FILES &&
        square.rank >= 0 &&
        square.rank < BOARD_CONFIG.RANKS
    );
}

/**
 * Convert algebraic notation to square (e.g., "e4" -> {file: 4, rank: 3})
 */
export function algebraicToSquare(notation: string): Square | null {
    if (notation.length < 2) return null;

    const file = FILES.indexOf(notation[0].toLowerCase());
    const rank = parseInt(notation.slice(1)) - 1;

    if (file === -1 || isNaN(rank)) return null;

    const square = { file, rank };
    return isValidSquare(square) ? square : null;
}

/**
 * Convert square to algebraic notation (e.g., {file: 4, rank: 3} -> "e4")
 */
export function squareToAlgebraic(square: Square): string {
    return `${FILES[square.file]}${square.rank + 1}`;
}

/**
 * Get square color (for board display)
 */
export function getSquareColor(file: number, rank: number): 'light' | 'dark' {
    return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

/**
 * Find king position for a color
 */
export function findKing(board: BoardState, color: PieceColor): Square | null {
    for (let rank = 0; rank < BOARD_CONFIG.RANKS; rank++) {
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const piece = board[rank][file];
            if (piece && piece.type === 'king' && piece.color === color) {
                return { file, rank };
            }
        }
    }
    return null;
}

/**
 * Count pieces on the board
 */
export function countPieces(board: BoardState, color?: PieceColor): number {
    let count = 0;
    for (let rank = 0; rank < BOARD_CONFIG.RANKS; rank++) {
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const piece = board[rank][file];
            if (piece && (!color || piece.color === color)) {
                count++;
            }
        }
    }
    return count;
}

/**
 * Get all pieces of a color
 */
export function getPiecesByColor(
    board: BoardState,
    color: PieceColor
): { piece: Piece; square: Square }[] {
    const pieces: { piece: Piece; square: Square }[] = [];

    for (let rank = 0; rank < BOARD_CONFIG.RANKS; rank++) {
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const piece = board[rank][file];
            if (piece && piece.color === color) {
                pieces.push({ piece, square: { file, rank } });
            }
        }
    }

    return pieces;
}

/**
 * Clone the board state
 */
export function cloneBoard(board: BoardState): BoardState {
    return board.map(row => row.map(piece => (piece ? { ...piece } : null)));
}

/**
 * Clone game state
 */
export function cloneGameState(state: GameState): GameState {
    return {
        ...state,
        board: cloneBoard(state.board),
        moveHistory: [...state.moveHistory],
        whiteKnightPositions: [...state.whiteKnightPositions],
        blackKnightPositions: [...state.blackKnightPositions],
        castlingRights: {
            white: { ...state.castlingRights.white },
            black: { ...state.castlingRights.black },
        },
        enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null,
    };
}

/**
 * Display board as ASCII (for debugging)
 */
export function boardToAscii(board: BoardState): string {
    const pieceSymbols: Record<string, string> = {
        'white-king': 'K',
        'white-queen': 'Q',
        'white-rook': 'R',
        'white-bishop': 'B',
        'white-knight': 'N',
        'white-pawn': 'P',
        'black-king': 'k',
        'black-queen': 'q',
        'black-rook': 'r',
        'black-bishop': 'b',
        'black-knight': 'n',
        'black-pawn': 'p',
    };

    let result = '  a b c d e f g h\n';

    for (let rank = BOARD_CONFIG.RANKS - 1; rank >= 0; rank--) {
        result += `${rank + 1} `;
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const piece = board[rank][file];
            if (piece) {
                result += pieceSymbols[`${piece.color}-${piece.type}`] + ' ';
            } else {
                result += '. ';
            }
        }
        result += `${rank + 1}\n`;
    }

    result += '  a b c d e f g h';
    return result;
}
