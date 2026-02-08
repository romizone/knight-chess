'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';

interface SessionUser {
    tokenBalance?: number;
    name?: string | null;
    email?: string | null;
    image?: string | null;
}

export default function PlayPage() {
    const { data: session } = useSession();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
            {/* Header */}
            <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="text-5xl">&#9822;</span>
                    <h1 className="text-4xl font-bold">
                        Knight <span className="text-primary">Chess</span>
                    </h1>
                </div>
                <p className="text-gray-400">Choose your game mode</p>
            </div>

            {/* Game Mode Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
                {/* Play vs Computer */}
                <Link href="/play/computer">
                    <motion.div
                        whileHover={{ scale: 1.02, y: -8 }}
                        whileTap={{ scale: 0.98 }}
                        className="card card-glow-green cursor-pointer h-full"
                    >
                        <div className="text-center py-8">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
                                <svg
                                    className="w-12 h-12 text-primary"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-bold mb-2">Play vs Computer</h2>
                            <p className="text-gray-400 mb-6">
                                Challenge our advanced AI.<br />Sharpen your skills.
                            </p>

                            <div className="flex justify-center gap-2 mb-6">
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                                    Easy
                                </span>
                                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                                    Medium
                                </span>
                                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                                    Difficult
                                </span>
                            </div>

                            <motion.span
                                className="inline-block btn btn-primary"
                                whileHover={{ scale: 1.05 }}
                            >
                                Start Game &rarr;
                            </motion.span>
                        </div>
                    </motion.div>
                </Link>

                {/* Play Online - Coming Soon */}
                <motion.div
                    className="card cursor-not-allowed h-full relative opacity-60"
                >
                    <div className="text-center py-8">
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

                        <h2 className="text-2xl font-bold mb-2">Play Online</h2>
                        <p className="text-gray-400 mb-6">
                            Compete against players<br />worldwide in real-time.
                        </p>

                        <span className="inline-block px-4 py-2 bg-gray-700 text-gray-400 rounded-lg text-sm font-semibold">
                            Coming Soon
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Token Balance */}
            {session && (
                <div className="mt-12 flex items-center gap-4">
                    <div className="token-badge text-lg">
                        <span className="text-2xl">&#129689;</span>
                        <span>{(session.user as SessionUser)?.tokenBalance?.toLocaleString() ?? '---'}</span>
                    </div>
                </div>
            )}

            {/* Back to Home */}
            <Link href="/" className="mt-8 text-gray-500 hover:text-primary transition-colors">
                &larr; Back to Home
            </Link>
        </div>
    );
}
