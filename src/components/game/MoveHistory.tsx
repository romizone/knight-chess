'use client';

import { Move } from '@/types';
import { motion } from 'framer-motion';

interface MoveHistoryProps {
    moves: Move[];
    currentMoveIndex?: number;
    onMoveClick?: (index: number) => void;
}

export default function MoveHistory({
    moves,
    currentMoveIndex,
    onMoveClick,
}: MoveHistoryProps) {
    // Group moves into pairs (white, black)
    const movePairs: { moveNumber: number; white?: Move; black?: Move }[] = [];

    for (let i = 0; i < moves.length; i += 2) {
        movePairs.push({
            moveNumber: Math.floor(i / 2) + 1,
            white: moves[i],
            black: moves[i + 1],
        });
    }

    const getMoveClass = (index: number) => {
        const isCurrentMove = currentMoveIndex === index;
        const isCheck = moves[index]?.isCheck;
        const isCheckmate = moves[index]?.isCheckmate;
        const capture = moves[index]?.captured;

        let classes = 'px-2 py-1 rounded cursor-pointer transition-colors ';

        if (isCurrentMove) {
            classes += 'bg-primary text-white ';
        } else if (isCheckmate) {
            classes += 'text-danger ';
        } else if (isCheck) {
            classes += 'text-warning ';
        } else if (capture) {
            classes += 'text-secondary ';
        } else {
            classes += 'hover:bg-gray-700 ';
        }

        return classes;
    };

    const formatNotation = (move: Move) => {
        let notation = move.notation || '';
        if (move.isCheckmate) notation += '#';
        else if (move.isCheck) notation += '+';
        return notation;
    };

    return (
        <div className="card bg-surface h-full flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-gray-300">Move History</h3>

            <div className="flex-1 overflow-y-auto space-y-1 max-h-[300px]">
                {movePairs.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No moves yet</p>
                ) : (
                    movePairs.map((pair, pairIndex) => (
                        <motion.div
                            key={pair.moveNumber}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: pairIndex * 0.05 }}
                            className="flex items-center gap-2 text-sm"
                        >
                            <span className="text-gray-500 w-8">{pair.moveNumber}.</span>

                            {/* White move */}
                            {pair.white && (
                                <span
                                    className={getMoveClass(pairIndex * 2)}
                                    onClick={() => onMoveClick?.(pairIndex * 2)}
                                >
                                    {formatNotation(pair.white)}
                                </span>
                            )}

                            {/* Black move */}
                            {pair.black && (
                                <span
                                    className={getMoveClass(pairIndex * 2 + 1)}
                                    onClick={() => onMoveClick?.(pairIndex * 2 + 1)}
                                >
                                    {formatNotation(pair.black)}
                                </span>
                            )}
                        </motion.div>
                    ))
                )}
            </div>

            {/* Move count */}
            <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-500">
                Total moves: {moves.length}
            </div>
        </div>
    );
}
