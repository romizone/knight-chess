// Zustand Store for Game State

import { create } from 'zustand';
import { GameState, Move, GameDifficulty, PieceColor, GameResult, EndReason } from '@/types';
import { createInitialGameState } from '@/lib/chess/board';
import { getAIMoveWithDelay } from '@/lib/ai/engine';
import { applyMove } from '@/lib/chess/applyMove';

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
    difficulty: 'medium',
    playerColor: 'white',
    whiteTime: 300,
    blackTime: 300,
    isTimerActive: false,
    isGameOver: false,
    result: null,
    endReason: null,
    tokensWon: 0,
    lastMove: null,
    isAIThinking: false,

    // Initialize a new game
    initGame: (difficulty: GameDifficulty, playerColor: PieceColor = 'white') => {
        const gameState = createInitialGameState();
        const timeControl = difficulty === 'difficult' ? 600 : 300;

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
        });

        // If player is black, AI moves first
        if (playerColor === 'black') {
            get().isAIThinking = true;
            setTimeout(() => get().makeAIMove(), 500);
        }
    },

    // Make a move
    makeMove: async (move: Move) => {
        const { gameState, difficulty, playerColor } = get();
        if (!gameState || get().isGameOver || get().isAIThinking) return;

        // Validate it's the correct turn
        if (gameState.turn !== playerColor) return;

        // Apply move
        const newState = applyMove(gameState, move);

        // Update timers (add increment)
        const increment = difficulty === 'easy' ? 3 : 5;
        const currentTime = playerColor === 'white' ? get().whiteTime : get().blackTime;

        set({
            gameState: newState,
            lastMove: move,
            whiteTime: playerColor === 'white' ? currentTime + increment : get().whiteTime,
            blackTime: playerColor === 'black' ? currentTime + increment : get().blackTime,
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
        set({ isAIThinking: true });
        await get().makeAIMove();
    },

    // Make AI move (internal)
    makeAIMove: async () => {
        const { gameState, difficulty, playerColor } = get();
        if (!gameState || get().isGameOver) return;

        const aiColor = playerColor === 'white' ? 'black' : 'white';

        try {
            const aiResponse = await getAIMoveWithDelay(gameState, difficulty, aiColor);

            if (aiResponse && aiResponse.move) {
                const newState = applyMove(gameState, aiResponse.move);

                // Add increment for AI
                const increment = difficulty === 'easy' ? 3 : 5;
                const aiTime = aiColor === 'white' ? get().whiteTime : get().blackTime;

                set({
                    gameState: newState,
                    lastMove: aiResponse.move,
                    whiteTime: aiColor === 'white' ? aiTime + increment : get().whiteTime,
                    blackTime: aiColor === 'black' ? aiTime + increment : get().blackTime,
                    isAIThinking: false,
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
            }
        } catch (error) {
            console.error('AI move error:', error);
            set({ isAIThinking: false });
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

// applyMove is now imported from '@/lib/chess/applyMove'
