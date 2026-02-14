// Blunder System for Knight Chess AI
// Makes AI intentionally make mistakes based on difficulty level
// Optimized: uses lightweight board clones instead of full state clones

import { GameState, Move, PieceColor, PieceType, Piece } from '@/types';
import { generateLegalMoves, isInCheck, isSquareAttacked } from '../chess/moves';
import { cloneBoard } from '../chess/board';
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
export function shouldBlunder(difficulty: string): boolean {
    const config = AI_CONFIG[difficulty as keyof typeof AI_CONFIG];
    if (!config) return false;
    return Math.random() < config.blunderChance;
}

/**
 * Get blunder configuration for difficulty
 */
export function getBlunderConfig(difficulty: string): BlunderConfig {
    if (difficulty === 'easy') {
        return {
            blunderChance: 0.35,
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
    }
    if (difficulty === 'medium') {
        return {
            blunderChance: 0.15,
            blunderTypes: {
                hangPiece: false,
                missCapture: true,
                badTrade: true,
                weakMove: true,
            },
            safetyChecks: {
                neverAllowMateIn1: true,
                neverHangQueen: true,
                alwaysPlayCheckmate: true,
            },
        };
    }
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

/**
 * Select a blunder move based on configuration
 */
export function selectBlunderMove(
    state: GameState,
    moves: Move[],
    bestMove: Move | null,
    difficulty: string
): Move | null {
    const config = getBlunderConfig(difficulty);

    // Filter out moves that violate safety checks
    const safeMoves = moves.filter(move => isSafeBlunder(state, move, config.safetyChecks));

    if (safeMoves.length === 0) {
        return bestMove;
    }

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
 * Apply a move to a board clone (lightweight, no full state clone)
 */
function applyMoveToBoard(state: GameState, move: Move): { board: (Piece | null)[][]; turn: PieceColor } {
    const board = cloneBoard(state.board);

    const piece = move.promotion
        ? { type: move.promotion, color: move.piece.color } as Piece
        : move.piece;

    board[move.from.rank][move.from.file] = null;
    board[move.to.rank][move.to.file] = piece;

    if (move.isEnPassant) {
        board[move.from.rank][move.to.file] = null;
    }

    if (move.isCastling) {
        const rank = move.from.rank;
        if (move.isCastling === 'kingside') {
            board[rank][5] = board[rank][7];
            board[rank][7] = null;
        } else {
            board[rank][3] = board[rank][0];
            board[rank][0] = null;
        }
    }

    const turn: PieceColor = state.turn === 'white' ? 'black' : 'white';
    return { board, turn };
}

/**
 * Check if a blunder move is safe (doesn't violate safety rules)
 */
function isSafeBlunder(state: GameState, move: Move, safety: BlunderConfig['safetyChecks']): boolean {
    const { board, turn: oppTurn } = applyMoveToBoard(state, move);
    const oppCheck = isInCheck(board, oppTurn);

    // Never allow mate in 1 against us
    if (safety.neverAllowMateIn1) {
        const tempState: GameState = {
            ...state,
            board,
            turn: oppTurn,
            isCheck: oppCheck,
            isCheckmate: false,
            isStalemate: false,
            isDraw: false,
            enPassantTarget: null,
            moveHistory: [],
        };

        const opponentMoves = generateLegalMoves(tempState);
        for (const oppMove of opponentMoves) {
            const after = applyMoveToBoard(tempState, oppMove);
            const ourColor = state.turn;
            const ourCheck = isInCheck(after.board, ourColor);
            if (!ourCheck) continue;

            // Check if we have any legal response
            const ourState: GameState = {
                ...state,
                board: after.board,
                turn: ourColor,
                isCheck: ourCheck,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                enPassantTarget: null,
                moveHistory: [],
            };
            const ourMoves = generateLegalMoves(ourState);
            if (ourMoves.length === 0) {
                return false;
            }
        }
    }

    // Never hang queen
    if (safety.neverHangQueen && move.piece.type === 'queen') {
        const oppColor = state.turn === 'white' ? 'black' : 'white';
        if (isSquareAttacked(board, move.to, oppColor)) {
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
            const { board } = applyMoveToBoard(state, move);
            const oppColor = state.turn === 'white' ? 'black' : 'white';

            if (isSquareAttacked(board, move.to, oppColor)) {
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

    if (captures.length > 0 && nonCaptures.length > 0) {
        return nonCaptures[Math.floor(Math.random() * nonCaptures.length)];
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
            const { board } = applyMoveToBoard(state, move);
            const oppColor = state.turn === 'white' ? 'black' : 'white';

            if (isSquareAttacked(board, move.to, oppColor)) {
                const ourValue = pieceValues[move.piece.type];
                const theirValue = pieceValues[move.captured.type];

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

    if (bestMove) {
        const otherMoves = moves.filter(
            m => !(m.from.file === bestMove.from.file && m.from.rank === bestMove.from.rank &&
                m.to.file === bestMove.to.file && m.to.rank === bestMove.to.rank)
        );

        if (otherMoves.length > 0) {
            const midPoint = Math.floor(otherMoves.length / 2);
            const weakerMoves = otherMoves.slice(midPoint);
            return weakerMoves[Math.floor(Math.random() * weakerMoves.length)];
        }
    }

    return moves[Math.floor(Math.random() * moves.length)];
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
export function getThinkTime(difficulty: string): number {
    const config = AI_CONFIG[difficulty as keyof typeof AI_CONFIG];
    if (!config) return 2000;
    const { min, max } = config.thinkTime;
    return min + Math.random() * (max - min);
}
