'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GameResult, EndReason } from '@/types';

interface GameOverModalProps {
    isOpen: boolean;
    result: GameResult;
    reason: EndReason;
    tokensWon: number;
    playerColor: 'white' | 'black';
    onPlayAgain: () => void;
    onBackToMenu: () => void;
}

export default function GameOverModal({
    isOpen,
    result,
    reason,
    tokensWon,
    playerColor,
    onPlayAgain,
    onBackToMenu,
}: GameOverModalProps) {
    const isPlayerWin =
        (result === 'white_wins' && playerColor === 'white') ||
        (result === 'black_wins' && playerColor === 'black');
    const isDraw = result === 'draw';

    const getTitle = () => {
        if (isDraw) return 'Draw!';
        if (isPlayerWin) return 'Victory!';
        return 'Defeat';
    };

    const getReasonText = () => {
        const reasons: Record<EndReason, string> = {
            checkmate: 'by Checkmate',
            timeout: 'on Time',
            resignation: 'by Resignation',
            stalemate: 'by Stalemate',
            draw_agreement: 'by Agreement',
            insufficient_material: 'by Insufficient Material',
            fifty_move: 'by 50-Move Rule',
            threefold_repetition: 'by Threefold Repetition',
            disconnect: 'by Disconnect',
        };
        return reasons[reason] || '';
    };

    const getIcon = () => {
        if (isDraw) return '🤝';
        if (isPlayerWin) return '🏆';
        return '😔';
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="glass w-full max-w-md p-6 rounded-2xl text-center"
                    >
                        {/* Icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
                            className="text-6xl mb-4"
                        >
                            {getIcon()}
                        </motion.div>

                        {/* Title */}
                        <h2
                            className={`text-4xl font-bold mb-2 ${isPlayerWin
                                    ? 'text-secondary'
                                    : isDraw
                                        ? 'text-gray-300'
                                        : 'text-gray-400'
                                }`}
                        >
                            {getTitle()}
                        </h2>

                        {/* Reason */}
                        <p className="text-gray-400 mb-6">{getReasonText()}</p>

                        {/* Token Rewards */}
                        <div className="bg-surface rounded-xl p-4 mb-6">
                            <h3 className="text-sm text-gray-400 mb-2">Token Rewards</h3>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-3xl">🪙</span>
                                <span
                                    className={`text-2xl font-bold ${tokensWon > 0
                                            ? 'text-primary'
                                            : tokensWon === 0
                                                ? 'text-gray-400'
                                                : 'text-danger'
                                        }`}
                                >
                                    {tokensWon > 0 ? `+${tokensWon}` : tokensWon} tokens
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {isPlayerWin
                                    ? 'Stake returned + win bonus'
                                    : isDraw
                                        ? 'Stake returned'
                                        : 'Stake lost'}
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onPlayAgain}
                                className="flex-1 btn btn-primary py-3"
                            >
                                Play Again
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onBackToMenu}
                                className="flex-1 btn btn-outline py-3"
                            >
                                Back to Menu
                            </motion.button>
                        </div>

                        {/* Rematch hint */}
                        <p className="text-xs text-gray-500 mt-4">Rematch available</p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
