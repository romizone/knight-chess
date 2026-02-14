// Minimax Algorithm with Alpha-Beta Pruning for Knight Chess AI
// Optimized: mutable make/unmake pattern, no deep cloning in search tree

import { GameState, Move, PieceColor, Piece } from '@/types';
import { generateLegalMoves, isInCheck } from '../chess/moves';
import { evaluateBoard } from './evaluation';

interface SearchResult {
    move: Move | null;
    score: number;
    nodesSearched: number;
}

interface UndoInfo {
    fromPiece: Piece | null;
    toPiece: Piece | null;
    castlingRights: {
        white: { kingside: boolean; queenside: boolean };
        black: { kingside: boolean; queenside: boolean };
    };
    enPassantTarget: { file: number; rank: number } | null;
    halfMoveClock: number;
    isCheck: boolean;
    isCheckmate: boolean;
    isStalemate: boolean;
    isDraw: boolean;
    turn: PieceColor;
    // For castling rook restore
    rookFrom?: { file: number; rank: number };
    rookTo?: { file: number; rank: number };
    rookPiece?: Piece | null;
    // For en passant capture restore
    epCaptureSquare?: { file: number; rank: number };
    epCapturedPiece?: Piece | null;
}

/**
 * Make a move in-place on the board, returning undo info
 */
function makeMoveInPlace(state: GameState, move: Move): UndoInfo {
    const board = state.board;
    const undo: UndoInfo = {
        fromPiece: board[move.from.rank][move.from.file],
        toPiece: board[move.to.rank][move.to.file],
        castlingRights: {
            white: { ...state.castlingRights.white },
            black: { ...state.castlingRights.black },
        },
        enPassantTarget: state.enPassantTarget,
        halfMoveClock: state.halfMoveClock,
        isCheck: state.isCheck,
        isCheckmate: state.isCheckmate,
        isStalemate: state.isStalemate,
        isDraw: state.isDraw,
        turn: state.turn,
    };

    const piece = move.promotion
        ? { type: move.promotion, color: move.piece.color } as Piece
        : move.piece;

    // Move piece
    board[move.from.rank][move.from.file] = null;
    board[move.to.rank][move.to.file] = piece;

    // Handle castling
    if (move.isCastling) {
        const rank = move.from.rank;
        if (move.isCastling === 'kingside') {
            undo.rookFrom = { file: 7, rank };
            undo.rookTo = { file: 5, rank };
            undo.rookPiece = board[rank][7];
            board[rank][5] = board[rank][7];
            board[rank][7] = null;
        } else {
            undo.rookFrom = { file: 0, rank };
            undo.rookTo = { file: 3, rank };
            undo.rookPiece = board[rank][0];
            board[rank][3] = board[rank][0];
            board[rank][0] = null;
        }
    }

    // Handle en passant
    if (move.isEnPassant) {
        undo.epCaptureSquare = { file: move.to.file, rank: move.from.rank };
        undo.epCapturedPiece = board[move.from.rank][move.to.file];
        board[move.from.rank][move.to.file] = null;
    }

    // Update en passant target
    if (move.piece.type === 'pawn' && Math.abs(move.to.rank - move.from.rank) === 2) {
        state.enPassantTarget = {
            file: move.from.file,
            rank: (move.from.rank + move.to.rank) / 2,
        };
    } else {
        state.enPassantTarget = null;
    }

    // Update castling rights
    if (move.piece.type === 'king') {
        state.castlingRights[move.piece.color] = { kingside: false, queenside: false };
    }
    if (move.piece.type === 'rook') {
        if (move.from.file === 0) {
            state.castlingRights[move.piece.color].queenside = false;
        }
        if (move.from.file === 7) {
            state.castlingRights[move.piece.color].kingside = false;
        }
    }
    // Also revoke castling if a rook is captured
    if (move.captured?.type === 'rook') {
        const capturedColor = move.captured.color;
        if (move.to.file === 0) {
            state.castlingRights[capturedColor].queenside = false;
        }
        if (move.to.file === 7) {
            state.castlingRights[capturedColor].kingside = false;
        }
    }

    // Switch turn
    state.turn = state.turn === 'white' ? 'black' : 'white';

    // Update check status
    state.isCheck = isInCheck(board, state.turn);
    state.isCheckmate = false;
    state.isStalemate = false;

    return undo;
}

/**
 * Unmake a move, restoring previous state
 */
function unmakeMoveInPlace(state: GameState, move: Move, undo: UndoInfo): void {
    const board = state.board;

    // Restore piece positions
    board[move.from.rank][move.from.file] = undo.fromPiece;
    board[move.to.rank][move.to.file] = undo.toPiece;

    // Restore castling rook
    if (undo.rookFrom && undo.rookTo) {
        board[undo.rookFrom.rank][undo.rookFrom.file] = board[undo.rookTo.rank][undo.rookTo.file];
        board[undo.rookTo.rank][undo.rookTo.file] = null;
    }

    // Restore en passant captured pawn
    if (undo.epCaptureSquare) {
        board[undo.epCaptureSquare.rank][undo.epCaptureSquare.file] = undo.epCapturedPiece!;
    }

    // Restore state
    state.castlingRights.white.kingside = undo.castlingRights.white.kingside;
    state.castlingRights.white.queenside = undo.castlingRights.white.queenside;
    state.castlingRights.black.kingside = undo.castlingRights.black.kingside;
    state.castlingRights.black.queenside = undo.castlingRights.black.queenside;
    state.enPassantTarget = undo.enPassantTarget;
    state.halfMoveClock = undo.halfMoveClock;
    state.isCheck = undo.isCheck;
    state.isCheckmate = undo.isCheckmate;
    state.isStalemate = undo.isStalemate;
    state.isDraw = undo.isDraw;
    state.turn = undo.turn;
}

