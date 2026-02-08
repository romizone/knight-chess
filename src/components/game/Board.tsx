'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GameState, Square, Move } from '@/types';
import { BOARD_CONFIG, PIECE_UNICODE, COLORS } from '@/lib/chess/constants';
import { getLegalMovesForSquare } from '@/lib/chess/moves';
import { getSquareColor, getPieceAt } from '@/lib/chess/board';

interface BoardProps {
    gameState: GameState;
    onMove: (move: Move) => void;
    flipped?: boolean;
    disabled?: boolean;
    lastMove?: Move | null;
}

export default function Board({
    gameState,
    onMove,
    flipped = false,
    disabled = false,
    lastMove = null,
}: BoardProps) {
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [legalMoves, setLegalMoves] = useState<Move[]>([]);

    // Get legal move target squares for display
    const legalMoveSquares = useMemo(() => {
        return new Set(legalMoves.map(m => `${m.to.file}-${m.to.rank}`));
    }, [legalMoves]);

    // Get capture squares
    const captureSquares = useMemo(() => {
        return new Set(
            legalMoves
                .filter(m => m.captured)
                .map(m => `${m.to.file}-${m.to.rank}`)
        );
    }, [legalMoves]);

    // Handle square click
    const handleSquareClick = useCallback(
        (file: number, rank: number) => {
            if (disabled) return;

            const clickedSquare: Square = { file, rank };
            const piece = getPieceAt(gameState.board, clickedSquare);

            // If a piece is already selected
            if (selectedSquare) {
                // Check if this click is a legal move destination
                const move = legalMoves.find(
                    m => m.to.file === file && m.to.rank === rank
                );

                if (move) {
                    // Make the move
                    onMove(move);
                    setSelectedSquare(null);
                    setLegalMoves([]);
                    return;
                }

                // Clicking on same square deselects
                if (selectedSquare.file === file && selectedSquare.rank === rank) {
                    setSelectedSquare(null);
                    setLegalMoves([]);
                    return;
                }

                // Clicking on another piece of same color selects it
                if (piece && piece.color === gameState.turn) {
                    setSelectedSquare(clickedSquare);
                    setLegalMoves(getLegalMovesForSquare(gameState, clickedSquare));
                    return;
                }

                // Otherwise deselect
                setSelectedSquare(null);
                setLegalMoves([]);
                return;
            }

            // No piece selected - select if it's our piece
            if (piece && piece.color === gameState.turn) {
                setSelectedSquare(clickedSquare);
                setLegalMoves(getLegalMovesForSquare(gameState, clickedSquare));
            }
        },
        [disabled, gameState, selectedSquare, legalMoves, onMove]
    );

    // Render the board
    const renderBoard = () => {
        const squares = [];

        for (let rankIndex = 0; rankIndex < BOARD_CONFIG.RANKS; rankIndex++) {
            for (let fileIndex = 0; fileIndex < BOARD_CONFIG.FILES; fileIndex++) {
                const rank = flipped ? rankIndex : BOARD_CONFIG.RANKS - 1 - rankIndex;
                const file = flipped ? BOARD_CONFIG.FILES - 1 - fileIndex : fileIndex;
                const squareColor = getSquareColor(file, rank);
                const piece = getPieceAt(gameState.board, { file, rank });
                const squareKey = `${file}-${rank}`;

                // Determine square state
                const isSelected =
                    selectedSquare?.file === file && selectedSquare?.rank === rank;
                const isLastMoveFrom =
                    lastMove?.from.file === file && lastMove?.from.rank === rank;
                const isLastMoveTo =
                    lastMove?.to.file === file && lastMove?.to.rank === rank;
                const isLegalMove = legalMoveSquares.has(squareKey);
                const isCapture = captureSquares.has(squareKey);
                const isKingInCheck =
                    gameState.isCheck &&
                    piece?.type === 'king' &&
                    piece?.color === gameState.turn;

                // Determine background color
                let bgColor = squareColor === 'light' ? COLORS.board.light : COLORS.board.dark;
                if (isSelected) bgColor = COLORS.board.selected;
                else if (isLastMoveFrom || isLastMoveTo) bgColor = COLORS.board.lastMove;
                if (isKingInCheck) bgColor = COLORS.board.check;

                squares.push(
                    <div
                        key={squareKey}
                        className="relative flex items-center justify-center cursor-pointer transition-colors duration-100"
                        style={{
                            backgroundColor: bgColor,
                            aspectRatio: '1',
                        }}
                        onClick={() => handleSquareClick(file, rank)}
                    >
                        {/* Coordinate label */}
                        {file === 0 && (
                            <span
                                className="absolute top-0.5 left-0.5 text-xs font-bold"
                                style={{
                                    color: squareColor === 'light' ? COLORS.board.dark : COLORS.board.light,
                                }}
                            >
                                {rank + 1}
                            </span>
                        )}
                        {rank === 0 && (
                            <span
                                className="absolute bottom-0.5 right-0.5 text-xs font-bold"
                                style={{
                                    color: squareColor === 'light' ? COLORS.board.dark : COLORS.board.light,
                                }}
                            >
                                {String.fromCharCode(97 + file)}
                            </span>
                        )}

                        {/* Legal move indicator */}
                        {isLegalMove && !isCapture && (
                            <div
                                className="absolute rounded-full"
                                style={{
                                    width: '30%',
                                    height: '30%',
                                    backgroundColor: COLORS.board.legalMove,
                                }}
                            />
                        )}

                        {/* Capture indicator */}
                        {isCapture && (
                            <div
                                className="absolute inset-0 rounded-full m-1"
                                style={{
                                    border: `4px solid ${COLORS.board.legalMove}`,
                                }}
                            />
                        )}

                        {/* Chess piece */}
                        {piece && (
                            <motion.span
                                key={`${piece.color}-${piece.type}-${file}-${rank}`}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-4xl md:text-5xl select-none pointer-events-none drop-shadow-lg"
                                style={{
                                    filter:
                                        piece.color === 'white'
                                            ? 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))'
                                            : 'none',
                                }}
                            >
                                {PIECE_UNICODE[piece.color][piece.type]}
                            </motion.span>
                        )}
                    </div>
                );
            }
        }

        return squares;
    };

    return (
        <div className="inline-block">
            <div
                className="grid border-4 border-gray-700 rounded-lg overflow-hidden shadow-2xl"
                style={{
                    gridTemplateColumns: `repeat(${BOARD_CONFIG.FILES}, 1fr)`,
                    gridTemplateRows: `repeat(${BOARD_CONFIG.RANKS}, 1fr)`,
                    width: 'min(80vw, 520px)',
                    aspectRatio: `${BOARD_CONFIG.FILES} / ${BOARD_CONFIG.RANKS}`,
                }}
            >
                {renderBoard()}
            </div>

            {/* Current turn indicator */}
            <div className="mt-4 text-center">
                <span className="text-gray-400">
                    {gameState.isCheckmate
                        ? `Checkmate! ${gameState.turn === 'white' ? 'Black' : 'White'} wins!`
                        : gameState.isStalemate
                            ? 'Stalemate! Draw.'
                            : gameState.isCheck
                                ? `${gameState.turn === 'white' ? 'White' : 'Black'} is in check!`
                                : `${gameState.turn === 'white' ? 'White' : 'Black'} to move`}
                </span>
            </div>
        </div>
    );
}
