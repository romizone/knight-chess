'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { GameState, Square, Move, Piece } from '@/types';
import { BOARD_CONFIG, PIECE_UNICODE, COLORS } from '@/lib/chess/constants';
import { getLegalMovesForSquare } from '@/lib/chess/moves';
import { getSquareColor, getPieceAt } from '@/lib/chess/board';

// Board color themes per difficulty
const BOARD_THEMES = {
    default: {
        light: COLORS.board.light,   // #F0D9B5
        dark: COLORS.board.dark,     // #B58863
        selected: COLORS.board.selected,
        lastMove: COLORS.board.lastMove,
    },
    difficult: {
        light: '#EEEED2',   // Light green/cream
        dark: '#769656',    // Green
        selected: '#BACA44', // Yellow-green highlight
        lastMove: '#F6F669', // Bright yellow-green
    },
};

interface BoardProps {
    gameState: GameState;
    onMove: (move: Move) => void;
    flipped?: boolean;
    disabled?: boolean;
    lastMove?: Move | null;
    difficulty?: string;
}

// Animated piece that slides from one square to another
interface AnimatingPiece {
    piece: Piece;
    fromFile: number;
    fromRank: number;
    toFile: number;
    toRank: number;
}

interface SquareProps {
    file: number;
    rank: number;
    fileIndex: number;
    rankIndex: number;
    piece: Piece | null;
    squareColor: 'light' | 'dark';
    isSelected: boolean;
    isLastMoveFrom: boolean;
    isLastMoveTo: boolean;
    isLegalMove: boolean;
    isCapture: boolean;
    isKingInCheck: boolean;
    isDragHover: boolean;
    isDragSource: boolean;
    showPiece: boolean;
    isAnimatingHere: boolean;
    animOffsetX: number;
    animOffsetY: number;
    sqSize: number;
    disabled: boolean;
    isPlayerPiece: boolean;
    onClick: (file: number, rank: number) => void;
    themeLight: string;
    themeDark: string;
    themeSelected: string;
    themeLastMove: string;
}

const BoardSquare = memo(function BoardSquare({
    file, rank, fileIndex, rankIndex, piece, squareColor,
    isSelected, isLastMoveFrom, isLastMoveTo, isLegalMove, isCapture,
    isKingInCheck, isDragHover, isDragSource, showPiece,
    isAnimatingHere, animOffsetX, animOffsetY, sqSize,
    disabled, isPlayerPiece, onClick,
    themeLight, themeDark, themeSelected, themeLastMove,
}: SquareProps) {
    let bgColor = squareColor === 'light' ? themeLight : themeDark;
    if (isSelected && !isDragSource) bgColor = themeSelected;
    else if (isLastMoveFrom || isLastMoveTo) bgColor = themeLastMove;
    if (isKingInCheck) bgColor = COLORS.board.check;
    if (isDragHover && isLegalMove) bgColor = themeSelected;

    return (
        <div
            className="relative flex items-center justify-center select-none"
            style={{
                backgroundColor: bgColor,
                aspectRatio: '1',
                cursor: disabled ? 'default' : isPlayerPiece ? 'grab' : isLegalMove ? 'pointer' : 'default',
            }}
            onClick={() => onClick(file, rank)}
        >
            {fileIndex === 0 && (
                <span
                    className="absolute top-0.5 left-0.5 text-[10px] font-bold leading-none pointer-events-none"
                    style={{ color: squareColor === 'light' ? themeDark : themeLight }}
                >
                    {rank + 1}
                </span>
            )}
            {rankIndex === BOARD_CONFIG.RANKS - 1 && (
                <span
                    className="absolute bottom-0.5 right-1 text-[10px] font-bold leading-none pointer-events-none"
                    style={{ color: squareColor === 'light' ? themeDark : themeLight }}
                >
                    {String.fromCharCode(97 + file)}
                </span>
            )}

            {isLegalMove && !isCapture && (
                <div
                    className="absolute rounded-full pointer-events-none z-10"
                    style={{
                        width: '28%',
                        height: '28%',
                        backgroundColor: 'rgba(0,0,0,0.12)',
                    }}
                />
            )}

            {isCapture && (
                <div
                    className="absolute inset-[4%] rounded-full pointer-events-none z-10"
                    style={{
                        border: '5px solid rgba(0,0,0,0.12)',
                    }}
                />
            )}

            {showPiece && piece && (
                <span
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                    style={{
                        fontSize: `${sqSize * 0.78}px`,
                        lineHeight: 1,
                        transform: isAnimatingHere
                            ? `translate(${animOffsetX}px, ${animOffsetY}px)`
                            : 'translate(0, 0)',
                        transition: isAnimatingHere ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
                        color: piece.color === 'white' ? '#FFFFFF' : '#1a1a1a',
                        textShadow: piece.color === 'white'
                            ? '-1px -1px 0 #333, 1px -1px 0 #333, -1px 1px 0 #333, 1px 1px 0 #333, 0 0 4px rgba(0,0,0,0.3)'
                            : '-1px -1px 0 #666, 1px -1px 0 #666, -1px 1px 0 #666, 1px 1px 0 #666, 0 0 3px rgba(0,0,0,0.2)',
                        willChange: 'transform',
                    }}
                    ref={(el) => {
                        if (el && isAnimatingHere) {
                            el.getBoundingClientRect();
                            requestAnimationFrame(() => {
                                el.style.transform = 'translate(0, 0)';
                                el.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)';
                            });
                        }
                    }}
                >
                    {PIECE_UNICODE[piece.color][piece.type]}
                </span>
            )}
        </div>
    );
});

