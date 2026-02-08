// Blunder System for Knight Chess AI
// Makes AI intentionally make mistakes based on difficulty level

import { GameState, Move, PieceColor, PieceType } from '@/types';
import { generateLegalMoves, isInCheck } from '../chess/moves';
import { cloneGameState, setPieceAt, getPieceAt } from '../chess/board';
import { AI_CONFIG } from '../chess/constants';

interface BlunderConfig {
    blunderChance: number;
    blunderTypes: {
        hangPiece: boolean;
        missCapture: boolean;
        badTrade: boolean;
        weakMove: boolean;
    };
    safetyChecks: {
        neverAllowMateIn1: boolean;
        neverHangQueen: boolean;
        alwaysPlayCheckmate: boolean;
    };
}

/**
 * Determine if AI should blunder this turn
 */
export function shouldBlunder(difficulty: 'easy' | 'medium' | 'difficult'): boolean {
    const config = AI_CONFIG[difficulty];
    return Math.random() < config.blunderChance;
}

/**
 * Get blunder configuration for difficulty
 */
export function getBlunderConfig(difficulty: 'easy' | 'medium' | 'difficult'): BlunderConfig {
    switch (difficulty) {
        case 'easy':
            return {
                blunderChance: 0.22,
                blunderTypes: {
                    hangPiece: true,
                    missCapture: true,
                    badTrade: true,
                    weakMove: true,
                },
                safetyChecks: {
                    neverAllowMateIn1: true,
                    neverHangQueen: false,
                    alwaysPlayCheckmate: true,
                },
            };
        case 'medium':
            return {
                blunderChance: 0.09,
                blunderTypes: {
                    hangPiece: false,
                    missCapture: true,
                    badTrade: false,
                    weakMove: true,
                },
                safetyChecks: {
                    neverAllowMateIn1: true,
                    neverHangQueen: true,
                    alwaysPlayCheckmate: true,
                },
            };
        case 'difficult':
            return {
                blunderChance: 0.03,
                blunderTypes: {
                    hangPiece: false,
                    missCapture: false,
                    badTrade: false,
                    weakMove: true,
                },
                safetyChecks: {
                    neverAllowMateIn1: true,
                    neverHangQueen: true,
                    alwaysPlayCheckmate: true,
                },
            };
    }
}

/**
 * Select a blunder move based on configuration
 */
export function selectBlunderMove(
    state: GameState,
    moves: Move[],
    bestMove: Move | null,
    difficulty: 'easy' | 'medium' | 'difficult'
): Move | null {
    const config = getBlunderConfig(difficulty);

    // Filter out moves that violate safety checks
    const safeMoves = moves.filter(move => isSafeBlunder(state, move, config.safetyChecks));

    if (safeMoves.length === 0) {
        return bestMove; // Fall back to best move if no safe blunders
    }

    // Select blunder type
    const availableTypes: string[] = [];
    if (config.blunderTypes.hangPiece) availableTypes.push('hangPiece');
    if (config.blunderTypes.missCapture) availableTypes.push('missCapture');
    if (config.blunderTypes.weakMove) availableTypes.push('weakMove');
    if (config.blunderTypes.badTrade) availableTypes.push('badTrade');

    if (availableTypes.length === 0) {
        return selectWeakMove(safeMoves, bestMove);
    }

    const blunderType = availableTypes[Math.floor(Math.random() * availableTypes.length)];

    switch (blunderType) {
        case 'hangPiece':
            return findHangingMove(safeMoves, state) || selectWeakMove(safeMoves, bestMove);
        case 'missCapture':
            return findNonCapture(safeMoves) || selectWeakMove(safeMoves, bestMove);
        case 'badTrade':
            return findBadTrade(safeMoves, state) || selectWeakMove(safeMoves, bestMove);
        case 'weakMove':
        default:
            return selectWeakMove(safeMoves, bestMove);
    }
}

/**
 * Check if a blunder move is safe (doesn't violate safety rules)
 */
function isSafeBlunder(state: GameState, move: Move, safety: BlunderConfig['safetyChecks']): boolean {
    const newState = applyMove(state, move);

    // Never allow mate in 1 against us
    if (safety.neverAllowMateIn1) {
        const opponentMoves = generateLegalMoves(newState);
        for (const oppMove of opponentMoves) {
            const afterOppMove = applyMove(newState, oppMove);
            if (afterOppMove.isCheckmate) {
                return false;
            }
        }
    }

    // Never hang queen
    if (safety.neverHangQueen && move.piece.type === 'queen') {
        if (isSquareAttackedAfterMove(newState, move.to, state.turn === 'white' ? 'black' : 'white')) {
            return false;
        }
    }

    return true;
}

