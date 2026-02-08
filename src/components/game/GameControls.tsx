'use client';

import { motion } from 'framer-motion';

interface GameControlsProps {
    onResign: () => void;
    onOfferDraw: () => void;
    soundEnabled: boolean;
    onToggleSound: () => void;
    disabled?: boolean;
}

export default function GameControls({
    onResign,
    onOfferDraw,
    soundEnabled,
    onToggleSound,
    disabled = false,
}: GameControlsProps) {
    return (
        <div className="card bg-surface space-y-4">
            <h3 className="text-lg font-bold text-gray-300">Game Controls</h3>

            {/* Resign Button */}
            <motion.button
                whileHover={{ scale: disabled ? 1 : 1.02 }}
                whileTap={{ scale: disabled ? 1 : 0.98 }}
                onClick={onResign}
                disabled={disabled}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${disabled
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-danger hover:bg-red-700 text-white'
                    }`}
            >
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                    />
                </svg>
                Resign
            </motion.button>

            {/* Offer Draw Button */}
            <motion.button
                whileHover={{ scale: disabled ? 1 : 1.02 }}
                whileTap={{ scale: disabled ? 1 : 0.98 }}
                onClick={onOfferDraw}
                disabled={disabled}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${disabled
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-600 hover:bg-gray-500 text-white'
                    }`}
            >
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                </svg>
                Offer Draw
            </motion.button>

            {/* Sound Toggle */}
            <div className="pt-4 border-t border-gray-700">
                <button
                    onClick={onToggleSound}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                    <span className="flex items-center gap-2">
                        {soundEnabled ? (
                            <svg
                                className="w-5 h-5 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                                />
                            </svg>
                        )}
                        Sound
                    </span>

                    {/* Toggle switch */}
                    <div
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${soundEnabled ? 'bg-primary' : 'bg-gray-600'
                            }`}
                    >
                        <motion.div
                            className="w-4 h-4 bg-white rounded-full shadow"
                            animate={{ x: soundEnabled ? 24 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                    </div>
                </button>
            </div>
        </div>
    );
}
