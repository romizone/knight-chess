'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';

export default function HomePage() {
    const { data: session } = useSession();

    return (
        <div className="min-h-screen flex flex-col">
            {/* Hero Section */}
            <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `
                linear-gradient(45deg, #272522 25%, transparent 25%),
                linear-gradient(-45deg, #272522 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #272522 75%),
                linear-gradient(-45deg, transparent 75%, #272522 75%)
              `,
                            backgroundSize: '60px 60px',
                            backgroundPosition: '0 0, 0 30px, 30px -30px, -30px 0px',
                        }}
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center z-10"
                >
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <span className="text-6xl">&#9822;</span>
                        <h1 className="text-5xl md:text-6xl font-bold">
                            Knight <span className="text-primary">Chess</span>
                        </h1>
                    </div>

                    {/* Tagline */}
                    <p className="text-2xl md:text-3xl text-secondary font-semibold mb-4">
                        5 Knights. Infinite Strategy.
                    </p>
                    <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                        Experience the unique chess variant with 5 knights per side on an extended 8x9 board.
                        Challenge AI opponents at multiple difficulty levels.
                    </p>

                    {/* CTA Button */}
                    <Link href={session ? '/play' : '/login'}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn btn-primary text-lg px-8 py-4"
                        >
                            {session ? 'Play Now' : 'Sign In to Play'}
                        </motion.button>
                    </Link>
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Why Knight Chess?</h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="card card-glow-green text-center"
                        >
                            <div className="text-5xl mb-4">&#9822;</div>
                            <h3 className="text-xl font-bold mb-2 text-primary">5 Knights Game</h3>
                            <p className="text-gray-400">
                                A unique chess variant with 5 knights per side.
                                3 pawns randomly replaced by knights each game.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="card card-glow-gold text-center"
                        >
                            <div className="text-5xl mb-4">&#129689;</div>
                            <h3 className="text-xl font-bold mb-2 text-secondary">Token Economy</h3>
                            <p className="text-gray-400">
                                Earn and trade in-game rewards. Win games to earn tokens,
                                get weekly bonuses, and climb the leaderboard.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="card text-center"
                            style={{
                                boxShadow: '0 0 20px rgba(100, 100, 255, 0.2)',
                                borderColor: 'rgba(100, 100, 255, 0.3)'
                            }}
                        >
                            <div className="text-5xl mb-4">&#9876;&#65039;</div>
                            <h3 className="text-xl font-bold mb-2 text-blue-400">3 AI Levels</h3>
                            <p className="text-gray-400">
                                Easy, Medium, or Difficult. Minimax AI with depth up to 5.
                                10-minute countdown timer, just like chess.com.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Board Preview */}
            <section className="py-16 px-4 bg-surface">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">8x9 Extended Board</h2>
                    <p className="text-gray-400 mb-8">
                        An extra row adds new strategic depth to the classic game
                    </p>

                    <div className="inline-block">
                        <div className="grid grid-cols-8 gap-0 border-4 border-gray-700 rounded-lg overflow-hidden">
                            {Array.from({ length: 72 }).map((_, i) => {
                                const row = Math.floor(i / 8);
                                const col = i % 8;
                                const isLight = (row + col) % 2 === 0;
                                return (
                                    <div
                                        key={i}
                                        className={`w-8 h-8 md:w-10 md:h-10 ${isLight ? 'bg-board-light' : 'bg-board-dark'}`}
                                    />
                                );
                            })}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">8 columns x 9 rows</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 text-center text-gray-500">
                <p>&copy; 2025 Knight Chess. Made with love for chess lovers.</p>
            </footer>
        </div>
    );
}
