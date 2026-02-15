'use client';

import { motion } from 'framer-motion';

interface DrawOfferBannerProps {
    onAccept: () => void;
    onDecline: () => void;
}

export default function DrawOfferBanner({ onAccept, onDecline }: DrawOfferBannerProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto mb-4"
        >
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🤝</span>
                    <div>
                        <p className="font-semibold text-yellow-400">Draw Offered</p>
                        <p className="text-sm text-gray-400">Your opponent is offering a draw</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onAccept}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold text-sm transition-colors"
                    >
                        Accept
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onDecline}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold text-sm transition-colors"
                    >
                        Decline
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
