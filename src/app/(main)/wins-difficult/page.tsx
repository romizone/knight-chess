'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface WinEntry {
    gameId: string;
    playerId: string;
    playerName: string | null;
    playerImage: string | null;
    playerRating: number;
    endReason: string | null;
    moveCount: number | null;
    endedAt: string | null;
    createdAt: string;
}

interface Stats {
    totalWins: number;
    uniquePlayers: number;
}

export default function WinsDifficultPage() {
    const [wins, setWins] = useState<WinEntry[]>([]);
    const [stats, setStats] = useState<Stats>({ totalWins: 0, uniquePlayers: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/wins-difficult');
                const data = await res.json();
                if (data.success) {
                    setWins(data.data.wins);
                    setStats(data.data.stats);
                }
            } catch {
                console.error('Failed to fetch wins data');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getEndReasonLabel = (reason: string | null) => {
        const labels: Record<string, string> = {
            checkmate: 'Checkmate',
            timeout: 'Timeout',
            resignation: 'AI Resigned',
            stalemate: 'Stalemate',
        };
        return reason ? labels[reason] || reason : '-';
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/play" className="text-primary hover:underline mb-4 inline-block">
                    &larr; Back to Play
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">&#127942;</span>
                    <h1 className="text-3xl font-bold">Win Difficult AI</h1>
                </div>
                <p className="text-gray-400 mb-8">
                    Hall of Fame - Players who defeated the Difficult AI (Rating 1600)
                </p>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card p-6 text-center"
                    >
                        <div className="text-3xl font-bold text-primary">{stats.totalWins}</div>
                        <div className="text-sm text-gray-400 mt-1">Total Victories</div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="card p-6 text-center"
                    >
                        <div className="text-3xl font-bold text-green-400">{stats.uniquePlayers}</div>
                        <div className="text-sm text-gray-400 mt-1">Unique Champions</div>
                    </motion.div>
                </div>

                {loading ? (
                    <div className="text-center text-gray-400 py-12">Loading victories...</div>
                ) : wins.length === 0 ? (
                    <div className="card p-12 text-center">
                        <span className="text-5xl block mb-4">&#9876;&#65039;</span>
                        <h2 className="text-xl font-bold mb-2">No Victories Yet</h2>
                        <p className="text-gray-400 mb-6">
                            Be the first to defeat the Difficult AI! Can you beat a 1600-rated opponent?
                        </p>
                        <Link href="/play/computer" className="btn btn-primary px-6 py-3 inline-block">
                            Challenge Difficult AI
                        </Link>
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                        {/* Header */}
                        <div className="grid grid-cols-[40px_1fr_80px_100px_80px_140px] gap-3 px-4 py-3 bg-surface text-sm text-gray-400 font-semibold">
                            <span>#</span>
                            <span>Player</span>
                            <span className="text-center">Rating</span>
                            <span className="text-center">End Reason</span>
                            <span className="text-center">Moves</span>
                            <span className="text-center">Date</span>
                        </div>

                        {/* Rows */}
                        {wins.map((win, i) => (
                            <motion.div
                                key={win.gameId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="grid grid-cols-[40px_1fr_80px_100px_80px_140px] gap-3 px-4 py-3 items-center border-t border-gray-700 hover:bg-gray-700/30 transition-colors"
                            >
                                <span className="text-sm text-gray-500 font-mono">{i + 1}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                                        {win.playerImage ? (
                                            <img src={win.playerImage} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            win.playerName?.charAt(0)?.toUpperCase() || '?'
                                        )}
                                    </div>
                                    <span className="font-medium truncate">{win.playerName || 'Anonymous'}</span>
                                </div>
                                <span className="text-center font-mono text-primary font-bold">{win.playerRating}</span>
                                <span className="text-center text-xs text-green-400">{getEndReasonLabel(win.endReason)}</span>
                                <span className="text-center text-gray-400">{win.moveCount ?? '-'}</span>
                                <span className="text-center text-xs text-gray-500">{formatDate(win.endedAt)}</span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
