// Move generation for Knight Chess (8x9 board)

import { BoardState, Move, Piece, PieceColor, Square, GameState, PieceType } from '@/types';
import { BOARD_CONFIG } from './constants';
import {
    isValidSquare,
    getPieceAt,
    findKing,
    cloneBoard,
    squareToAlgebraic
} from './board';

// Direction vectors for different pieces
const KNIGHT_MOVES = [
    { file: 1, rank: 2 },
    { file: 2, rank: 1 },
    { file: 2, rank: -1 },
    { file: 1, rank: -2 },
    { file: -1, rank: -2 },
    { file: -2, rank: -1 },
    { file: -2, rank: 1 },
    { file: -1, rank: 2 },
];

const KING_MOVES = [
    { file: 0, rank: 1 },
    { file: 1, rank: 1 },
    { file: 1, rank: 0 },
    { file: 1, rank: -1 },
    { file: 0, rank: -1 },
    { file: -1, rank: -1 },
    { file: -1, rank: 0 },
    { file: -1, rank: 1 },
];

const ROOK_DIRECTIONS = [
    { file: 0, rank: 1 },
    { file: 1, rank: 0 },
    { file: 0, rank: -1 },
    { file: -1, rank: 0 },
];

const BISHOP_DIRECTIONS = [
    { file: 1, rank: 1 },
    { file: 1, rank: -1 },
    { file: -1, rank: -1 },
    { file: -1, rank: 1 },
];

const QUEEN_DIRECTIONS = [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS];

/**
 * Generate all pseudo-legal moves for a piece (doesn't check for putting own king in check)
 */
export function generatePseudoLegalMoves(
    state: GameState,
    square: Square
): Move[] {
    const piece = getPieceAt(state.board, square);
    if (!piece) return [];

    switch (piece.type) {
        case 'pawn':
            return generatePawnMoves(state, square, piece);
        case 'knight':
            return generateKnightMoves(state.board, square, piece);
        case 'bishop':
            return generateSlidingMoves(state.board, square, piece, BISHOP_DIRECTIONS);
        case 'rook':
            return generateSlidingMoves(state.board, square, piece, ROOK_DIRECTIONS);
        case 'queen':
            return generateSlidingMoves(state.board, square, piece, QUEEN_DIRECTIONS);
        case 'king':
            return generateKingMoves(state, square, piece);
        default:
            return [];
    }
}

/**
 * Generate pawn moves
 */
function generatePawnMoves(state: GameState, from: Square, piece: Piece): Move[] {
    const moves: Move[] = [];
    const direction = piece.color === 'white' ? 1 : -1;
    const startRank = piece.color === 'white' ? 1 : 7;
    const promotionRank = piece.color === 'white' ? 8 : 0; // Row 9 for white, row 1 for black

    // Forward move
    const oneStep: Square = { file: from.file, rank: from.rank + direction };
    if (isValidSquare(oneStep) && !getPieceAt(state.board, oneStep)) {
        if (oneStep.rank === promotionRank) {
            // Promotion
            const promotionTypes: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];
            for (const promotion of promotionTypes) {
                moves.push(createMove(from, oneStep, piece, undefined, promotion));
            }
        } else {
            moves.push(createMove(from, oneStep, piece));
        }

        // Double step from starting position
        if (from.rank === startRank) {
            const twoStep: Square = { file: from.file, rank: from.rank + 2 * direction };
            if (isValidSquare(twoStep) && !getPieceAt(state.board, twoStep)) {
                moves.push(createMove(from, twoStep, piece));
            }
        }
    }

    // Captures
    for (const fileDelta of [-1, 1]) {
        const captureSquare: Square = {
            file: from.file + fileDelta,
            rank: from.rank + direction,
        };

        if (!isValidSquare(captureSquare)) continue;

        const target = getPieceAt(state.board, captureSquare);
        if (target && target.color !== piece.color) {
            if (captureSquare.rank === promotionRank) {
                const promotionTypes: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];
                for (const promotion of promotionTypes) {
                    moves.push(createMove(from, captureSquare, piece, target, promotion));
                }
            } else {
                moves.push(createMove(from, captureSquare, piece, target));
            }
        }

        // En passant
        if (
            state.enPassantTarget &&
            captureSquare.file === state.enPassantTarget.file &&
            captureSquare.rank === state.enPassantTarget.rank
        ) {
            const capturedPawn: Piece = { type: 'pawn', color: piece.color === 'white' ? 'black' : 'white' };
            const move = createMove(from, captureSquare, piece, capturedPawn);
            move.isEnPassant = true;
            moves.push(move);
        }
    }

    return moves;
}

/**
 * Generate knight moves
 */