export default function Board({
    gameState,
    onMove,
    flipped = false,
    disabled = false,
    lastMove = null,
    difficulty = 'easy',
}: BoardProps) {
    const theme = difficulty === 'difficult' ? BOARD_THEMES.difficult : BOARD_THEMES.default;
    const boardRef = useRef<HTMLDivElement>(null);
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [legalMoves, setLegalMoves] = useState<Move[]>([]);

    // Drag state
    const [dragging, setDragging] = useState(false);
    const [dragPiece, setDragPiece] = useState<{ piece: Piece; square: Square } | null>(null);
    const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [hoverSquare, setHoverSquare] = useState<Square | null>(null);

    // Move animation state
    const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null);
    const [prevBoard, setPrevBoard] = useState(gameState.board);

    // Detect board changes and animate piece movement
    useEffect(() => {
        if (lastMove && prevBoard !== gameState.board) {
            setAnimatingPiece({
                piece: lastMove.piece,
                fromFile: lastMove.from.file,
                fromRank: lastMove.from.rank,
                toFile: lastMove.to.file,
                toRank: lastMove.to.rank,
            });
            const timer = setTimeout(() => setAnimatingPiece(null), 250);
            setPrevBoard(gameState.board);
            return () => clearTimeout(timer);
        }
        setPrevBoard(gameState.board);
    }, [gameState.board, lastMove, prevBoard]);

    // Legal move target squares
    const legalMoveSquares = useMemo(() => {
        return new Set(legalMoves.map(m => `${m.to.file}-${m.to.rank}`));
    }, [legalMoves]);

    // Capture squares
    const captureSquares = useMemo(() => {
        return new Set(
            legalMoves
                .filter(m => m.captured)
                .map(m => `${m.to.file}-${m.to.rank}`)
        );
    }, [legalMoves]);

    // Get square size based on board element
    const getSquareSize = useCallback(() => {
        if (!boardRef.current) return 64;
        return boardRef.current.clientWidth / BOARD_CONFIG.FILES;
    }, []);

    // Convert pixel position to board square
    const posToSquare = useCallback((clientX: number, clientY: number): Square | null => {
        if (!boardRef.current) return null;
        const rect = boardRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const sqSize = rect.width / BOARD_CONFIG.FILES;

        const fileIndex = Math.floor(x / sqSize);
        const rankIndex = Math.floor(y / (rect.height / BOARD_CONFIG.RANKS));

        if (fileIndex < 0 || fileIndex >= BOARD_CONFIG.FILES) return null;
        if (rankIndex < 0 || rankIndex >= BOARD_CONFIG.RANKS) return null;

        const file = flipped ? BOARD_CONFIG.FILES - 1 - fileIndex : fileIndex;
        const rank = flipped ? rankIndex : BOARD_CONFIG.RANKS - 1 - rankIndex;

        return { file, rank };
    }, [flipped]);

    // Find move from legal moves
    const findMove = useCallback((toFile: number, toRank: number): Move | undefined => {
        return legalMoves.find(m => m.to.file === toFile && m.to.rank === toRank);
    }, [legalMoves]);

    // Execute a move with selection cleanup
    const executeMove = useCallback((move: Move) => {
        onMove(move);
        setSelectedSquare(null);
        setLegalMoves([]);
        setHoverSquare(null);
    }, [onMove]);

    // Select a piece
    const selectPiece = useCallback((square: Square) => {
        setSelectedSquare(square);
        setLegalMoves(getLegalMovesForSquare(gameState, square));
    }, [gameState]);

    // ===== CLICK HANDLING =====
    const handleSquareClick = useCallback((file: number, rank: number) => {
        if (disabled || dragging) return;

        const clickedSquare: Square = { file, rank };
        const piece = getPieceAt(gameState.board, clickedSquare);

        if (selectedSquare) {
            const move = findMove(file, rank);
            if (move) {
                executeMove(move);
                return;
            }
            if (selectedSquare.file === file && selectedSquare.rank === rank) {
                setSelectedSquare(null);
                setLegalMoves([]);
                return;
            }
            if (piece && piece.color === gameState.turn) {
                selectPiece(clickedSquare);
                return;
            }
            setSelectedSquare(null);
            setLegalMoves([]);
            return;
        }

        if (piece && piece.color === gameState.turn) {
            selectPiece(clickedSquare);
        }
    }, [disabled, dragging, gameState, selectedSquare, findMove, executeMove, selectPiece]);

    // ===== DRAG HANDLING =====
    const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const square = posToSquare(clientX, clientY);
        if (!square) return;

        const piece = getPieceAt(gameState.board, square);
        if (!piece || piece.color !== gameState.turn) return;

        e.preventDefault();

        setDragPiece({ piece, square });
        setDragPos({ x: clientX, y: clientY });
        setDragStartPos({ x: clientX, y: clientY });
        setDragging(true);

        selectPiece(square);
    }, [disabled, posToSquare, gameState, selectPiece]);

    const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!dragging || !dragPiece) return;
        e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setDragPos({ x: clientX, y: clientY });

        const square = posToSquare(clientX, clientY);
        setHoverSquare(square);
    }, [dragging, dragPiece, posToSquare]);

    const handleDragEnd = useCallback((e: MouseEvent | TouchEvent) => {
        if (!dragging || !dragPiece) return;

        const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
        const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

        const dx = clientX - dragStartPos.x;
        const dy = clientY - dragStartPos.y;
        const isClick = Math.abs(dx) < 5 && Math.abs(dy) < 5;

        if (!isClick) {
            const dropSquare = posToSquare(clientX, clientY);
            if (dropSquare) {
                const move = findMove(dropSquare.file, dropSquare.rank);
                if (move) {
                    executeMove(move);
                    setDragging(false);
                    setDragPiece(null);
                    setHoverSquare(null);
                    return;
                }
            }
        }

        setDragging(false);
        setDragPiece(null);
        setHoverSquare(null);
    }, [dragging, dragPiece, dragStartPos, posToSquare, findMove, executeMove]);

    // Attach/detach global listeners for drag
    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleDragMove, { passive: false });
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
            return () => {
                window.removeEventListener('mousemove', handleDragMove);
                window.removeEventListener('mouseup', handleDragEnd);
                window.removeEventListener('touchmove', handleDragMove);
                window.removeEventListener('touchend', handleDragEnd);
            };
        }
    }, [dragging, handleDragMove, handleDragEnd]);

    // ===== RENDERING =====
    const squares = useMemo(() => {
        const result = [];
        const sqSize = getSquareSize();

        for (let rankIndex = 0; rankIndex < BOARD_CONFIG.RANKS; rankIndex++) {
            for (let fileIndex = 0; fileIndex < BOARD_CONFIG.FILES; fileIndex++) {
                const rank = flipped ? rankIndex : BOARD_CONFIG.RANKS - 1 - rankIndex;
                const file = flipped ? BOARD_CONFIG.FILES - 1 - fileIndex : fileIndex;
                const squareColor = getSquareColor(file, rank);
                const piece = getPieceAt(gameState.board, { file, rank });
                const squareKey = `${file}-${rank}`;

                const isSelected = selectedSquare?.file === file && selectedSquare?.rank === rank;
                const isLastMoveFrom = lastMove?.from.file === file && lastMove?.from.rank === rank;
                const isLastMoveTo = lastMove?.to.file === file && lastMove?.to.rank === rank;
                const isLegalMove = legalMoveSquares.has(squareKey);
                const isCapture = captureSquares.has(squareKey);
                const isKingInCheck = gameState.isCheck && piece?.type === 'king' && piece?.color === gameState.turn;
                const isDragHover = hoverSquare?.file === file && hoverSquare?.rank === rank && dragging;
                const isDragSource = dragging && dragPiece?.square.file === file && dragPiece?.square.rank === rank;

                const showPiece = !!piece && !isDragSource;
                const isPlayerPiece = !!piece && piece.color === gameState.turn;

                const isAnimatingHere = !!(animatingPiece &&
                    animatingPiece.toFile === file &&
                    animatingPiece.toRank === rank);

                let animOffsetX = 0;
                let animOffsetY = 0;
                if (isAnimatingHere && animatingPiece) {
                    const fromFileIdx = flipped ? BOARD_CONFIG.FILES - 1 - animatingPiece.fromFile : animatingPiece.fromFile;
                    const fromRankIdx = flipped ? animatingPiece.fromRank : BOARD_CONFIG.RANKS - 1 - animatingPiece.fromRank;
                    const toFileIdx = flipped ? BOARD_CONFIG.FILES - 1 - animatingPiece.toFile : animatingPiece.toFile;
                    const toRankIdx = flipped ? animatingPiece.toRank : BOARD_CONFIG.RANKS - 1 - animatingPiece.toRank;
                    animOffsetX = (fromFileIdx - toFileIdx) * sqSize;
                    animOffsetY = (fromRankIdx - toRankIdx) * (sqSize * BOARD_CONFIG.RANKS / BOARD_CONFIG.FILES);
                }

                result.push(
                    <BoardSquare
                        key={squareKey}
                        file={file}
                        rank={rank}
                        fileIndex={fileIndex}
                        rankIndex={rankIndex}
                        piece={piece}
                        squareColor={squareColor}
                        isSelected={isSelected}
                        isLastMoveFrom={!!isLastMoveFrom}
                        isLastMoveTo={!!isLastMoveTo}
                        isLegalMove={isLegalMove}
                        isCapture={isCapture}
                        isKingInCheck={!!isKingInCheck}
                        isDragHover={isDragHover}
                        isDragSource={isDragSource}
                        showPiece={showPiece}
                        isAnimatingHere={isAnimatingHere}
                        animOffsetX={animOffsetX}
                        animOffsetY={animOffsetY}
                        sqSize={sqSize}
                        disabled={disabled}
                        isPlayerPiece={isPlayerPiece}
                        onClick={handleSquareClick}
                        themeLight={theme.light}
                        themeDark={theme.dark}
                        themeSelected={theme.selected}
                        themeLastMove={theme.lastMove}
                    />
                );
            }
        }

        return result;
    }, [gameState.board, gameState.turn, gameState.isCheck, flipped, disabled,
        selectedSquare, lastMove, legalMoveSquares, captureSquares,
        hoverSquare, dragging, dragPiece, animatingPiece, getSquareSize, handleSquareClick, theme]);

    return (
        <div className="inline-block touch-none">
            <div
                ref={boardRef}
                className="grid border-4 border-gray-700 rounded-lg overflow-hidden shadow-2xl relative"
                style={{
                    gridTemplateColumns: `repeat(${BOARD_CONFIG.FILES}, 1fr)`,
                    gridTemplateRows: `repeat(${BOARD_CONFIG.RANKS}, 1fr)`,
                    width: 'min(85vw, 520px)',
                    aspectRatio: `${BOARD_CONFIG.FILES} / ${BOARD_CONFIG.RANKS}`,
                }}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
            >
                {squares}
            </div>

            {/* Floating drag piece */}
            {dragging && dragPiece && (
                <div
                    className="fixed pointer-events-none z-[9999]"
                    style={{
                        left: dragPos.x,
                        top: dragPos.y,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `${getSquareSize() * 1.1}px`,
                        lineHeight: 1,
                        color: dragPiece.piece.color === 'white' ? '#FFFFFF' : '#1a1a1a',
                        textShadow: dragPiece.piece.color === 'white'
                            ? '-1px -1px 0 #333, 1px -1px 0 #333, -1px 1px 0 #333, 1px 1px 0 #333, 0 2px 8px rgba(0,0,0,0.5)'
                            : '-1px -1px 0 #666, 1px -1px 0 #666, -1px 1px 0 #666, 1px 1px 0 #666, 0 2px 8px rgba(0,0,0,0.4)',
                        opacity: 0.92,
                        willChange: 'left, top',
                    }}
                >
                    {PIECE_UNICODE[dragPiece.piece.color][dragPiece.piece.type]}
                </div>
            )}

            {/* Turn indicator */}
            <div className="mt-3 text-center">
                <span className="text-sm text-gray-400">
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
