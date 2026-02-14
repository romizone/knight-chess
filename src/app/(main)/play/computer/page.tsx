'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AI_CONFIG, TIME_CONTROLS } from '@/lib/chess/constants';
import { useState } from 'react';
import { GameDifficulty } from '@/types';

const DIFFICULTY_CARDS: { key: GameDifficulty; emoji: string; borderColor: string; btnClass: string }[] = [
    { key: 'easy', emoji: '\u{1F60A}', borderColor: 'border-green-500/30', btnClass: 'btn btn-primary' },
    { key: 'medium', emoji: '\u{1F525}', borderColor: 'border-yellow-500/30', btnClass: 'btn btn-warning' },
    { key: 'difficult', emoji: '\u{1F480}', borderColor: 'border-red-500/30', btnClass: 'btn btn-danger' },
];

export default function PlayComputerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);

    const handleStartGame = async (difficulty: GameDifficulty) => {
        setLoading(difficulty);
        try {
            const res = await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameType: 'vs_computer',
                    difficulty,
                    timeControl: difficulty,
                }),
            });
            const data = await res.json();
            if (data.success && (data.data?.gameId || data.data?.id)) {
                const gameId = data.data.gameId || data.data.id;
                router.push(`/game/${gameId}?difficulty=${difficulty}`);
            } else {
                alert(data.error || 'Failed to create game');
                setLoading(null);
            }
        } catch {
            alert('Failed to create game. Please try again.');
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <Link href="/play" className="text-primary hover:underline mb-4 inline-block">
                    &larr; Back to Play
                </Link>
                <h1 className="text-3xl font-bold mb-2">Play vs Computer</h1>
                <p className="text-gray-400">
                    Choose your difficulty and challenge our AI
                </p>
            </div>

            {/* Difficulty Cards */}
            <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
                {DIFFICULTY_CARDS.map(({ key, emoji, borderColor, btnClass }) => {
                    const config = AI_CONFIG[key];
                    const timeControl = TIME_CONTROLS[key];
                    return (
                        <motion.div
                            key={key}
                            whileHover={{ scale: 1.02, y: -4 }}
                            className={`card ${borderColor} cursor-pointer`}
                        >
                            <div className="text-center">
                                <div className="text-5xl mb-4">{emoji}</div>

                                <h3 className="text-xl font-bold mb-2">{config.name}</h3>
                                <p className="text-gray-400 text-sm mb-4">{config.description}</p>

                                <div className="bg-surface rounded-lg p-3 mb-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500">Search Depth</span>
                                        <span className="font-mono">{config.searchDepth}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500">Blunder Rate</span>
                                        <span className="font-mono">{(config.blunderChance * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Time</span>
                                        <span className="font-mono">{timeControl.label} ({timeControl.category})</span>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleStartGame(key)}
                                    disabled={loading !== null}
                                    className={`w-full ${btnClass} ${loading !== null ? 'opacity-50' : ''}`}
                                >
                                    {loading === key ? 'Creating...' : 'Play Now'}
                                </motion.button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Token Notice */}
            <div className="max-w-4xl mx-auto mt-8 text-center">
                <div className="inline-flex items-center gap-2 bg-surface px-4 py-2 rounded-lg">
                    <span className="text-2xl">&#129689;</span>
                    <span className="text-gray-400">
                        Cost: <span className="text-secondary font-bold">1 token</span> per game
                    </span>
                </div>
            </div>
        </div>
    );
}
