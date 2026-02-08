'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AI_CONFIG, TIME_CONTROLS } from '@/lib/chess/constants';
import { GameDifficulty } from '@/types';
import { useState } from 'react';

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
            if (data.success && data.data?.id) {
                router.push(`/game/${data.data.id}?difficulty=${difficulty}`);
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
                    Challenge our AI and improve your Knight Chess skills
                </p>
            </div>

            {/* Difficulty Selection */}
            <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
                {Object.entries(AI_CONFIG).map(([key, config]) => (
                    <motion.div
                        key={key}
                        whileHover={{ scale: 1.02, y: -4 }}
                        className={`card cursor-pointer ${key === 'easy'
                                ? 'card-glow-green'
                                : key === 'medium'
                                    ? 'border-yellow-500/30'
                                    : 'border-red-500/30'
                            }`}
                    >
                        <div className="text-center">
                            <div className="text-5xl mb-4">
                                {key === 'easy' ? '\u{1F331}' : key === 'medium' ? '\u2694\uFE0F' : '\u{1F525}'}
                            </div>

                            <h3 className="text-xl font-bold mb-2">{config.name}</h3>
                            <p className="text-gray-400 text-sm mb-4">{config.description}</p>

                            <div className="bg-surface rounded-lg p-3 mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500">Search Depth</span>
                                    <span className="font-mono">{config.searchDepth}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Blunder Rate</span>
                                    <span className="font-mono">{(config.blunderChance * 100).toFixed(0)}%</span>
                                </div>
                            </div>

                            <div className="text-sm text-gray-400 mb-4">
                                Time: {TIME_CONTROLS[key].label} ({TIME_CONTROLS[key].category})
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleStartGame(key as GameDifficulty)}
                                disabled={loading !== null}
                                className={`w-full btn ${key === 'easy'
                                        ? 'btn-primary'
                                        : key === 'medium'
                                            ? 'btn-secondary'
                                            : 'btn-danger'
                                    } ${loading === key ? 'opacity-50' : ''}`}
                            >
                                {loading === key ? 'Creating...' : `Play ${config.name}`}
                            </motion.button>
                        </div>
                    </motion.div>
                ))}
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
