// Shared utility for applying moves to game state
// Used by both client stores (gameStore, multiplayerStore) and server-side validation

import { GameState, Move } from '@/types';
import { cloneGameState, setPieceAt, getPieceAt } from './board';
import { isInCheck, generateLegalMoves } from './moves';

/**
 * Apply a move to a game state and return the new state (immutable).
 * Handles: piece movement, castling, en passant, promotion,
 * turn switching, check/checkmate/stalemate detection.
 */
export function applyMove(state: GameState, move: Move): GameState {
    const newState = cloneGameState(state);

    const piece = move.promotion
        ? { type: move.promotion, color: move.piece.color }
        : move.piece;

    newState.board = setPieceAt(
        setPieceAt(state.board, move.from, null),
        move.to,
        piece
    );

    // Handle castling - move the rook
    if (move.isCastling) {
        const rank = move.from.rank;
        if (move.isCastling === 'kingside') {
            const rook = getPieceAt(newState.board, { file: 7, rank });
            newState.board = setPieceAt(newState.board, { file: 7, rank }, null);
            newState.board = setPieceAt(newState.board, { file: 5, rank }, rook);
        } else {
            const rook = getPieceAt(newState.board, { file: 0, rank });
            newState.board = setPieceAt(newState.board, { file: 0, rank }, null);
            newState.board = setPieceAt(newState.board, { file: 3, rank }, rook);
        }
    }

    // Handle en passant - capture the pawn on a different square
    if (move.isEnPassant) {
        newState.board = setPieceAt(
            newState.board,
            { file: move.to.file, rank: move.from.rank },
            null
        );
    }

    // Update castling rights
    if (move.piece.type === 'king') {
        newState.castlingRights[move.piece.color] = { kingside: false, queenside: false };
    }
    if (move.piece.type === 'rook') {
        if (move.from.file === 0) {
            newState.castlingRights[move.piece.color].queenside = false;
        } else if (move.from.file === 7) {
            newState.castlingRights[move.piece.color].kingside = false;
        }
    }

    // Update en passant target
    if (
        move.piece.type === 'pawn' &&
        Math.abs(move.to.rank - move.from.rank) === 2
    ) {
        newState.enPassantTarget = {
            file: move.from.file,
            rank: (move.from.rank + move.to.rank) / 2,
        };
    } else {
        newState.enPassantTarget = null;
    }

    // Update half-move clock (for 50-move rule)
    if (move.piece.type === 'pawn' || move.captured) {
        newState.halfMoveClock = 0;
    } else {
        newState.halfMoveClock = state.halfMoveClock + 1;
    }

    // Update full move number
    if (state.turn === 'black') {
        newState.fullMoveNumber = state.fullMoveNumber + 1;
    }

    // Switch turn
    newState.turn = state.turn === 'white' ? 'black' : 'white';
    newState.moveHistory = [...state.moveHistory, move];

    // Check detection
    newState.isCheck = isInCheck(newState.board, newState.turn);

    // Checkmate / stalemate detection
    const legalMoves = generateLegalMoves(newState);
    if (legalMoves.length === 0) {
        if (newState.isCheck) {
            newState.isCheckmate = true;
        } else {
            newState.isStalemate = true;
            newState.isDraw = true;
        }
    }

    // 50-move rule
    if (newState.halfMoveClock >= 100) {
        newState.isDraw = true;
    }

    return newState;
}
