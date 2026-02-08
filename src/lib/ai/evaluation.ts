// Board Evaluation for Knight Chess AI

import { BoardState, PieceColor, Square } from '@/types';
import { BOARD_CONFIG, PIECE_VALUES, KNIGHT_POSITION_TABLE, PAWN_POSITION_TABLE } from '../chess/constants';
import { getPieceAt, findKing, getPiecesByColor } from '../chess/board';
import { isSquareAttacked } from '../chess/moves';

/**
 * Evaluate the board position for a given color
 * Positive score = advantage for the color
 * Negative score = disadvantage
 */
export function evaluateBoard(board: BoardState, forColor: PieceColor): number {
    let score = 0;

    // Material evaluation
    score += evaluateMaterial(board, forColor);

    // Piece position evaluation
    score += evaluatePositions(board, forColor);

    // King safety
    score += evaluateKingSafety(board, forColor);

    // Center control
    score += evaluateCenterControl(board, forColor);

    // Knight-specific evaluation (important in this variant)
    score += evaluateKnightControl(board, forColor);

    return score;
}

/**
 * Evaluate material balance
 */
function evaluateMaterial(board: BoardState, forColor: PieceColor): number {
    let score = 0;

    for (let rank = 0; rank < BOARD_CONFIG.RANKS; rank++) {
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const piece = board[rank][file];
            if (!piece) continue;

            const value = PIECE_VALUES[piece.type];
            if (piece.color === forColor) {
                score += value;
            } else {
                score -= value;
            }
        }
    }

    return score;
}

/**
 * Evaluate piece positions using position tables
 */
function evaluatePositions(board: BoardState, forColor: PieceColor): number {
    let score = 0;

    for (let rank = 0; rank < BOARD_CONFIG.RANKS; rank++) {
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const piece = board[rank][file];
            if (!piece) continue;

            let positionBonus = 0;
            const tableRank = piece.color === 'white' ? rank : BOARD_CONFIG.RANKS - 1 - rank;

            switch (piece.type) {
                case 'knight':
                    positionBonus = KNIGHT_POSITION_TABLE[tableRank]?.[file] || 0;
                    break;
                case 'pawn':
                    positionBonus = PAWN_POSITION_TABLE[tableRank]?.[file] || 0;
                    break;
                // Add more piece-position tables as needed
            }

            if (piece.color === forColor) {
                score += positionBonus;
            } else {
                score -= positionBonus;
            }
        }
    }

    return score;
}

/**
 * Evaluate king safety
 */
function evaluateKingSafety(board: BoardState, forColor: PieceColor): number {
    let score = 0;
    const kingSquare = findKing(board, forColor);
    const opponentColor = forColor === 'white' ? 'black' : 'white';

    if (!kingSquare) return -10000; // King missing = very bad

    // Penalty for king in center during early/mid game
    const centerFiles = [3, 4];
    const centerRanks = [3, 4, 5];
    if (centerFiles.includes(kingSquare.file) && centerRanks.includes(kingSquare.rank)) {
        score -= 50;
    }

    // Check pawn shield in front of castled king
    if (kingSquare.file <= 2 || kingSquare.file >= 5) {
        const pawnRank = forColor === 'white' ? kingSquare.rank + 1 : kingSquare.rank - 1;
        let pawnShield = 0;

        for (let f = Math.max(0, kingSquare.file - 1); f <= Math.min(7, kingSquare.file + 1); f++) {
            const square: Square = { file: f, rank: pawnRank };
            const piece = getPieceAt(board, square);
            if (piece?.type === 'pawn' && piece.color === forColor) {
                pawnShield += 15;
            }
        }
        score += pawnShield;
    }

    // Penalty if king is attacked
    if (isSquareAttacked(board, kingSquare, opponentColor)) {
        score -= 75;
    }

    return score;
}

/**
 * Evaluate center control
 */
function evaluateCenterControl(board: BoardState, forColor: PieceColor): number {
    let score = 0;
    const centerSquares: Square[] = [
        { file: 3, rank: 4 },
        { file: 4, rank: 4 },
        { file: 3, rank: 5 },
        { file: 4, rank: 5 },
    ];

    for (const square of centerSquares) {
        const piece = getPieceAt(board, square);
        if (piece) {
            if (piece.color === forColor) {
                score += 10;
                if (piece.type === 'knight' || piece.type === 'bishop') {
                    score += 5; // Extra bonus for minor pieces in center
                }
            } else {
                score -= 10;
            }
        }

        // Control bonus (attacking the square)
        const opponentColor = forColor === 'white' ? 'black' : 'white';
        if (isSquareAttacked(board, square, forColor)) {
            score += 5;
        }
        if (isSquareAttacked(board, square, opponentColor)) {
            score -= 5;
        }
    }

    return score;
}

/**
 * Evaluate knight control (important in 5-knights variant)
 */
function evaluateKnightControl(board: BoardState, forColor: PieceColor): number {
    let score = 0;
    const pieces = getPiecesByColor(board, forColor);
    const opponentPieces = getPiecesByColor(board, forColor === 'white' ? 'black' : 'white');

    const myKnights = pieces.filter(p => p.piece.type === 'knight');
    const oppKnights = opponentPieces.filter(p => p.piece.type === 'knight');

    // Knight count advantage
    score += (myKnights.length - oppKnights.length) * 20;

    // Knights are stronger when enemy has pawns (can create outposts)
    const oppPawns = opponentPieces.filter(p => p.piece.type === 'pawn');
    if (oppPawns.length > 4) {
        score += myKnights.length * 10;
    }

    // Knights are stronger in closed positions
    // (simplified: count pieces in center)
    let centerPieces = 0;
    for (let rank = 3; rank <= 5; rank++) {
        for (let file = 2; file <= 5; file++) {
            if (getPieceAt(board, { file, rank })) {
                centerPieces++;
            }
        }
    }
    if (centerPieces > 4) {
        score += myKnights.length * 8;
    }

    // Outpost bonus (knight on square not attackable by enemy pawns)
    for (const knight of myKnights) {
        const rank = knight.square.rank;
        const file = knight.square.file;

        // Check if any enemy pawn can attack this square
        let isOutpost = true;
        const pawnDirection = forColor === 'white' ? 1 : -1;

        for (let r = rank; r >= 0 && r < BOARD_CONFIG.RANKS; r += pawnDirection) {
            for (const f of [file - 1, file + 1]) {
                if (f >= 0 && f < BOARD_CONFIG.FILES) {
                    const piece = getPieceAt(board, { file: f, rank: r });
                    if (piece?.type === 'pawn' && piece.color !== forColor) {
                        isOutpost = false;
                        break;
                    }
                }
            }
            if (!isOutpost) break;
        }

        if (isOutpost && rank >= 3 && rank <= 6) {
            score += 25;
        }
    }

    return score;
}

/**
 * Quick evaluation for move ordering (captures, checks, etc.)
 */
export function evaluateMove(board: BoardState, from: Square, to: Square): number {
    let score = 0;
    const piece = getPieceAt(board, from);
    const target = getPieceAt(board, to);

    if (!piece) return 0;

    // Capture bonus (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
    if (target) {
        score += PIECE_VALUES[target.type] - PIECE_VALUES[piece.type] / 10;
    }

    // Promotion bonus
    if (piece.type === 'pawn') {
        const promotionRank = piece.color === 'white' ? 8 : 0;
        if (to.rank === promotionRank) {
            score += PIECE_VALUES.queen;
        }
    }

    // Center control bonus
    if (to.file >= 3 && to.file <= 4 && to.rank >= 3 && to.rank <= 5) {
        score += 10;
    }

    return score;
}
