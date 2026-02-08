// Minimax Algorithm with Alpha-Beta Pruning for Knight Chess AI

import { GameState, Move, PieceColor } from '@/types';
import { cloneGameState, setPieceAt, getPieceAt } from '../chess/board';
import { generateLegalMoves, isInCheck } from '../chess/moves';
import { evaluateBoard } from './evaluation';

interface SearchResult {
    move: Move | null;
    score: number;
    nodesSearched: number;
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
 * Minimax algorithm with alpha-beta pruning
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
            // Checkmate
            return {
                move: null,
                score: isMaximizing ? -100000 + (10 - depth) : 100000 - (10 - depth),
                nodesSearched: nodesSearched + 1,
            };
        }
        // Stalemate
        return {
            move: null,
            score: 0,
            nodesSearched: nodesSearched + 1,
        };
    }

    // Order moves for better pruning
    const orderedMoves = orderMoves(state, moves);

    let bestMove: Move | null = null;
    let totalNodes = nodesSearched;

    if (isMaximizing) {
        let maxScore = -Infinity;

        for (const move of orderedMoves) {
            const newState = makeMove(state, move);
            const result = minimax(newState, depth - 1, alpha, beta, false, aiColor, totalNodes);
            totalNodes = result.nodesSearched;

            if (result.score > maxScore) {
                maxScore = result.score;
                bestMove = move;
            }

            alpha = Math.max(alpha, result.score);
            if (beta <= alpha) {
                break; // Beta cutoff
            }
        }

        return { move: bestMove, score: maxScore, nodesSearched: totalNodes };
    } else {
        let minScore = Infinity;

        for (const move of orderedMoves) {
            const newState = makeMove(state, move);
            const result = minimax(newState, depth - 1, alpha, beta, true, aiColor, totalNodes);
            totalNodes = result.nodesSearched;

            if (result.score < minScore) {
                minScore = result.score;
                bestMove = move;
            }

            beta = Math.min(beta, result.score);
            if (beta <= alpha) {
                break; // Alpha cutoff
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
        // If it's AI's turn and checkmate, AI loses
        return state.turn === aiColor ? -100000 : 100000;
    }

    if (state.isStalemate || state.isDraw) {
        return 0;
    }

    return evaluateBoard(state.board, aiColor);
}

/**
 * Order moves for better alpha-beta pruning
 * (captures, checks, promotions first)
 */
function orderMoves(state: GameState, moves: Move[]): Move[] {
    return moves.sort((a, b) => {
        const scoreA = getMoveOrderScore(state, a);
        const scoreB = getMoveOrderScore(state, b);
        return scoreB - scoreA;
    });
}

/**
 * Score a move for ordering purposes
 */
function getMoveOrderScore(state: GameState, move: Move): number {
    let score = 0;

    // Captures are high priority (MVV-LVA)
    if (move.captured) {
        const victimValue = getSimplePieceValue(move.captured.type);
        const attackerValue = getSimplePieceValue(move.piece.type);
        score += 10000 + victimValue - attackerValue / 100;
    }

    // Promotions
    if (move.promotion) {
        score += 9000;
    }

    // Checks (need to test move to know)
    // Skip for performance, captures/promotions are usually enough

    // Center moves
    if (move.to.file >= 3 && move.to.file <= 4 && move.to.rank >= 3 && move.to.rank <= 5) {
        score += 50;
    }

    return score;
}

/**
 * Simple piece values for move ordering
 */
function getSimplePieceValue(type: string): number {
    const values: Record<string, number> = {
        pawn: 100,
        knight: 320,
        bishop: 330,
        rook: 500,
        queen: 900,
        king: 20000,
    };
    return values[type] || 0;
}

/**
 * Make a move and return new state
 */
function makeMove(state: GameState, move: Move): GameState {
    const newState = cloneGameState(state);

    // Move piece
    const piece = move.promotion
        ? { type: move.promotion, color: move.piece.color }
        : move.piece;

    newState.board = setPieceAt(
        setPieceAt(state.board, move.from, null),
        move.to,
        piece
    );

    // Handle castling
    if (move.isCastling) {
        const rank = move.from.rank;
        if (move.isCastling === 'kingside') {
            const rook = getPieceAt(newState.board, { file: 7, rank });
            newState.board = setPieceAt(newState.board, { file: 7, rank }, null);
            newState.board = setPieceAt(newState.board, { file: 5, rank }, rook);
        } else {
            const rook = getPieceAt(newState.board, { file: 0, rank });
            newState.board = setPieceAt(newState.board, { file: 0, rank }, null);
            newState.board = setPieceAt(newState.board, { file: 3, rank }, rook);
        }
    }

    // Handle en passant
    if (move.isEnPassant) {
        newState.board = setPieceAt(
            newState.board,
            { file: move.to.file, rank: move.from.rank },
            null
        );
    }

    // Update en passant target
    if (move.piece.type === 'pawn' && Math.abs(move.to.rank - move.from.rank) === 2) {
        newState.enPassantTarget = {
            file: move.from.file,
            rank: (move.from.rank + move.to.rank) / 2,
        };
    } else {
        newState.enPassantTarget = null;
    }

    // Update castling rights
    if (move.piece.type === 'king') {
        newState.castlingRights[move.piece.color] = { kingside: false, queenside: false };
    }
    if (move.piece.type === 'rook') {
        if (move.from.file === 0) {
            newState.castlingRights[move.piece.color].queenside = false;
        }
        if (move.from.file === 7) {
            newState.castlingRights[move.piece.color].kingside = false;
        }
    }

    // Switch turn
    newState.turn = state.turn === 'white' ? 'black' : 'white';

    // Update check status
    newState.isCheck = isInCheck(newState.board, newState.turn);

    // Check for checkmate/stalemate
    const legalMoves = generateLegalMoves(newState);
    if (legalMoves.length === 0) {
        if (newState.isCheck) {
            newState.isCheckmate = true;
        } else {
            newState.isStalemate = true;
            newState.isDraw = true;
        }
    }

    return newState;
}

/**
 * Iterative deepening search (optional, for time-limited search)
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

        // If we found a winning move, stop searching
        if (Math.abs(result.score) > 90000) {
            break;
        }
    }

    return bestResult;
}