function generateKnightMoves(board: BoardState, from: Square, piece: Piece): Move[] {
    const moves: Move[] = [];

    for (const delta of KNIGHT_MOVES) {
        const to: Square = {
            file: from.file + delta.file,
            rank: from.rank + delta.rank,
        };

        if (!isValidSquare(to)) continue;

        const target = getPieceAt(board, to);
        if (!target || target.color !== piece.color) {
            moves.push(createMove(from, to, piece, target || undefined));
        }
    }

    return moves;
}

/**
 * Generate sliding piece moves (bishop, rook, queen)
 */
function generateSlidingMoves(
    board: BoardState,
    from: Square,
    piece: Piece,
    directions: { file: number; rank: number }[]
): Move[] {
    const moves: Move[] = [];

    for (const dir of directions) {
        let current: Square = { file: from.file + dir.file, rank: from.rank + dir.rank };

        while (isValidSquare(current)) {
            const target = getPieceAt(board, current);

            if (!target) {
                moves.push(createMove(from, current, piece));
            } else {
                if (target.color !== piece.color) {
                    moves.push(createMove(from, current, piece, target));
                }
                break;
            }

            current = { file: current.file + dir.file, rank: current.rank + dir.rank };
        }
    }

    return moves;
}

/**
 * Generate king moves including castling
 */
function generateKingMoves(state: GameState, from: Square, piece: Piece): Move[] {
    const moves: Move[] = [];

    // Normal king moves
    for (const delta of KING_MOVES) {
        const to: Square = {
            file: from.file + delta.file,
            rank: from.rank + delta.rank,
        };

        if (!isValidSquare(to)) continue;

        const target = getPieceAt(state.board, to);
        if (!target || target.color !== piece.color) {
            moves.push(createMove(from, to, piece, target || undefined));
        }
    }

    // Castling
    const castlingRights = state.castlingRights[piece.color];
    const rank = piece.color === 'white' ? 0 : 8;

    // Kingside castling
    if (castlingRights.kingside && from.rank === rank && from.file === 4) {
        const f = { file: 5, rank };
        const g = { file: 6, rank };
        const rookSquare = { file: 7, rank };
        const rook = getPieceAt(state.board, rookSquare);

        if (
            !getPieceAt(state.board, f) &&
            !getPieceAt(state.board, g) &&
            rook?.type === 'rook' &&
            rook?.color === piece.color &&
            !isSquareAttacked(state.board, from, piece.color === 'white' ? 'black' : 'white') &&
            !isSquareAttacked(state.board, f, piece.color === 'white' ? 'black' : 'white') &&
            !isSquareAttacked(state.board, g, piece.color === 'white' ? 'black' : 'white')
        ) {
            const move = createMove(from, g, piece);
            move.isCastling = 'kingside';
            moves.push(move);
        }
    }

    // Queenside castling
    if (castlingRights.queenside && from.rank === rank && from.file === 4) {
        const d = { file: 3, rank };
        const c = { file: 2, rank };
        const b = { file: 1, rank };
        const rookSquare = { file: 0, rank };
        const rook = getPieceAt(state.board, rookSquare);

        if (
            !getPieceAt(state.board, d) &&
            !getPieceAt(state.board, c) &&
            !getPieceAt(state.board, b) &&
            rook?.type === 'rook' &&
            rook?.color === piece.color &&
            !isSquareAttacked(state.board, from, piece.color === 'white' ? 'black' : 'white') &&
            !isSquareAttacked(state.board, d, piece.color === 'white' ? 'black' : 'white') &&
            !isSquareAttacked(state.board, c, piece.color === 'white' ? 'black' : 'white')
        ) {
            const move = createMove(from, c, piece);
            move.isCastling = 'queenside';
            moves.push(move);
        }
    }

    return moves;
}

/**
 * Check if a square is attacked by a given color
 */
export function isSquareAttacked(
    board: BoardState,
    square: Square,
    byColor: PieceColor
): boolean {
    // Check knight attacks
    for (const delta of KNIGHT_MOVES) {
        const from: Square = {
            file: square.file + delta.file,
            rank: square.rank + delta.rank,
        };
        if (isValidSquare(from)) {
            const piece = getPieceAt(board, from);
            if (piece?.type === 'knight' && piece.color === byColor) {
                return true;
            }
        }
    }

    // Check pawn attacks
    const pawnDirection = byColor === 'white' ? -1 : 1;
    for (const fileDelta of [-1, 1]) {
        const from: Square = {
            file: square.file + fileDelta,
            rank: square.rank + pawnDirection,
        };
        if (isValidSquare(from)) {
            const piece = getPieceAt(board, from);
            if (piece?.type === 'pawn' && piece.color === byColor) {
                return true;
            }
        }
    }

    // Check king attacks
    for (const delta of KING_MOVES) {
        const from: Square = {
            file: square.file + delta.file,
            rank: square.rank + delta.rank,
        };
        if (isValidSquare(from)) {
            const piece = getPieceAt(board, from);
            if (piece?.type === 'king' && piece.color === byColor) {
                return true;
            }
        }
    }

    // Check sliding piece attacks (rook, queen)
    for (const dir of ROOK_DIRECTIONS) {
        let current: Square = { file: square.file + dir.file, rank: square.rank + dir.rank };
        while (isValidSquare(current)) {
            const piece = getPieceAt(board, current);
            if (piece) {
                if (
                    piece.color === byColor &&
                    (piece.type === 'rook' || piece.type === 'queen')
                ) {
                    return true;
                }
                break;
            }
            current = { file: current.file + dir.file, rank: current.rank + dir.rank };
        }
    }

    // Check sliding piece attacks (bishop, queen)
    for (const dir of BISHOP_DIRECTIONS) {
        let current: Square = { file: square.file + dir.file, rank: square.rank + dir.rank };
        while (isValidSquare(current)) {
            const piece = getPieceAt(board, current);
            if (piece) {
                if (
                    piece.color === byColor &&
                    (piece.type === 'bishop' || piece.type === 'queen')
                ) {
                    return true;
                }
                break;
            }
            current = { file: current.file + dir.file, rank: current.rank + dir.rank };
        }
    }

    return false;
}

