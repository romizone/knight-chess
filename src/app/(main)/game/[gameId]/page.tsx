'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Board from '@/components/game/Board';
import Timer from '@/components/game/Timer';
import MoveHistory from '@/components/game/MoveHistory';
import GameControls from '@/components/game/GameControls';
import GameOverModal from '@/components/game/GameOverModal';
import { useGameStore } from '@/stores/gameStore';
import { useSoundStore } from '@/stores/soundStore';
import { GameDifficulty } from '@/types';
import { TIME_CONTROLS } from '@/lib/chess/constants';

function ThinkingIndicator() {
    const [elapsed, setElapsed] = useState(0);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        startTimeRef.current = Date.now();
        setElapsed(0);
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 100) / 10);
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-4 py-2">
            <div className="flex gap-1">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-yellow-400 font-medium">
                AI is thinking...
            </span>
            <span className="text-sm text-yellow-300 font-mono tabular-nums">
                {elapsed.toFixed(1)}s
            </span>
        </div>
    );
}

export default function GamePage({ params }: { params: { gameId: string } }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const difficulty = (searchParams.get('difficulty') || 'medium') as GameDifficulty;

    const {
        gameState,
        playerColor,
        whiteTime,
        blackTime,
        isGameOver,
        result,
        endReason,
        tokensWon,
        lastMove,
        isAIThinking,
        initGame,
        makeMove,
        resign,
        offerDraw,
        resetGame,
        handleTimeout,
    } = useGameStore();

    const { soundEnabled, toggleSound } = useSoundStore();

    // Initialize game on mount
    useEffect(() => {
        if (!gameState) {
            initGame(difficulty);
        }
    }, [gameState, difficulty, initGame]);

    // Handle resign
    const handleResign = useCallback(async () => {
        resign();
        try {
            await fetch(`/api/game/${params.gameId}/resign`, { method: 'POST' });
        } catch {
            // Ignore API errors for resign
        }
    }, [resign, params.gameId]);

    // Handle play again
    const handlePlayAgain = useCallback(() => {
        resetGame();
        router.push('/play/computer');
    }, [resetGame, router]);

    // Handle back to menu
    const handleBackToMenu = useCallback(() => {
        resetGame();
        router.push('/play');
    }, [resetGame, router]);

    if (!gameState) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-5xl mb-4 animate-spin">&#9822;</div>
                    <p className="text-gray-400">Setting up the board...</p>
                </div>
            </div>
        );
    }

    const timeControl = TIME_CONTROLS[difficulty] || TIME_CONTROLS.medium;
    const isPlayerTurn = gameState.turn === playerColor;
    const opponentColor = playerColor === 'white' ? 'black' : 'white';

    return (
        <div className="min-h-screen p-4 md:p-6">
            {/* Header */}
            <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">&#9822;</span>
                    <span className="text-xl font-bold">
                        Knight <span className="text-primary">Chess</span>
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {isAIThinking && <ThinkingIndicator />}
                    <span className="text-sm text-gray-400 capitalize">{difficulty} Mode</span>
                </div>
            </header>

            {/* Main Game Area */}
            <div className="max-w-6xl mx-auto grid lg:grid-cols-[auto_300px] gap-6">
                {/* Left: Board Area */}
                <div className="space-y-4">
                    {/* Opponent Info */}
                    <div className="flex items-center justify-between bg-surface rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-2xl">
                                &#129302;
                            </div>
                            <div>
                                <div className="font-bold">Computer</div>
                                <div className="text-sm text-gray-400 capitalize">{difficulty}</div>
                            </div>
                        </div>
                        <Timer
                            initialTime={opponentColor === 'white' ? whiteTime : blackTime}
                            increment={timeControl.increment}
                            isActive={gameState.turn === opponentColor && !isGameOver}
                            onTimeout={() => handleTimeout(opponentColor)}
                        />
                    </div>

                    {/* Chess Board */}
                    <div className="flex justify-center">
                        <Board
                            gameState={gameState}
                            onMove={makeMove}
                            flipped={playerColor === 'black'}
                            lastMove={lastMove}
                            disabled={isGameOver || !isPlayerTurn || isAIThinking}
                        />
                    </div>

                    {/* Player Info */}
                    <div className="flex items-center justify-between bg-surface rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-2xl">
                                &#128100;
                            </div>
                            <div>
                                <div className="font-bold">You</div>
                                <div className="text-sm text-gray-400 capitalize">{playerColor}</div>
                            </div>
                        </div>
                        <Timer
                            initialTime={playerColor === 'white' ? whiteTime : blackTime}
                            increment={timeControl.increment}
                            isActive={gameState.turn === playerColor && !isGameOver}
                            onTimeout={() => handleTimeout(playerColor)}
                        />
                    </div>
                </div>

                {/* Right: Sidebar */}
                <div className="space-y-4">
                    <MoveHistory moves={gameState.moveHistory} />
                    <GameControls
                        onResign={handleResign}
                        onOfferDraw={offerDraw}
                        soundEnabled={soundEnabled}
                        onToggleSound={toggleSound}
                        disabled={isGameOver}
                    />
                </div>
            </div>

            {/* Game Over Modal */}
            {endReason && (
                <GameOverModal
                    isOpen={isGameOver}
                    result={result}
                    reason={endReason}
                    tokensWon={tokensWon}
                    playerColor={playerColor}
                    onPlayAgain={handlePlayAgain}
                    onBackToMenu={handleBackToMenu}
                />
            )}
        </div>
    );
}
