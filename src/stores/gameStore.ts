// Zustand Store for Game State

import { create } from 'zustand';
import { GameState, Move, GameDifficulty, PieceColor, GameResult, EndReason } from '@/types';
import { createInitialGameState } from '@/lib/chess/board';
import { applyMove } from '@/lib/chess/applyMove';

// AI Worker singleton
let aiWorker: Worker | null = null;

function getAIWorker(): Worker {
    if (!aiWorker) {
        aiWorker = new Worker('/ai-worker.js');
    }
    return aiWorker;
}

function computeAIMove(
    gameState: GameState,
    difficulty: GameDifficulty,
    aiColor: PieceColor
): Promise<{
    move: Move;
    thinkTime: number;
    evaluation: number;
    depth: number;
    nodesSearched: number;
    isBlunder: boolean;
} | null> {
    return new Promise((resolve, reject) => {
        const worker = getAIWorker();

        const handler = (e: MessageEvent) => {
            worker.removeEventListener('message', handler);
            worker.removeEventListener('error', errorHandler);
            if (e.data.type === 'moveResult') {
                resolve(e.data.result);
            } else if (e.data.type === 'error') {
                reject(new Error(e.data.error));
            }
        };

        const errorHandler = (e: ErrorEvent) => {
            worker.removeEventListener('message', handler);
            worker.removeEventListener('error', errorHandler);
            reject(new Error(e.message || 'Worker error'));
        };

        worker.addEventListener('message', handler);
        worker.addEventListener('error', errorHandler);

        worker.postMessage({
            type: 'computeMove',
            gameState,
            difficulty,
            aiColor,
        });
    });
}

interface GameStore {
    // Game state
    gameState: GameState | null;
    gameId: string | null;
    difficulty: GameDifficulty;
    playerColor: PieceColor;

    // Timers
    whiteTime: number;
    blackTime: number;
    isTimerActive: boolean;

    // Game status
    isGameOver: boolean;
    result: GameResult;
    endReason: EndReason | null;
    tokensWon: number;

    // UI state
    lastMove: Move | null;
    isAIThinking: boolean;
    aiThinkingStartTime: number | null;

    // Actions
    initGame: (difficulty: GameDifficulty, playerColor?: PieceColor) => void;
    makeMove: (move: Move) => Promise<void>;
    makeAIMove: () => Promise<void>;
    resign: () => void;
    offerDraw: () => void;
    resetGame: () => void;
    setTimerActive: (active: boolean) => void;
    updateTimer: (color: PieceColor, time: number) => void;
    handleTimeout: (color: PieceColor) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
    // Initial state
    gameState: null,
    gameId: null,
    difficulty: 'difficult',
    playerColor: 'white',
    whiteTime: 600,
    blackTime: 600,
    isTimerActive: false,
    isGameOver: false,
    result: null,
    endReason: null,
    tokensWon: 0,
    lastMove: null,
    isAIThinking: false,
    aiThinkingStartTime: null,

    // Initialize a new game
    initGame: (difficulty: GameDifficulty, playerColor: PieceColor = 'white') => {
        const gameState = createInitialGameState();
        const timeControl = 600; // 10 minutes

        set({
            gameState,
            gameId: `local-${Date.now()}`,
            difficulty,
            playerColor,
            whiteTime: timeControl,
            blackTime: timeControl,
            isTimerActive: true,
            isGameOver: false,
            result: null,
            endReason: null,
            tokensWon: 0,
            lastMove: null,
            isAIThinking: false,
            aiThinkingStartTime: null,
        });

        // If player is black, AI moves first
        if (playerColor === 'black') {
            set({ isAIThinking: true, aiThinkingStartTime: Date.now() });
            setTimeout(() => get().makeAIMove(), 500);
        }
    },