/**
 * Find a move that hangs a piece (leaves it undefended)
 */
function findHangingMove(moves: Move[], state: GameState): Move | null {
    for (const move of shuffleArray([...moves])) {
        if (move.piece.type !== 'king' && move.piece.type !== 'queen') {
            const newState = applyMove(state, move);
            const oppColor = state.turn === 'white' ? 'black' : 'white';

            if (isSquareAttackedAfterMove(newState, move.to, oppColor)) {
                return move;
            }
        }
    }
    return null;
}

/**
 * Find a non-capture move when captures are available
 */
function findNonCapture(moves: Move[]): Move | null {
    const captures = moves.filter(m => m.captured);
    const nonCaptures = moves.filter(m => !m.captured);

    // Only "miss" if there are good captures available
    if (captures.length > 0 && nonCaptures.length > 0) {
        const randomNonCapture = nonCaptures[Math.floor(Math.random() * nonCaptures.length)];
        return randomNonCapture;
    }

    return null;
}

/**
 * Find a bad trade move
 */
function findBadTrade(moves: Move[], state: GameState): Move | null {
    const pieceValues: Record<PieceType, number> = {
        pawn: 1,
        knight: 3,
        bishop: 3,
        rook: 5,
        queen: 9,
        king: 100,
    };

    for (const move of shuffleArray([...moves])) {
        if (move.captured) {
            const oppColor = state.turn === 'white' ? 'black' : 'white';
            const newState = applyMove(state, move);

            if (isSquareAttackedAfterMove(newState, move.to, oppColor)) {
                // We capture but lose our piece
                const ourValue = pieceValues[move.piece.type];
                const theirValue = pieceValues[move.captured.type];

                // Bad trade: we lose more than we gain
                if (ourValue > theirValue) {
                    return move;
                }
            }
        }
    }
    return null;
}

/**
 * Select a weak (non-optimal) move
 */
function selectWeakMove(moves: Move[], bestMove: Move | null): Move | null {
    if (moves.length <= 1) return moves[0] || bestMove;

    // If we have a best move, try to select something else
    if (bestMove) {
        const otherMoves = moves.filter(
            m => !(m.from.file === bestMove.from.file && m.from.rank === bestMove.from.rank &&
                m.to.file === bestMove.to.file && m.to.rank === bestMove.to.rank)
        );

        if (otherMoves.length > 0) {
            // Select from bottom half of moves (weaker moves)
            const midPoint = Math.floor(otherMoves.length / 2);
            const weakerMoves = otherMoves.slice(midPoint);
            return weakerMoves[Math.floor(Math.random() * weakerMoves.length)];
        }
    }

    // Random move
    return moves[Math.floor(Math.random() * moves.length)];
}

/**
 * Check if square is attacked after a move
 */
function isSquareAttackedAfterMove(
    state: GameState,
    square: { file: number; rank: number },
    byColor: PieceColor
): boolean {
    // Simplified check - just see if any piece can reach that square
    const pieces = [];
    for (let rank = 0; rank < 9; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = getPieceAt(state.board, { file, rank });
            if (piece && piece.color === byColor) {
                pieces.push({ piece, square: { file, rank } });
            }
        }
    }

    // Create temporary state for that color's turn
    const tempState = cloneGameState(state);
    tempState.turn = byColor;

    const moves = generateLegalMoves(tempState);
    return moves.some(m => m.to.file === square.file && m.to.rank === square.rank);
}

/**
 * Apply move to state (helper)
 */
function applyMove(state: GameState, move: Move): GameState {
    const newState = cloneGameState(state);

    const piece = move.promotion
        ? { type: move.promotion, color: move.piece.color }
        : move.piece;

    newState.board = setPieceAt(
        setPieceAt(state.board, move.from, null),
        move.to,
        piece
    );

    newState.turn = state.turn === 'white' ? 'black' : 'white';
    newState.isCheck = isInCheck(newState.board, newState.turn);

    const legalMoves = generateLegalMoves(newState);
    if (legalMoves.length === 0) {
        if (newState.isCheck) {
            newState.isCheckmate = true;
        } else {
            newState.isStalemate = true;
        }
    }

    return newState;
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Get thinking time for difficulty
 */
export function getThinkTime(difficulty: 'easy' | 'medium' | 'difficult'): number {
    const config = AI_CONFIG[difficulty];
    const { min, max } = config.thinkTime;
    return min + Math.random() * (max - min);
}
