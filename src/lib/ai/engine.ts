// Main AI Engine Interface for Knight Chess

import { GameState, Move, PieceColor, GameDifficulty } from '@/types';
import { generateLegalMoves, isInCheck } from '../chess/moves';
import { cloneGameState, cloneBoard } from '../chess/board';
import { AI_CONFIG } from '../chess/constants';
import { findBestMove } from './minimax';
import { shouldBlunder, selectBlunderMove, getThinkTime } from './blunder';

interface AIResponse {
    move: Move;
    thinkTime: number;
    evaluation: number;
    depth: number;
    nodesSearched: number;
    isBlunder: boolean;
}

/**
 * Get AI move for current game state
 */
export async function getAIMove(
    state: GameState,
    difficulty: GameDifficulty,
    aiColor: PieceColor
): Promise<AIResponse | null> {
    const config = AI_CONFIG[difficulty];
    const legalMoves = generateLegalMoves(state);

    if (legalMoves.length === 0) {
        return null;
    }

    // Single legal move - play it immediately
    if (legalMoves.length === 1) {
        return {
            move: legalMoves[0],
            thinkTime: 200,
            evaluation: 0,
            depth: 0,
            nodesSearched: 1,
            isBlunder: false,
        };
    }

    // Check for checkmate move first (always play it)
    const checkmateMove = findCheckmateMove(state, legalMoves);
    if (checkmateMove) {
        return {
            move: checkmateMove,
            thinkTime: 500,
            evaluation: 100000,
            depth: 1,
            nodesSearched: legalMoves.length,
            isBlunder: false,
        };
    }

    // Clone state once for minimax (it mutates internally via make/unmake)
    const searchState = cloneGameState(state);
    const searchResult = findBestMove(searchState, config.searchDepth, aiColor);

    if (!searchResult.move) {
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        return {
            move: randomMove,
            thinkTime: getThinkTime(difficulty),
            evaluation: 0,
            depth: config.searchDepth,
            nodesSearched: searchResult.nodesSearched,
            isBlunder: true,
        };
    }

    // Determine if we should blunder
    let finalMove = searchResult.move;
    let isBlunder = false;

    if (shouldBlunder(difficulty)) {
        const blunderMove = selectBlunderMove(state, legalMoves, searchResult.move, difficulty);
        if (blunderMove) {
            finalMove = blunderMove;
            isBlunder = true;
        }
    }

    return {
        move: finalMove,
        thinkTime: getThinkTime(difficulty),
        evaluation: searchResult.score,
        depth: config.searchDepth,
        nodesSearched: searchResult.nodesSearched,
        isBlunder,
    };
}

/**
 * Get AI move with simulated thinking delay
 */
export async function getAIMoveWithDelay(
    state: GameState,
    difficulty: GameDifficulty,
    aiColor: PieceColor
): Promise<AIResponse | null> {
    // Yield to browser before heavy computation
    await new Promise(resolve => setTimeout(resolve, 0));

    const result = await getAIMove(state, difficulty, aiColor);

    if (!result) return null;

    // Simulate thinking time
    await delay(result.thinkTime);

    return result;
}

/**
 * Find immediate checkmate move (lightweight check)
 */
function findCheckmateMove(state: GameState, moves: Move[]): Move | null {
    for (const move of moves) {
        const newBoard = cloneBoard(state.board);

        const piece = move.promotion
            ? { type: move.promotion, color: move.piece.color } as const
            : move.piece;

        newBoard[move.from.rank][move.from.file] = null;
        newBoard[move.to.rank][move.to.file] = piece;

        // Handle en passant
        if (move.isEnPassant) {
            newBoard[move.from.rank][move.to.file] = null;
        }

        // Handle castling
        if (move.isCastling) {
            const rank = move.from.rank;
            if (move.isCastling === 'kingside') {
                newBoard[rank][5] = newBoard[rank][7];
                newBoard[rank][7] = null;
            } else {
                newBoard[rank][3] = newBoard[rank][0];
                newBoard[rank][0] = null;
            }
        }

        const opponentColor = state.turn === 'white' ? 'black' : 'white';
        if (!isInCheck(newBoard, opponentColor)) {
            continue;
        }

        // Check if opponent has any legal response
        const tempState: GameState = {
            ...state,
            board: newBoard,
            turn: opponentColor,
            isCheck: true,
            isCheckmate: false,
            isStalemate: false,
            isDraw: false,
            enPassantTarget: null,
        };

        const opponentMoves = generateLegalMoves(tempState);
        if (opponentMoves.length === 0) {
            return move;
        }
    }
    return null;
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get difficulty description
 */
export function getDifficultyInfo(difficulty: GameDifficulty) {
    return {
        ...AI_CONFIG[difficulty],
        expectedWinRate: {
            easy: '60-70%',
            medium: '40-50%',
            difficult: '20-30%',
        }[difficulty],
    };
}

/**
 * Analyze a position (for future features)
 */
export function analyzePosition(state: GameState, depth: number = 4): {
    evaluation: number;
    bestLine: Move[];
    threats: string[];
} {
    const aiColor = state.turn;
    const searchState = cloneGameState(state);
    const result = findBestMove(searchState, depth, aiColor);

    return {
        evaluation: result.score,
        bestLine: result.move ? [result.move] : [],
        threats: detectThreats(state),
    };
}

/**
 * Detect threats in position
 */
function detectThreats(state: GameState): string[] {
    const threats: string[] = [];

    if (state.isCheck) {
        threats.push('King is in check');
    }

    return threats;
}