/**
 * Find the best move using Minimax with Alpha-Beta pruning
 */
export function findBestMove(
    state: GameState,
    depth: number,
    aiColor: PieceColor
): SearchResult {
    const result = minimax(
        state,
        depth,
        -Infinity,
        Infinity,
        state.turn === aiColor,
        aiColor,
        0
    );

    return result;
}

/**
 * Minimax algorithm with alpha-beta pruning (make/unmake pattern)
 */
function minimax(
    state: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    aiColor: PieceColor,
    nodesSearched: number
): SearchResult {
    // Base case: leaf node or game over
    if (depth === 0 || state.isCheckmate || state.isStalemate || state.isDraw) {
        return {
            move: null,
            score: evaluatePosition(state, aiColor),
            nodesSearched: nodesSearched + 1,
        };
    }

    const moves = generateLegalMoves(state);

    // No legal moves
    if (moves.length === 0) {
        if (state.isCheck) {
            return {
                move: null,
                score: isMaximizing ? -100000 + (10 - depth) : 100000 - (10 - depth),
                nodesSearched: nodesSearched + 1,
            };
        }
        return {
            move: null,
            score: 0,
            nodesSearched: nodesSearched + 1,
        };
    }

    // Order moves for better pruning
    orderMovesInPlace(moves);

    let bestMove: Move | null = null;
    let totalNodes = nodesSearched;

    if (isMaximizing) {
        let maxScore = -Infinity;

        for (const move of moves) {
            const undo = makeMoveInPlace(state, move);

            // Check for checkmate/stalemate at this node
            const childMoves = generateLegalMoves(state);
            if (childMoves.length === 0) {
                if (state.isCheck) {
                    state.isCheckmate = true;
                } else {
                    state.isStalemate = true;
                    state.isDraw = true;
                }
            }

            const result = minimax(state, depth - 1, alpha, beta, false, aiColor, totalNodes);
            totalNodes = result.nodesSearched;

            unmakeMoveInPlace(state, move, undo);

            if (result.score > maxScore) {
                maxScore = result.score;
                bestMove = move;
            }

            alpha = Math.max(alpha, result.score);
            if (beta <= alpha) {
                break;
            }
        }

        return { move: bestMove, score: maxScore, nodesSearched: totalNodes };
    } else {
        let minScore = Infinity;

        for (const move of moves) {
            const undo = makeMoveInPlace(state, move);

            const childMoves = generateLegalMoves(state);
            if (childMoves.length === 0) {
                if (state.isCheck) {
                    state.isCheckmate = true;
                } else {
                    state.isStalemate = true;
                    state.isDraw = true;
                }
            }

            const result = minimax(state, depth - 1, alpha, beta, true, aiColor, totalNodes);
            totalNodes = result.nodesSearched;

            unmakeMoveInPlace(state, move, undo);

            if (result.score < minScore) {
                minScore = result.score;
                bestMove = move;
            }

            beta = Math.min(beta, result.score);
            if (beta <= alpha) {
                break;
            }
        }

        return { move: bestMove, score: minScore, nodesSearched: totalNodes };
    }
}

/**
 * Evaluate position at leaf node
 */
function evaluatePosition(state: GameState, aiColor: PieceColor): number {
    if (state.isCheckmate) {
        return state.turn === aiColor ? -100000 : 100000;
    }

    if (state.isStalemate || state.isDraw) {
        return 0;
    }

    return evaluateBoard(state.board, aiColor);
}

/**
 * Order moves in-place for better alpha-beta pruning
 */
function orderMovesInPlace(moves: Move[]): void {
    moves.sort((a, b) => {
        return getMoveOrderScore(b) - getMoveOrderScore(a);
    });
}

/**
 * Score a move for ordering purposes
 */
function getMoveOrderScore(move: Move): number {
    let score = 0;

    if (move.captured) {
        const victimValue = SIMPLE_PIECE_VALUES[move.captured.type] || 0;
        const attackerValue = SIMPLE_PIECE_VALUES[move.piece.type] || 0;
        score += 10000 + victimValue - attackerValue / 100;
    }

    if (move.promotion) {
        score += 9000;
    }

    if (move.to.file >= 3 && move.to.file <= 4 && move.to.rank >= 3 && move.to.rank <= 5) {
        score += 50;
    }

    return score;
}

const SIMPLE_PIECE_VALUES: Record<string, number> = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000,
};

/**
 * Iterative deepening search (for time-limited search)
 */
export function iterativeDeepening(
    state: GameState,
    maxDepth: number,
    maxTimeMs: number,
    aiColor: PieceColor
): SearchResult {
    const startTime = Date.now();
    let bestResult: SearchResult = { move: null, score: 0, nodesSearched: 0 };

    for (let depth = 1; depth <= maxDepth; depth++) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= maxTimeMs) {
            break;
        }

        const result = findBestMove(state, depth, aiColor);
        bestResult = result;

        if (Math.abs(result.score) > 90000) {
            break;
        }
    }

    return bestResult;
}
