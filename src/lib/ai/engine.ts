// Main AI Engine Interface for Knight Chess

import { GameState, Move, PieceColor, GameDifficulty } from '@/types';
import { generateLegalMoves, isInCheck } from '../chess/moves';
import { cloneGameState, setPieceAt } from '../chess/board';
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

    // Find best move using minimax
    const searchResult = findBestMove(state, config.searchDepth, aiColor);

    if (!searchResult.move) {
        // Fallback to random legal move
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
    const result = await getAIMove(state, difficulty, aiColor);

    if (!result) return null;

    // Simulate thinking time
    await delay(result.thinkTime);

    return result;
}

/**
 * Find immediate checkmate move
 */
function findCheckmateMove(state: GameState, moves: Move[]): Move | null {
    for (const move of moves) {
        // Quick check if this move gives checkmate
        const newState = applyMoveQuick(state, move);
        if (newState.isCheckmate) {
            return move;
        }
    }
    return null;
}

/**
 * Quick move application for checkmate detection
 */
function applyMoveQuick(state: GameState, move: Move): { isCheckmate: boolean } {
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

    if (!newState.isCheck) {
        return { isCheckmate: false };
    }

    const opponentMoves = generateLegalMoves(newState);
    return { isCheckmate: opponentMoves.length === 0 };
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
    const result = findBestMove(state, depth, aiColor);

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

    // Add more threat detection as needed

    return threats;
}
