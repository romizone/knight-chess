'use client';

import { motion } from 'framer-motion';
import { useSoundStore } from '@/stores/soundStore';
import Link from 'next/link';

export default function SettingsPage() {
    const { soundEnabled, volume, toggleSound, setVolume } = useSoundStore();

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto">
                <Link href="/play" className="text-primary hover:underline mb-4 inline-block">
                    &larr; Back to Play
                </Link>

                <h1 className="text-3xl font-bold mb-8">Settings</h1>

                {/* Sound Settings */}
                <div className="card mb-6">
                    <h3 className="text-lg font-bold mb-6">Sound</h3>

                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-gray-300">Sound Effects</span>
                        <button
                            onClick={toggleSound}
                            className={`w-14 h-7 rounded-full p-1 transition-colors ${soundEnabled ? 'bg-primary' : 'bg-gray-600'}`}
                        >
                            <motion.div
                                className="w-5 h-5 bg-white rounded-full shadow"
                                animate={{ x: soundEnabled ? 28 : 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        </button>
                    </div>

                    {/* Volume Slider */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-300">Volume</span>
                            <span className="text-gray-400 text-sm">{Math.round((volume ?? 1) * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume ?? 1}
                            onChange={(e) => setVolume?.(parseFloat(e.target.value))}
                            disabled={!soundEnabled}
                            className="w-full accent-primary"
                        />
                    </div>
                </div>

                {/* Game Preferences */}
                <div className="card">
                    <h3 className="text-lg font-bold mb-6">Game Preferences</h3>

                    <div className="space-y-4 text-gray-400 text-sm">
                        <p>More settings coming soon:</p>
                        <ul className="list-disc list-inside space-y-2">
                            <li>Board theme selection</li>
                            <li>Show/hide legal move indicators</li>
                            <li>Show/hide coordinates</li>
                            <li>Auto-promote to Queen</li>
                            <li>Piece animation speed</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
