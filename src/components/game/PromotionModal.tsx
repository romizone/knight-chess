'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PieceType, PieceColor } from '@/types';
import { PIECE_UNICODE } from '@/lib/chess/constants';

interface PromotionModalProps {
    isOpen: boolean;
    color: PieceColor;
    onSelect: (piece: PieceType) => void;
}

const PROMOTION_PIECES: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];

export default function PromotionModal({ isOpen, color, onSelect }: PromotionModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="glass rounded-2xl p-6 text-center"
                    >
                        <h3 className="text-lg font-bold mb-4">Promote Pawn</h3>
                        <div className="flex gap-4">
                            {PROMOTION_PIECES.map((piece) => (
                                <motion.button
                                    key={piece}
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onSelect(piece)}
                                    className="w-16 h-16 bg-surface rounded-lg flex items-center justify-center text-4xl hover:bg-gray-600 transition-colors"
                                    title={piece.charAt(0).toUpperCase() + piece.slice(1)}
                                >
                                    {PIECE_UNICODE[color][piece]}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
