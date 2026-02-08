'use client';

import { useEffect, useState, useCallback } from 'react';
import Board from '@/components/game/Board';
import MoveHistory from '@/components/game/MoveHistory';
import { GameState, Move, PieceColor, PieceType, BoardState } from '@/types';
import { createInitialGameState } from '@/lib/chess/board';
import Link from 'next/link';

interface ReplayMove {
    moveNumber: number;
    player: string;
    fromSquare: string;
    toSquare: string;
    piece: string;
    captured?: string;
    promotion?: string;
    isCheck: boolean;
    isCheckmate: boolean;
    isCastling?: string;
    isEnPassant: boolean;
    notation: string;
    boardState: BoardState;
}

export default function ReplayPage({ params }: { params: { gameId: string } }) {
    const [moves, setMoves] = useState<ReplayMove[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
    const [loading, setLoading] = useState(true);
    const [autoPlaying, setAutoPlaying] = useState(false);

    // Fetch replay moves
    useEffect(() => {
        async function fetchReplay() {
            try {
                const res = await fetch(`/api/replay/${params.gameId}`);
                const data = await res.json();
                if (data.success) {
                    setMoves(data.data);
                }
            } catch {
                console.error('Failed to fetch replay');
            } finally {
                setLoading(false);
            }
        }
        fetchReplay();
    }, [params.gameId]);

    // Navigate to a specific move index
    const goToMove = useCallback((index: number) => {
        if (index < -1 || index >= moves.length) return;
        setCurrentIndex(index);

        // Reconstruct game state by replaying from start
        let state = createInitialGameState();
        const replayedMoves: Move[] = [];

        for (let i = 0; i <= index; i++) {
            const m = moves[i];
            // If we have stored board state, use it
            if (m.boardState) {
                state = {
                    ...state,
                    board: m.boardState,
                    turn: i % 2 === 0 ? 'black' : 'white',
                    isCheck: m.isCheck,
                    isCheckmate: m.isCheckmate,
                    moveHistory: replayedMoves,
                };
            }
            replayedMoves.push({
                from: { file: m.fromSquare.charCodeAt(0) - 97, rank: parseInt(m.fromSquare[1]) - 1 },
                to: { file: m.toSquare.charCodeAt(0) - 97, rank: parseInt(m.toSquare[1]) - 1 },
                piece: { type: m.piece as PieceType, color: m.player as PieceColor },
                notation: m.notation,
                isCheck: m.isCheck,
                isCheckmate: m.isCheckmate,
            });
        }

        state.moveHistory = replayedMoves;
        setGameState(state);
    }, [moves]);

    // Auto-play
    useEffect(() => {
        if (!autoPlaying) return;
        if (currentIndex >= moves.length - 1) {
            setAutoPlaying(false);
            return;
        }

        const timer = setTimeout(() => {
            goToMove(currentIndex + 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [autoPlaying, currentIndex, moves.length, goToMove]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goToMove(currentIndex - 1);
            if (e.key === 'ArrowRight') goToMove(currentIndex + 1);
            if (e.key === 'Home') goToMove(-1);
            if (e.key === 'End') goToMove(moves.length - 1);
            if (e.key === ' ') {
                e.preventDefault();
                setAutoPlaying(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, moves.length, goToMove]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-400">Loading replay...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <Link href="/profile" className="text-primary hover:underline mb-4 inline-block">
                    &larr; Back to Profile
                </Link>

                <h1 className="text-2xl font-bold mb-6">Game Replay</h1>

                <div className="grid lg:grid-cols-[auto_300px] gap-6">
                    {/* Board */}
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <Board
                                gameState={gameState}
                                onMove={() => {}}
                                disabled={true}
                                lastMove={currentIndex >= 0 ? gameState.moveHistory[currentIndex] : null}
                            />
                        </div>

                        {/* Replay Controls */}
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => goToMove(-1)}
                                className="btn bg-gray-700 hover:bg-gray-600 px-3 py-2"
                                disabled={currentIndex <= -1}
                            >
                                &#x23EE;
                            </button>
                            <button
                                onClick={() => goToMove(currentIndex - 1)}
                                className="btn bg-gray-700 hover:bg-gray-600 px-3 py-2"
                                disabled={currentIndex <= -1}
                            >
                                &#x23EA;
                            </button>
                            <button
                                onClick={() => setAutoPlaying(prev => !prev)}
                                className={`btn px-4 py-2 ${autoPlaying ? 'btn-danger' : 'btn-primary'}`}
                            >
                                {autoPlaying ? '&#x23F8;' : '&#x25B6;'}
                            </button>
                            <button
                                onClick={() => goToMove(currentIndex + 1)}
                                className="btn bg-gray-700 hover:bg-gray-600 px-3 py-2"
                                disabled={currentIndex >= moves.length - 1}
                            >
                                &#x23E9;
                            </button>
                            <button
                                onClick={() => goToMove(moves.length - 1)}
                                className="btn bg-gray-700 hover:bg-gray-600 px-3 py-2"
                                disabled={currentIndex >= moves.length - 1}
                            >
                                &#x23ED;
                            </button>
                        </div>

                        <div className="text-center text-sm text-gray-400">
                            Move {currentIndex + 1} of {moves.length} | Use arrow keys or space to auto-play
                        </div>
                    </div>

                    {/* Move History */}
                    <div>
                        <MoveHistory
                            moves={gameState.moveHistory}
                            currentMoveIndex={currentIndex >= 0 ? currentIndex : undefined}
                            onMoveClick={(index) => goToMove(index)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
