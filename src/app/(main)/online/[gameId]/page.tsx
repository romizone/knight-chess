'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Board from '@/components/game/Board';
import Timer from '@/components/game/Timer';
import MoveHistory from '@/components/game/MoveHistory';
import GameControls from '@/components/game/GameControls';
import GameOverModal from '@/components/game/GameOverModal';
import DrawOfferBanner from '@/components/game/DrawOfferBanner';
import { useOnlineGameStore } from '@/stores/onlineGameStore';
import { useSoundStore } from '@/stores/soundStore';
import Image from 'next/image';

export default function OnlineGamePage({ params }: { params: { gameId: string } }) {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);

    const {
        gameState,
        gameId,
        playerColor,
        opponent,
        whiteTime,
        blackTime,
        isGameOver,
        result,
        endReason,
        tokensWon,
        lastMove,
        drawOfferReceived,
        drawOfferSent,
        connectionStatus,
        initOnlineGame,
        makeMove,
        resign,
        offerDraw,
        respondToDraw,
        handleTimeout,
        resetStore,
    } = useOnlineGameStore();

    const { soundEnabled, toggleSound } = useSoundStore();

    // Load game data
    useEffect(() => {
        async function loadGame() {
            if (!session?.user?.id) return;

            try {
                const response = await fetch(`/api/online/game?gameId=${params.gameId}`);
                const data = await response.json();

                if (data.success) {
                    initOnlineGame(
                        params.gameId,
                        data.data.playerColor,
                        data.data.opponent,
                        data.data.board,
                        data.data.whiteKnightPositions,
                        data.data.blackKnightPositions,
                        session.user.id,
                    );
                } else {
                    router.push('/play');
                }
            } catch (error) {
                console.error('Error loading game:', error);
                router.push('/play');
            } finally {
                setLoading(false);
            }
        }

        if (!gameState || gameId !== params.gameId) {
            loadGame();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, params.gameId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Don't cleanup if game is still active - user might navigate back
        };
    }, []);

    const handleResign = useCallback(async () => {
        await resign();
    }, [resign]);

    const handleOfferDraw = useCallback(async () => {
        await offerDraw();
    }, [offerDraw]);

    const handlePlayAgain = useCallback(() => {
        resetStore();
        router.push('/play/online');
    }, [resetStore, router]);

    const handleBackToMenu = useCallback(() => {
        resetStore();
        router.push('/play');
    }, [resetStore, router]);

    if (loading || !gameState) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-5xl mb-4 animate-spin">&#9822;</div>
                    <p className="text-gray-400">Connecting to game...</p>
                </div>
            </div>
        );
    }

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
                    <span className="px-2 py-1 bg-secondary/20 text-secondary text-xs rounded-full font-semibold">
                        LIVE
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-400' :
                        connectionStatus === 'reconnecting' ? 'bg-yellow-400 animate-pulse' :
                        'bg-red-400'
                    }`} />
                    <span className="text-xs text-gray-500 capitalize">{connectionStatus}</span>
                </div>
            </header>

            {/* Draw Offer Banner */}
            {drawOfferReceived && (
                <DrawOfferBanner
                    onAccept={() => respondToDraw(true)}
                    onDecline={() => respondToDraw(false)}
                />
            )}

            {drawOfferSent && (
                <div className="max-w-6xl mx-auto mb-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                        <p className="text-yellow-400 text-sm">
                            Draw offer sent. Waiting for opponent&apos;s response...
                        </p>
                    </div>
                </div>
            )}

            {/* Main Game Area */}
            <div className="max-w-6xl mx-auto grid lg:grid-cols-[auto_300px] gap-6">
                {/* Left: Board Area */}
                <div className="space-y-4">
                    {/* Opponent Info */}
                    <div className="flex items-center justify-between bg-surface rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                                {opponent?.avatarUrl ? (
                                    <Image
                                        src={opponent.avatarUrl}
                                        alt={opponent.name || 'Opponent'}
                                        width={48}
                                        height={48}
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-2xl">&#128100;</span>
                                )}
                            </div>
                            <div>
                                <div className="font-bold">{opponent?.name || 'Opponent'}</div>
                                <div className="text-sm text-gray-400">
                                    Rating: {opponent?.rating || '---'}
                                    {!isPlayerTurn && !isGameOver && (
                                        <span className="ml-2 text-yellow-400">Thinking...</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Timer
                            initialTime={opponentColor === 'white' ? whiteTime : blackTime}
                            increment={0}
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
                            disabled={isGameOver || !isPlayerTurn}
                        />
                    </div>

                    {/* Player Info */}
                    <div className="flex items-center justify-between bg-surface rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center overflow-hidden">
                                {session?.user?.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt="You"
                                        width={48}
                                        height={48}
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-2xl">&#128100;</span>
                                )}
                            </div>
                            <div>
                                <div className="font-bold">
                                    {session?.user?.name || 'You'}
                                    <span className="ml-2 text-xs text-primary">(You)</span>
                                </div>
                                <div className="text-sm text-gray-400 capitalize">
                                    {playerColor}
                                    {isPlayerTurn && !isGameOver && (
                                        <span className="ml-2 text-green-400">Your turn</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Timer
                            initialTime={playerColor === 'white' ? whiteTime : blackTime}
                            increment={0}
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
                        onOfferDraw={handleOfferDraw}
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