    // Make a move
    makeMove: async (move: Move) => {
        const { gameState, playerColor } = get();
        if (!gameState || get().isGameOver || get().isAIThinking) return;

        // Validate it's the correct turn
        if (gameState.turn !== playerColor) return;

        // Apply move
        const newState = applyMove(gameState, move);

        set({
            gameState: newState,
            lastMove: move,
        });

        // Check for game over
        if (newState.isCheckmate || newState.isStalemate || newState.isDraw) {
            const result = newState.isCheckmate
                ? (newState.turn === 'white' ? 'black_wins' : 'white_wins')
                : 'draw';
            const isPlayerWin =
                (result === 'white_wins' && playerColor === 'white') ||
                (result === 'black_wins' && playerColor === 'black');

            set({
                isGameOver: true,
                result,
                endReason: newState.isCheckmate ? 'checkmate' : 'stalemate',
                tokensWon: isPlayerWin ? 2 : (result === 'draw' ? 1 : 0),
                isTimerActive: false,
            });
            return;
        }

        // AI's turn
        set({ isAIThinking: true, aiThinkingStartTime: Date.now() });
        await get().makeAIMove();
    },

    // Make AI move (via Web Worker)
    makeAIMove: async () => {
        const { gameState, difficulty, playerColor } = get();
        if (!gameState || get().isGameOver) return;

        const aiColor = playerColor === 'white' ? 'black' : 'white';

        try {
            const aiResponse = await computeAIMove(gameState, difficulty, aiColor);

            if (aiResponse && aiResponse.move) {
                // Simulate remaining think time (worker computes instantly, but we want natural delay)
                const elapsed = Date.now() - (get().aiThinkingStartTime || Date.now());
                const remainingDelay = Math.max(0, aiResponse.thinkTime - elapsed);
                if (remainingDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, remainingDelay));
                }

                const newState = applyMove(gameState, aiResponse.move);

                set({
                    gameState: newState,
                    lastMove: aiResponse.move,
                    isAIThinking: false,
                    aiThinkingStartTime: null,
                });

                // Check for game over after AI move
                if (newState.isCheckmate || newState.isStalemate || newState.isDraw) {
                    const result = newState.isCheckmate
                        ? (newState.turn === 'white' ? 'black_wins' : 'white_wins')
                        : 'draw';
                    const isPlayerWin =
                        (result === 'white_wins' && playerColor === 'white') ||
                        (result === 'black_wins' && playerColor === 'black');

                    set({
                        isGameOver: true,
                        result,
                        endReason: newState.isCheckmate ? 'checkmate' : 'stalemate',
                        tokensWon: isPlayerWin ? 2 : (result === 'draw' ? 1 : 0),
                        isTimerActive: false,
                    });
                }
            } else {
                set({ isAIThinking: false, aiThinkingStartTime: null });
            }
        } catch (error) {
            console.error('AI move error:', error);
            set({ isAIThinking: false, aiThinkingStartTime: null });
        }
    },

    // Resign
    resign: () => {
        const { playerColor } = get();
        set({
            isGameOver: true,
            result: playerColor === 'white' ? 'black_wins' : 'white_wins',
            endReason: 'resignation',
            tokensWon: 0,
            isTimerActive: false,
        });
    },

    // Offer draw (AI always declines)
    offerDraw: () => {
        // AI declines - no state change
        console.log('Draw offer declined by AI');
    },

    // Reset game
    resetGame: () => {
        set({
            gameState: null,
            gameId: null,
            isGameOver: false,
            result: null,
            endReason: null,
            tokensWon: 0,
            lastMove: null,
            isAIThinking: false,
            aiThinkingStartTime: null,
            isTimerActive: false,
        });
    },

    // Timer controls
    setTimerActive: (active: boolean) => set({ isTimerActive: active }),

    updateTimer: (color: PieceColor, time: number) => {
        if (color === 'white') {
            set({ whiteTime: time });
        } else {
            set({ blackTime: time });
        }
    },

    handleTimeout: (color: PieceColor) => {
        const { playerColor } = get();
        const isPlayerTimeout = color === playerColor;

        set({
            isGameOver: true,
            result: color === 'white' ? 'black_wins' : 'white_wins',
            endReason: 'timeout',
            tokensWon: isPlayerTimeout ? 0 : 2,
            isTimerActive: false,
        });
    },
}));
