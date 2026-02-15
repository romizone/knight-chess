'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnlineGameStore } from '@/stores/onlineGameStore';
import Link from 'next/link';

export default function PlayOnlinePage() {
    const router = useRouter();
    const { data: session } = useSession();
    const {
        matchmakingStatus,
        searchStartTime,
        startMatchmaking,
        cancelMatchmaking,
        pollMatchmaking,
        gameId,
        opponent,
    } = useOnlineGameStore();

    const [elapsed, setElapsed] = useState(0);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Timer for elapsed search time
    useEffect(() => {
        if (matchmakingStatus === 'searching' && searchStartTime) {
            timerRef.current = setInterval(() => {
                setElapsed(Math.floor((Date.now() - searchStartTime) / 1000));
            }, 1000);
        } else {
            setElapsed(0);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [matchmakingStatus, searchStartTime]);

    // Poll for match status
    useEffect(() => {
        if (matchmakingStatus === 'searching') {
            pollIntervalRef.current = setInterval(() => {
                pollMatchmaking();
            }, 3000);
        }

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [matchmakingStatus, pollMatchmaking]);

    // Redirect when matched
    useEffect(() => {
        if (matchmakingStatus === 'matched' && gameId) {
            router.push(`/online/${gameId}`);
        }
    }, [matchmakingStatus, gameId, router]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (matchmakingStatus === 'searching') {
                cancelMatchmaking();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFindMatch = useCallback(() => {
        if (session?.user?.id) {
            startMatchmaking(session.user.id);
        }
    }, [session, startMatchmaking]);

    const handleCancel = useCallback(() => {
        cancelMatchmaking();
    }, [cancelMatchmaking]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
            {/* Header */}
            <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="text-5xl">&#9822;</span>
                    <h1 className="text-4xl font-bold">
                        Play <span className="text-secondary">Online</span>
                    </h1>
                </div>
                <p className="text-gray-400">Challenge real players worldwide</p>
            </div>

            {/* Matchmaking Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card max-w-md w-full"
            >
                <div className="text-center py-8">
                    <AnimatePresence mode="wait">
                        {matchmakingStatus === 'idle' && (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {/* Game Info */}
                                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary/20 flex items-center justify-center">
                                    <svg
                                        className="w-12 h-12 text-secondary"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                        />
                                    </svg>
                                </div>

                                <h2 className="text-xl font-bold mb-2">Rapid Match</h2>
                                <p className="text-gray-400 mb-2">10 min &bull; No increment</p>
                                <p className="text-gray-500 text-sm mb-6">
                                    Stake: 1 token &bull; Win: +2 tokens
                                </p>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleFindMatch}
                                    className="btn btn-primary px-12 py-4 text-lg font-bold"
                                >
                                    Find Match
                                </motion.button>
                            </motion.div>
                        )}

                        {matchmakingStatus === 'searching' && (
                            <motion.div
                                key="searching"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {/* Searching Animation */}
                                <div className="w-24 h-24 mx-auto mb-6 relative">
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-4 border-secondary/30"
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                    />
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-4 border-secondary/30"
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                                    />
                                    <div className="absolute inset-0 rounded-full bg-secondary/20 flex items-center justify-center">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                                        >
                                            <svg
                                                className="w-10 h-10 text-secondary"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                                />
                                            </svg>
                                        </motion.div>
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold mb-2">Searching for opponent...</h2>
                                <p className="text-gray-400 mb-6 font-mono text-2xl tabular-nums">
                                    {formatTime(elapsed)}
                                </p>

                                <div className="flex gap-1 justify-center mb-6">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={i}
                                            className="w-2 h-2 rounded-full bg-secondary"
                                            animate={{
                                                y: [0, -10, 0],
                                                opacity: [0.3, 1, 0.3],
                                            }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 1.2,
                                                delay: i * 0.2,
                                            }}
                                        />
                                    ))}
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCancel}
                                    className="btn bg-gray-600 hover:bg-gray-500 text-white px-8 py-3"
                                >
                                    Cancel
                                </motion.button>
                            </motion.div>
                        )}

                        {matchmakingStatus === 'matched' && (
                            <motion.div
                                key="matched"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    className="text-6xl mb-4"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 500 }}
                                >
                                    ⚔️
                                </motion.div>
                                <h2 className="text-xl font-bold mb-2 text-secondary">Match Found!</h2>
                                {opponent && (
                                    <p className="text-gray-400 mb-2">
                                        vs {opponent.name} ({opponent.rating})
                                    </p>
                                )}
                                <p className="text-gray-500 text-sm">Loading game...</p>
                            </motion.div>
                        )}

                        {matchmakingStatus === 'error' && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="text-5xl mb-4">😵</div>
                                <h2 className="text-xl font-bold mb-2 text-red-400">Connection Error</h2>
                                <p className="text-gray-400 mb-6">
                                    Could not connect to matchmaking server. Please try again.
                                </p>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleFindMatch}
                                    className="btn btn-primary px-8 py-3"
                                >
                                    Try Again
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Back to Play */}
            <Link
                href="/play"
                className="mt-8 text-gray-500 hover:text-primary transition-colors"
            >
                &larr; Back to Game Modes
            </Link>
        </div>
    );
}