/**
 * Check if the king of a color is in check
 */
export function isInCheck(board: BoardState, color: PieceColor): boolean {
    const kingSquare = findKing(board, color);
    if (!kingSquare) return false;
    return isSquareAttacked(board, kingSquare, color === 'white' ? 'black' : 'white');
}

/**
 * Generate all legal moves for a color
 */
export function generateLegalMoves(state: GameState): Move[] {
    const moves: Move[] = [];

    for (let rank = 0; rank < BOARD_CONFIG.RANKS; rank++) {
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const square: Square = { file, rank };
            const piece = getPieceAt(state.board, square);

            if (piece && piece.color === state.turn) {
                const pieceMoves = generatePseudoLegalMoves(state, square);

                for (const move of pieceMoves) {
                    // Make the move and check if it leaves king in check
                    const newBoard = makeTemporaryMove(state.board, move);
                    if (!isInCheck(newBoard, state.turn)) {
                        moves.push(move);
                    }
                }
            }
        }
    }

    return moves;
}

/**
 * Make a temporary move on the board (for checking legality)
 */
function makeTemporaryMove(board: BoardState, move: Move): BoardState {
    const newBoard = cloneBoard(board);

    // Move the piece
    newBoard[move.to.rank][move.to.file] = move.promotion
        ? { type: move.promotion, color: move.piece.color }
        : move.piece;
    newBoard[move.from.rank][move.from.file] = null;

    // Handle castling
    if (move.isCastling) {
        const rank = move.from.rank;
        if (move.isCastling === 'kingside') {
            newBoard[rank][5] = newBoard[rank][7]; // Move rook
            newBoard[rank][7] = null;
        } else {
            newBoard[rank][3] = newBoard[rank][0]; // Move rook
            newBoard[rank][0] = null;
        }
    }

    // Handle en passant
    if (move.isEnPassant) {
        const capturedRank = move.from.rank;
        newBoard[capturedRank][move.to.file] = null;
    }

    return newBoard;
}

/**
 * Get legal moves for a specific square
 */
export function getLegalMovesForSquare(state: GameState, square: Square): Move[] {
    const piece = getPieceAt(state.board, square);
    if (!piece || piece.color !== state.turn) return [];

    const pseudoMoves = generatePseudoLegalMoves(state, square);
    const legalMoves: Move[] = [];

    for (const move of pseudoMoves) {
        const newBoard = makeTemporaryMove(state.board, move);
        if (!isInCheck(newBoard, state.turn)) {
            legalMoves.push(move);
        }
    }

    return legalMoves;
}

/**
 * Create a move object
 */
function createMove(
    from: Square,
    to: Square,
    piece: Piece,
    captured?: Piece,
    promotion?: PieceType
): Move {
    return {
        from,
        to,
        piece,
        captured,
        promotion,
        notation: generateNotation(from, to, piece, captured, promotion),
    };
}

/**
 * Generate algebraic notation for a move
 */
function generateNotation(
    from: Square,
    to: Square,
    piece: Piece,
    captured?: Piece,
    promotion?: PieceType
): string {
    const pieceLetters: Record<PieceType, string> = {
        king: 'K',
        queen: 'Q',
        rook: 'R',
        bishop: 'B',
        knight: 'N',
        pawn: '',
    };

    let notation = '';

    if (piece.type === 'pawn') {
        if (captured) {
            notation += squareToAlgebraic(from)[0]; // File letter for pawn capture
        }
    } else {
        notation += pieceLetters[piece.type];
    }

    if (captured) {
        notation += 'x';
    }

    notation += squareToAlgebraic(to);

    if (promotion) {
        notation += '=' + pieceLetters[promotion];
    }

    return notation;
}
