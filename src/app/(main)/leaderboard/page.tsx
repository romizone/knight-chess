'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface LeaderboardEntry {
    rank: number;
    id: string;
    name: string;
    image?: string;
    rating: number;
    totalGames: number;
    wins: number;
    winRate: number;
    tokenBalance: number;
}

export default function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                const res = await fetch('/api/leaderboard');
                const data = await res.json();
                if (data.success) setEntries(data.data);
            } catch {
                console.error('Failed to fetch leaderboard');
            } finally {
                setLoading(false);
            }
        }
        fetchLeaderboard();
    }, []);

    const getRankBadge = (rank: number) => {
        if (rank === 1) return '\u{1F947}';
        if (rank === 2) return '\u{1F948}';
        if (rank === 3) return '\u{1F949}';
        return `#${rank}`;
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/play" className="text-primary hover:underline mb-4 inline-block">
                    &larr; Back to Play
                </Link>

                <h1 className="text-3xl font-bold mb-8">Leaderboard</h1>

                {loading ? (
                    <div className="text-center text-gray-400 py-12">Loading leaderboard...</div>
                ) : entries.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">No players yet. Be the first!</div>
                ) : (
                    <div className="card overflow-hidden">
                        {/* Header */}
                        <div className="grid grid-cols-[60px_1fr_80px_80px_80px_80px] gap-4 px-4 py-3 bg-surface text-sm text-gray-400 font-semibold">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-center">Rating</span>
                            <span className="text-center">Games</span>
                            <span className="text-center">Win %</span>
                            <span className="text-center">Tokens</span>
                        </div>

                        {/* Rows */}
                        {entries.map((entry, i) => (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className={`grid grid-cols-[60px_1fr_80px_80px_80px_80px] gap-4 px-4 py-3 items-center border-t border-gray-700 hover:bg-gray-700/30 transition-colors ${entry.rank <= 3 ? 'bg-surface' : ''}`}
                            >
                                <span className="text-xl font-bold">{getRankBadge(entry.rank)}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm">
                                        {entry.image ? (
                                            <img src={entry.image} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            entry.name?.charAt(0)?.toUpperCase() || '?'
                                        )}
                                    </div>
                                    <span className="font-medium truncate">{entry.name || 'Anonymous'}</span>
                                </div>
                                <span className="text-center font-mono text-primary font-bold">{entry.rating}</span>
                                <span className="text-center text-gray-400">{entry.totalGames}</span>
                                <span className="text-center text-green-400">{entry.winRate}%</span>
                                <span className="text-center text-secondary font-mono">{entry.tokenBalance}</span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
